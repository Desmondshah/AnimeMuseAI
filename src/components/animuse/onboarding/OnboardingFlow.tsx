// src/components/animuse/onboarding/OnboardingFlow.tsx - Optimized for Mobile Performance
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { toast } from "sonner";
import WelcomeStep from "./WelcomeStep";
import MoodStep from "./MoodStep";
import GenreStep from "./GenreStep";
import FavoritesStep from "./FavoritesStep";
import ExperienceStep from "./ExperienceStep";
import DislikedStep from "./DislikedStep";
import StyledButton from "../shared/StyledButton";
import { useAnimationOptimization, useParticleOptimization, useBackgroundOptimization } from "../../../../convex/useMobileOptimizations";

const TOTAL_STEPS = 6;

// Optimized Floating Particle Component
const FloatingParticle: React.FC<{ 
  delay?: number; 
  size?: string; 
  color?: string;
  shouldRender: boolean;
}> = ({ delay = 0, size = "w-2 h-2", color = "bg-brand-accent-gold/30", shouldRender }) => {
  if (!shouldRender) return null;
  
  return (
    <div 
      className={`absolute ${size} ${color} rounded-full animate-ping`}
      style={{ 
        animationDelay: `${delay}s`, 
        left: `${Math.random() * 100}%`, 
        top: `${Math.random() * 100}%`,
        animationDuration: `${2 + Math.random() * 3}s`
      }}
    ></div>
  );
};

// Optimized Step Progress Indicator
const StepProgressIndicator: React.FC<{ 
  currentStep: number; 
  totalSteps: number;
  shouldAnimate: boolean;
}> = React.memo(({ currentStep, totalSteps, shouldAnimate }) => (
  <div className="flex items-center justify-center space-x-3 mb-8">
    {Array.from({ length: totalSteps }, (_, i) => {
      const stepNumber = i + 1;
      const isCompleted = stepNumber < currentStep;
      const isCurrent = stepNumber === currentStep;

      return (
        <div key={stepNumber} className="flex items-center">
          {/* Step Circle */}
          <div className="relative">
            {isCurrent && shouldAnimate && (
              <div className="absolute -inset-2 bg-gradient-to-r from-brand-primary-action/50 to-brand-accent-gold/50 rounded-full blur-lg animate-pulse"></div>
            )}
            <div className={`relative w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${shouldAnimate ? 'transition-all duration-300' : ''} ${
              isCompleted 
                ? 'bg-gradient-to-r from-green-500 to-emerald-400 text-white shadow-lg transform scale-110' 
                : isCurrent 
                ? `bg-gradient-to-r from-brand-primary-action to-brand-accent-gold text-white shadow-lg transform scale-125 ${shouldAnimate ? 'animate-pulse' : ''}` 
                : 'bg-white/10 text-white/60 border border-white/20'
            }`}>
              {isCompleted ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                stepNumber
              )}
            </div>
          </div>
          
          {/* Connector Line */}
          {stepNumber < totalSteps && (
            <div className={`w-8 h-1 mx-2 rounded-full ${shouldAnimate ? 'transition-all duration-500' : ''} ${
              stepNumber < currentStep 
                ? 'bg-gradient-to-r from-green-500 to-emerald-400' 
                : 'bg-white/20'
            }`}></div>
          )}
        </div>
      );
    })}
  </div>
));

// Optimized Step Animation Wrapper
const StepWrapper: React.FC<{ 
  children: React.ReactNode; 
  currentStep: number; 
  isVisible: boolean;
  shouldAnimate: boolean;
}> = React.memo(({ children, currentStep, isVisible, shouldAnimate }) => {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (isVisible && shouldAnimate) {
      const timer = setTimeout(() => setAnimate(true), 50);
      return () => clearTimeout(timer);
    } else if (isVisible) {
      setAnimate(true);
    }
  }, [isVisible, shouldAnimate]);

  return (
    <div className={`${shouldAnimate ? 'transform transition-all duration-500' : ''} ${
      animate 
        ? 'translate-x-0 opacity-100 scale-100' 
        : shouldAnimate ? 'translate-x-8 opacity-0 scale-95' : 'opacity-100'
    }`}>
      {children}
    </div>
  );
});

