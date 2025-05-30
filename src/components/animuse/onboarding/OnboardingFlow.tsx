// src/components/animuse/onboarding/OnboardingFlow.tsx - Mobile-First Fixed
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

// Simplified Step Progress Indicator - Mobile Optimized
const StepProgressIndicator: React.FC<{ 
  currentStep: number; 
  totalSteps: number;
}> = React.memo(({ currentStep, totalSteps }) => (
  <div className="flex items-center justify-center space-x-2 sm:space-x-3 mb-6 sm:mb-8 px-2">
    {Array.from({ length: totalSteps }, (_, i) => {
      const stepNumber = i + 1;
      const isCompleted = stepNumber < currentStep;
      const isCurrent = stepNumber === currentStep;

      return (
        <div key={stepNumber} className="flex items-center">
          {/* Step Circle - Mobile Optimized */}
          <div className="relative">
            <div className={`w-7 h-7 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold transition-all duration-300 ${
              isCompleted 
                ? 'bg-gradient-to-r from-green-500 to-emerald-400 text-white shadow-md scale-105' 
                : isCurrent 
                ? 'bg-gradient-to-r from-brand-primary-action to-brand-accent-gold text-white shadow-md scale-110' 
                : 'bg-white/10 text-white/60 border border-white/20'
            }`}>
              {isCompleted ? (
                <svg className="w-3 h-3 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                stepNumber
              )}
            </div>
          </div>
          
          {/* Connector Line - Smaller on mobile */}
          {stepNumber < totalSteps && (
            <div className={`w-4 sm:w-8 h-0.5 sm:h-1 mx-1 sm:mx-2 rounded-full transition-all duration-500 ${
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
  const { shouldShowParticles } = useParticleOptimization();
  const { shouldUseGradients, shouldUseBlur } = useBackgroundOptimization();

  const completeOnboarding = useMutation(api.users.completeOnboarding);

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
    <div className="min-h-screen bg-brand-background relative">
      {/* Simplified Background - Mobile Optimized */}
      {shouldShowParticles && shouldUseGradients && (
        <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-30">
          <div className="absolute top-20 left-10 w-32 h-32 sm:w-64 sm:h-64 bg-gradient-to-br from-brand-primary-action/10 to-transparent rounded-full blur-2xl"></div>
          <div className="absolute bottom-32 right-16 w-40 h-40 sm:w-80 sm:h-80 bg-gradient-to-tr from-brand-accent-gold/8 to-transparent rounded-full blur-2xl"></div>
        </div>
      )}

      {/* Main Container - Mobile First */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header - Mobile Optimized */}
        <div className="text-center pt-8 pb-4 px-4">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-heading font-bold mb-2 sm:mb-4">
            <span className={`${shouldUseGradients ? 'bg-gradient-to-r from-brand-primary-action via-brand-accent-gold to-brand-primary-action bg-clip-text text-transparent' : 'text-brand-primary-action'}`}>
              Personalize Your Journey
            </span>
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-white/80 max-w-2xl mx-auto px-2">
            Help us understand your anime preferences for perfect recommendations
          </p>
        </div>

        {/* Step Progress */}
        <StepProgressIndicator 
          currentStep={currentStep} 
          totalSteps={TOTAL_STEPS} 
        />

        {/* Main Content Container */}
        <div className="flex-1 flex flex-col px-4 sm:px-6 lg:px-8 pb-6">
          {/* Step Card - Mobile Optimized */}
          <div className="max-w-4xl mx-auto w-full">
            <div className={`relative ${shouldUseGradients ? 'bg-black/40' : 'bg-black/80'} ${shouldUseBlur ? 'backdrop-blur-xl' : ''} border border-white/20 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden`}>
              
              {/* Step Header - Mobile Optimized */}
              <div className="text-center p-4 sm:p-6 border-b border-white/10">
                <div className={`inline-block p-3 sm:p-4 ${shouldUseGradients ? 'bg-gradient-to-r from-brand-primary-action/20 to-brand-accent-gold/20' : 'bg-brand-primary-action/20'} rounded-full mb-3 sm:mb-4`}>
                  <span className="text-2xl sm:text-3xl md:text-4xl">{currentStepInfo.icon}</span>
                </div>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-heading text-white mb-1 sm:mb-2">
                  {currentStepInfo.title}
                </h2>
                <p className="text-xs sm:text-sm text-white/70">
                  Step {currentStep} of {TOTAL_STEPS} • {currentStepInfo.description}
                </p>
              </div>

              {/* Step Content - Mobile Optimized Container */}
              <div className="p-4 sm:p-6 lg:p-8">
                <div className="max-w-2xl mx-auto">
                  {renderCurrentStep()}
                </div>
              </div>

              {/* Navigation - Mobile Optimized */}
              <div className="flex justify-between items-center p-4 sm:p-6 border-t border-white/10 bg-black/20">
                <div>
                  {currentStep > 1 && (
                    <StyledButton 
                      onClick={prevStep} 
                      variant="ghost" 
                      className="!bg-white/10 !border-white/20 hover:!bg-white/20 !text-white flex items-center gap-2 !text-sm sm:!text-base !px-3 sm:!px-4 !py-2 sm:!py-3"
                      disabled={isSubmitting}
                    >
                      <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                      </svg>
                      <span className="hidden sm:inline">Back</span>
                    </StyledButton>
                  )}
                </div>

                <div>
                  {currentStep < TOTAL_STEPS ? (
                    <StyledButton 
                      onClick={nextStep} 
                      variant="primary"
                      className={`${shouldUseGradients ? '!bg-gradient-to-r !from-brand-primary-action !to-brand-accent-gold hover:!from-brand-accent-gold hover:!to-brand-primary-action' : '!bg-brand-primary-action hover:!bg-brand-accent-gold'} flex items-center gap-2 !text-sm sm:!text-base !px-4 sm:!px-6 !py-2 sm:!py-3`}
                      disabled={isSubmitting}
                    >
                      <span>Next</span>
                      <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </StyledButton>
                  ) : (
                    <StyledButton 
                      onClick={handleSubmit} 
                      variant="primary"
                      className="!bg-gradient-to-r !from-green-500 !to-emerald-400 hover:!from-emerald-400 hover:!to-green-500 flex items-center gap-2 !text-sm sm:!text-base !px-4 sm:!px-6 !py-2 sm:!py-3"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <div className={`w-3 h-3 sm:w-4 sm:h-4 border-2 border-transparent border-t-white rounded-full animate-spin ${shouldUseGPUAcceleration ? 'gpu-accelerate' : ''}`}></div>
                          <span className="hidden sm:inline">Creating...</span>
                        </>
                      ) : (
                        <>
                          <span className="text-sm sm:text-base">🎉</span>
                          <span>Complete</span>
                        </>
                      )}
                    </StyledButton>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Progress Bar - Mobile Optimized */}
          <div className="mt-6 sm:mt-8 max-w-md mx-auto w-full">
            <div className={`h-2 sm:h-3 ${shouldUseGradients ? 'bg-black/40' : 'bg-black/60'} rounded-full overflow-hidden border border-white/20`}>
              <div
                className={`h-full ${shouldUseGradients ? 'bg-gradient-to-r from-brand-primary-action via-brand-accent-gold to-brand-accent-peach' : 'bg-brand-primary-action'} rounded-full transition-all duration-700 ease-out`}
                style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
              >
              </div>
            </div>
            
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-white/60">Progress</span>
              <span className="text-xs text-white/80 font-medium">
                {Math.round((currentStep / TOTAL_STEPS) * 100)}% Complete
              </span>
            </div>
          </div>

          {/* Encouragement Message - Mobile Optimized */}
          <div className="text-center mt-4 sm:mt-6">
            <div className={`inline-flex items-center space-x-2 ${shouldUseGradients ? 'bg-black/30' : 'bg-black/60'} rounded-full px-4 py-2 border border-white/10 max-w-full`}>
              <span className="text-sm sm:text-base flex-shrink-0">✨</span>
              <span className="text-white/80 text-xs sm:text-sm text-center truncate">
                {currentStep === 1 && "Let's get to know you!"}
                {currentStep === 2 && "What's your vibe?"}
                {currentStep === 3 && "Your favorite genres"}
                {currentStep === 4 && "What to avoid"}
                {currentStep === 5 && "Your all-time favorites"}
                {currentStep === 6 && "Almost there!"}
              </span>
              <span className="text-sm sm:text-base flex-shrink-0">🎯</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile-specific styles */}
      <style jsx>{`
        .gpu-accelerate {
          transform: translateZ(0);
          will-change: transform;
        }

        /* Ensure no text overlap on iOS */
        @media (max-width: 768px) {
          * {
            position: relative;
            z-index: auto;
          }
          
          /* Override absolute positioning that causes overlap */
          .absolute {
            position: relative !important;
          }
          
          /* Ensure proper text sizing on iOS */
          html {
            -webkit-text-size-adjust: 100%;
            text-size-adjust: 100%;
          }
          
          /* Fix iOS viewport */
          body {
            -webkit-overflow-scrolling: touch;
            overflow-x: hidden;
          }
        }
        
        /* iOS specific fixes */
        @supports (-webkit-touch-callout: none) {
          .backdrop-blur-xl {
            backdrop-filter: none !important;
            background-color: rgba(0, 0, 0, 0.8) !important;
          }
        }
      `}</style>
    </div>
  );
}