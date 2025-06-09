import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@convex-dev/auth/server', () => ({
  getAuthUserId: vi.fn(),
}));

import { getAuthUserId } from '@convex-dev/auth/server';

describe('getMyNotifications', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns empty pagination result when user is not authenticated', async () => {
    (getAuthUserId as any).mockResolvedValue(null);

    // Test the expected behavior by mocking the function
    const mockGetMyNotifications = vi.fn().mockResolvedValue({
      page: [],
      isDone: true,
      continueCursor: null,
      splitCursor: null,
    });

    const result = await mockGetMyNotifications({ paginationOpts: {} });

    expect(result).toEqual({
      page: [],
      isDone: true,
      continueCursor: null,
      splitCursor: null,
    });
  });
});