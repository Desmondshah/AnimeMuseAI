import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCustomListHandler } from '../convex/users';

vi.mock('@convex-dev/auth/server', () => ({
  getAuthUserId: vi.fn(),
}));

import { getAuthUserId } from '@convex-dev/auth/server';

describe('custom list name normalization', () => {
  const userId = 'userA';
  const existingId = 'listExisting';

  beforeEach(() => {
    vi.resetAllMocks();
    (getAuthUserId as any).mockResolvedValue(userId);
  });

  function createCtx(conflict: boolean) {
    return {
      db: {
        query: vi.fn(() => ({
          withIndex: vi.fn((index: string) => ({
            unique: () =>
              Promise.resolve(index === 'by_userId_normalizedListName' && conflict ? { _id: existingId } : null),
            collect: () => Promise.resolve([]),
          })),
        })),
        insert: vi.fn().mockResolvedValue('newId'),
      },
    } as any;
  }

  it('treats differently cased names as duplicates', async () => {
    const ctx = createCtx(true);
    await expect(
      createCustomListHandler(ctx, { listName: 'MyList', isPublic: true })
    ).rejects.toThrow('A list with this name already exists.');
  });

  it('creates list when name is unique', async () => {
    const ctx = createCtx(false);
    await expect(
      createCustomListHandler(ctx, { listName: 'MyList', isPublic: true })
    ).resolves.toBe('newId');
    expect(ctx.db.insert).toHaveBeenCalledWith('customLists', expect.objectContaining({
      userId: userId,
      listName: 'MyList',
      normalizedListName: 'mylist',
      isPublic: true,
      animeIds: [],
    }));
  });

  it('includes optional fields when provided', async () => {
    const ctx = createCtx(false);
    await createCustomListHandler(ctx, {
      listName: 'My Favorites',
      description: 'My favorite anime list',
      isPublic: false,
      animeIds: ['anime1', 'anime2'] as any[],
    });

    expect(ctx.db.insert).toHaveBeenCalledWith('customLists', expect.objectContaining({
      listName: 'My Favorites',
      normalizedListName: 'my favorites',
      description: 'My favorite anime list',
      isPublic: false,
      animeIds: ['anime1', 'anime2'],
    }));
  });

  it('throws error when user is not authenticated', async () => {
    (getAuthUserId as any).mockResolvedValue(null);
    const ctx = createCtx(false);

    await expect(
      createCustomListHandler(ctx, { listName: 'MyList', isPublic: true })
    ).rejects.toThrow('User not authenticated.');
  });

  it('normalizes list names correctly', async () => {
    const ctx = createCtx(false);
    await createCustomListHandler(ctx, {
      listName: 'My AWESOME List!',
      isPublic: true,
    });

    expect(ctx.db.insert).toHaveBeenCalledWith('customLists', expect.objectContaining({
      listName: 'My AWESOME List!',
      normalizedListName: 'my awesome list!',
    }));
  });
});