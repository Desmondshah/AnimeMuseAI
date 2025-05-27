// src/SignInForm.tsx
"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import React, { useState, FormEvent } from "react";
import { toast } from "sonner";
import StyledButton from "./components/animuse/shared/StyledButton";

export function SignInForm() {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [submitting, setSubmitting] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const formData = new FormData(e.target as HTMLFormElement);
    const email = formData.get("email") as string;
    const currentPassword = formData.get("password") as string;

    if (flow === "signUp") {
      if (currentPassword !== passwordConfirm) {
        toast.error("Passwords do not match.");
        setSubmitting(false);
        return;
      }
      if (currentPassword.length < 6) {
        toast.error("Password must be at least 6 characters long.");
        setSubmitting(false);
        return;
      }
    }

    const convexFormData = new FormData();
    convexFormData.set("email", email);
    convexFormData.set("password", currentPassword);
    convexFormData.set("flow", flow);

    try {
      await signIn("password", convexFormData);
    } catch (error: any) {
      let errorMessage = flow === "signIn"
        ? "Could not sign in. Please check your credentials."
        : "Could not sign up. The email might already be taken or the password is too weak.";
      if (error.data && typeof error.data.message === 'string') {
        errorMessage = error.data.message;
      } else if (error.data && typeof error.data.error === 'string') {
        errorMessage = error.data.error;
      } else if (typeof error.message === 'string' && error.message.length < 100) {
        if (error.message.includes("Invalid email or password") ||
            error.message.includes("User already exists") ||
            error.message.includes("Password does not meet requirements") ||
            error.message.includes("Invalid email address")) {
              errorMessage = error.message;
            }
      }
      toast.error(errorMessage);
    } finally {
        setSubmitting(false);
    }
  };

  const handleAnonymousSignIn = async () => {
    setSubmitting(true);
    try {
      await signIn("anonymous");
      toast.success("Signed in anonymously!");
    } catch (error: any) {
      console.error("Anonymous sign-in error:", error);
      toast.error("Could not sign in anonymously. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 sm:p-8 neumorphic-card bg-brand-surface">
      <h2 className="text-3xl font-orbitron text-center mb-6 text-neon-cyan">
        {flow === "signIn" ? "Welcome Back!" : "Create Account"}
      </h2>
      <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
         <input
          className="neumorphic-input w-full"
          type="email"
          name="email"
          placeholder="Email"
          required
          autoComplete="email"
        />
        <input
          className="neumorphic-input w-full"
          type="password"
          name="password"
          placeholder="Password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={flow === "signIn" ? "current-password" : "new-password"}
        />
        {flow === "signUp" && (
          <input
            className="neumorphic-input w-full"
            type="password"
            name="passwordConfirm"
            placeholder="Confirm Password"
            required
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            autoComplete="new-password"
          />
        )}
        <StyledButton
          type="submit"
          variant="primary"
          className="w-full py-3 text-lg"
          disabled={submitting && (flow === "signIn" || flow === "signUp") }
        >
          {submitting && (flow === "signIn" || flow === "signUp")
            ? (flow === "signIn" ? "Signing In..." : "Signing Up...")
            : (flow === "signIn" ? "Sign In" : "Sign Up")
          }
        </StyledButton>
        <div className="text-center text-sm text-brand-text-secondary">
          <span>
            {flow === "signIn"
              ? "Don't have an account? "
              : "Already have an account? "}
          </span>
          <button
            type="button"
            className="font-semibold text-sakura-pink hover:text-neon-cyan cursor-pointer transition-colors"
            onClick={() => {
              setFlow(flow === "signIn" ? "signUp" : "signIn");
              setPassword("");
              setPasswordConfirm("");
            }}
          >
            {flow === "signIn" ? "Sign up instead" : "Sign in instead"}
          </button>
        </div>
      </form>

      <div className="my-6 flex items-center">
        <hr className="flex-grow border-t border-brand-dark" />
        <span className="mx-4 text-xs text-brand-text-secondary">OR</span>
        <hr className="flex-grow border-t border-brand-dark" />
      </div>

      <StyledButton
        variant="secondary"
        className="w-full py-3 text-lg"
        onClick={handleAnonymousSignIn}
        disabled={submitting}
      >
        {submitting ? "Processing..." : "Sign In Anonymously"}
      </StyledButton>
    </div>
  );
}