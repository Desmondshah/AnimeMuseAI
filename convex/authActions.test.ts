import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ensurePhoneNumberNotUsed } from '../convex/authActions';

vi.mock('@convex-dev/auth/server', () => ({
  getAuthUserId: vi.fn(),
}));

import { getAuthUserId } from '@convex-dev/auth/server';

describe('phone number conflict checks', () => {
  const userId = 'userA';
  const otherUserId = 'userB';
  const phone = '+12345678900';

  beforeEach(() => {
    vi.resetAllMocks();
    (getAuthUserId as any).mockResolvedValue(userId);
  });

  function createCtx(conflict: boolean) {
    return {
      db: {
        get: vi.fn().mockResolvedValue({ _id: userId }),
        query: vi.fn((table: string) => {
          if (table === 'userProfiles') {
            return {
              withIndex: (index: string) => {
                if (index === 'by_userId') {
                  return { unique: () => Promise.resolve(null) };
                }
                if (index === 'by_phoneNumber') {
                  return {
                    first: () => Promise.resolve(conflict ? { userId: otherUserId } : null),
                  };
                }
                return { unique: () => Promise.resolve(null) };
              },
            };
          }
          return { withIndex: () => ({ collect: () => Promise.resolve([]) }) };
        }),
        insert: vi.fn(),
        patch: vi.fn(),
        delete: vi.fn(),
      },
      scheduler: { runAfter: vi.fn() },
    } as any;
  }

  it('ensurePhoneNumberNotUsed throws when phone belongs to another user', async () => {
    const ctx = createCtx(true);
    await expect(
      ensurePhoneNumberNotUsed(ctx.db, userId as any, phone)
    ).rejects.toThrow('This phone number is already associated with another account.');
  });
});