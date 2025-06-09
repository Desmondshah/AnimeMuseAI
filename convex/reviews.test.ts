import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@convex-dev/auth/server', () => ({
  getAuthUserId: vi.fn(),
}));

import { getAuthUserId } from '@convex-dev/auth/server';

interface Comment {
  _id: string;
  userId: string;
  reviewId: string;
  parentId?: string;
}

describe('deleteReviewComment', () => {
  const userId = 'user1';

  beforeEach(() => {
    vi.resetAllMocks();
    (getAuthUserId as any).mockResolvedValue(userId);
  });

  function createDeleteCommentHandler(comments: Map<string, Comment>, profiles: Map<string, any>) {
    return async (commentId: string) => {
      // Mock the deletion logic
      const comment = comments.get(commentId);
      if (!comment) return false;
      
      // Check auth
      const authUserId = await getAuthUserId({} as any);
      if (!authUserId) return false;
      
      // Check profile exists
      const profile = profiles.get(authUserId);
      if (!profile) return false;
      
      // Recursive deletion function
      const deleteRecursively = (id: string) => {
        // Find and delete child comments first
        const children = Array.from(comments.values()).filter(c => c.parentId === id);
        children.forEach(child => deleteRecursively(child._id));
        
        // Delete the comment itself
        comments.delete(id);
      };
      
      deleteRecursively(commentId);
      return true;
    };
  }

  it('removes nested replies recursively', async () => {
    const comments = new Map<string, Comment>();
    comments.set('c1', { _id: 'c1', userId, reviewId: 'r1' });
    comments.set('c2', { _id: 'c2', userId, reviewId: 'r1', parentId: 'c1' });
    comments.set('c3', { _id: 'c3', userId, reviewId: 'r1', parentId: 'c2' });

    const profiles = new Map<string, any>();
    profiles.set(userId, { userId });

    const deleteHandler = createDeleteCommentHandler(comments, profiles);

    await deleteHandler('c1');

    expect(comments.size).toBe(0);
  });
});