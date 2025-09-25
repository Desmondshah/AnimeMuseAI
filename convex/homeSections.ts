// homeSections.ts - curated + dynamic sections
import { query, internalMutation, internalQuery, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Section keys (exclude personalized 'for_you' from manual editing)
export const EDITABLE_SECTIONS = [
	"popular_now", // could be trending
	"top_rated",
	"bingeworthy",
	"retro_classics",
];

type SectionKey = typeof EDITABLE_SECTIONS[number] | "for_you";

// Simple dynamic generators (placeholder logic – replace with real metrics later)
async function dynamicSection(ctx: any, key: SectionKey): Promise<string[]> {
	switch (key) {
		case "popular_now": {
			const docs = await ctx.db.query("anime").withIndex("by_reviewCount", q => q).order("desc").take(20);
			return docs.map((d: any) => d._id);
		}
		case "top_rated": {
			const docs = await ctx.db.query("anime").withIndex("by_averageUserRating", q => q).order("desc").take(20);
			return docs.map((d: any) => d._id);
		}
		case "bingeworthy": {
			// Heuristic: high reviewCount but not necessarily top rating
			const docs = await ctx.db.query("anime").withIndex("by_reviewCount", q => q).order("desc").take(40);
			return docs.slice(0, 20).map((d: any) => d._id);
		}
		case "retro_classics": {
			const docs = await ctx.db.query("anime").withIndex("by_year", q => q).order("asc").take(50);
			return docs.slice(0, 20).map((d: any) => d._id);
		}
		case "for_you":
		default:
			return [];
	}
}

// Fetch curated override if exists
async function getOverride(ctx: any, sectionKey: string) {
	return await ctx.db.query("homeSectionOverrides").withIndex("by_sectionKey", q => q.eq("sectionKey", sectionKey)).unique();
}

// Returns ONLY ids + metadata to keep single function read tiny
export const getHomeSections = query({
	args: {},
	handler: async (ctx) => {
		const result: Record<string, { animeIds: string[]; overrideApplied: boolean; count: number; } > = {};
		for (const key of EDITABLE_SECTIONS) {
			const override = await getOverride(ctx, key);
			let animeIds: any[];
			if (override) {
				animeIds = override.animeIds;
			} else {
				animeIds = await dynamicSection(ctx, key as SectionKey);
			}
			// Hard cap to avoid huge overrides causing large subsequent reads
			const limitedIds = animeIds.slice(0, 50);
			result[key] = { animeIds: limitedIds, overrideApplied: !!override, count: limitedIds.length };
		}
		return result;
	}
});

// Fetch lightweight summaries for a single section (separate query prevents large aggregate reads)
export const getSectionSummaries = query({
	args: { sectionKey: v.string(), limit: v.optional(v.number()) },
	handler: async (ctx, args) => {
		if (!EDITABLE_SECTIONS.includes(args.sectionKey)) throw new Error("Invalid section key");
		const limit = Math.min(args.limit ?? 24, 50);
		const override = await getOverride(ctx, args.sectionKey);
		let animeIds: any[];
		if (override) {
			animeIds = override.animeIds;
		} else {
			animeIds = await dynamicSection(ctx, args.sectionKey as SectionKey);
		}
		const slice = animeIds.slice(0, limit);
		const docs: any[] = [];
			for (const id of slice) { // sequential to allow early stop if large docs
				const d = await ctx.db.get(id);
				if (d && (d as any).title) {
					const a: any = d;
					docs.push({
						_id: a._id,
						title: a.title,
						posterUrl: a.posterUrl,
						year: a.year,
						rating: a.rating,
						averageUserRating: a.averageUserRating,
					});
				}
		}
		return { anime: docs, overrideApplied: !!override, count: docs.length };
	}
});

	// New: dedicated query for homepage consumption returning EXACTLY displayCount items per section
	export const getHomeSectionsDisplay = query({
		args: { displayCount: v.optional(v.number()), uniqueAcrossSections: v.optional(v.boolean()) },
		handler: async (ctx, args) => {
			const displayCount = Math.min(args.displayCount ?? 8, 20);
			const enforceUnique = args.uniqueAcrossSections !== false; // default true

			// Pre-fetch dynamic candidate pools (oversized) to allow dedup + fallback fill
			const dynamicPools: Record<string, string[]> = {};
			for (const key of EDITABLE_SECTIONS) {
				// Fetch more candidates than needed so uniqueness filtering still yields enough
				const base = await dynamicSection(ctx, key as SectionKey); // returns up to 50 depending on section
				dynamicPools[key] = base.slice(0, 60); // safety cap
			}

			const out: Record<string, any> = {};
			const used = new Set<string>();

			// Helper to materialize docs safely and lightly
			const materialize = async (ids: string[]) => {
				const docs: any[] = [];
				for (const id of ids) {
					const d = await ctx.db.get(id as any);
					if (d && (d as any).title) {
						const a: any = d;
						docs.push({
							_id: a._id,
							title: a.title,
							posterUrl: a.posterUrl,
							year: a.year,
							rating: a.rating,
							averageUserRating: a.averageUserRating,
						});
					}
				}
				return docs;
			};

			for (const key of EDITABLE_SECTIONS) {
				const override = await getOverride(ctx, key);
				const selected: string[] = [];
				const already = new Set<string>();

				// 1. Use override first (respect order) while enforcing uniqueness if requested
				if (override) {
					for (const id of override.animeIds) {
						if (selected.length >= displayCount) break;
						if (enforceUnique && used.has(id)) continue; // skip duplicates across sections
						if (!already.has(id)) {
							selected.push(id);
							already.add(id);
							if (enforceUnique) used.add(id);
						}
					}
				}

				// 2. Fill from dynamic pool if short
				if (selected.length < displayCount) {
					for (const id of dynamicPools[key]) {
						if (selected.length >= displayCount) break;
						if (enforceUnique && used.has(id)) continue;
						if (!already.has(id)) {
							selected.push(id);
							already.add(id);
							if (enforceUnique) used.add(id);
						}
					}
				}

				// 3. If still short (rare), allow borrowing from other pools (excluding its own) to avoid empty slots, but only if uniqueness not enforced
				if (selected.length < displayCount && !enforceUnique) {
					for (const altKey of EDITABLE_SECTIONS) {
						if (altKey === key) continue;
						for (const id of dynamicPools[altKey]) {
							if (selected.length >= displayCount) break;
							if (!already.has(id)) {
								selected.push(id);
								already.add(id);
							}
						}
						if (selected.length >= displayCount) break;
					}
				}

				const docs = await materialize(selected);
				out[key] = {
					anime: docs,
					overrideApplied: !!override,
					uniqueEnforced: enforceUnique,
					count: docs.length,
				};
			}

			return out;
		}
	});

export const getHomeSectionOverride = query({
	args: { sectionKey: v.string() },
	handler: async (ctx, args) => {
		if (!EDITABLE_SECTIONS.includes(args.sectionKey)) throw new Error("Invalid section key");
		return await getOverride(ctx, args.sectionKey);
	}
});

export const updateHomeSectionOrdering = mutation({
	args: {
		sectionKey: v.string(),
		animeIds: v.array(v.id("anime")),
	},
	handler: async (ctx, args) => {
		if (!EDITABLE_SECTIONS.includes(args.sectionKey)) throw new Error("Section not editable");
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new Error("Not authenticated");
		// verify admin
		const profile = await ctx.db.query("userProfiles").withIndex("by_userId", q => q.eq("userId", userId)).unique();
		if (!profile?.isAdmin) throw new Error("Admin only");

		// Validate each anime id exists (lightweight)
		const validIds: any[] = [];
		for (const id of args.animeIds) {
			const doc = await ctx.db.get(id);
			if (doc) validIds.push(id);
		}
		const existing = await getOverride(ctx, args.sectionKey);
		if (existing) {
			await ctx.db.patch(existing._id, { animeIds: validIds, updatedAt: Date.now(), updatedBy: userId });
		} else {
			await ctx.db.insert("homeSectionOverrides", { sectionKey: args.sectionKey, animeIds: validIds, updatedAt: Date.now(), updatedBy: userId });
		}
		return { success: true };
	}
});

