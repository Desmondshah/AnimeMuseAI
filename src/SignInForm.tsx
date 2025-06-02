// src/SignInForm.tsx - Optimized for Mobile Performance
"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import React, { useState, FormEvent, useEffect, useMemo } from "react";
import { toast } from "sonner";
import StyledButton from "./components/animuse/shared/StyledButton";
import { useAnimationOptimization, useParticleOptimization, useBackgroundOptimization } from "../convex/useMobileOptimizations";

// Optimized Floating Particle Component
const FloatingParticle: React.FC<{ 
  delay?: number; 
  size?: string; 
  color?: string;
  shouldAnimate: boolean;
}> = ({ delay = 0, size = "w-2 h-2", color = "bg-brand-accent-gold/30", shouldAnimate }) => {
  if (!shouldAnimate) return null;
  
  return (
    <div 
      className={`absolute ${size} ${color} rounded-full ${shouldAnimate ? 'animate-ping' : ''}`}
      style={{ 
        animationDelay: `${delay}s`, 
        left: `${Math.random() * 100}%`, 
        top: `${Math.random() * 100}%`,
        animationDuration: `${2 + Math.random() * 3}s`
      }}
    ></div>
  );
};

// Optimized Loading Spinner
const ArtisticLoadingSpinner: React.FC<{ 
  size?: string;
  shouldUseGPUAcceleration: boolean;
}> = ({ size = "h-5 w-5", shouldUseGPUAcceleration }) => (
  <div className="relative">
    <div className={`${size} border-2 border-transparent border-t-white border-r-white/70 rounded-full animate-spin ${shouldUseGPUAcceleration ? 'gpu-accelerate' : ''}`}></div>
    <div className={`absolute top-0.5 left-0.5 w-3 h-3 border-2 border-transparent border-b-white/50 border-l-white/30 rounded-full animate-spin animate-reverse ${shouldUseGPUAcceleration ? 'gpu-accelerate' : ''}`}></div>
  </div>
);

