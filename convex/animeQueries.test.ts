import { describe, it, expect, vi } from 'vitest';
import { getAnimeByTitleHandler, searchAnimeByTitleHandler } from './animeQueries';

function createCtx(data: any[]) {
  const paginateMock = vi.fn(async ({ cursor, numItems }: any) => {
    const start = cursor ? parseInt(cursor) : 0;
    const end = start + numItems;
    return {
      page: data.slice(start, end),
      isDone: end >= data.length,
      continueCursor: end >= data.length ? null : String(end),
      splitCursor: null,
      pageStatus: end >= data.length ? "Exhausted" : "CanLoadMore"
    };
  });

  return {
    db: {
      query: vi.fn(() => ({
        filter: vi.fn(() => ({ 
          first: vi.fn().mockResolvedValue(null) 
        })),
        withSearchIndex: vi.fn(() => ({ 
          paginate: paginateMock 
        })),
      })),
    },
    paginateMock,
  } as any;
}

describe('animeQueries search', () => {
  it('getAnimeByTitleHandler finds case-insensitive match using search index', async () => {
    const anime = [
      { _id: '1', title: 'Naruto' }, 
      { _id: '2', title: 'One Piece' }
    ];
    const ctx = createCtx(anime);
    
    // Test the handler function directly
    const result = await getAnimeByTitleHandler(ctx, { title: 'one piece' });
    
    expect(result).toEqual(anime[1]);
    expect(ctx.paginateMock).toHaveBeenCalledTimes(1);
  });

  it('searchAnimeByTitleHandler returns limited results without scanning all pages', async () => {
    const anime = [
      { _id: '1', title: 'Attack on Titan' },
      { _id: '2', title: 'One Piece' },
      { _id: '3', title: 'One Punch Man' },
    ];
    const ctx = createCtx(anime);
    
    // Test the handler function directly
    const result = await searchAnimeByTitleHandler(ctx, { title: 'One', limit: 2 });
    
    expect(result).toEqual([anime[1], anime[2]]);
    expect(ctx.paginateMock).toHaveBeenCalledTimes(1);
  });

  it('searchAnimeByTitleHandler scores matches correctly', async () => {
    const anime = [
      { _id: '1', title: 'One Piece' },        // Exact match - score 100
      { _id: '2', title: 'One Punch Man' },    // Starts with - score 80
      { _id: '3', title: 'Attack on One' },    // Contains - score 60
    ];
    const ctx = createCtx(anime);
    
    const result = await searchAnimeByTitleHandler(ctx, { title: 'one', limit: 3 });
    
    // Should be ordered by score: exact match first, then starts with, then contains
    expect(result[0]).toEqual(anime[0]); // One Piece (exact)
    expect(result[1]).toEqual(anime[1]); // One Punch Man (starts with)
    expect(result[2]).toEqual(anime[2]); // Attack on One (contains)
  });

  it('getAnimeByTitleHandler returns partial match when no exact match found', async () => {
    const anime = [
      { _id: '1', title: 'Naruto Shippuden' },
      { _id: '2', title: 'One Piece' }
    ];
    const ctx = createCtx(anime);
    
    const result = await getAnimeByTitleHandler(ctx, { title: 'naruto' });
    
    // Should find partial match since "naruto" is contained in "Naruto Shippuden"
    expect(result).toEqual(anime[0]);
  });

  it('searchAnimeByTitleHandler uses default limit when not specified', async () => {
    const anime = Array.from({ length: 10 }, (_, i) => ({ 
      _id: String(i + 1), 
      title: `Anime ${i + 1}` 
    }));
    const ctx = createCtx(anime);
    
    const result = await searchAnimeByTitleHandler(ctx, { title: 'Anime' });
    
    // Should use default limit of 5
    expect(result).toHaveLength(5);
  });
});