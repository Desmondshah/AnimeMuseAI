// src/SignInForm.tsx - Brutalist Artistic Design
"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import React, { useState, FormEvent, useEffect, useMemo } from "react";
import { toast } from "sonner";
import StyledButton from "./components/animuse/shared/StyledButton";
import { useAnimationOptimization, useParticleOptimization, useBackgroundOptimization } from "../convex/useMobileOptimizations";

// Brutalist Geometric Shape Component
const BrutalistShape: React.FC<{ 
  type: 'square' | 'triangle' | 'circle' | 'rectangle';
  size: 'small' | 'medium' | 'large';
  position: { x: number; y: number };
  color: string;
  rotation?: number;
}> = ({ type, size, position, color, rotation = 0 }) => {
  const sizeMap = {
    small: 'w-8 h-8',
    medium: 'w-16 h-16', 
    large: 'w-24 h-24'
  };

  const getShape = () => {
    switch (type) {
      case 'triangle':
        return (
          <div 
            className={`${sizeMap[size]} ${color}`}
            style={{
              clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
              transform: `rotate(${rotation}deg)`,
              position: 'absolute',
              left: `${position.x}%`,
              top: `${position.y}%`,
            }}
          />
        );
      case 'circle':
        return (
          <div 
            className={`${sizeMap[size]} ${color} rounded-full`}
            style={{
              transform: `rotate(${rotation}deg)`,
              position: 'absolute',
              left: `${position.x}%`,
              top: `${position.y}%`,
            }}
          />
        );
      case 'rectangle':
        return (
          <div 
            className={`${sizeMap[size]} ${color} w-32 h-12`}
            style={{
              transform: `rotate(${rotation}deg)`,
              position: 'absolute',
              left: `${position.x}%`,
              top: `${position.y}%`,
            }}
          />
        );
      default:
        return (
          <div 
            className={`${sizeMap[size]} ${color}`}
            style={{
              transform: `rotate(${rotation}deg)`,
              position: 'absolute',
              left: `${position.x}%`,
              top: `${position.y}%`,
            }}
          />
        );
    }
  };

  return getShape();
};

