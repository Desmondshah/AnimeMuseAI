// convex/authActions.ts
"use node"; // Mark some actions for Node.js environment for external API calls and crypto

import { v } from "convex/values";
import { mutation, internalAction, action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Auth, getAuthUserId } from "@convex-dev/auth/server";
import { Resend } from 'resend';
import bcrypt from 'bcryptjs'; // For hashing verification codes

const CODE_EXPIRATION_MS = 10 * 60 * 1000; // 10 minutes
const MAX_VERIFICATION_ATTEMPTS = 5;

// Initialize Resend with your API key from environment variables
// Set this in your Convex project settings: RESEND_API_KEY
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL_ADDRESS = process.env.RESEND_FROM_EMAIL; // e.g., "verification@yourdomain.com" - Set this too!

// --- Helper Functions ---
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
}

async function hashVerificationCode(code: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(code, salt);
}

async function compareVerificationCode(code: string, hashedCode: string): Promise<boolean> {
  return await bcrypt.compare(code, hashedCode);
}


// --- Public Mutations/Actions ---

export const requestEmailVerificationCode = mutation({
  args: {}, // No args, uses authenticated user's email
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated.");
    }

    const user = await ctx.db.get(userId);
    if (!user || !user.email) {
      throw new Error("User record or email not found.");
    }
    if (user.emailVerified) {
        throw new Error("Email is already verified.");
    }

    // Clean up any old codes for this user
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

    // Schedule an action to send the email
    await ctx.scheduler.runAfter(0, internal.authActions.sendVerificationEmailAction, {
      email: user.email,
      code: verificationCode, // Send plain code in email
      userName: user.name || "User",
    });

    return { success: true, message: "Verification code sent to your email." };
  },
});

export const submitVerificationCode = mutation({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated.");
    }

    const verificationEntry = await ctx.db.query("emailVerifications")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .order("desc") // Get the latest one if somehow multiple existed (shouldn't due to cleanup)
      .first();

    if (!verificationEntry) {
      throw new Error("No verification attempt found. Please request a new code.");
    }

    if (Date.now() > verificationEntry.expiresAt) {
      await ctx.db.delete(verificationEntry._id); // Clean up expired code
      throw new Error("Verification code has expired. Please request a new one.");
    }

    if ((verificationEntry.attempts || 0) >= MAX_VERIFICATION_ATTEMPTS) {
      await ctx.db.delete(verificationEntry._id); // Clean up after too many attempts
      throw new Error("Too many verification attempts. Please request a new code.");
    }

    const isValidCode = await compareVerificationCode(args.code, verificationEntry.hashedCode);

    if (!isValidCode) {
      await ctx.db.patch(verificationEntry._id, { attempts: (verificationEntry.attempts || 0) + 1 });
      throw new Error("Invalid verification code.");
    }

    // Code is valid, update user profile
    const userProfile = await ctx.db.query("userProfiles")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .unique();

    if (userProfile) {
      await ctx.db.patch(userProfile._id, { emailVerified: true });
    } else {
      // This case should ideally not happen if profile is created on sign-up/first load
      console.warn(`User profile not found for userId ${userId} during email verification.`);
      // Potentially create it here or throw an error.
      // For now, we assume profile exists or will be created by other app logic.
      // If user is from @convex-dev/auth 'users' table, their emailVerified field is on the user record itself.
    }
    
    // Also update the main user record from @convex-dev/auth if it has emailVerified
    // The `users` table managed by `authTables` has an `emailVerified` field (usually a timestamp or boolean).
    // Let's assume it's a boolean for simplicity with the provider.
    // Note: Directly patching `users` table fields might require specific setup or could be handled
    // by the auth provider if it had a "verifyEmail" method.
    // For now, we focus on our userProfiles table.
    // A more robust solution might require extending or interacting with the auth provider's user update mechanisms.
    // Let's try patching the main user table.
    try {
        const userAuthRecord = await ctx.db.get(userId);
        if(userAuthRecord && userAuthRecord.emailVerified !== true) { // Check if field exists and not already true
            await ctx.db.patch(userId, { emailVerified: true as any }); // Cast as any if schema is strict
        }
    } catch(e) {
        console.error("Could not patch main user record for emailVerified status:", e);
    }


    await ctx.db.delete(verificationEntry._id); // Clean up used code

    return { success: true, message: "Email verified successfully!" };
  },
});


// --- Internal Action for Sending Email ---
export const sendVerificationEmailAction = internalAction({
  args: {
    email: v.string(),
    code: v.string(),
    userName: v.string(),
  },
  handler: async (_ctx, args) => {
    // This action runs in a Node.js environment
    if (!resend || !FROM_EMAIL_ADDRESS) {
      console.error("Resend API key or From Email Address is not configured. Email not sent.");
      // In a real app, you might want to throw an error or handle this more gracefully.
      // Depending on your requirements, you might allow user creation even if email fails,
      // and they can re-request verification later.
      return { success: false, error: "Email service not configured." };
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
            <p>Your email verification code is: <strong>${args.code}</strong></p>
            <p>This code will expire in 10 minutes.</p>
            <p>If you did not request this, please ignore this email.</p>
            <br/>
            <p>Thanks,</p>
            <p>The AniMuse Team</p>
          </div>
        `,
      });
      console.log(`Verification email sent to ${args.email}`);
      return { success: true };
    } catch (error) {
      console.error("Failed to send verification email:", error);
      return { success: false, error: "Failed to send email." };
    }
  },
});