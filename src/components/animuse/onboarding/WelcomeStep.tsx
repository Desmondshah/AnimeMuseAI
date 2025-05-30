// src/components/animuse/onboarding/WelcomeStep.tsx - Advanced Artistic Version
import React, { useState, useEffect } from "react";

interface WelcomeStepProps {
  data: { name: string };
  updateData: (data: { name: string }) => void;
}

// Floating Animation Component
const FloatingElement: React.FC<{ children: React.ReactNode; delay?: number }> = ({ 
  children, 
  delay = 0 
}) => (
  <div 
    className="animate-bounce"
    style={{ 
      animationDelay: `${delay}s`,
      animationDuration: '3s'
    }}
  >
    {children}
  </div>
);

export default function WelcomeStep({ data, updateData }: WelcomeStepProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (data.name) {
      setIsTyping(true);
      const timer = setTimeout(() => setIsTyping(false), 500);
      return () => clearTimeout(timer);
    }
  }, [data.name]);

  return (
    <div className="relative min-h-[300px] flex flex-col items-center justify-center space-y-8">
      {/* Floating Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-4 left-8 w-16 h-16 bg-gradient-to-br from-brand-primary-action/20 to-transparent rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-6 right-12 w-20 h-20 bg-gradient-to-tl from-brand-accent-gold/15 to-transparent rounded-full blur-xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-4 w-12 h-12 bg-gradient-to-r from-brand-accent-peach/20 to-transparent rounded-full blur-lg animate-pulse delay-2000"></div>
      </div>

      {/* Animated Welcome Icons */}
      <div className="relative z-10 flex items-center justify-center space-x-4 mb-6">
        <FloatingElement delay={0}>
          <div className="text-4xl sm:text-5xl">👋</div>
        </FloatingElement>
        <FloatingElement delay={0.5}>
          <div className="text-4xl sm:text-5xl">✨</div>
        </FloatingElement>
        <FloatingElement delay={1}>
          <div className="text-4xl sm:text-5xl">🎌</div>
        </FloatingElement>
      </div>

      {/* Main Content */}
      <div className="relative z-10 text-center space-y-6 max-w-md">
        {/* Greeting Text */}
        <div className="space-y-4">
          <h3 className="text-2xl sm:text-3xl font-heading text-white font-bold">
            <span className="bg-gradient-to-r from-brand-primary-action to-brand-accent-gold bg-clip-text text-transparent">
              Welcome to AniMuse!
            </span>
          </h3>
          
          {/* Animated Description */}
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-brand-accent-peach/20 to-brand-primary-action/20 rounded-2xl blur-xl opacity-50"></div>
            <div className="relative bg-black/30 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
              <p className="text-white/90 text-base sm:text-lg leading-relaxed">
                Let's get to know you a bit to tailor your anime discovery experience.
                <br />
                <span className="text-brand-accent-gold font-medium">What should we call you?</span>
              </p>
            </div>
          </div>
        </div>

        {/* Enhanced Input Field */}
        <div className="relative">
          {/* Input Glow Effect */}
          <div className={`absolute -inset-2 bg-gradient-to-r from-brand-primary-action/40 to-brand-accent-gold/40 rounded-3xl blur-lg transition-opacity duration-300 ${
            isFocused ? 'opacity-100' : 'opacity-0'
          }`}></div>
          
          <div className="relative">
            {/* Input Container */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <div className={`text-2xl transition-all duration-300 ${
                  data.name ? 'animate-bounce' : ''
                }`}>
                  {data.name ? '😊' : '👤'}
                </div>
              </div>
              
              <input
                type="text"
                placeholder="Your Nickname"
                value={data.name}
                onChange={(e) => updateData({ name: e.target.value })}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                className="w-full bg-black/40 backdrop-blur-sm border border-white/20 rounded-2xl pl-16 pr-6 py-4 text-white text-center placeholder-white/60 focus:border-brand-primary-action focus:ring-2 focus:ring-brand-primary-action/50 focus:outline-none transition-all duration-300 text-lg font-medium"
                style={{ 
                  fontSize: "16px", // Prevent iOS zoom
                }}
              />
              
              {/* Typing Indicator */}
              {isTyping && (
                <div className="absolute inset-y-0 right-4 flex items-center">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-brand-accent-gold rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-brand-accent-gold rounded-full animate-bounce delay-100"></div>
                    <div className="w-2 h-2 bg-brand-accent-gold rounded-full animate-bounce delay-200"></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Greeting */}
        {data.name && (
          <div className="relative animate-fade-in-up">
            <div className="absolute -inset-2 bg-gradient-to-r from-green-500/30 to-emerald-400/30 rounded-2xl blur-lg opacity-60 animate-pulse"></div>
            <div className="relative bg-gradient-to-r from-green-500/20 to-emerald-400/20 backdrop-blur-sm border border-green-500/30 rounded-2xl p-4">
              <div className="flex items-center justify-center space-x-3">
                <span className="text-2xl animate-bounce">🎉</span>
                <p className="text-white font-medium text-lg">
                  Nice to meet you, <span className="text-brand-accent-gold font-bold">{data.name}</span>!
                </p>
                <span className="text-2xl animate-bounce delay-200">✨</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Decoration */}
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 flex space-x-2 opacity-60">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="w-2 h-2 bg-gradient-to-r from-brand-primary-action to-brand-accent-gold rounded-full animate-pulse"
            style={{ animationDelay: `${i * 0.2}s` }}
          ></div>
        ))}
      </div>

      {/* Custom CSS */}
      <style jsx>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  );
}