// convex/emailVerification.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

const CODE_EXPIRATION_MS = 10 * 60 * 1000; // 10 minutes
const MAX_VERIFICATION_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 3; // Max 3 requests per minute

function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateSalt(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

async function hashVerificationCode(dataToHash: string): Promise<string> {
  const salt = generateSalt();
  const encoder = new TextEncoder();
  const data = encoder.encode(dataToHash + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return `${salt}:${hashHex}`;
}

async function compareVerificationCode(code: string, hashedCodeWithSalt: string): Promise<boolean> {
  try {
    const [salt, hash] = hashedCodeWithSalt.split(':');
    if (!salt || !hash) return false;
    const encoder = new TextEncoder();
    const data = encoder.encode(code + salt);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex === hash;
  } catch (error) {
    console.error("Error comparing verification code:", error);
    return false;
  }
}

export const requestEmailVerificationCode = mutation({
  args: {
    email: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    expiresIn: v.optional(v.number()),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated.");
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(args.email)) {
      throw new Error("Invalid email format.");
    }

    // Rate limiting check
    const recentRequests = await ctx.db.query("emailVerifications")
      .withIndex("by_userId", q => q.eq("userId", userId as Id<"users">))
      .filter(q => q.gt(q.field("requestedAt") ?? 0, Date.now() - RATE_LIMIT_WINDOW_MS))
      .collect();
    
    if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
      throw new Error("Too many verification requests. Please wait a moment before trying again.");
    }

    // Clean up existing codes
    const existingCodes = await ctx.db.query("emailVerifications")
      .withIndex("by_userId", q => q.eq("userId", userId as Id<"users">))
      .collect();
    for (const oldCode of existingCodes) {
      await ctx.db.delete(oldCode._id);
    }

    // Generate verification code
    const verificationCode = generateVerificationCode();
    const hashedCode = await hashVerificationCode(verificationCode);
    const expiresAt = Date.now() + CODE_EXPIRATION_MS;

    // Store verification code
    await ctx.db.insert("emailVerifications", {
      email: args.email,
      userId: userId as Id<"users">,
      hashedCode: hashedCode,
      expiresAt: expiresAt,
      attempts: 0,
      requestedAt: Date.now(),
    });

    // In a real implementation, you would send the email here
    // For now, we'll log the code for development
    console.log(`Email verification code for ${args.email}: ${verificationCode}`);

    return {
      success: true,
      message: "Verification code sent to your email address.",
      expiresIn: Math.floor(CODE_EXPIRATION_MS / 1000 / 60),
    };
  },
});

export const submitEmailVerificationCode = mutation({
  args: {
    code: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated.");
    }

    if (!/^\d{6}$/.test(args.code)) {
      throw new Error("Invalid verification code format. Please enter a 6-digit code.");
    }

    const verificationEntry = await ctx.db.query("emailVerifications")
      .withIndex("by_userId", q => q.eq("userId", userId as Id<"users">))
      .order("desc")
      .first();

    if (!verificationEntry) {
      throw new Error("No verification attempt found. Please request a new code.");
    }

    if (Date.now() > verificationEntry.expiresAt) {
      await ctx.db.delete(verificationEntry._id);
      throw new Error("Verification code has expired. Please request a new one.");
    }

    if ((verificationEntry.attempts || 0) >= MAX_VERIFICATION_ATTEMPTS) {
      await ctx.db.delete(verificationEntry._id);
      throw new Error("Too many verification attempts for this code. Please request a new one.");
    }

    const isValidCode = await compareVerificationCode(args.code, verificationEntry.hashedCode);
    if (!isValidCode) {
      await ctx.db.patch(verificationEntry._id, {
        attempts: (verificationEntry.attempts || 0) + 1,
      });
      const remainingAttempts = MAX_VERIFICATION_ATTEMPTS - (verificationEntry.attempts || 0) - 1;
      throw new Error(`Invalid verification code. ${remainingAttempts} attempts remaining.`);
    }

    // Update user profile
    const userProfile = await ctx.db.query("userProfiles")
      .withIndex("by_userId", q => q.eq("userId", userId as Id<"users">))
      .unique();

    const profileUpdateData = {
      email: verificationEntry.email,
      emailVerified: true,
      verifiedAt: Date.now(),
    };

    if (userProfile) {
      await ctx.db.patch(userProfile._id, profileUpdateData);
    } else {
      await ctx.db.insert("userProfiles", {
        userId: userId as Id<"users">,
        ...profileUpdateData,
        onboardingCompleted: false,
        name: undefined,
        moods: [],
        genres: [],
        favoriteAnimes: [],
        experienceLevel: undefined,
        avatarUrl: undefined,
        phoneNumber: undefined,
        phoneNumberVerified: false,
        dislikedGenres: [],
        dislikedTags: [],
        isAdmin: false,
      });
    }

    await ctx.db.delete(verificationEntry._id);
    return {
      success: true,
      message: "Email verified successfully! Welcome to AniMuse!",
    };
  },
});

export const resendEmailVerificationCode = mutation({
  args: {
    email: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    expiresIn: v.optional(v.number()),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated.");
    }

    const user = await ctx.db.get(userId as Id<"users">);
    if (!user) {
      throw new Error("User record not found.");
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(args.email)) {
      throw new Error("Invalid email format.");
    }

    // Rate limiting check
    const recentRequests = await ctx.db.query("emailVerifications")
      .withIndex("by_userId", q => q.eq("userId", userId as Id<"users">))
      .filter(q => q.gt(q.field("requestedAt") ?? 0, Date.now() - RATE_LIMIT_WINDOW_MS))
      .collect();
    
    if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
      throw new Error("Too many verification requests. Please wait a moment.");
    }

    // Clean up existing codes
    const existingCodes = await ctx.db.query("emailVerifications")
      .withIndex("by_userId", q => q.eq("userId", userId as Id<"users">))
      .collect();
    for (const oldCode of existingCodes) {
      await ctx.db.delete(oldCode._id);
    }

    // Generate new verification code
    const verificationCode = generateVerificationCode();
    const hashedCode = await hashVerificationCode(verificationCode);
    const expiresAt = Date.now() + CODE_EXPIRATION_MS;

    await ctx.db.insert("emailVerifications", {
      email: args.email,
      userId: userId as Id<"users">,
      hashedCode: hashedCode,
      expiresAt: expiresAt,
      attempts: 0,
      requestedAt: Date.now(),
    });

    // In a real implementation, you would send the email here
    console.log(`Resent email verification code for ${args.email}: ${verificationCode}`);

    return {
      success: true,
      message: "New verification code sent to your email.",
      expiresIn: Math.floor(CODE_EXPIRATION_MS / 1000 / 60),
    };
  },
});
