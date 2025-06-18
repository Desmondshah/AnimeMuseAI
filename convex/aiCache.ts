import { internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const getCache = internalQuery({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const entry = await ctx.db
      .query("aiCache")
      .withIndex("by_cacheKey", q => q.eq("cacheKey", args.key))
      .unique();
    if (!entry) return null;
    if (entry.expiresAt && entry.expiresAt < Date.now()) return null;
    return entry.value;
  },
});

export const setCache = internalMutation({
  args: { key: v.string(), value: v.any(), ttl: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const now = Date.now();
    const expiresAt = args.ttl ? now + args.ttl : undefined;
    const existing = await ctx.db
      .query("aiCache")
      .withIndex("by_cacheKey", q => q.eq("cacheKey", args.key))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { value: args.value, createdAt: now, expiresAt });
    } else {
      await ctx.db.insert("aiCache", { cacheKey: args.key, value: args.value, createdAt: now, expiresAt });
    }
  },
});

export const invalidateCache = internalMutation({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("aiCache")
      .withIndex("by_cacheKey", q => q.eq("cacheKey", args.key))
      .unique();
    if (existing) await ctx.db.delete(existing._id);
  },
});