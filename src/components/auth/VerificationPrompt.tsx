// src/components/auth/VerificationPrompt.tsx
import React, { useState, useEffect, FormEvent } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";

interface VerificationPromptProps {
  onVerified: () => void;
  userIdForLog?: string;
}

// Brutalist Geometric Shape Component
const BrutalistShape: React.FC<{ 
  type: 'square' | 'triangle' | 'circle' | 'rectangle' | 'diamond';
  size: 'small' | 'medium' | 'large';
  position: { x: number; y: number };
  color: string;
  rotation?: number;
  zIndex?: number;
}> = ({ type, size, position, color, rotation = 0, zIndex = 0 }) => {
  const sizeMap = {
    small: 'w-12 h-12',
    medium: 'w-20 h-20', 
    large: 'w-32 h-32'
  };

  const getShape = () => {
    const baseStyle = {
      transform: `rotate(${rotation}deg)`,
      position: 'absolute' as const,
      left: `${position.x}%`,
      top: `${position.y}%`,
      zIndex: zIndex,
    };

    switch (type) {
      case 'triangle':
        return (
          <div 
            className={`${sizeMap[size]} ${color}`}
            style={{
              ...baseStyle,
              clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
            }}
          />
        );
      case 'circle':
        return (
          <div 
            className={`${sizeMap[size]} ${color} rounded-full`}
            style={baseStyle}
          />
        );
      case 'diamond':
        return (
          <div 
            className={`${sizeMap[size]} ${color}`}
            style={{
              ...baseStyle,
              clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
            }}
          />
        );
      case 'rectangle':
        return (
          <div 
            className={`w-24 h-12 ${color}`}
            style={baseStyle}
          />
        );
      default: // square
        return (
          <div 
            className={`${sizeMap[size]} ${color}`}
            style={baseStyle}
          />
        );
    }
  };

  return getShape();
};

