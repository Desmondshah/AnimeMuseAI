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

// Helper to generate a 6-digit verification code
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Helper to generate a random salt for hashing (if not using bcryptjs directly here)
function generateSalt(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Simple hash function using Web Crypto API (replace with bcrypt if preferred and set up for node in Convex)
async function hashVerificationCode(dataToHash: string): Promise<string> {
  const salt = generateSalt(); // Generate a new salt for each hash
  const encoder = new TextEncoder();
  const data = encoder.encode(dataToHash + salt); // Combine data with salt

  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return `${salt}:${hashHex}`; // Store salt along with the hash
}

// Compare verification code with hashed version
async function compareVerificationCode(code: string, hashedCodeWithSalt: string): Promise<boolean> {
  try {
    const [salt, hash] = hashedCodeWithSalt.split(':');
    if (!salt || !hash) return false; // Invalid stored hash format

    const encoder = new TextEncoder();
    const data = encoder.encode(code + salt); // Use the stored salt

    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return hashHex === hash;
  } catch (error) {
    console.error("Error comparing verification code:", error);
    return false;
  }
}


// Basic E.164 phone number validation (you might want a more robust library for this in production)
function isValidE164PhoneNumber(phoneNumber: string): boolean {
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phoneNumber);
}

export const requestSmsVerificationCode = mutation({
  args: {
    phoneNumber: v.string(), // Expecting E.164 format from the client
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    expiresIn: v.optional(v.number()), // Optional: tell client how long code is valid (in minutes)
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated.");
    }

    const user = await ctx.db.get(userId); // From auth.users table
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
    // If verifying a *new* or *different* phone number, proceed.

    // Rate limiting for requests
    const recentRequests = await ctx.db.query("phoneVerifications")
      .withIndex("by_userId", q => q.eq("userId", userId as Id<"users">))
      .filter(q => q.gt(q.field("requestedAt") ?? 0, Date.now() - RATE_LIMIT_WINDOW_MS))
      .collect();

    if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
      throw new Error("Too many verification requests. Please wait a moment before trying again.");
    }

    // Clean up any existing pending codes for this user to prevent multiple active codes
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

    // Call the internal action to send SMS via Twilio
    await ctx.scheduler.runAfter(0, internal.twilioSender.sendSmsVerification, {
      toPhoneNumber: args.phoneNumber,
      code: verificationCode,
      userName: user.name || "User", // Use name from auth.users if available
    });

    return {
      success: true,
      message: "Verification code sent to your phone number.",
      expiresIn: Math.floor(CODE_EXPIRATION_MS / 1000 / 60), // Expires in minutes
    };
  },
});

export const submitSmsVerificationCode = mutation({
  args: {
    code: v.string(),
    // phoneNumber is implicitly taken from the latest phoneVerifications entry for the user
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

    // Get the latest verification attempt for this user
    const verificationEntry = await ctx.db.query("phoneVerifications")
      .withIndex("by_userId", q => q.eq("userId", userId as Id<"users">))
      .order("desc") // Get the most recent one by _creationTime (implicit)
      .first();

    if (!verificationEntry) {
      throw new Error("No verification attempt found. Please request a new code.");
    }

    if (Date.now() > verificationEntry.expiresAt) {
      await ctx.db.delete(verificationEntry._id); // Clean up expired entry
      throw new Error("Verification code has expired. Please request a new one.");
    }

    if ((verificationEntry.attempts || 0) >= MAX_VERIFICATION_ATTEMPTS) {
      await ctx.db.delete(verificationEntry._id); // Clean up entry after max attempts
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

    // Code is valid, update userProfile
    const userProfile = await ctx.db.query("userProfiles")
      .withIndex("by_userId", q => q.eq("userId", userId as Id<"users">))
      .unique();

    const profileUpdateData = {
      phoneNumber: verificationEntry.phoneNumber, // Set the verified phone number
      phoneNumberVerified: true,
      verifiedAt: Date.now(),
    };

    if (userProfile) {
      await ctx.db.patch(userProfile._id, profileUpdateData);
    } else {
      // Create a basic profile if one doesn't exist
      await ctx.db.insert("userProfiles", {
        userId: userId as Id<"users">,
        ...profileUpdateData,
        onboardingCompleted: false, // Assume onboarding is next
        // Initialize other fields as per your schema defaults
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

    // Clean up the successful verification entry
    await ctx.db.delete(verificationEntry._id);

    return {
      success: true,
      message: "Phone number verified successfully! Welcome to AniMuse!",
    };
  },
});


// Optional: Resend SMS Verification Code (similar logic to request)
export const resendSmsVerificationCode = mutation({
  args: {
    phoneNumber: v.string(), // User confirms the phone number again or it's retrieved
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
     const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User record not found.");
    }

    if (!isValidE164PhoneNumber(args.phoneNumber)) {
      throw new Error("Invalid phone number format.");
    }

    // Rate limiting
    const recentRequests = await ctx.db.query("phoneVerifications")
      .withIndex("by_userId", q => q.eq("userId", userId as Id<"users">))
      .filter(q => q.gt(q.field("requestedAt") ?? 0, Date.now() - RATE_LIMIT_WINDOW_MS))
      .collect();

    if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
      throw new Error("Too many verification requests. Please wait a moment.");
    }

    // Clean up old codes for this user
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