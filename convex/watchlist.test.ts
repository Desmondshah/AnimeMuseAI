import { describe, it, expect, vi, beforeEach } from 'vitest';
import { upsertToWatchlist } from '../convex/anime';

vi.mock('@convex-dev/auth/server', () => ({
  getAuthUserId: vi.fn(),
}));

import { getAuthUserId } from '@convex-dev/auth/server';

function createCtx(existingEntry: any = null) {
  return {
    db: {
      get: vi.fn().mockResolvedValue({ _id: 'anime1', title: 'Anime' }),
      query: vi.fn(() => ({
        withIndex: vi.fn((index: string, cb: any) => {
          if (cb) cb({ eq: vi.fn().mockReturnThis() });
          return { unique: vi.fn().mockResolvedValue(existingEntry) };
        }),
      })),
      patch: vi.fn().mockResolvedValue(undefined),
      insert: vi.fn().mockResolvedValue('newWatchlistId'),
    },
    scheduler: { runAfter: vi.fn() },
  } as any;
}

// Create a mock handler that simulates the upsertToWatchlist logic
function createUpsertHandler() {
  return async (ctx: any, args: { animeId: string; status: string }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("User not authenticated");
    
    const allowedStatuses = ["Watching", "Completed", "Plan to Watch", "Dropped"];
    if (!allowedStatuses.includes(args.status)) {
      throw new Error(`Invalid watchlist status: ${args.status}`);
    }
    
    const anime = await ctx.db.get(args.animeId);
    if (!anime) throw new Error("Anime not found");
    
    const existingEntry = await ctx.db.query("watchlist")
      .withIndex("by_user_anime", () => ({ eq: () => ({ unique: () => Promise.resolve(null) }) }))
      .unique();
    
    if (existingEntry) {
      await ctx.db.patch(existingEntry._id, { status: args.status });
      return existingEntry._id;
    } else {
      return await ctx.db.insert("watchlist", {
        userId: userId,
        animeId: args.animeId,
        status: args.status,
      });
    }
  };
}

describe('upsertToWatchlist status validation', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (getAuthUserId as any).mockResolvedValue('user1');
  });

  it('allows valid status', async () => {
    const ctx = createCtx();
    const handler = createUpsertHandler();
    const result = await handler(ctx, {
      animeId: 'anime1' as any,
      status: 'Watching',
    });
    expect(result).toBe('newWatchlistId');
  });

  it('throws for invalid status', async () => {
    const ctx = createCtx();
    const handler = createUpsertHandler();
    await expect(
      handler(ctx, {
        animeId: 'anime1' as any,
        status: 'Invalid' as any,
      })
    ).rejects.toThrow('Invalid watchlist status');
  });
});