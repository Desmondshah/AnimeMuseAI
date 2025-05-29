// src/SignInForm.tsx
"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import React, { useState, FormEvent } from "react";
import { toast } from "sonner";
import StyledButton from "./components/animuse/shared/StyledButton"; // Ensure path is correct

export function SignInForm() {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState(""); // Added for controlled input
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    // Email and password are now taken from state for controlled components
    // const formData = new FormData(e.target as HTMLFormElement);
    // const email = formData.get("email") as string;
    // const currentPassword = formData.get("password") as string;

    if (flow === "signUp") {
      if (password !== passwordConfirm) {
        toast.error("Passwords do not match.");
        setSubmitting(false);
        return;
      }
      if (password.length < 6) {
        toast.error("Password must be at least 6 characters long.");
        setSubmitting(false);
        return;
      }
    }

    const convexFormData = new FormData();
    convexFormData.set("email", email);
    convexFormData.set("password", password); // Use state variable 'password'
    convexFormData.set("flow", flow);

    try {
      await signIn("password", convexFormData);
      // toast.success for sign-in/sign-up is usually handled by the auth flow itself or page navigation
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
    // Use content-card for the new theme. Max width for mobile, centered.
    <div className="w-full max-w-sm mx-auto p-6 sm:p-8 bg-brand-surface text-white rounded-xl shadow-lg">
      <h2 className="text-2xl sm:text-3xl font-heading text-center mb-6 sm:mb-8 text-brand-primary-action">
        {flow === "signIn" ? "Welcome Back!" : "Create Account"}
      </h2>
      <form className="flex flex-col gap-4 sm:gap-5" onSubmit={handleSubmit}>
         <input
          className="form-input" // Apply new input style
          type="email"
          name="email"
          placeholder="Email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={submitting}
        />
        <input
          className="form-input" // Apply new input style
          type="password"
          name="password"
          placeholder="Password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={flow === "signIn" ? "current-password" : "new-password"}
          disabled={submitting}
        />
        {flow === "signUp" && (
          <input
            className="form-input" // Apply new input style
            type="password"
            name="passwordConfirm"
            placeholder="Confirm Password"
            required
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            autoComplete="new-password"
            disabled={submitting}
          />
        )}
        <StyledButton
          type="submit"
          variant="primary"
          className="w-full py-2.5 sm:py-3 text-base sm:text-lg mt-2" // Adjusted padding and margin
          disabled={submitting}
        >
          {submitting
            ? (flow === "signIn" ? "Signing In..." : "Signing Up...")
            : (flow === "signIn" ? "Sign In" : "Sign Up")
          }
        </StyledButton>
        <div className="text-center text-sm text-white">
          <span>
            {flow === "signIn"
              ? "Don't have an account? "
              : "Already have an account? "}
          </span>
          <button
            type="button"
            className="font-semibold text-brand-primary-action hover:text-brand-accent-peach cursor-pointer transition-colors"
            onClick={() => {
              setFlow(flow === "signIn" ? "signUp" : "signIn");
              setEmail(""); // Clear email field on flow change
              setPassword("");
              setPasswordConfirm("");
            }}
            disabled={submitting}
          >
            {flow === "signIn" ? "Sign up" : "Sign in"}
          </button>
        </div>
      </form>

      <div className="my-6 flex items-center">
        <hr className="flex-grow border-t border-brand-accent-peach/50" />
        <span className="mx-3 text-xs text-white">OR</span>
        <hr className="flex-grow border-t border-brand-accent-peach/50" />
      </div>

      <StyledButton
        variant="secondary" // Using secondary style for anonymous sign-in
        className="w-full py-2.5 sm:py-3 text-base sm:text-lg"
        onClick={handleAnonymousSignIn}
        disabled={submitting}
      >
        {submitting ? "Processing..." : "Continue as Guest"}
      </StyledButton>
    </div>
  );
}