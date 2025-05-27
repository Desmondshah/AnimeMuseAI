// convex/authActions.ts
import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { internal } from "./_generated/api";
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

function isValidE164PhoneNumber(phoneNumber: string): boolean {
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phoneNumber);
}

export const requestSmsVerificationCode = mutation({
  args: {
    phoneNumber: v.string(),
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
    if (!isValidE164PhoneNumber(args.phoneNumber)) {
      throw new Error("Invalid phone number format. Please use E.164 (e.g., +12223334444).");
    }
    const userProfile = await ctx.db.query("userProfiles")
      .withIndex("by_userId", q => q.eq("userId", userId as Id<"users">))
      .unique();
    if (userProfile?.phoneNumberVerified && userProfile?.phoneNumber === args.phoneNumber) {
      throw new Error("This phone number is already verified for your account.");
    }
    const recentRequests = await ctx.db.query("phoneVerifications")
      .withIndex("by_userId", q => q.eq("userId", userId as Id<"users">))
      .filter(q => q.gt(q.field("requestedAt") ?? 0, Date.now() - RATE_LIMIT_WINDOW_MS))
      .collect();
    if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
      throw new Error("Too many verification requests. Please wait a moment before trying again.");
    }
    const existingCodes = await ctx.db.query("phoneVerifications")
      .withIndex("by_userId", q => q.eq("userId", userId as Id<"users">))
      .collect();
    for (const oldCode of existingCodes) {
      await ctx.db.delete(oldCode._id);
    }
    const verificationCode = generateVerificationCode();
    const hashedCode = await hashVerificationCode(verificationCode);
    const expiresAt = Date.now() + CODE_EXPIRATION_MS;
    await ctx.db.insert("phoneVerifications", {
      phoneNumber: args.phoneNumber,
      userId: userId as Id<"users">,
      hashedCode: hashedCode,
      expiresAt: expiresAt,
      attempts: 0,
      requestedAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.twilioSender.sendSmsVerification, {
      toPhoneNumber: args.phoneNumber,
      code: verificationCode,
      userName: user.name || "User",
    });
    return {
      success: true,
      message: "Verification code sent to your phone number.",
      expiresIn: Math.floor(CODE_EXPIRATION_MS / 1000 / 60),
    };
  },
});

export const submitSmsVerificationCode = mutation({
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
    const verificationEntry = await ctx.db.query("phoneVerifications")
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
    const userProfile = await ctx.db.query("userProfiles")
      .withIndex("by_userId", q => q.eq("userId", userId as Id<"users">))
      .unique();
    const profileUpdateData = {
      phoneNumber: verificationEntry.phoneNumber,
      phoneNumberVerified: true,
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
        dislikedGenres: [],
        dislikedTags: [],
        isAdmin: false,
      });
    }
    await ctx.db.delete(verificationEntry._id);
    return {
      success: true,
      message: "Phone number verified successfully! Welcome to AniMuse!",
    };
  },
});

export const resendSmsVerificationCode = mutation({
  args: {
    phoneNumber: v.string(),
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
    if (!isValidE164PhoneNumber(args.phoneNumber)) {
      throw new Error("Invalid phone number format.");
    }
    const recentRequests = await ctx.db.query("phoneVerifications")
      .withIndex("by_userId", q => q.eq("userId", userId as Id<"users">))
      .filter(q => q.gt(q.field("requestedAt") ?? 0, Date.now() - RATE_LIMIT_WINDOW_MS))
      .collect();
    if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
      throw new Error("Too many verification requests. Please wait a moment.");
    }
    const existingCodes = await ctx.db.query("phoneVerifications")
      .withIndex("by_userId", q => q.eq("userId", userId as Id<"users">))
      .collect();
    for (const oldCode of existingCodes) {
      await ctx.db.delete(oldCode._id);
    }
    const verificationCode = generateVerificationCode();
    const hashedCode = await hashVerificationCode(verificationCode);
    const expiresAt = Date.now() + CODE_EXPIRATION_MS;
    await ctx.db.insert("phoneVerifications", {
      phoneNumber: args.phoneNumber,
      userId: userId as Id<"users">,
      hashedCode: hashedCode,
      expiresAt: expiresAt,
      attempts: 0,
      requestedAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.twilioSender.sendSmsVerification, {
      toPhoneNumber: args.phoneNumber,
      code: verificationCode,
      userName: user.name || "User",
    });
    return {
      success: true,
      message: "New verification code sent to your phone.",
      expiresIn: Math.floor(CODE_EXPIRATION_MS / 1000 / 60),
    };
  },
});