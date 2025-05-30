// src/components/animuse/onboarding/WelcomeStep.tsx - Mobile-Safe Fixed
import React, { useState, useEffect } from "react";

interface WelcomeStepProps {
  data: { name: string };
  updateData: (data: { name: string }) => void;
}

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
    <div className="mobile-container-safe mobile-space-y-safe">
      {/* Welcome Icons - Mobile Safe */}
      <div className="text-center mb-4 sm:mb-6">
        <div className="flex items-center justify-center space-x-2 sm:space-x-4 mb-3 sm:mb-4">
          <span className="text-2xl sm:text-3xl md:text-4xl">👋</span>
          <span className="text-2xl sm:text-3xl md:text-4xl">✨</span>
          <span className="text-2xl sm:text-3xl md:text-4xl">🎌</span>
        </div>
      </div>

      {/* Main Content - Mobile Safe */}
      <div className="text-center mobile-space-y-safe">
        {/* Greeting Text */}
        <div className="mobile-space-y-safe">
          <h3 className="mobile-large-heading-safe bg-gradient-to-r from-brand-primary-action to-brand-accent-gold bg-clip-text text-transparent">
            Welcome to AniMuse!
          </h3>
          
          {/* Description Card - Mobile Safe */}
          <div className="mobile-card-safe">
            <p className="mobile-text-safe text-white/90 leading-relaxed">
              Let's get to know you a bit to tailor your anime discovery experience.
            </p>
            <p className="mobile-text-safe text-brand-accent-gold font-medium mt-2">
              What should we call you?
            </p>
          </div>
        </div>

        {/* Input Field - Mobile Safe */}
        <div className="mobile-space-y-safe">
          <div className={`mobile-card-safe transition-all duration-300 ${
            isFocused ? 'ring-2 ring-brand-primary-action/50 border-brand-primary-action' : ''
          }`}>
            <div className="mobile-flex-safe flex-row items-center justify-center gap-3">
              {/* Icon */}
              <div className="flex-shrink-0">
                <span className={`text-xl sm:text-2xl transition-all duration-300 ${
                  data.name ? '😊' : '👤'
                }`}>
                  {data.name ? '😊' : '👤'}
                </span>
              </div>
              
              {/* Input */}
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Your Nickname"
                  value={data.name}
                  onChange={(e) => updateData({ name: e.target.value })}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  className="mobile-input-safe text-center"
                />
              </div>
              
              {/* Typing Indicator */}
              {isTyping && (
                <div className="flex-shrink-0 flex space-x-1">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-brand-accent-gold rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-brand-accent-gold rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-brand-accent-gold rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Greeting - Mobile Safe */}
        {data.name && (
          <div className="mobile-card-safe bg-gradient-to-r from-green-500/20 to-emerald-400/20 border-green-500/30">
            <div className="mobile-flex-safe flex-row items-center justify-center gap-2 sm:gap-3">
              <span className="text-xl sm:text-2xl flex-shrink-0">🎉</span>
              <p className="mobile-text-safe text-white font-medium text-center">
                Nice to meet you, <span className="text-brand-accent-gold font-bold">{data.name}</span>!
              </p>
              <span className="text-xl sm:text-2xl flex-shrink-0">✨</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}