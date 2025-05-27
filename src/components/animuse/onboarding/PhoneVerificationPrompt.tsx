// src/components/animuse/onboarding/PhoneVerificationPrompt.tsx
import React, { useState, useEffect, FormEvent } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { toast } from "sonner";
import StyledButton from "../shared/StyledButton";

interface PhoneVerificationPromptProps {
  initialPhoneNumber?: string;
  onVerified: () => void;
  userIdForLog?: string;
}

export default function PhoneVerificationPrompt({
  initialPhoneNumber = "",
  onVerified,
  userIdForLog,
}: PhoneVerificationPromptProps) {
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber);
  const [verificationCode, setVerificationCode] = useState("");
  const [isRequestingCode, setIsRequestingCode] = useState(false);
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);
  const [timeUntilResend, setTimeUntilResend] = useState(0);
  const [hasRequestedOnce, setHasRequestedOnce] = useState(false);

  const requestSmsCodeMutation = useMutation(api.authActions.requestSmsVerificationCode);
  const submitSmsCodeMutation = useMutation(api.authActions.submitSmsVerificationCode);
  const resendSmsCodeMutation = useMutation(api.authActions.resendSmsVerificationCode);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timeUntilResend > 0) {
      interval = setInterval(() => {
        setTimeUntilResend((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timeUntilResend]);

  const handleRequestCode = async (isResend = false) => {
    if (!phoneNumber.trim()) {
      toast.error("Please enter your phone number.");
      return;
    }
    if (!/^\+[1-9]\d{1,14}$/.test(phoneNumber)) {
      toast.error("Invalid phone number format. Please use E.164 (e.g., +12223334444).");
      return;
    }
    setIsRequestingCode(true);
    const toastId = `sms-request-${Date.now()}`;
    toast.loading(isResend ? "Resending code..." : "Sending verification code...", { id: toastId });
    setHasRequestedOnce(true);
    try {
      const mutationToCall = isResend ? resendSmsCodeMutation : requestSmsCodeMutation;
      const result = await mutationToCall({ phoneNumber });
      if (result.success) {
        toast.success(result.message, { id: toastId });
        setTimeUntilResend(60);
      } else {
        toast.error(result.message || "Failed to send code.", { id: toastId });
      }
    } catch (error: any) {
      console.error("Request code error:", error);
      toast.error(error.data?.message || error.message || "Could not send verification code.", { id: toastId });
      if (error.data?.message?.includes("Too many")) {
        setTimeUntilResend(60);
      }
    } finally {
      setIsRequestingCode(false);
    }
  };

  const handleSubmitCode = async (e: FormEvent) => {
    e.preventDefault();
    if (!verificationCode.trim() || !/^\d{6}$/.test(verificationCode)) {
      toast.error("Please enter the 6-digit verification code.");
      return;
    }
    setIsSubmittingCode(true);
    const toastId = `sms-submit-${Date.now()}`;
    toast.loading("Verifying code...", { id: toastId });
    try {
      const result = await submitSmsCodeMutation({ code: verificationCode });
      if (result.success) {
        toast.success(result.message || "Phone number verified successfully!", { id: toastId });
        setVerificationCode("");
        onVerified();
      } else {
        toast.error(result.message || "Verification failed.", { id: toastId });
      }
    } catch (error: any) {
      console.error("Submit code error:", error);
      toast.error(error.data?.message || error.message || "Could not verify code.", { id: toastId });
      if (error.data?.message?.includes("Invalid") || error.data?.message?.includes("expired")) {
        setVerificationCode("");
      }
    } finally {
      setIsSubmittingCode(false);
    }
  };

  const formatTimeRemaining = (seconds: number): string => {
    if (seconds <= 0) return "";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${remainingSeconds}s`;
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 sm:p-8 neumorphic-card bg-brand-surface">
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto mb-4 bg-electric-blue rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.308 1.154a11.034 11.034 0 005.378 5.378l1.154-2.308a1 1 0 011.21-.502l4.493 1.498A1 1 0 0119 12.72V16a2 2 0 01-2 2h-1C6.04 18 2 13.96 2 7.5V5z"></path>
          </svg>
        </div>
        <h2 className="text-2xl font-orbitron text-neon-cyan mb-2">Verify Your Phone Number</h2>
        {!hasRequestedOnce && (
          <p className="text-brand-text-secondary text-sm">
            Enter your phone number to receive a verification code.
          </p>
        )}
         {hasRequestedOnce && (
          <p className="text-brand-text-secondary text-sm">
            We've sent a 6-digit verification code to <span className="text-brand-text font-medium">{phoneNumber}</span>.
          </p>
        )}
      </div>
      {!hasRequestedOnce || timeUntilResend > 0 ? (
        <div className="mb-6">
          <label htmlFor="phone-number" className="block text-sm font-medium text-brand-text-secondary mb-2">
            Phone Number (e.g., +14155552671)
          </label>
          <input
            id="phone-number"
            type="tel"
            placeholder="+12223334444"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="neumorphic-input w-full"
            autoComplete="tel"
            disabled={isRequestingCode || (hasRequestedOnce && timeUntilResend === 0 && verificationCode !== "")}
          />
        </div>
      ) : null}
      {hasRequestedOnce && (
        <form onSubmit={handleSubmitCode} className="space-y-6 mt-4">
          <div>
            <label htmlFor="verification-code" className="block text-sm font-medium text-brand-text-secondary mb-2">
              Verification Code
            </label>
            <input
              id="verification-code"
              type="text"
              inputMode="numeric"
              placeholder="000000"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="neumorphic-input w-full text-center text-2xl font-mono tracking-wider"
              maxLength={6}
              autoComplete="one-time-code"
              disabled={isSubmittingCode}
            />
            <p className="text-xs text-brand-text-secondary mt-1">
              Enter the 6-digit code from your SMS.
            </p>
          </div>
          <StyledButton
            type="submit"
            variant="primary"
            className="w-full py-3 text-lg"
            disabled={isSubmittingCode || verificationCode.length !== 6}
          >
            {isSubmittingCode ? "Verifying..." : "Verify Phone"}
          </StyledButton>
        </form>
      )}
      <div className="mt-6 text-center">
        <StyledButton
          onClick={() => handleRequestCode(!hasRequestedOnce ? false : true)}
          variant={hasRequestedOnce ? "secondary_small" : "primary"}
          disabled={isRequestingCode || timeUntilResend > 0 || !phoneNumber.trim()}
          className="text-sm"
        >
          {isRequestingCode
            ? (hasRequestedOnce ? "Resending..." : "Sending...")
            : timeUntilResend > 0
            ? `Resend in ${formatTimeRemaining(timeUntilResend)}`
            : (hasRequestedOnce ? "Resend Code" : "Send Code")
          }
        </StyledButton>
         {!hasRequestedOnce && !phoneNumber.trim() &&
          <p className="text-xs text-yellow-400 mt-1">Enter phone number to enable Send Code.</p>
        }
      </div>
      <div className="mt-6 p-4 bg-brand-dark rounded-lg shadow-neumorphic-light-inset">
        <h4 className="text-sm font-orbitron text-electric-blue mb-2">💡 Tips:</h4>
        <ul className="text-xs text-brand-text-secondary space-y-1">
          <li>• Ensure your phone number is in E.164 format (e.g., +14155552671).</li>
          <li>• The code expires in 10 minutes.</li>
          <li>• Check your SMS messages.</li>
        </ul>
      </div>
    </div>
  );
}