export function SignInForm() {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  // Optimization hooks
  const { shouldAnimate, shouldUseGPUAcceleration } = useAnimationOptimization();
  const { shouldShowParticles, getOptimalParticleCount } = useParticleOptimization();
  const { shouldUseGradients, shouldUseBlur } = useBackgroundOptimization();

  // Optimized particle generation
  const particles = useMemo(() => {
    const baseCount = 15;
    const optimizedCount = getOptimalParticleCount(baseCount);
    return Array.from({ length: optimizedCount }, (_, i) => i);
  }, [getOptimalParticleCount]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);

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
    convexFormData.set("password", password);
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
    <div className="relative min-h-screen flex items-center justify-center px-4 py-8 overflow-hidden">
      {/* Optimized Floating Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Primary gradient orbs - Conditionally rendered */}
        {shouldUseGradients && (
          <>
            <div className={`absolute top-10 left-10 w-96 h-96 bg-gradient-to-br from-brand-primary-action/20 to-transparent rounded-full ${shouldUseBlur ? 'blur-3xl' : ''} ${shouldAnimate ? 'animate-pulse' : ''}`}></div>
            <div className={`absolute bottom-20 right-16 w-[500px] h-[500px] bg-gradient-to-tr from-brand-accent-gold/15 to-transparent rounded-full ${shouldUseBlur ? 'blur-3xl' : ''} ${shouldAnimate ? 'animate-pulse' : ''}`} style={{ animationDelay: '1s' }}></div>
            <div className={`absolute top-1/3 right-1/5 w-80 h-80 bg-gradient-to-l from-brand-accent-peach/12 to-transparent rounded-full ${shouldUseBlur ? 'blur-3xl' : ''} ${shouldAnimate ? 'animate-pulse' : ''}`} style={{ animationDelay: '2s' }}></div>
          </>
        )}

        {/* Optimized floating particles */}
        {shouldShowParticles && particles.map((particle) => (
          <FloatingParticle
            key={particle}
            delay={particle * 0.3}
            shouldAnimate={shouldAnimate}
            size={Math.random() > 0.7 ? "w-3 h-3" : "w-2 h-2"}
            color={
              Math.random() > 0.6
                ? "bg-brand-primary-action/25"
                : Math.random() > 0.3
                  ? "bg-brand-accent-gold/25"
                  : "bg-brand-accent-peach/25"
            }
          />
        ))}

        {/* Simplified animated grid pattern for low-performance devices */}
        {shouldUseGradients && (
          <div className="absolute inset-0 opacity-5">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)",
                backgroundSize: "60px 60px",
                ...(shouldAnimate && {
                  animation: "float 25s ease-in-out infinite",
                })
              }}
            ></div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-md">
        {/* Enhanced Form Card */}
        <div className="relative">
          {/* Card Glow Effect - Conditionally rendered */}
          {shouldUseGradients && (
            <div className={`absolute -inset-6 bg-gradient-to-r from-brand-primary-action/30 via-brand-accent-gold/20 to-brand-accent-peach/30 rounded-3xl ${shouldUseBlur ? 'blur-2xl' : ''} opacity-70 ${shouldAnimate ? 'animate-pulse' : ''}`}></div>
          )}
          
          {/* Main Form Container */}
          <div className={`relative ${shouldUseGradients ? 'bg-black/40' : 'bg-black/80'} ${shouldUseBlur ? 'backdrop-blur-xl' : ''} border border-white/20 rounded-3xl p-8 sm:p-10 shadow-2xl`}>
            {/* Simplified background pattern for performance */}
            {shouldUseGradients && (
              <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent transform rotate-45"></div>
              </div>
            )}
            
            <div className="relative z-10">
              {/* Form Header */}
              <div className="text-center mb-8">
                <div className={`inline-block p-3 ${shouldUseGradients ? 'bg-gradient-to-r from-brand-primary-action/20 to-brand-accent-gold/20' : 'bg-brand-primary-action/20'} rounded-full mb-4`}>
                  <span className="text-3xl">{flow === "signIn" ? "🚀" : "✨"}</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-heading text-white mb-2">
                  {flow === "signIn" ? "Welcome Back!" : "Join AniMuse"}
                </h2>
                <p className="text-white/70 text-sm">
                  {flow === "signIn" 
                    ? "Continue your anime journey" 
                    : "Start your personalized anime adventure"
                  }
                </p>
              </div>

              {/* Form */}
              <form className="space-y-6" onSubmit={handleSubmit}>
                {/* Email Field */}
                <div className="relative group">
                  {shouldUseGradients && (
                    <div className={`absolute inset-0 bg-gradient-to-r from-brand-primary-action/20 to-brand-accent-gold/20 rounded-2xl ${shouldUseBlur ? 'blur-lg' : ''} opacity-0 group-focus-within:opacity-100 transition-opacity duration-300`}></div>
                  )}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                      <svg className={`w-5 h-5 text-white/60 group-focus-within:text-brand-primary-action transition-colors ${shouldAnimate ? '' : 'transition-none'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                      </svg>
                    </div>
                    <input
                      className={`w-full ${shouldUseGradients ? 'bg-black/40' : 'bg-black/60'} ${shouldUseBlur ? 'backdrop-blur-sm' : ''} border border-white/20 rounded-2xl pl-12 pr-4 py-4 text-white placeholder-white/60 focus:border-brand-primary-action focus:ring-2 focus:ring-brand-primary-action/50 focus:outline-none ${shouldAnimate ? 'transition-all duration-300' : 'transition-none'}`}
                      type="email"
                      name="email"
                      placeholder="your@email.com"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={submitting}
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="relative group">
                  {shouldUseGradients && (
                    <div className={`absolute inset-0 bg-gradient-to-r from-brand-primary-action/20 to-brand-accent-gold/20 rounded-2xl ${shouldUseBlur ? 'blur-lg' : ''} opacity-0 group-focus-within:opacity-100 transition-opacity duration-300`}></div>
                  )}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                      <svg className={`w-5 h-5 text-white/60 group-focus-within:text-brand-primary-action transition-colors ${shouldAnimate ? '' : 'transition-none'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <input
                      className={`w-full ${shouldUseGradients ? 'bg-black/40' : 'bg-black/60'} ${shouldUseBlur ? 'backdrop-blur-sm' : ''} border border-white/20 rounded-2xl pl-12 pr-12 py-4 text-white placeholder-white/60 focus:border-brand-primary-action focus:ring-2 focus:ring-brand-primary-action/50 focus:outline-none ${shouldAnimate ? 'transition-all duration-300' : 'transition-none'}`}
                      type={showPassword ? "text" : "password"}
                      name="password"
                      placeholder="Your password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete={flow === "signIn" ? "current-password" : "new-password"}
                      disabled={submitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={`absolute inset-y-0 right-4 flex items-center text-white/60 hover:text-white ${shouldAnimate ? 'transition-colors' : 'transition-none'}`}
                      aria-label={showPasswordConfirm ? "Hide confirm password" : "Show confirm password"}
                      disabled={submitting}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {showPassword ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.464 8.464m1.414 1.414L8.464 8.464m5.656 5.656L15.536 15.536m-1.414-1.414L15.536 15.536" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        )}
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Confirm Password Field (Sign Up Only) */}
                {flow === "signUp" && (
                  <div className="relative group">
                    {shouldUseGradients && (
                      <div className={`absolute inset-0 bg-gradient-to-r from-brand-primary-action/20 to-brand-accent-gold/20 rounded-2xl ${shouldUseBlur ? 'blur-lg' : ''} opacity-0 group-focus-within:opacity-100 transition-opacity duration-300`}></div>
                    )}
                    <div className="relative">
                      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <svg className={`w-5 h-5 text-white/60 group-focus-within:text-brand-primary-action transition-colors ${shouldAnimate ? '' : 'transition-none'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <input
                        className={`w-full ${shouldUseGradients ? 'bg-black/40' : 'bg-black/60'} ${shouldUseBlur ? 'backdrop-blur-sm' : ''} border border-white/20 rounded-2xl pl-12 pr-12 py-4 text-white placeholder-white/60 focus:border-brand-primary-action focus:ring-2 focus:ring-brand-primary-action/50 focus:outline-none ${shouldAnimate ? 'transition-all duration-300' : 'transition-none'}`}
                        type={showPasswordConfirm ? "text" : "password"}
                        name="passwordConfirm"
                        placeholder="Confirm your password"
                        required
                        value={passwordConfirm}
                        onChange={(e) => setPasswordConfirm(e.target.value)}
                        autoComplete="new-password"
                        disabled={submitting}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                        className={`absolute inset-y-0 right-4 flex items-center text-white/60 hover:text-white ${shouldAnimate ? 'transition-colors' : 'transition-none'}`}
                        aria-label={showPasswordConfirm ? "Hide confirm password" : "Show confirm password"}
                        disabled={submitting}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {showPasswordConfirm ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.464 8.464m1.414 1.414L8.464 8.464m5.656 5.656L15.536 15.536m-1.414-1.414L15.536 15.536" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          )}
                        </svg>
                      </button>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <div className="relative group">
                  {shouldUseGradients && (
                    <div className={`absolute -inset-2 bg-gradient-to-r from-brand-primary-action/50 to-brand-accent-gold/50 rounded-3xl ${shouldUseBlur ? 'blur-lg' : ''} opacity-60 group-hover:opacity-100 ${shouldAnimate ? 'transition-opacity duration-300' : 'transition-none'}`}></div>
                  )}
                  <StyledButton
                    type="submit"
                    variant="primary"
                    className={`relative w-full !py-4 !text-lg ${shouldUseGradients ? '!bg-gradient-to-r !from-brand-primary-action !to-brand-accent-gold hover:!from-brand-accent-gold hover:!to-brand-primary-action' : '!bg-brand-primary-action hover:!bg-brand-accent-gold'} ${shouldAnimate ? '!transition-all !duration-500' : '!transition-none'} !shadow-2xl hover:!shadow-brand-primary-action/25`}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <span className="flex items-center justify-center gap-3">
                        <ArtisticLoadingSpinner shouldUseGPUAcceleration={shouldUseGPUAcceleration} />
                        {flow === "signIn" ? "Signing In..." : "Creating Account..."}
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-3">
                        <span className="text-xl">{flow === "signIn" ? "🚀" : "✨"}</span>
                        {flow === "signIn" ? "Sign In" : "Create Account"}
                        <span className="text-xl">→</span>
                      </span>
                    )}
                  </StyledButton>
                </div>

                {/* Flow Toggle */}
                <div className="text-center">
                  <span className="text-white/70 text-sm">
                    {flow === "signIn"
                      ? "New to AniMuse? "
                      : "Already have an account? "}
                  </span>
                  <button
                    type="button"
                    className={`font-semibold text-brand-primary-action hover:text-brand-accent-gold cursor-pointer ${shouldAnimate ? 'transition-colors duration-300' : 'transition-none'} text-sm underline decoration-2 underline-offset-2 hover:decoration-brand-accent-gold`}
                    onClick={() => {
                      setFlow(flow === "signIn" ? "signUp" : "signIn");
                      setEmail("");
                      setPassword("");
                      setPasswordConfirm("");
                      setShowPassword(false);
                      setShowPasswordConfirm(false);
                    }}
                    disabled={submitting}
                  >
                    {flow === "signIn" ? "Create an account" : "Sign in instead"}
                  </button>
                </div>
              </form>

              {/* Divider */}
              <div className="my-8 flex items-center">
                <hr className="flex-grow border-t border-white/20" />
                <span className={`mx-4 text-sm text-white/70 ${shouldUseGradients ? 'bg-black/40' : 'bg-black/60'} px-4 py-2 rounded-full ${shouldUseBlur ? 'backdrop-blur-sm' : ''}`}>OR</span>
                <hr className="flex-grow border-t border-white/20" />
              </div>

              {/* Anonymous Sign In */}
              <div className="relative group">
                {shouldUseGradients && (
                  <div className={`absolute -inset-2 bg-gradient-to-r from-purple-500/30 to-blue-500/30 rounded-3xl ${shouldUseBlur ? 'blur-lg' : ''} opacity-0 group-hover:opacity-100 ${shouldAnimate ? 'transition-opacity duration-300' : 'transition-none'}`}></div>
                )}
                <StyledButton
                  variant="secondary"
                  className={`relative w-full !py-4 !text-lg ${shouldUseGradients ? '!bg-black/40' : '!bg-black/60'} ${shouldUseBlur ? '!backdrop-blur-sm' : ''} !border-white/20 hover:!bg-white/10 !text-white`}
                  onClick={handleAnonymousSignIn}
                  disabled={submitting}
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-3">
                      <ArtisticLoadingSpinner shouldUseGPUAcceleration={shouldUseGPUAcceleration} />
                      Processing...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-3">
                      <span className="text-xl">👤</span>
                      Continue as Guest
                      <span className="text-lg">✨</span>
                    </span>
                  )}
                </StyledButton>
              </div>

              {/* Footer Note */}
              <div className="mt-8 text-center">
                <p className="text-xs text-white/60 leading-relaxed">
                  By continuing, you agree to our terms of service and privacy policy.
                  <br />
                  Join thousands of anime fans discovering their next favorite series.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Optimized Custom CSS for animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-20px) rotate(180deg);
          }
        }

        .animate-spin-reverse {
          animation: spin 1s linear infinite reverse;
        }

        .gpu-accelerate {
          transform: translateZ(0);
          will-change: transform;
        }
      `}</style>
    </div>
  );
}