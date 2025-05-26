// convex/authActions.ts - Fixed references
"use node";

import { v } from "convex/values";
import { mutation, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Resend } from 'resend';
import bcrypt from 'bcryptjs';

const CODE_EXPIRATION_MS = 10 * 60 * 1000;
const MAX_VERIFICATION_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 3;

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL_ADDRESS = process.env.RESEND_FROM_EMAIL || "noreply@animuse.app";

function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function hashVerificationCode(code: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return await bcrypt.hash(code, salt);
}

async function compareVerificationCode(code: string, hashedCode: string): Promise<boolean> {
  return await bcrypt.compare(code, hashedCode);
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export const requestEmailVerificationCode = mutation({
  args: {},
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    expiresIn: v.optional(v.number()),
  }),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated.");
    }

    const user = await ctx.db.get(userId);
    if (!user || !user.email) {
      throw new Error("User record or email not found.");
    }

    if (!isValidEmail(user.email)) {
      throw new Error("Invalid email address.");
    }

    const userProfile = await ctx.db.query("userProfiles")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .unique();

    const isEmailVerified = userProfile?.emailVerified || !!user.emailVerificationTime;
    
    if (isEmailVerified) {
      throw new Error("Email is already verified.");
    }

    const recentRequests = await ctx.db.query("emailVerifications")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .filter(q => q.gt(q.field("_creationTime"), Date.now() - RATE_LIMIT_WINDOW_MS))
      .collect();

    if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
      throw new Error("Too many verification requests. Please wait before requesting another code.");
    }

    const existingCodes = await ctx.db.query("emailVerifications")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .collect();
    
    for (const oldCode of existingCodes) {
      await ctx.db.delete(oldCode._id);
    }

    const verificationCode = generateVerificationCode();
    const hashedCode = await hashVerificationCode(verificationCode);
    const expiresAt = Date.now() + CODE_EXPIRATION_MS;

    await ctx.db.insert("emailVerifications", {
      email: user.email,
      userId: userId,
      hashedCode: hashedCode,
      expiresAt: expiresAt,
      attempts: 0,
    });

    // Schedule email sending as internal action
    await ctx.scheduler.runAfter(0, internal.authActions.sendVerificationEmailAction, {
      email: user.email,
      code: verificationCode,
      userName: user.name || "User",
    });

    return { 
      success: true, 
      message: "Verification code sent to your email.",
      expiresIn: Math.floor(CODE_EXPIRATION_MS / 1000 / 60) 
    };
  },
});

export const submitVerificationCode = mutation({
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
      .withIndex("by_userId", q => q.eq("userId", userId))
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
      throw new Error("Too many verification attempts. Please request a new code.");
    }

    const isValidCode = await compareVerificationCode(args.code, verificationEntry.hashedCode);

    if (!isValidCode) {
      await ctx.db.patch(verificationEntry._id, { 
        attempts: (verificationEntry.attempts || 0) + 1 
      });
      
      const remainingAttempts = MAX_VERIFICATION_ATTEMPTS - (verificationEntry.attempts || 0) - 1;
      throw new Error(`Invalid verification code. ${remainingAttempts} attempts remaining.`);
    }

    const userProfile = await ctx.db.query("userProfiles")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .unique();

    if (userProfile) {
      await ctx.db.patch(userProfile._id, { 
        emailVerified: true,
        verifiedAt: Date.now() 
      });
    } else {
      await ctx.db.insert("userProfiles", {
        userId: userId,
        emailVerified: true,
        verifiedAt: Date.now(),
        onboardingCompleted: false,
        name: undefined,
        moods: [],
        genres: [],
        favoriteAnimes: [],
        experienceLevel: undefined,
        dislikedGenres: [],
        dislikedTags: [],
      });
    }

    try {
      const userAuthRecord = await ctx.db.get(userId);
      if (userAuthRecord && !userAuthRecord.emailVerificationTime) {
        await ctx.db.patch(userId, { 
          emailVerificationTime: Date.now()
        } as any);
      }
    } catch (e) {
      console.warn("Could not patch main user record:", e);
    }

    await ctx.db.delete(verificationEntry._id);

    return { 
      success: true, 
      message: "Email verified successfully! Welcome to AniMuse!" 
    };
  },
});

export const resendVerificationCode = mutation({
  args: {},
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    expiresIn: v.optional(v.number()),
  }),
  handler: async (ctx) => {
    // Duplicate the logic from requestEmailVerificationCode to avoid circular references
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated.");
    }

    const user = await ctx.db.get(userId);
    if (!user || !user.email) {
      throw new Error("User record or email not found.");
    }

    if (!isValidEmail(user.email)) {
      throw new Error("Invalid email address.");
    }

    const userProfile = await ctx.db.query("userProfiles")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .unique();

    const isEmailVerified = userProfile?.emailVerified || !!user.emailVerificationTime;
    
    if (isEmailVerified) {
      throw new Error("Email is already verified.");
    }

    const recentRequests = await ctx.db.query("emailVerifications")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .filter(q => q.gt(q.field("_creationTime"), Date.now() - RATE_LIMIT_WINDOW_MS))
      .collect();

    if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
      throw new Error("Too many verification requests. Please wait before requesting another code.");
    }

    const existingCodes = await ctx.db.query("emailVerifications")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .collect();
    
    for (const oldCode of existingCodes) {
      await ctx.db.delete(oldCode._id);
    }

    const verificationCode = generateVerificationCode();
    const hashedCode = await hashVerificationCode(verificationCode);
    const expiresAt = Date.now() + CODE_EXPIRATION_MS;

    await ctx.db.insert("emailVerifications", {
      email: user.email,
      userId: userId,
      hashedCode: hashedCode,
      expiresAt: expiresAt,
      attempts: 0,
    });

    await ctx.scheduler.runAfter(0, internal.authActions.sendVerificationEmailAction, {
      email: user.email,
      code: verificationCode,
      userName: user.name || "User",
    });

    return { 
      success: true, 
      message: "New verification code sent to your email.",
      expiresIn: Math.floor(CODE_EXPIRATION_MS / 1000 / 60) 
    };
  },
});

export const sendVerificationEmailAction = internalAction({
  args: {
    email: v.string(),
    code: v.string(),
    userName: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
    details: v.optional(v.string()),
  }),
  handler: async (_ctx, args) => {
    if (!resend) {
      return { success: false, error: "Email service not configured." };
    }

    if (!isValidEmail(args.email)) {
      return { success: false, error: "Invalid email address." };
    }

    try {
      await resend.emails.send({
        from: FROM_EMAIL_ADDRESS,
        to: args.email,
        subject: 'AniMuse - Verify Your Email Address',
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h2>Hello ${args.userName},</h2>
            <p>Thanks for signing up for AniMuse!</p>
            <p>Your email verification code is: <strong style="font-size: 24px; color: #3B82F6;">${args.code}</strong></p>
            <p>This code will expire in 10 minutes.</p>
            <p>If you did not request this, please ignore this email.</p>
            <br/>
            <p>Thanks,</p>
            <p>The AniMuse Team</p>
          </div>
        `,
        text: `Hello ${args.userName}!\n\nYour email verification code is: ${args.code}\n\nThis code expires in 10 minutes.\n\nThanks,\nThe AniMuse Team`,
      });

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: "Failed to send email.",
        details: error instanceof Error ? error.message : "Unknown error"
      };
    }
  },
});