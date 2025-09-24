import { action, internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import {
  findAllDuplicateGroups,
  selectPrimaryEntry,
  deduplicateNewApiData,
  consolidateSeasons,
  areDuplicateAnime,
  isRomanizedJapanese,
  generateAnimeKey,
  calculateEntryQuality,
  pickPreferredTitle,
} from "./deduplicationUtils";

// Helper: snapshot docs for rollback
async function snapshotForGroup(ctx: any, batchId: string, groupKey: string, primaryId: Id<"anime">, duplicateIds: Id<"anime">[]) {
  // Anime snapshots
  const animeDocs: Array<{ animeId: Id<"anime">; doc: any }> = [];
  const allIds = [primaryId, ...duplicateIds];
  for (const id of allIds) {
    const doc = await ctx.db.get(id);
    if (doc) animeDocs.push({ animeId: id, doc });
  }
  // Watchlist snapshots
  const watchlistSnapshots: Array<{ _id: Id<"watchlist">; doc: any }> = [];
  for (const id of allIds) {
    const items = await ctx.db.query("watchlist").withIndex("by_userId", q => q.gt("userId", null as any)).filter((q:any)=> q.eq(q.field("animeId"), id)).collect();
    for (const it of items) watchlistSnapshots.push({ _id: it._id, doc: it });
  }
  // Review snapshots
  const reviewSnapshots: Array<{ _id: Id<"reviews">; doc: any }> = [];
  for (const id of allIds) {
    const items = await ctx.db.query("reviews").withIndex("by_animeId_createdAt", q => q.eq("animeId", id)).collect();
    for (const it of items) reviewSnapshots.push({ _id: it._id, doc: it });
  }
  // Custom list snapshots
  const customListSnapshots: Array<{ _id: Id<"customLists">; doc: any }> = [];
  const lists = await ctx.db.query("customLists").collect();
  for (const l of lists) {
    if (l.animeIds.some(aid => allIds.includes(aid))) {
      customListSnapshots.push({ _id: l._id, doc: l });
    }
  }
  await ctx.db.insert("deduplicationBackups", {
    batchId,
    groupKey,
    primaryAnimeId: primaryId,
    duplicateAnimeIds: duplicateIds,
    animeSnapshots: animeDocs,
    watchlistSnapshots,
    reviewSnapshots,
    customListSnapshots,
    createdAt: Date.now(),
  });
}

// Update foreign references from duplicate -> primary
async function repointReferences(ctx: any, primaryId: Id<"anime">, duplicateIds: Id<"anime">[]) {
  // Watchlist
  for (const dupId of duplicateIds) {
    const dupItems = await ctx.db.query("watchlist").withIndex("by_userId", q => q.gt("userId", null as any)).filter((q:any)=> q.eq(q.field("animeId"), dupId)).collect();
    for (const item of dupItems) {
      // Merge semantics: if the user already has a watchlist entry for primary, reconcile
      const existingPrimary = await ctx.db
        .query("watchlist")
        .withIndex("by_user_anime", q => q.eq("userId", item.userId).eq("animeId", primaryId))
        .unique();
      if (existingPrimary) {
        // Prefer max progress and keep rating if present
        const merged = {
          status: existingPrimary.status === "Completed" || item.status === "Completed" ? "Completed" : (existingPrimary.status || item.status),
          progress: Math.max(existingPrimary.progress || 0, item.progress || 0) || undefined,
          userRating: (existingPrimary.userRating ?? item.userRating) || undefined,
          notes: [existingPrimary.notes, item.notes].filter(Boolean).join(" | ") || undefined,
        };
        await ctx.db.patch(existingPrimary._id, merged);
        await ctx.db.delete(item._id);
      } else {
        await ctx.db.patch(item._id, { animeId: primaryId });
      }
    }
  }

  // Reviews
  for (const dupId of duplicateIds) {
    const dupReviews = await ctx.db.query("reviews").withIndex("by_animeId_createdAt", q => q.eq("animeId", dupId)).collect();
    for (const r of dupReviews) {
      // If a user has a review on both, keep the most recent and delete older
      const existing = await ctx.db
        .query("reviews")
        .withIndex("by_animeId_userId", q => q.eq("animeId", primaryId).eq("userId", r.userId))
        .unique();
      if (existing) {
        const keep = (existing.updatedAt || existing.createdAt) >= (r.updatedAt || r.createdAt) ? existing : r;
        const drop = keep._id === existing._id ? r : existing;
        if (drop._id !== r._id) {
          await ctx.db.delete(r._id);
        } else {
          await ctx.db.delete(existing._id);
          await ctx.db.patch(r._id, { animeId: primaryId });
        }
      } else {
        await ctx.db.patch(r._id, { animeId: primaryId });
      }
    }
  }

  // Custom lists
  const lists = await ctx.db.query("customLists").collect();
  for (const list of lists) {
    let changed = false;
    const newIds: Id<"anime">[] = [] as any;
    const seen = new Set<string>();
    for (const aid of list.animeIds) {
      const shouldReplace = duplicateIds.includes(aid);
      const place = shouldReplace ? primaryId : aid;
      const key = place.toString();
      if (!seen.has(key)) {
        newIds.push(place);
        seen.add(key);
      } else {
        changed = true; // duplicate collapsed
      }
      if (shouldReplace) changed = true;
    }
    if (changed) {
      await ctx.db.patch(list._id, { animeIds: newIds });
    }
  }
}

// Internal mutation: Merge duplicates into primary and delete others (DB access allowed)
export const processDuplicateGroup = internalMutation({
  args: {
    batchId: v.string(),
    groupIds: v.array(v.id("anime")),
  },
  handler: async (ctx, args) => {
    const groupDocs: Doc<"anime">[] = [];
    for (const id of args.groupIds) {
      const doc = await ctx.db.get(id);
      if (doc) groupDocs.push(doc);
    }
    if (groupDocs.length < 2) return { skipped: true } as any;
    const first = groupDocs[0];
    const groupKey = generateAnimeKey({
      title: first.title,
      anilistId: first.anilistId,
      myAnimeListId: first.myAnimeListId,
    } as any);
    const primary = selectPrimaryEntry(groupDocs as any) as Doc<"anime">;
    const duplicateDocs = groupDocs.filter(g => g._id !== primary._id);

    // Backup
    await snapshotForGroup(ctx, args.batchId, groupKey, primary._id, duplicateDocs.map(d => d._id));

    // Merge seasons
    const toMerge = [primary, ...duplicateDocs];
    const mergedSeasonView = consolidateSeasons(toMerge as any)[0];
    await ctx.db.patch(primary._id, {
      consolidated: true,
      seriesKey: groupKey.replace(/^t:/, 'series:'),
      seasons: mergedSeasonView.seasons,
    });

    // Repoint references
    await repointReferences(ctx, primary._id, duplicateDocs.map(d => d._id));

    // Delete duplicates
    for (const d of duplicateDocs) {
      await ctx.db.delete(d._id);
    }

    return { primaryId: primary._id, deleted: duplicateDocs.map(d => d._id), size: groupDocs.length };
  },
});

// Internal query: get all anime fast
export const getAllAnimeInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("anime").collect();
  },
});