export default function OnboardingFlow() {
  const [currentStep, setCurrentStep] = useState(1);
  const [onboardingData, setOnboardingData] = useState({
    name: "",
    moods: [] as string[],
    genres: [] as string[],
    favoriteAnimes: [] as string[],
    experienceLevel: "",
    dislikedGenres: [] as string[],
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Optimization hooks
  const { shouldAnimate, shouldUseGPUAcceleration } = useAnimationOptimization();
  const { shouldShowParticles, getOptimalParticleCount } = useParticleOptimization();
  const { shouldUseGradients, shouldUseBlur } = useBackgroundOptimization();

  const completeOnboarding = useMutation(api.users.completeOnboarding);

  // Optimized particle generation
  const particles = useMemo(() => {
    const baseCount = 12;
    const optimizedCount = getOptimalParticleCount(baseCount);
    return Array.from({ length: optimizedCount }, (_, i) => i);
  }, [getOptimalParticleCount]);

  const nextStep = useCallback(() => setCurrentStep((prev) => Math.min(prev + 1, TOTAL_STEPS)), []);
  const prevStep = useCallback(() => setCurrentStep((prev) => Math.max(prev - 1, 1)), []);

  const updateData = useCallback((data: Partial<typeof onboardingData>) => {
    setOnboardingData((prev) => ({ ...prev, ...data }));
  }, []);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    toast.loading("Creating your personalized profile...", { id: "onboarding-submit" });
    
    try {
      await completeOnboarding({
        name: onboardingData.name,
        moods: onboardingData.moods,
        genres: onboardingData.genres,
        favoriteAnimes: onboardingData.favoriteAnimes,
        experienceLevel: onboardingData.experienceLevel,
        dislikedGenres: onboardingData.dislikedGenres,
      });
      toast.success("🎉 Welcome to AniMuse! Your anime journey begins now.", { id: "onboarding-submit" });
    } catch (error) {
      console.error("Failed to complete onboarding:", error);
      toast.error("Could not save preferences. Please try again.", { id: "onboarding-submit" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStepInfo = useCallback((step: number) => {
    const stepInfo = {
      1: { title: "Welcome", icon: "👋", description: "Let's get started" },
      2: { title: "Your Vibe", icon: "😌", description: "What's your mood?" },
      3: { title: "Favorite Genres", icon: "🎭", description: "What do you love?" },
      4: { title: "Avoid These", icon: "🚫", description: "What to skip?" },
      5: { title: "Your Favorites", icon: "⭐", description: "Top anime picks" },
      6: { title: "Experience Level", icon: "🎯", description: "How deep are you?" },
    };
    return stepInfo[step as keyof typeof stepInfo] || stepInfo[1];
  }, []);

  const renderCurrentStep = useCallback(() => {
    const steps = {
      1: <WelcomeStep data={onboardingData} updateData={updateData} />,
      2: <MoodStep data={onboardingData} updateData={updateData} />,
      3: <GenreStep data={onboardingData} updateData={updateData} />,
      4: <DislikedStep data={onboardingData} updateData={updateData} />,
      5: <FavoritesStep data={onboardingData} updateData={updateData} />,
      6: <ExperienceStep data={onboardingData} updateData={updateData} />,
    };
    return steps[currentStep as keyof typeof steps] || steps[1];
  }, [currentStep, onboardingData, updateData]);

  const currentStepInfo = useMemo(() => getStepInfo(currentStep), [currentStep, getStepInfo]);

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-8 overflow-hidden">
      {/* Optimized Floating Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Primary gradient orbs - Conditionally rendered */}
        {shouldUseGradients && (
          <>
            <div className={`absolute top-20 left-10 w-80 h-80 bg-gradient-to-br from-brand-primary-action/15 to-transparent rounded-full ${shouldUseBlur ? 'blur-3xl' : ''} ${shouldAnimate ? 'animate-pulse' : ''}`}></div>
            <div className={`absolute bottom-32 right-16 w-96 h-96 bg-gradient-to-tr from-brand-accent-gold/12 to-transparent rounded-full ${shouldUseBlur ? 'blur-3xl' : ''} ${shouldAnimate ? 'animate-pulse' : ''}`} style={{ animationDelay: '1s' }}></div>
            <div className={`absolute top-1/2 right-1/4 w-64 h-64 bg-gradient-to-l from-brand-accent-peach/10 to-transparent rounded-full ${shouldUseBlur ? 'blur-3xl' : ''} ${shouldAnimate ? 'animate-pulse' : ''}`} style={{ animationDelay: '2s' }}></div>
            <div className={`absolute bottom-1/4 left-1/3 w-72 h-72 bg-gradient-to-r from-purple-500/8 to-transparent rounded-full ${shouldUseBlur ? 'blur-3xl' : ''} ${shouldAnimate ? 'animate-pulse' : ''}`} style={{ animationDelay: '3s' }}></div>
          </>
        )}

        {/* Optimized floating particles */}
        {shouldShowParticles && particles.map((particle) => (
          <FloatingParticle
            key={particle}
            delay={particle * 0.4}
            shouldRender={shouldShowParticles}
            size={Math.random() > 0.7 ? "w-3 h-3" : "w-2 h-2"}
            color={
              Math.random() > 0.6
                ? "bg-brand-primary-action/20"
                : Math.random() > 0.3
                  ? "bg-brand-accent-gold/20"
                  : "bg-brand-accent-peach/20"
            }
          />
        ))}

        {/* Simplified animated grid pattern */}
        {shouldUseGradients && (
          <div className="absolute inset-0 opacity-5">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)",
                backgroundSize: "50px 50px",
                ...(shouldAnimate && {
                  animation: "float 20s ease-in-out infinite",
                })
              }}
            ></div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-block group">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-heading font-bold mb-4">
              <span className={`${shouldUseGradients ? 'bg-gradient-to-r from-brand-primary-action via-brand-accent-gold via-brand-accent-peach to-brand-primary-action bg-clip-text text-transparent' : 'text-brand-primary-action'} ${shouldAnimate ? 'animate-pulse' : ''}`}>
                Personalize Your Journey
              </span>
            </h1>
            {shouldUseGradients && (
              <div className={`h-1 w-full bg-gradient-to-r from-transparent via-brand-primary-action via-brand-accent-gold to-transparent ${shouldAnimate ? 'animate-pulse group-hover:animate-none transition-opacity duration-500' : ''}`}></div>
            )}
          </div>
          <p className="text-lg text-white/80 mt-4">
            Help us understand your anime preferences for the perfect recommendations
          </p>
        </div>

        {/* Step Progress */}
        <StepProgressIndicator 
          currentStep={currentStep} 
          totalSteps={TOTAL_STEPS} 
          shouldAnimate={shouldAnimate}
        />

        {/* Enhanced Main Card */}
        <div className="relative">
          {/* Card Glow Effect - Conditionally rendered */}
          {shouldUseGradients && (
            <div className={`absolute -inset-6 bg-gradient-to-r from-brand-primary-action/30 via-brand-accent-gold/20 to-brand-accent-peach/30 rounded-3xl ${shouldUseBlur ? 'blur-2xl' : ''} opacity-60 ${shouldAnimate ? 'animate-pulse' : ''}`}></div>
          )}
          
          {/* Main Card Container */}
          <div className={`relative ${shouldUseGradients ? 'bg-black/40' : 'bg-black/80'} ${shouldUseBlur ? 'backdrop-blur-xl' : ''} border border-white/20 rounded-3xl p-8 sm:p-10 shadow-2xl min-h-[500px] flex flex-col`}>
            {/* Simplified background pattern */}
            {shouldUseGradients && (
              <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent transform rotate-45"></div>
              </div>
            )}
            
            <div className="relative z-10 flex-1 flex flex-col">
              {/* Step Header */}
              <div className="text-center mb-8">
                <div className={`inline-block p-4 ${shouldUseGradients ? 'bg-gradient-to-r from-brand-primary-action/20 to-brand-accent-gold/20' : 'bg-brand-primary-action/20'} rounded-full mb-4 ${shouldAnimate ? 'transform hover:scale-110 transition-transform duration-300' : ''}`}>
                  <span className="text-4xl">{currentStepInfo.icon}</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-heading text-white mb-2">
                  {currentStepInfo.title}
                </h2>
                <p className="text-white/70 text-sm">
                  Step {currentStep} of {TOTAL_STEPS} • {currentStepInfo.description}
                </p>
              </div>

              {/* Step Content */}
              <div className="flex-1 flex items-center justify-center">
                <div className="w-full max-w-lg sm:max-w-xl md:max-w-2xl">
                  <StepWrapper 
                    currentStep={currentStep} 
                    isVisible={true} 
                    shouldAnimate={shouldAnimate}
                  >
                    {renderCurrentStep()}
                  </StepWrapper>
                </div>
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between items-center mt-8 pt-6 border-t border-white/10">
                <div className="relative group">
                  {currentStep > 1 && (
                    <>
                      {shouldUseGradients && (
                        <div className={`absolute -inset-2 bg-gradient-to-r from-white/20 to-gray-300/20 rounded-2xl ${shouldUseBlur ? 'blur-lg' : ''} opacity-0 group-hover:opacity-100 ${shouldAnimate ? 'transition-opacity duration-300' : 'transition-none'}`}></div>
                      )}
                      <StyledButton 
                        onClick={prevStep} 
                        variant="ghost" 
                        className={`relative ${shouldUseGradients ? '!bg-white/10' : '!bg-white/20'} ${shouldUseBlur ? '!backdrop-blur-sm' : ''} !border-white/20 hover:!bg-white/20 !text-white flex items-center gap-2`}
                        disabled={isSubmitting}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                        </svg>
                        Back
                      </StyledButton>
                    </>
                  )}
                </div>

                <div className="relative group">
                  {shouldUseGradients && (
                    <div className={`absolute -inset-2 bg-gradient-to-r from-brand-primary-action/50 to-brand-accent-gold/50 rounded-2xl ${shouldUseBlur ? 'blur-lg' : ''} opacity-60 group-hover:opacity-100 ${shouldAnimate ? 'transition-opacity duration-300' : 'transition-none'}`}></div>
                  )}
                  {currentStep < TOTAL_STEPS ? (
                    <StyledButton 
                      onClick={nextStep} 
                      variant="primary"
                      className={`relative ${shouldUseGradients ? '!bg-gradient-to-r !from-brand-primary-action !to-brand-accent-gold hover:!from-brand-accent-gold hover:!to-brand-primary-action' : '!bg-brand-primary-action hover:!bg-brand-accent-gold'} ${shouldAnimate ? '!transition-all !duration-500' : '!transition-none'} !shadow-lg hover:!shadow-brand-primary-action/25 flex items-center gap-2`}
                      disabled={isSubmitting}
                    >
                      Next
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </StyledButton>
                  ) : (
                    <StyledButton 
                      onClick={handleSubmit} 
                      variant="primary"
                      className={`relative !bg-gradient-to-r !from-green-500 !to-emerald-400 hover:!from-emerald-400 hover:!to-green-500 ${shouldAnimate ? '!transition-all !duration-500' : '!transition-none'} !shadow-lg hover:!shadow-green-500/25 flex items-center gap-2`}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <div className={`w-4 h-4 border-2 border-transparent border-t-white rounded-full animate-spin ${shouldUseGPUAcceleration ? 'gpu-accelerate' : ''}`}></div>
                          Creating Profile...
                        </>
                      ) : (
                        <>
                          <span className="text-lg">🎉</span>
                          Complete Setup
                        </>
                      )}
                    </StyledButton>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Progress Bar */}
        <div className="mt-8">
          <div className="relative">
            <div className={`h-3 ${shouldUseGradients ? 'bg-black/40' : 'bg-black/60'} rounded-full overflow-hidden ${shouldUseBlur ? 'backdrop-blur-sm' : ''} border border-white/20`}>
              <div
                className={`h-full ${shouldUseGradients ? 'bg-gradient-to-r from-brand-primary-action via-brand-accent-gold to-brand-accent-peach' : 'bg-brand-primary-action'} rounded-full ${shouldAnimate ? 'transition-all duration-700 ease-out' : ''} relative overflow-hidden`}
                style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
              >
                {/* Animated shine effect - only if animations enabled */}
                {shouldAnimate && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
                )}
              </div>
            </div>
            
            {/* Progress Text */}
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-white/60">Progress</span>
              <span className="text-xs text-white/80 font-medium">
                {Math.round((currentStep / TOTAL_STEPS) * 100)}% Complete
              </span>
            </div>
          </div>
        </div>

        {/* Encouragement Message */}
        <div className="text-center mt-8">
          <div className={`inline-flex items-center space-x-2 ${shouldUseGradients ? 'bg-black/30' : 'bg-black/60'} ${shouldUseBlur ? 'backdrop-blur-sm' : ''} rounded-full px-6 py-3 border border-white/10`}>
            <span className={`text-lg ${shouldAnimate ? 'animate-bounce' : ''}`}>✨</span>
            <span className="text-white/80 text-sm">
              {currentStep === 1 && "Let's get to know you better!"}
              {currentStep === 2 && "What's your current mood for anime?"}
              {currentStep === 3 && "Tell us about your favorite genres"}
              {currentStep === 4 && "Help us avoid what you don't like"}
              {currentStep === 5 && "Share your all-time favorites"}
              {currentStep === 6 && "Almost there! Last question"}
            </span>
            <span className={`text-lg ${shouldAnimate ? 'animate-bounce' : ''}`} style={{ animationDelay: '0.2s' }}>🎯</span>
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

        .gpu-accelerate {
          transform: translateZ(0);
          will-change: transform;
        }

        /* Performance optimizations */
        @media (max-width: 768px), 
               (prefers-reduced-motion: reduce),
               .low-bandwidth,
               .mobile-device {
          .animate-pulse,
          .animate-bounce {
            animation-duration: 3s;
          }
          
          .blur-3xl,
          .blur-2xl,
          .blur-xl {
            filter: blur(8px);
          }
        }

        /* iOS optimizations */
        @media (max-width: 768px) and (-webkit-min-device-pixel-ratio: 2) {
          .backdrop-blur-xl,
          .backdrop-blur-sm {
            backdrop-filter: none;
            background-color: rgba(0, 0, 0, 0.8);
          }
        }
      `}</style>
    </div>
  );
}