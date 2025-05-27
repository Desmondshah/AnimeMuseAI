// convex/emailSender.ts
"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import formData from "form-data";
import Mailgun from "mailgun.js"; // Standard import for the Mailgun class

// --- Mailgun Configuration ---
const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY;
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN;
const MAILGUN_FROM_EMAIL_USER = process.env.MAILGUN_FROM_EMAIL_USER || "noreply";
const FROM_EMAIL_ADDRESS_NAME = "AniMuse Team";

// Initialize mg with a more general type or let it be inferred upon assignment
let mg: ReturnType<InstanceType<typeof Mailgun>['client']> | null = null;

if (MAILGUN_API_KEY && MAILGUN_DOMAIN) {
  const mailgunInstance = new Mailgun(formData); // Create an instance of the Mailgun service class
  mg = mailgunInstance.client({ // Assign the client object to mg
    username: "api",
    key: MAILGUN_API_KEY,
  });
} else {
  console.warn(
    "Mailgun API Key or Domain not found in environment variables. Email sending will be disabled."
  );
}

// Helper function for email validation
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
  handler: async (
    _ctx,
    args
  ): Promise<{ success: boolean; error?: string; details?: string }> => {
    if (!mg || !MAILGUN_DOMAIN) {
      console.error(
        "Mailgun client not initialized or domain not set. MAILGUN_API_KEY or MAILGUN_DOMAIN might be missing."
      );
      return {
        success: false,
        error: "Email service (Mailgun) not configured on the server.",
      };
    }

    if (!isValidEmail(args.email)) {
      console.error(`Invalid email format attempt: ${args.email}`);
      return {
        success: false,
        error: "Invalid email address provided to email sender.",
      };
    }

    const fromEmail = `${FROM_EMAIL_ADDRESS_NAME} <${MAILGUN_FROM_EMAIL_USER}@${MAILGUN_DOMAIN}>`;

    const emailData = {
      from: fromEmail,
      to: args.email,
      subject: "AniMuse - Verify Your Email Address",
      text: `Hello ${
        args.userName || "User"
      }!\n\nThanks for signing up for AniMuse!\nYour email verification code is: ${
        args.code
      }\nThis code will expire in 10 minutes.\n\nIf you did not request this, please ignore this email.\n\nBest regards,\nThe AniMuse Team`,
      html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
            <h2 style="color: #3B82F6; text-align: center;">Hello ${
              args.userName || "User"
            },</h2>
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
    };

    try {
      // TypeScript should now correctly infer the type of 'mg'
      // and recognize the 'messages.create' method.
      const result = await mg.messages.create(MAILGUN_DOMAIN, emailData);
      // console.log("Email sent successfully via Mailgun:", result);
      return { success: true };
    } catch (error) {
      console.error("Failed to send verification email via Mailgun:", error);
      const mailgunError = error as any;
      return {
        success: false,
        error: "Failed to send verification email.",
        details:
          mailgunError.message ||
          (mailgunError.toString ? mailgunError.toString() : "Unknown Mailgun error"),
      };
    }
  },
});