// Internal helper: check if current user is admin
export const isCurrentUserAdminInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q:any) => q.eq("userId", userId))
      .unique();
    return !!profile?.isAdmin;
  },
});

// Phase 1: Cleanup existing duplicates
export const runCompleteDeduplication = action({
  args: {
    dryRun: v.optional(v.boolean()),
    limitGroups: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
  const isAdmin = await ctx.runQuery(internal.deduplication.isCurrentUserAdminInternal, {});
  if (!isAdmin) throw new Error("Admin only");

    const allAnime: Doc<"anime">[] = await ctx.runQuery(internal.deduplication.getAllAnimeInternal, {});
    const groups = findAllDuplicateGroups(allAnime as any);
    const limitedGroups = args.limitGroups ? groups.slice(0, args.limitGroups) : groups;
    const batchId = `dedup:${Date.now()}`;

    const results: Array<{ primaryId: Id<"anime">; deleted: Id<"anime">[]; size: number }> = [];

    for (const group of limitedGroups) {
      const groupIds = group.map(g => (g as Doc<"anime">)._id);
      console.log(`[Dedup] Group found: ${group.map(g => (g as any).title).join(" | ")}`);
      if (args.dryRun) {
        results.push({ primaryId: groupIds[0], deleted: groupIds.slice(1), size: group.length });
        continue;
      }
      const res: any = await ctx.runMutation(internal.deduplication.processDuplicateGroup, {
        batchId,
        groupIds,
      });
      if (res?.primaryId) {
        results.push({ primaryId: res.primaryId, deleted: res.deleted, size: res.size });
      } else {
        // Fallback record
        results.push({ primaryId: groupIds[0], deleted: groupIds.slice(1), size: group.length });
      }
    }

    return {
      batchId,
      groupsExamined: groups.length,
      groupsProcessed: limitedGroups.length,
      changesApplied: !args.dryRun,
      results,
    };
  },
});

// Phase 2: Pre-insert prevention utility (internal)
export const deduplicateIncomingApiData = internalAction({
  args: { items: v.array(v.any()) },
  handler: async (_ctx, args) => {
    return deduplicateNewApiData(args.items as any);
  },
});

