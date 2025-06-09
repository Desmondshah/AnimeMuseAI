import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('@convex-dev/auth/server', () => ({
  getAuthUserId: vi.fn(),
}));
import { getAuthUserId } from '@convex-dev/auth/server';
import { addAnimeByUserHandler } from './anime';

function createCtx(existingAnime: any | null) {
  return {
    db: {
      query: vi.fn(() => ({
        withIndex: vi.fn(() => ({
          first: vi.fn().mockResolvedValue(existingAnime && existingAnime.caseSensitive ? existingAnime : null),
        })),
        withSearchIndex: vi.fn(() => ({
          take: vi.fn().mockResolvedValue(existingAnime && !existingAnime.caseSensitive ? [existingAnime] : []),
        })),
      })),
      insert: vi.fn().mockResolvedValue('newId'),
    },
    scheduler: { runAfter: vi.fn() },
  } as any;
}

describe('addAnimeByUserHandler', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (getAuthUserId as any).mockResolvedValue('user1');
  });
  it('detects duplicates regardless of case', async () => {
    const existing = { _id: 'anime1', title: 'Naruto', caseSensitive: false };
    const ctx = createCtx(existing);
    const id = await addAnimeByUserHandler(ctx, {
      title: 'naruto',
      description: 'desc',
      posterUrl: 'url',
      genres: [],
    });
    expect(id).toBe(existing._id);
    expect(ctx.db.insert).not.toHaveBeenCalled();
  });
});