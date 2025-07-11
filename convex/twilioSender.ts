// convex/twilioSender.ts
// @ts-nocheck
"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import Twilio from "twilio";

// Define clear interfaces to avoid deep type recursion
interface SmsResult {
  success: boolean;
  error?: string;
  details?: any; // Simplified to avoid nested object type issues
}

// Twilio Configuration - These MUST be set in your Convex Environment Variables
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

let twilioClient: Twilio.Twilio | null = null;
if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER) {
  twilioClient = Twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
} else {
  console.warn(
    "Twilio credentials (Account SID, Auth Token, or Phone Number) not found in environment variables. SMS sending will be disabled."
  );
}

// Basic E.164 phone number validation
function isValidE164PhoneNumber(phoneNumber: string): boolean {
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phoneNumber);
}

export const sendSmsVerification = internalAction({
  args: {
    toPhoneNumber: v.string(),
    code: v.string(),
    userName: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
    details: v.optional(v.any()) // Simplified - use v.any() to avoid deep nesting
  }),
  handler: async (_ctx, args): Promise<SmsResult> => {
    if (!twilioClient || !TWILIO_PHONE_NUMBER) {
      console.error("Twilio client not initialized or sending phone number not set.");
      return {
        success: false,
        error: "SMS service (Twilio) not configured on the server.",
      };
    }

    if (!isValidE164PhoneNumber(args.toPhoneNumber)) {
      console.error(`Invalid E.164 phone number format: ${args.toPhoneNumber}`);
      return {
        success: false,
        error: "Invalid phone number format. Please use E.164 format (e.g., +12223334444).",
      };
    }

    const messageBody = `Your AniMuse verification code is: ${args.code}`;

    try {
      const message = await twilioClient.messages.create({
        body: messageBody,
        from: TWILIO_PHONE_NUMBER,
        to: args.toPhoneNumber,
      });

      return { 
        success: true, 
        details: { messageSid: message.sid } 
      };
    } catch (error) {
      console.error("Failed to send SMS via Twilio:", error);
      const twilioError = error as any;
      return {
        success: false,
        error: "Failed to send SMS verification.",
        details: {
          message: twilioError.message,
          code: twilioError.code,
          status: twilioError.status,
          moreInfo: twilioError.moreInfo,
        }
      };
    }
  },
});