// Phase 2: Cross-check against DB and normalize entries before insert
export const prepareNewAnimeForInsert = internalAction({
  args: { items: v.array(v.any()) },
  handler: async (ctx, args) => {
    const deduped = deduplicateNewApiData(args.items as any);
    const prepared: any[] = [];
    for (const item of deduped) {
      // Normalize preferred title and seriesKey
      const displayTitle = pickPreferredTitle(item as any);
      const seriesKey = `series:${(item.title_english || item.title || '').toLowerCase()}`;

      // Cross-check DB by external IDs or title
      const existing = await ctx.runQuery(internal.anime.checkAnimeExistsByExternalIds, {
        anilistId: item.anilistId ?? item.anilist_id,
        myAnimeListId: item.myAnimeListId ?? item.mal_id,
        title: displayTitle,
      });
      if (existing) {
        // Skip insert; attach existing ID for client to reference
        prepared.push({ ...item, _id: existing._id, foundInDatabase: true });
        continue;
      }
      prepared.push({
        ...item,
        title: displayTitle,
        consolidated: item.seasons && item.seasons.length > 0 ? true : undefined,
        seriesKey,
      });
    }
    return prepared;
  },
});

// Public helper query to test utilities quickly
export const testDedupPreview = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const all: Doc<"anime">[] = await ctx.db.query("anime").take(args.limit ?? 200);
    const groups = findAllDuplicateGroups(all as any);
    return groups.map(g => g.map(x => ({ id: x._id, title: x.title })));
  },
});

// Admin-only rollback: restore a previous dedup batch
// Internal mutation: perform restoration work
export const restoreDedupBatch = internalMutation({
  args: { batchId: v.string() },
  handler: async (ctx, args) => {
    const backups = await ctx.db
      .query("deduplicationBackups")
      .withIndex("by_batchId", (q:any) => q.eq("batchId", args.batchId))
      .collect();
    if (!backups.length) return { restored: 0, notes: "No backups found" } as any;

    let restored = 0;
    const idMap = new Map<string, Id<"anime">>();
    for (const b of backups) {
      // Restore anime docs
      for (const snap of b.animeSnapshots) {
        const current = await ctx.db.get(snap.animeId);
        const doc = snap.doc;
        if (current) {
          const { _id, _creationTime, ...rest } = doc;
          await ctx.db.patch(current._id, rest);
          idMap.set(snap.animeId as unknown as string, current._id);
        } else {
          const { _id, _creationTime, ...rest } = doc;
          const newId = await ctx.db.insert("anime", rest);
          idMap.set(snap.animeId as unknown as string, newId);
        }
      }

      const mapAnimeId = (id: Id<"anime">): Id<"anime"> => {
        return idMap.get(id as unknown as string) || id;
      };

      // Restore watchlist
      for (const w of b.watchlistSnapshots) {
        const doc = w.doc;
        const targetAnimeId = mapAnimeId(doc.animeId);
        const existing = await ctx.db.get(w._id);
        if (existing) {
          await ctx.db.patch(w._id, { ...doc, animeId: targetAnimeId });
        } else {
          await ctx.db.insert("watchlist", { ...doc, animeId: targetAnimeId });
        }
      }

      // Restore reviews
      for (const r of b.reviewSnapshots) {
        const doc = r.doc;
        const targetAnimeId = mapAnimeId(doc.animeId);
        const existing = await ctx.db.get(r._id);
        if (existing) {
          await ctx.db.patch(r._id, { ...doc, animeId: targetAnimeId });
        } else {
          await ctx.db.insert("reviews", { ...doc, animeId: targetAnimeId });
        }
      }

      // Restore custom lists
      for (const cl of b.customListSnapshots) {
        const doc = cl.doc;
        const ids = (doc.animeIds || []).map((x: Id<"anime">) => mapAnimeId(x));
        const existing = await ctx.db.get(cl._id);
        if (existing) {
          await ctx.db.patch(cl._id, { ...doc, animeIds: ids });
        } else {
          await ctx.db.insert("customLists", { ...doc, animeIds: ids });
        }
      }

      restored++;
    }

    return { batchId: args.batchId, restored };
  },
});

// Action wrapper: admin check then perform restore
// Note: Action wrapper for restore is intentionally omitted to avoid TS deep type issues.
// Call internal.deduplication.restoreDedupBatch from a minimal action or admin tool if needed.

// Export validators as named functions for potential frontend use
export const validators = {
  isRomanizedJapanese: (title: string) => isRomanizedJapanese(title),
  calculateEntryQuality: (a: any) => calculateEntryQuality(a),
  generateAnimeKey: (a: any) => generateAnimeKey(a),
};
