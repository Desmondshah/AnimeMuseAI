import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('@convex-dev/auth/server', () => ({
  getAuthUserId: vi.fn(),
}));
import { getAuthUserId } from '@convex-dev/auth/server';
import { addAnimeByUserHandler, findExistingAnimeByTitle } from './anime';


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

function createSearchCtx(data: any[]) {
  const firstMock = vi.fn().mockResolvedValue(null);
  const takeMock = vi.fn().mockResolvedValue(data);
  return {
    db: {
      query: vi.fn(() => ({
        withIndex: vi.fn(() => ({ first: firstMock })),
        withSearchIndex: vi.fn(() => ({ take: takeMock })),
      })),
    },
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

describe('findExistingAnimeByTitle', () => {
  it('finds case-insensitive match using search index', async () => {
    const data = [{ _id: '1', title: 'Naruto' }];
    const ctx = createSearchCtx(data);
    const result = await findExistingAnimeByTitle(ctx, 'naruto');
    expect(result).toEqual(data[0]);
    expect(ctx.db.query).toHaveBeenCalled();
  });

  it('returns partial match when no exact match found', async () => {
    const data = [{ _id: '1', title: 'Naruto Shippuden' }];
    const ctx = createSearchCtx(data);
    const result = await findExistingAnimeByTitle(ctx, 'naruto');
    expect(result).toBeNull();
  });
});