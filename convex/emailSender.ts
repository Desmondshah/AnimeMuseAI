// convex/emailSender.ts
"use node"; // This action needs Node.js environment for Resend and process.env

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL_ADDRESS = process.env.RESEND_FROM_EMAIL || "opeoluwaseyi76@gmail.com"; // Ensure this matches your domain on Resend

// Helper function for email validation (can be moved to a shared util if used elsewhere)
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export const sendVerificationEmail = internalAction({
  args: {
    email: v.string(),
    code: v.string(),
    userName: v.string(),
  },
  handler: async (_ctx, args): Promise<{ success: boolean; error?: string; details?: string }> => {
    if (!resend) {
      console.error("Resend client not initialized. RESEND_API_KEY might be missing.");
      return { success: false, error: "Email service (Resend) not configured on the server." };
    }

    if (!isValidEmail(args.email)) {
      console.error(`Invalid email format attempt: ${args.email}`);
      return { success: false, error: "Invalid email address provided to email sender." };
    }

    try {
      const data = await resend.emails.send({
        from: FROM_EMAIL_ADDRESS,
        to: args.email,
        subject: 'AniMuse - Verify Your Email Address',
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
            <h2 style="color: #3B82F6; text-align: center;">Hello ${args.userName || 'User'},</h2>
            <p style="font-size: 16px;">Thanks for signing up for AniMuse! We're excited to have you.</p>
            <p style="font-size: 16px;">Please use the following verification code to complete your registration:</p>
            <p style="text-align: center; margin: 25px 0;">
              <strong style="font-size: 28px; color: #3B82F6; background-color: #f0f0f0; padding: 10px 20px; border-radius: 5px; letter-spacing: 2px;">
                ${args.code}
              </strong>
            </p>
            <p style="font-size: 16px;">This code will expire in 10 minutes.</p>
            <p style="font-size: 14px; color: #777;">If you did not request this email, please ignore it. Your account is secure.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 12px; color: #999; text-align: center;">
              Best regards,<br/>The AniMuse Team
            </p>
          </div>
        `,
        text: `Hello ${args.userName || 'User'}!\n\nThanks for signing up for AniMuse!\nYour email verification code is: ${args.code}\nThis code will expire in 10 minutes.\n\nIf you did not request this, please ignore this email.\n\nBest regards,\nThe AniMuse Team`,
      });

      // console.log("Email sent successfully via Resend:", data); // Optional: log success
      return { success: true };
    } catch (error) {
      console.error("Failed to send verification email via Resend:", error);
      // Consider logging more specific error details from Resend if available
      const resendError = error as any;
      return { 
        success: false, 
        error: "Failed to send verification email.",
        details: resendError.message || (resendError.toString ? resendError.toString() : "Unknown Resend error")
      };
    }
  },
});