export default function VerificationPrompt({
  onVerified,
  userIdForLog,
}: VerificationPromptProps) {
  const [verificationType, setVerificationType] = useState<'email' | 'phone'>('email');
  const [contact, setContact] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isRequestingCode, setIsRequestingCode] = useState(false);
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);
  const [timeUntilResend, setTimeUntilResend] = useState(0);
  const [hasRequestedOnce, setHasRequestedOnce] = useState(false);

  // Email verification mutations
  const requestEmailCodeMutation = useMutation(api.emailVerification.requestEmailVerificationCode);
  const submitEmailCodeMutation = useMutation(api.emailVerification.submitEmailVerificationCode);
  const resendEmailCodeMutation = useMutation(api.emailVerification.resendEmailVerificationCode);

  // Phone verification mutations  
  const requestSmsCodeMutation = useMutation(api.authActions.requestSmsVerificationCode);
  const submitSmsCodeMutation = useMutation(api.authActions.submitSmsVerificationCode);
  const resendSmsCodeMutation = useMutation(api.authActions.resendSmsVerificationCode);

  // Brutalist geometric shapes for background
  const backgroundShapes = React.useMemo(() => [
    { type: 'square' as const, size: 'large' as const, position: { x: 5, y: 10 }, color: 'bg-red-500', rotation: 15, zIndex: 1 },
    { type: 'triangle' as const, size: 'medium' as const, position: { x: 75, y: 5 }, color: 'bg-blue-600', rotation: -30, zIndex: 2 },
    { type: 'circle' as const, size: 'small' as const, position: { x: 85, y: 75 }, color: 'bg-yellow-400', rotation: 0, zIndex: 1 },
    { type: 'diamond' as const, size: 'medium' as const, position: { x: 10, y: 70 }, color: 'bg-purple-600', rotation: 45, zIndex: 2 },
    { type: 'rectangle' as const, size: 'small' as const, position: { x: 60, y: 85 }, color: 'bg-green-500', rotation: -15, zIndex: 1 },
    { type: 'square' as const, size: 'small' as const, position: { x: 45, y: 15 }, color: 'bg-pink-500', rotation: 30, zIndex: 1 },
    { type: 'triangle' as const, size: 'large' as const, position: { x: 80, y: 45 }, color: 'bg-orange-500', rotation: 180, zIndex: 1 },
    { type: 'circle' as const, size: 'medium' as const, position: { x: 2, y: 40 }, color: 'bg-indigo-600', rotation: 0, zIndex: 2 },
  ], []);

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

  const validateContact = (contact: string, type: 'email' | 'phone'): boolean => {
    if (type === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(contact);
    } else {
      const phoneRegex = /^\+[1-9]\d{1,14}$/;
      return phoneRegex.test(contact);
    }
  };

  const handleRequestCode = async (isResend = false) => {
    if (!contact.trim()) {
      toast.error(`Please enter your ${verificationType === 'email' ? 'email' : 'phone number'}.`);
      return;
    }

    if (!validateContact(contact, verificationType)) {
      toast.error(
        verificationType === 'email' 
          ? 'Invalid email format.' 
          : 'Invalid phone number format. Please use E.164 (e.g., +12223334444).'
      );
      return;
    }

    setIsRequestingCode(true);
    const toastId = `verification-request-${Date.now()}`;
    toast.loading(isResend ? 'Resending code...' : 'Sending verification code...', { id: toastId });
    setHasRequestedOnce(true);

    try {
      const mutationToCall = verificationType === 'email' 
        ? (isResend ? resendEmailCodeMutation : requestEmailCodeMutation)
        : (isResend ? resendSmsCodeMutation : requestSmsCodeMutation);
      
      const args = verificationType === 'email' 
        ? { email: contact } 
        : { phoneNumber: contact };
      
      const result = await mutationToCall(args);
      
      if (result.success) {
        toast.success(result.message, { id: toastId });
        setTimeUntilResend(60);
      } else {
        toast.error(result.message || 'Failed to send code.', { id: toastId });
      }
    } catch (error: any) {
      console.error('Request code error:', error);
      toast.error(error.data?.message || error.message || 'Could not send verification code.', { id: toastId });
      if (error.data?.message?.includes('Too many')) {
        setTimeUntilResend(60);
      }
    } finally {
      setIsRequestingCode(false);
    }
  };

  const handleSubmitCode = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!verificationCode.trim() || !/^\d{6}$/.test(verificationCode)) {
      toast.error('Please enter the 6-digit verification code.');
      return;
    }

    setIsSubmittingCode(true);
    const toastId = `verification-submit-${Date.now()}`;
    toast.loading('Verifying code...', { id: toastId });

    try {
      const mutationToCall = verificationType === 'email' 
        ? submitEmailCodeMutation 
        : submitSmsCodeMutation;
      
      const result = await mutationToCall({ code: verificationCode });
      
      if (result.success) {
        toast.success(result.message || 'Verified successfully!', { id: toastId });
        setVerificationCode('');
        onVerified();
      } else {
        toast.error(result.message || 'Verification failed.', { id: toastId });
      }
    } catch (error: any) {
      console.error('Submit code error:', error);
      toast.error(error.data?.message || error.message || 'Could not verify code.', { id: toastId });
      
      if (error.data?.message?.includes('Invalid') || error.data?.message?.includes('expired')) {
        setVerificationCode('');
      }
    } finally {
      setIsSubmittingCode(false);
    }
  };

  const formatTimeRemaining = (seconds: number): string => {
    if (seconds <= 0) return '';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${remainingSeconds}s`;
  };

  return (
    <div className="relative min-h-screen bg-white overflow-hidden">
      {/* Brutalist Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        {backgroundShapes.map((shape, index) => (
          <BrutalistShape
            key={index}
            type={shape.type}
            size={shape.size}
            position={shape.position}
            color={shape.color}
            rotation={shape.rotation}
            zIndex={shape.zIndex}
          />
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-6">
        <div className="w-full max-w-md">
          {/* Main Card */}
          <div className="relative">
            <div className="absolute -inset-3 bg-black transform rotate-2"></div>
            <div className="relative bg-white border-4 border-black p-8">
              {/* Header */}
              <div className="text-center mb-8">
                <div className="relative">
                  <div className="absolute -inset-2 bg-red-500 transform -rotate-2"></div>
                  <div className="relative bg-black text-white py-3 px-6">
                    <h1 className="text-2xl font-black uppercase tracking-wider">
                      VERIFY IDENTITY
                    </h1>
                  </div>
                </div>
                <p className="mt-4 text-gray-700 font-mono text-sm">
                  Choose your verification method and secure your account.
                </p>
              </div>

              {/* Verification Type Toggle */}
              <div className="mb-6">
                <div className="relative">
                  <div className="absolute -inset-1 bg-blue-500 transform rotate-1"></div>
                  <div className="relative bg-white border-4 border-black">
                    <div className="bg-black text-white text-xs font-bold px-2 py-1 uppercase tracking-wide">
                      VERIFICATION METHOD
                    </div>
                    <div className="p-4 flex gap-2">
                      <button
                        onClick={() => {
                          setVerificationType('email');
                          setContact('');
                          setVerificationCode('');
                          setHasRequestedOnce(false);
                        }}
                        className={`flex-1 py-3 px-4 font-black uppercase text-sm border-4 transition-all transform hover:scale-105 ${
                          verificationType === 'email'
                            ? 'bg-black text-white border-black'
                            : 'bg-white text-black border-black hover:bg-gray-100'
                        }`}
                      >
                        📧 EMAIL
                      </button>
                      <button
                        onClick={() => {
                          setVerificationType('phone');
                          setContact('');
                          setVerificationCode('');
                          setHasRequestedOnce(false);
                        }}
                        className={`flex-1 py-3 px-4 font-black uppercase text-sm border-4 transition-all transform hover:scale-105 ${
                          verificationType === 'phone'
                            ? 'bg-black text-white border-black'
                            : 'bg-white text-black border-black hover:bg-gray-100'
                        }`}
                      >
                        📱 SMS
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Input */}
              {(!hasRequestedOnce || timeUntilResend > 0) && (
                <div className="mb-6">
                  <div className="relative">
                    <div className="absolute -inset-1 bg-green-500 transform -rotate-1"></div>
                    <div className="relative bg-white border-4 border-black">
                      <label className="block bg-black text-white text-xs font-bold px-2 py-1 uppercase tracking-wide">
                        {verificationType === 'email' ? 'EMAIL ADDRESS' : 'PHONE NUMBER'}
                      </label>
                      <input
                        type={verificationType === 'email' ? 'email' : 'tel'}
                        placeholder={verificationType === 'email' ? 'your@email.com' : '+12223334444'}
                        value={contact}
                        onChange={(e) => setContact(e.target.value)}
                        className="w-full bg-white border-0 px-4 py-4 text-black placeholder-gray-500 font-mono text-lg focus:outline-none focus:ring-0"
                        autoComplete={verificationType === 'email' ? 'email' : 'tel'}
                        disabled={isRequestingCode || (hasRequestedOnce && timeUntilResend === 0 && verificationCode !== '')}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Verification Code Input */}
              {hasRequestedOnce && (
                <form onSubmit={handleSubmitCode} className="mb-6">
                  <div className="relative">
                    <div className="absolute -inset-1 bg-purple-500 transform rotate-1"></div>
                    <div className="relative bg-white border-4 border-black">
                      <label className="block bg-black text-white text-xs font-bold px-2 py-1 uppercase tracking-wide">
                        VERIFICATION CODE
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="000000"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="w-full bg-white border-0 px-4 py-4 text-black placeholder-gray-500 font-mono text-3xl text-center tracking-[0.3em] focus:outline-none focus:ring-0"
                        maxLength={6}
                        autoComplete="one-time-code"
                        disabled={isSubmittingCode}
                      />
                    </div>
                  </div>
                  
                  {hasRequestedOnce && (
                    <p className="text-center text-gray-600 text-sm mt-2 font-mono">
                      Code sent to <span className="font-black">{contact}</span>
                    </p>
                  )}

                  {/* Verify Button */}
                  <div className="mt-6">
                    <div className="relative">
                      <div className="absolute -inset-1 bg-green-600 transform -rotate-1"></div>
                      <button
                        type="submit"
                        disabled={isSubmittingCode || verificationCode.length !== 6}
                        className="relative w-full bg-black text-white py-4 border-4 border-black font-black uppercase text-lg tracking-wider hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95"
                      >
                        {isSubmittingCode ? 'VERIFYING...' : 'VERIFY CODE'}
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Send/Resend Button */}
              <div className="mb-6">
                <div className="relative">
                  <div className="absolute -inset-1 bg-yellow-400 transform rotate-1"></div>
                  <button
                    onClick={() => handleRequestCode(!hasRequestedOnce ? false : true)}
                    disabled={isRequestingCode || timeUntilResend > 0 || !contact.trim()}
                    className="relative w-full bg-white text-black py-4 border-4 border-black font-black uppercase text-lg tracking-wider hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95"
                  >
                    {isRequestingCode
                      ? (hasRequestedOnce ? 'RESENDING...' : 'SENDING...')
                      : timeUntilResend > 0
                      ? `RESEND IN ${formatTimeRemaining(timeUntilResend)}`
                      : (hasRequestedOnce ? 'RESEND CODE' : 'SEND CODE')
                    }
                  </button>
                </div>
              </div>

              {/* Info Panel */}
              <div className="relative">
                <div className="absolute -inset-1 bg-blue-400 transform -rotate-1"></div>
                <div className="relative bg-white border-4 border-black p-4">
                  <div className="bg-black text-white text-xs font-bold px-2 py-1 uppercase tracking-wide mb-3">
                    ⚡ SECURITY NOTICE
                  </div>
                  <ul className="text-xs text-gray-700 space-y-1 font-mono">
                    <li>• Code expires in 10 minutes</li>
                    <li>• {verificationType === 'email' ? 'Check your email inbox' : 'Check your SMS messages'}</li>
                    <li>• Enter 6-digit verification code</li>
                    <li>• Maximum 5 attempts per code</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
