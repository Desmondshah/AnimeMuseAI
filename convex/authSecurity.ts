// convex/authSecurity.ts - Enhanced security utilities
import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

// Rate limiting for auth attempts
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;

// Password strength validation
export const validatePasswordStrength = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }
  
  if (!/\d/.test(password)) {
    errors.push("Password must contain at least one number");
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push("Password must contain at least one special character");
  }
  
  // Check for common patterns
  const commonPasswords = [
    "password", "123456", "qwerty", "abc123", "letmein", "welcome",
    "monkey", "dragon", "password123", "admin", "user"
  ];
  
  if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
    errors.push("Password contains common patterns and is not secure");
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Email validation
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Track failed login attempts
export const recordFailedAttempt = internalMutation({
  args: {
    identifier: v.string(), // email or IP
    attemptType: v.union(v.literal("login"), v.literal("signup")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Clean up old attempts
    const oldAttempts = await ctx.db
      .query("authAttempts")
      .withIndex("by_identifier_timestamp", (q) => 
        q.eq("identifier", args.identifier)
      )
      .filter((q) => q.lt(q.field("timestamp"), now - RATE_LIMIT_WINDOW))
      .collect();
    
    for (const attempt of oldAttempts) {
      await ctx.db.delete(attempt._id);
    }
    
    // Record new attempt
    await ctx.db.insert("authAttempts", {
      identifier: args.identifier,
      attemptType: args.attemptType,
      timestamp: now,
    });
  },
});

// Check rate limiting
export const checkRateLimit = query({
  args: {
    identifier: v.string(),
    attemptType: v.union(v.literal("login"), v.literal("signup")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const recentAttempts = await ctx.db
      .query("authAttempts")
      .withIndex("by_identifier_timestamp", (q) => 
        q.eq("identifier", args.identifier)
      )
      .filter((q) => q.gte(q.field("timestamp"), now - RATE_LIMIT_WINDOW))
      .collect();
    
    const rateLimited = recentAttempts.length >= MAX_ATTEMPTS;
    const timeUntilReset = rateLimited && recentAttempts.length > 0
      ? Math.max(0, (recentAttempts[0]?.timestamp || 0) + RATE_LIMIT_WINDOW - now)
      : 0;
    
    return {
      rateLimited,
      attemptCount: recentAttempts.length,
      timeUntilReset,
      maxAttempts: MAX_ATTEMPTS,
    };
  },
});

// Security audit log
export const logSecurityEvent = internalMutation({
  args: {
    userId: v.optional(v.id("users")),
    event: v.string(),
    details: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("securityLogs", {
      userId: args.userId,
      event: args.event,
      details: args.details,
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
      timestamp: Date.now(),
    });
  },
});

// Account lockout after suspicious activity
export const checkAccountStatus = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    // Check if account is locked
    const accountLock = await ctx.db
      .query("accountLocks")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
    
    if (accountLock && accountLock.lockedUntil > Date.now()) {
      return {
        isLocked: true,
        lockedUntil: accountLock.lockedUntil,
        reason: accountLock.reason,
      };
    }
    
    return {
      isLocked: false,
    };
  },
});

// Two-factor authentication setup
export const setupTwoFactor = mutation({
  args: {
    secret: v.string(),
    backupCodes: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    
    // Store 2FA secret and backup codes
    await ctx.db.insert("twoFactorAuth", {
      userId: userId as Id<"users">,
      secret: args.secret,
      backupCodes: args.backupCodes,
      isEnabled: true,
      createdAt: Date.now(),
    });
    
    return { success: true };
  },
});

// Session management
export const getActiveSessions = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }
    
    return await ctx.db
      .query("userSessions")
      .withIndex("by_userId", (q) => q.eq("userId", userId as Id<"users">))
      .filter((q) => q.gt(q.field("expiresAt"), Date.now()))
      .collect();
  },
});

export const revokeSession = mutation({
  args: {
    sessionId: v.id("userSessions"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) {
      throw new Error("Session not found or not owned by user");
    }
    
    await ctx.db.delete(args.sessionId);
  },
});
