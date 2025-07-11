// src/components/auth/PasswordReset.tsx
import React, { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Mail, Key, ArrowLeft, CheckCircle } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

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

interface PasswordResetProps {
  onBack: () => void;
}

export function PasswordReset({ onBack }: PasswordResetProps) {
  const [step, setStep] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Brutalist geometric shapes
  const brutalistShapes = useMemo(() => [
    { type: 'square' as const, size: 'medium' as const, position: { x: 8, y: 12 }, color: 'bg-orange-400', rotation: 30 },
    { type: 'triangle' as const, size: 'large' as const, position: { x: 75, y: 20 }, color: 'bg-purple-500', rotation: 45 },
    { type: 'circle' as const, size: 'small' as const, position: { x: 15, y: 65 }, color: 'bg-cyan-500', rotation: 0 },
    { type: 'rectangle' as const, size: 'medium' as const, position: { x: 70, y: 70 }, color: 'bg-lime-500', rotation: -15 },
    { type: 'square' as const, size: 'small' as const, position: { x: 40, y: 8 }, color: 'bg-pink-600', rotation: 45 },
    { type: 'triangle' as const, size: 'medium' as const, position: { x: 85, y: 50 }, color: 'bg-yellow-500', rotation: 120 },
  ], []);

  const requestPasswordReset = useMutation(api.passwordReset.requestPasswordReset);
  const resetPassword = useMutation(api.passwordReset.resetPassword);
  const tokenValidation = useQuery(
    api.passwordReset.validateResetToken,
    token ? { token } : "skip"
  );

  // Check for token in URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const resetToken = urlParams.get("token");
    if (resetToken) {
      setToken(resetToken);
      setStep("reset");
    }
  }, []);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await requestPasswordReset({ email });
      if (result.success) {
        toast.success(result.message);
        // In development, show the token
        if (result.devToken) {
          toast.info(`Dev Token: ${result.devToken}`, { duration: 10000 });
        }
      } else {
        toast.error(result.message);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to send reset email");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await resetPassword({ token, newPassword });
      if (result.success) {
        toast.success(result.message);
        onBack();
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to reset password");
    } finally {
      setIsSubmitting(false);
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
        <div className="absolute top-16 left-8 transform -rotate-6 opacity-10">
          <span className="text-8xl font-black text-black">RESET</span>
        </div>
        <div className="absolute bottom-16 right-8 transform rotate-6 opacity-10">
          <span className="text-8xl font-black text-black">SECURE</span>
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
        <div className="absolute top-0 left-1/6 w-2 h-full bg-black opacity-20 transform rotate-6"></div>
        <div className="absolute top-0 right-1/4 w-3 h-full bg-orange-500 opacity-30 transform -rotate-12"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full flex items-center justify-center min-h-screen px-4 py-8">
        <div className="w-full max-w-md">
          {/* Brutalist Form Card */}
          <div className="relative">
            {/* Bold Border Frame */}
            <div className="absolute -inset-4 bg-black transform rotate-1"></div>
            <div className="absolute -inset-3 bg-orange-400 transform -rotate-1"></div>
            
            {/* Main Form Container */}
            <div className="relative bg-white border-8 border-black p-8 transform rotate-0 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
              {/* Brutalist Header */}
              <div className="text-center mb-8">
                <div className="relative mb-6">
                  <div className="absolute -inset-2 bg-purple-500 transform rotate-3"></div>
                  <div className="relative bg-white border-4 border-black p-4 text-center">
                    <span className="text-4xl font-black text-black">
                      {step === "request" ? "PASSWORD" : "NEW"} 
                    </span>
                    <br />
                    <span className="text-4xl font-black text-black">
                      {step === "request" ? "RESET" : "PASSWORD"}
                    </span>
                  </div>
                </div>
                <div className="bg-black text-white p-3 font-bold text-lg transform -rotate-1 inline-block">
                  {step === "request" 
                    ? "FORGOT YOUR ACCESS?" 
                    : "CREATE NEW ACCESS"
                  }
                </div>
              </div>
              {/* Request Reset Form */}
              {step === "request" && (
                <form onSubmit={handleRequestReset} className="space-y-6">
                  <div className="relative">
                    <div className="absolute -inset-1 bg-blue-500 transform rotate-1"></div>
                    <div className="relative bg-white border-4 border-black">
                      <label className="block bg-black text-white text-xs font-bold px-2 py-1 uppercase tracking-wide">
                        EMAIL ADDRESS
                      </label>
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-white border-0 px-4 py-4 text-black placeholder-gray-500 font-mono text-lg focus:outline-none focus:ring-0"
                        placeholder="your@email.com"
                        required
                      />
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute -inset-2 bg-yellow-400 transform rotate-2"></div>
                    <div className="absolute -inset-1 bg-black transform -rotate-1"></div>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="relative w-full bg-red-500 hover:bg-red-600 border-4 border-black text-white font-black text-xl py-6 px-8 uppercase tracking-wider shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transform hover:translate-x-1 hover:translate-y-1 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <span className="flex items-center justify-center gap-3">
                          <BrutalistLoader />
                          SENDING RESET EMAIL...
                        </span>
                      ) : (
                        "SEND RESET EMAIL!"
                      )}
                    </button>
                  </div>

                  <div className="text-center">
                    <div className="bg-black text-white p-2 inline-block transform rotate-1">
                      <button
                        type="button"
                        onClick={onBack}
                        className="font-black text-yellow-400 hover:text-red-500 cursor-pointer underline decoration-4 underline-offset-2"
                      >
                        ← BACK TO SIGN IN
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Reset Password Form */}
              {step === "reset" && (
                <>
                  {/* Token Validation Status */}
                  {tokenValidation === undefined && (
                    <div className="flex items-center justify-center py-8">
                      <div className="bg-black text-white p-4 border-4 border-black">
                        <div className="flex items-center gap-3">
                          <BrutalistLoader />
                          <span className="font-bold uppercase">VALIDATING TOKEN...</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {tokenValidation && !tokenValidation.valid && (
                    <div className="text-center py-8">
                      <div className="relative mb-6">
                        <div className="absolute -inset-2 bg-red-500 transform rotate-3"></div>
                        <div className="relative bg-white border-4 border-black p-6 text-center">
                          <span className="text-3xl font-black text-black">INVALID TOKEN!</span>
                        </div>
                      </div>
                      <div className="bg-black text-white p-4 mb-6 border-4 border-black">
                        <p className="font-bold uppercase">{tokenValidation.message}</p>
                      </div>
                      <div className="relative">
                        <div className="absolute -inset-2 bg-blue-500 transform -rotate-2"></div>
                        <div className="absolute -inset-1 bg-black transform rotate-1"></div>
                        <button
                          onClick={() => {
                            setStep("request");
                            setToken("");
                          }}
                          className="relative bg-white hover:bg-gray-100 border-4 border-black text-black font-black text-lg py-4 px-6 uppercase tracking-wider shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transform hover:translate-x-1 hover:translate-y-1 transition-all duration-150"
                        >
                          REQUEST NEW RESET LINK
                        </button>
                      </div>
                    </div>
                  )}

                  {tokenValidation && tokenValidation.valid && (
                    <form onSubmit={handleResetPassword} className="space-y-6">
                      <div className="mb-4">
                        <div className="bg-green-500 text-white p-2 border-4 border-black font-bold text-center">
                          ✓ VALID RESET TOKEN
                        </div>
                      </div>

                      <div className="relative">
                        <div className="absolute -inset-1 bg-purple-500 transform rotate-1"></div>
                        <div className="relative bg-white border-4 border-black">
                          <label className="block bg-black text-white text-xs font-bold px-2 py-1 uppercase tracking-wide">
                            NEW PASSWORD
                          </label>
                          <input
                            id="newPassword"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full bg-white border-0 px-4 py-4 text-black placeholder-gray-500 font-mono text-lg focus:outline-none focus:ring-0"
                            placeholder="••••••••"
                            required
                          />
                        </div>
                      </div>

                      <div className="relative">
                        <div className="absolute -inset-1 bg-green-500 transform -rotate-1"></div>
                        <div className="relative bg-white border-4 border-black">
                          <label className="block bg-black text-white text-xs font-bold px-2 py-1 uppercase tracking-wide">
                            CONFIRM NEW PASSWORD
                          </label>
                          <input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full bg-white border-0 px-4 py-4 text-black placeholder-gray-500 font-mono text-lg focus:outline-none focus:ring-0"
                            placeholder="••••••••"
                            required
                          />
                        </div>
                        {confirmPassword && newPassword !== confirmPassword && (
                          <div className="mt-2 bg-red-500 text-white p-2 border-2 border-black font-bold text-center">
                            PASSWORDS DO NOT MATCH!
                          </div>
                        )}
                      </div>

                      <div className="relative">
                        <div className="absolute -inset-2 bg-yellow-400 transform rotate-2"></div>
                        <div className="absolute -inset-1 bg-black transform -rotate-1"></div>
                        <button
                          type="submit"
                          disabled={isSubmitting || newPassword !== confirmPassword}
                          className="relative w-full bg-red-500 hover:bg-red-600 border-4 border-black text-white font-black text-xl py-6 px-8 uppercase tracking-wider shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transform hover:translate-x-1 hover:translate-y-1 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSubmitting ? (
                            <span className="flex items-center justify-center gap-3">
                              <BrutalistLoader />
                              RESETTING PASSWORD...
                            </span>
                          ) : (
                            "RESET PASSWORD!"
                          )}
                        </button>
                      </div>

                      <div className="text-center">
                        <div className="bg-black text-white p-2 inline-block transform rotate-1">
                          <button
                            type="button"
                            onClick={onBack}
                            className="font-black text-yellow-400 hover:text-red-500 cursor-pointer underline decoration-4 underline-offset-2"
                          >
                            ← BACK TO SIGN IN
                          </button>
                        </div>
                      </div>
                    </form>
                  )}
                </>
              )}

              {/* Footer Note */}
              <div className="mt-8 text-center">
                <div className="bg-black text-white p-4 transform rotate-1 inline-block border-4 border-black">
                  <p className="text-xs font-bold leading-relaxed uppercase tracking-wide">
                    SECURE PASSWORD RESET SYSTEM
                    <br />
                    YOUR SECURITY IS OUR PRIORITY
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