// Brutalist Loading Component
const BrutalistLoader: React.FC = () => (
  <div className="flex items-center gap-2">
    <div className="w-4 h-4 bg-black animate-bounce" style={{ animationDelay: '0ms' }}></div>
    <div className="w-4 h-4 bg-black animate-bounce" style={{ animationDelay: '150ms' }}></div>
    <div className="w-4 h-4 bg-black animate-bounce" style={{ animationDelay: '300ms' }}></div>
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

  // Brutalist geometric shapes
  const brutalistShapes = useMemo(() => [
    { type: 'square' as const, size: 'large' as const, position: { x: 10, y: 15 }, color: 'bg-yellow-400', rotation: 45 },
    { type: 'triangle' as const, size: 'medium' as const, position: { x: 85, y: 20 }, color: 'bg-red-500', rotation: 0 },
    { type: 'circle' as const, size: 'small' as const, position: { x: 15, y: 75 }, color: 'bg-blue-600', rotation: 0 },
    { type: 'rectangle' as const, size: 'medium' as const, position: { x: 75, y: 80 }, color: 'bg-green-500', rotation: 30 },
    { type: 'square' as const, size: 'small' as const, position: { x: 50, y: 10 }, color: 'bg-purple-600', rotation: 0 },
    { type: 'triangle' as const, size: 'large' as const, position: { x: 90, y: 60 }, color: 'bg-orange-500', rotation: 180 },
    { type: 'circle' as const, size: 'medium' as const, position: { x: 5, y: 45 }, color: 'bg-pink-500', rotation: 0 },
  ], []);

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
    <div className="relative min-h-screen bg-white overflow-hidden">
      {/* Brutalist Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Geometric Shapes */}
        {brutalistShapes.map((shape, index) => (
          <BrutalistShape
            key={index}
            type={shape.type}
            size={shape.size}
            position={shape.position}
            color={shape.color}
            rotation={shape.rotation}
          />
        ))}

        {/* Bold Typography Background */}
        <div className="absolute top-20 left-10 transform -rotate-12 opacity-10">
          <span className="text-9xl font-black text-black">ANIME</span>
        </div>
        <div className="absolute bottom-20 right-10 transform rotate-12 opacity-10">
          <span className="text-9xl font-black text-black">MUSE</span>
        </div>

        {/* Grid Pattern */}
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}></div>

        {/* Bold Stripes */}
        <div className="absolute top-0 left-1/4 w-2 h-full bg-black opacity-20 transform rotate-12"></div>
        <div className="absolute top-0 right-1/3 w-3 h-full bg-red-500 opacity-30 transform -rotate-6"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full flex items-center justify-center min-h-screen px-4 py-8">
        <div className="w-full max-w-md">
          {/* Brutalist Form Card */}
          <div className="relative">
            {/* Bold Border Frame */}
            <div className="absolute -inset-4 bg-black transform rotate-1"></div>
            <div className="absolute -inset-3 bg-yellow-400 transform -rotate-1"></div>
            
            {/* Main Form Container */}
            <div className="relative bg-white border-8 border-black p-8 transform rotate-0 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
              {/* Brutalist Header */}
              <div className="text-center mb-8">
                <div className="relative mb-6">
                  <div className="absolute -inset-2 bg-red-500 transform rotate-3"></div>
                  <div className="relative bg-white border-4 border-black p-4 text-center">
                    <span className="text-4xl font-black text-black">
                      {flow === "signIn" ? "SIGN IN" : "SIGN UP"}
                    </span>
                  </div>
                </div>
                <div className="bg-black text-white p-3 font-bold text-lg transform -rotate-1 inline-block">
                  {flow === "signIn" 
                    ? "ENTER THE ZONE" 
                    : "JOIN THE REVOLUTION"
                  }
                </div>
              </div>

              {/* Form */}
              <form className="space-y-6" onSubmit={handleSubmit}>
                {/* Email Field */}
                <div className="relative">
                  <div className="absolute -inset-1 bg-blue-500 transform rotate-1"></div>
                  <div className="relative bg-white border-4 border-black">
                    <label className="block bg-black text-white text-xs font-bold px-2 py-1 uppercase tracking-wide">
                      EMAIL ADDRESS
                    </label>
                    <input
                      className="w-full bg-white border-0 px-4 py-4 text-black placeholder-gray-500 font-mono text-lg focus:outline-none focus:ring-0"
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
                <div className="relative">
                  <div className="absolute -inset-1 bg-red-500 transform -rotate-1"></div>
                  <div className="relative bg-white border-4 border-black">
                    <label className="block bg-black text-white text-xs font-bold px-2 py-1 uppercase tracking-wide">
                      PASSWORD
                    </label>
                    <div className="relative">
                      <input
                        className="w-full bg-white border-0 px-4 py-4 pr-12 text-black placeholder-gray-500 font-mono text-lg focus:outline-none focus:ring-0"
                        type={showPassword ? "text" : "password"}
                        name="password"
                        placeholder="••••••••"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete={flow === "signIn" ? "current-password" : "new-password"}
                        disabled={submitting}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-4 flex items-center text-black hover:text-red-500 font-bold"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        disabled={submitting}
                      >
                        {showPassword ? "HIDE" : "SHOW"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Confirm Password Field (Sign Up Only) */}
                {flow === "signUp" && (
                  <div className="relative">
                    <div className="absolute -inset-1 bg-green-500 transform rotate-1"></div>
                    <div className="relative bg-white border-4 border-black">
                      <label className="block bg-black text-white text-xs font-bold px-2 py-1 uppercase tracking-wide">
                        CONFIRM PASSWORD
                      </label>
                      <div className="relative">
                        <input
                          className="w-full bg-white border-0 px-4 py-4 pr-12 text-black placeholder-gray-500 font-mono text-lg focus:outline-none focus:ring-0"
                          type={showPasswordConfirm ? "text" : "password"}
                          name="passwordConfirm"
                          placeholder="••••••••"
                          required
                          value={passwordConfirm}
                          onChange={(e) => setPasswordConfirm(e.target.value)}
                          autoComplete="new-password"
                          disabled={submitting}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                          className="absolute inset-y-0 right-4 flex items-center text-black hover:text-green-500 font-bold"
                          aria-label={showPasswordConfirm ? "Hide confirm password" : "Show confirm password"}
                          disabled={submitting}
                        >
                          {showPasswordConfirm ? "HIDE" : "SHOW"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <div className="relative">
                  <div className="absolute -inset-2 bg-yellow-400 transform rotate-2"></div>
                  <div className="absolute -inset-1 bg-black transform -rotate-1"></div>
                  <button
                    type="submit"
                    className="relative w-full bg-red-500 hover:bg-red-600 border-4 border-black text-white font-black text-xl py-6 px-8 uppercase tracking-wider shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transform hover:translate-x-1 hover:translate-y-1 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <span className="flex items-center justify-center gap-3">
                        <BrutalistLoader />
                        {flow === "signIn" ? "SIGNING IN..." : "CREATING..."}
                      </span>
                    ) : (
                      <span>
                        {flow === "signIn" ? "SIGN IN NOW!" : "CREATE ACCOUNT!"}
                      </span>
                    )}
                  </button>
                </div>

                {/* Flow Toggle */}
                <div className="text-center">
                  <div className="bg-black text-white p-3 inline-block transform -rotate-1">
                    <span className="text-sm font-bold">
                      {flow === "signIn"
                        ? "NEW USER? "
                        : "HAVE ACCOUNT? "}
                    </span>
                    <button
                      type="button"
                      className="font-black text-yellow-400 hover:text-red-500 cursor-pointer underline decoration-4 underline-offset-2"
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
                      {flow === "signIn" ? "SIGN UP!" : "SIGN IN!"}
                    </button>
                  </div>
                </div>
              </form>

              {/* Divider */}
              <div className="my-8 flex items-center">
                <div className="flex-grow h-1 bg-black"></div>
                <div className="mx-4 bg-yellow-400 border-2 border-black px-4 py-2 transform rotate-2">
                  <span className="text-black font-black text-sm uppercase tracking-wider">OR</span>
                </div>
                <div className="flex-grow h-1 bg-black"></div>
              </div>

              {/* Anonymous Sign In */}
              <div className="relative">
                <div className="absolute -inset-2 bg-purple-500 transform -rotate-2"></div>
                <div className="absolute -inset-1 bg-black transform rotate-1"></div>
                <button
                  className="relative w-full bg-white hover:bg-gray-100 border-4 border-black text-black font-black text-xl py-6 px-8 uppercase tracking-wider shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transform hover:translate-x-1 hover:translate-y-1 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleAnonymousSignIn}
                  disabled={submitting}
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-3">
                      <BrutalistLoader />
                      PROCESSING...
                    </span>
                  ) : (
                    <span>
                      BETA TEST
                    </span>
                  )}
                </button>
              </div>

              {/* Footer Note */}
              <div className="mt-8 text-center">
                <div className="bg-black text-white p-4 transform rotate-1 inline-block border-4 border-black">
                  <p className="text-xs font-bold leading-relaxed uppercase tracking-wide">
                    BY CONTINUING, YOU AGREE TO OUR TERMS
                    <br />
                    JOIN THE ANIME REVOLUTION
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Brutalist Custom CSS */}
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
        
        @keyframes brutalist-pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }

        @keyframes brutalist-shake {
          0%, 100% {
            transform: translateX(0);
          }
          25% {
            transform: translateX(-2px) rotate(1deg);
          }
          75% {
            transform: translateX(2px) rotate(-1deg);
          }
        }

        .brutalist-hover:hover {
          animation: brutalist-shake 0.3s ease-in-out;
        }

        .brutalist-focus:focus {
          animation: brutalist-pulse 0.5s ease-in-out;
        }

        .font-brutal {
          font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
          font-weight: 900;
          letter-spacing: 0.1em;
        }

        .text-shadow-brutal {
          text-shadow: 3px 3px 0px rgba(0,0,0,1);
        }

        .transform-brutal {
          transform: perspective(1000px) rotateX(5deg) rotateY(-5deg);
        }
      `}</style>
    </div>
  );
}