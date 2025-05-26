// src/components/animuse/shared/EmailVerificationPrompt.tsx
import React, { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { toast } from "sonner";
import StyledButton from "../shared/StyledButton";

interface EmailVerificationPromptProps {
  userEmail?: string;
  onVerified?: () => void;
}

export default function EmailVerificationPrompt({ userEmail, onVerified }: EmailVerificationPromptProps) {
  const [verificationCode, setVerificationCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRequestingCode, setIsRequestingCode] = useState(false);
  const [timeUntilResend, setTimeUntilResend] = useState(0);
  const [hasRequestedInitialCode, setHasRequestedInitialCode] = useState(false);

  const requestVerificationCode = useMutation(api.authActions.requestEmailVerificationCode);
  const submitVerificationCode = useMutation(api.authActions.submitVerificationCode);
  const resendVerificationCode = useMutation(api.authActions.resendVerificationCode);
  const checkVerificationStatus = useQuery(api.users.checkVerificationStatus);

  // Auto-request initial code when component mounts
  useEffect(() => {
    if (!hasRequestedInitialCode) {
      handleRequestCode(true);
      setHasRequestedInitialCode(true);
    }
  }, [hasRequestedInitialCode]);

  // Handle countdown timer for resend
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

  const handleRequestCode = async (isInitial = false) => {
    setIsRequestingCode(true);
    const toastId = isInitial ? "initial-verification" : "resend-verification";
    
    toast.loading(
      isInitial ? "Sending verification code..." : "Resending verification code...", 
      { id: toastId }
    );

    try {
      const result = await requestVerificationCode({});
      if (result.success) {
        toast.success(
          isInitial 
            ? `Verification code sent to ${userEmail || 'your email'}!`
            : "New verification code sent!",
          { id: toastId }
        );
        setTimeUntilResend(60); // 60 second cooldown
        if (result.expiresIn) {
          toast.info(`Code expires in ${result.expiresIn} minutes`, { duration: 5000 });
        }
      } else {
        toast.error(result.message || "Failed to send verification code", { id: toastId });
      }
    } catch (error: any) {
      console.error("Failed to request verification code:", error);
      const errorMessage = error.data?.message || error.message || "Failed to send verification code";
      toast.error(errorMessage, { id: toastId });
      
      // If rate limited, set appropriate countdown
      if (errorMessage.includes("Too many")) {
        setTimeUntilResend(60);
      }
    } finally {
      setIsRequestingCode(false);
    }
  };

  const handleSubmitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!verificationCode.trim()) {
      toast.error("Please enter the verification code");
      return;
    }

    if (!/^\d{6}$/.test(verificationCode)) {
      toast.error("Please enter a valid 6-digit code");
      return;
    }

    setIsSubmitting(true);
    toast.loading("Verifying code...", { id: "submit-verification" });

    try {
      const result = await submitVerificationCode({ code: verificationCode });
      if (result.success) {
        toast.success(result.message || "Email verified successfully!", { id: "submit-verification" });
        setVerificationCode("");
        
        // Call the onVerified callback if provided
        if (onVerified) {
          setTimeout(onVerified, 1000); // Small delay to show success message
        }
      } else {
        toast.error(result.message || "Verification failed", { id: "submit-verification" });
      }
    } catch (error: any) {
      console.error("Failed to verify code:", error);
      const errorMessage = error.data?.message || error.message || "Verification failed";
      toast.error(errorMessage, { id: "submit-verification" });
      
      // Clear the code if it was invalid
      if (errorMessage.includes("Invalid") || errorMessage.includes("expired")) {
        setVerificationCode("");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6); // Only digits, max 6
    setVerificationCode(value);
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
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-2xl font-orbitron text-neon-cyan mb-2">Verify Your Email</h2>
        <p className="text-brand-text-secondary text-sm">
          We've sent a 6-digit verification code to{" "}
          <span className="text-brand-text font-medium">{userEmail || "your email"}</span>
        </p>
      </div>

      <form onSubmit={handleSubmitCode} className="space-y-6">
        <div>
          <label htmlFor="verification-code" className="block text-sm font-medium text-brand-text-secondary mb-2">
            Verification Code
          </label>
          <input
            id="verification-code"
            type="text"
            inputMode="numeric"
            pattern="\d{6}"
            placeholder="000000"
            value={verificationCode}
            onChange={handleCodeChange}
            className="neumorphic-input w-full text-center text-2xl font-mono tracking-wider"
            maxLength={6}
            autoComplete="one-time-code"
            disabled={isSubmitting}
          />
          <p className="text-xs text-brand-text-secondary mt-1">
            Enter the 6-digit code from your email
          </p>
        </div>

        <StyledButton
          type="submit"
          variant="primary"
          className="w-full py-3 text-lg"
          disabled={isSubmitting || verificationCode.length !== 6}
        >
          {isSubmitting ? "Verifying..." : "Verify Email"}
        </StyledButton>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-brand-text-secondary mb-2">Didn't receive the code?</p>
        <StyledButton
          onClick={() => handleRequestCode(false)}
          variant="secondary_small"
          disabled={isRequestingCode || timeUntilResend > 0}
          className="text-sm"
        >
          {isRequestingCode
            ? "Sending..."
            : timeUntilResend > 0
            ? `Resend in ${formatTimeRemaining(timeUntilResend)}`
            : "Resend Code"
          }
        </StyledButton>
      </div>

      <div className="mt-6 p-4 bg-brand-dark rounded-lg shadow-neumorphic-light-inset">
        <h4 className="text-sm font-orbitron text-electric-blue mb-2">💡 Tips:</h4>
        <ul className="text-xs text-brand-text-secondary space-y-1">
          <li>• Check your spam/junk folder if you don't see the email</li>
          <li>• The code expires in 10 minutes</li>
          <li>• Make sure to enter all 6 digits</li>
        </ul>
      </div>

      <div className="mt-4 text-center">
        <button
          onClick={() => {
            // checkVerificationStatus is now a query, so we check its current value
            if (checkVerificationStatus?.isVerified) {
              toast.success("Email is already verified!");
              if (onVerified) onVerified();
            } else if (checkVerificationStatus?.isAuthenticated) {
              toast.info("Email is not yet verified. Please enter the code above.");
            } else {
              toast.error("Please sign in to check verification status.");
            }
          }}
          className="text-xs text-brand-text-secondary hover:text-neon-cyan transition-colors underline"
        >
          Check verification status
        </button>
      </div>
    </div>
  );
}