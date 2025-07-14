// src/components/animuse/onboarding/BrutalistOnboardingFlow.tsx - Brutalist Artistic Design
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

const TOTAL_STEPS = 6;

// Brutalist Geometric Shape Component
const BrutalistShape: React.FC<{ 
  type: 'square' | 'triangle' | 'circle' | 'rectangle';
  size: 'small' | 'medium' | 'large';
  position: { x: number; y: number };
  color: string;
  rotation?: number;
}> = ({ type, size, position, color, rotation = 0 }) => {
  const sizeMap = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8', 
    large: 'w-16 h-16'
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
            className={`${sizeMap[size]} ${color} w-12 h-4`}
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

// Brutalist Step Progress Indicator
const BrutalistStepProgress: React.FC<{ 
  currentStep: number; 
  totalSteps: number;
}> = React.memo(({ currentStep, totalSteps }) => (
  <div className="relative mb-8">
    <div className="absolute -inset-2 bg-black transform rotate-1"></div>
    <div className="relative bg-yellow-400 border-4 border-black p-4">
      <div className="flex items-center justify-center space-x-2">
        {Array.from({ length: totalSteps }, (_, i) => {
          const stepNumber = i + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;

          return (
            <div key={stepNumber} className="flex items-center">
              {/* Brutalist Step Circle */}
              <div className={`w-8 h-8 border-2 border-black flex items-center justify-center text-xs font-black ${
                isCompleted 
                  ? 'bg-green-500 text-white' 
                  : isCurrent 
                  ? 'bg-red-500 text-white' 
                  : 'bg-white text-black'
              }`}>
                {isCompleted ? '✓' : stepNumber}
              </div>
              
              {/* Connector Line */}
              {stepNumber < totalSteps && (
                <div className={`w-4 h-1 mx-1 ${
                  stepNumber < currentStep 
                    ? 'bg-green-500' 
                    : 'bg-black'
                }`}></div>
              )}
            </div>
          );
        })}
      </div>
      <div className="text-center mt-2">
        <span className="text-black font-black text-sm uppercase tracking-wider">
          STEP {currentStep} OF {totalSteps}
        </span>
      </div>
    </div>
  </div>
));

export default function BrutalistOnboardingFlow() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    moods: [] as string[],
    genres: [] as string[],
    favoriteAnimes: [] as string[],
    experienceLevel: "",
    dislikedGenres: [] as string[],
  });

  const createUserProfile = useMutation(api.users.createUserProfile);

  // Brutalist geometric shapes
  const brutalistShapes = useMemo(() => [
    { type: 'square' as const, size: 'large' as const, position: { x: 5, y: 10 }, color: 'bg-yellow-400', rotation: 45 },
    { type: 'triangle' as const, size: 'medium' as const, position: { x: 90, y: 15 }, color: 'bg-red-500', rotation: 0 },
    { type: 'circle' as const, size: 'small' as const, position: { x: 10, y: 85 }, color: 'bg-blue-600', rotation: 0 },
    { type: 'rectangle' as const, size: 'medium' as const, position: { x: 85, y: 80 }, color: 'bg-green-500', rotation: 30 },
    { type: 'square' as const, size: 'small' as const, position: { x: 50, y: 5 }, color: 'bg-purple-600', rotation: 0 },
    { type: 'triangle' as const, size: 'large' as const, position: { x: 95, y: 50 }, color: 'bg-orange-500', rotation: 180 },
    { type: 'circle' as const, size: 'medium' as const, position: { x: 3, y: 45 }, color: 'bg-pink-500', rotation: 0 },
  ], []);

  const stepInfo = useMemo(() => ({
    1: { title: "WELCOME", description: "ENTER YOUR NAME", icon: "🎯" },
    2: { title: "MOOD", description: "SET YOUR VIBE", icon: "🎭" },
    3: { title: "GENRES", description: "PICK YOUR STYLE", icon: "🎪" },
    4: { title: "FAVORITES", description: "CHOOSE HEROES", icon: "⭐" },
    5: { title: "EXPERIENCE", description: "SKILL LEVEL", icon: "🎮" },
    6: { title: "DISLIKES", description: "AVOID THESE", icon: "❌" },
  }), []);

  const currentStepInfo = stepInfo[currentStep as keyof typeof stepInfo];

  const updateFormData = useCallback((data: Partial<typeof formData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  }, []);

  const handleNext = useCallback(() => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 1: return formData.name.trim().length > 0;
      case 2: return formData.moods.length > 0;
      case 3: return formData.genres.length > 0;
      case 4: return formData.favoriteAnimes.length > 0;
      case 5: return formData.experienceLevel.length > 0;
      case 6: return true; // Optional step
      default: return false;
    }
  }, [currentStep, formData]);

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    toast.loading("CREATING YOUR PROFILE...", { id: "onboarding-submit" });

    try {
      await createUserProfile({
        name: formData.name,
        favoriteGenres: formData.genres,
        mood: formData.moods[0] || "",
        experience: formData.experienceLevel,
        favoriteAnime: formData.favoriteAnimes,
        dislikedGenres: formData.dislikedGenres,
      });
      
      toast.success("🎉 WELCOME TO ANIMUSE! YOUR JOURNEY BEGINS NOW.", { id: "onboarding-submit" });
      
      setTimeout(() => {
        window.location.href = "/animuse";
      }, 1500);
    } catch (error) {
      console.error("Profile creation error:", error);
      toast.error("ERROR CREATING PROFILE. TRY AGAIN.", { id: "onboarding-submit" });
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, createUserProfile, isSubmitting]);

  const renderCurrentStep = () => {
    const stepProps = { data: formData, updateData: updateFormData };
    
    switch (currentStep) {
      case 1: return <WelcomeStep {...stepProps} />;
      case 2: return <MoodStep {...stepProps} />;
      case 3: return <GenreStep {...stepProps} />;
      case 4: return <FavoritesStep {...stepProps} />;
      case 5: return <ExperienceStep {...stepProps} />;
      case 6: return <DislikedStep {...stepProps} />;
      default: return <WelcomeStep {...stepProps} />;
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
          <span className="text-6xl md:text-9xl font-black text-black">ONBOARD</span>
        </div>
        <div className="absolute bottom-20 right-10 transform rotate-12 opacity-10">
          <span className="text-6xl md:text-9xl font-black text-black">HERO</span>
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
      <div className="relative z-10 flex items-center justify-center min-h-screen px-4 py-8">
        <div className="w-full max-w-4xl">
          {/* Brutalist Header */}
          <div className="text-center mb-8">
            <div className="relative">
              <div className="absolute -inset-4 bg-black transform rotate-2"></div>
              <div className="absolute -inset-2 bg-yellow-400 transform -rotate-1"></div>
              <div className="relative bg-white border-8 border-black p-6 text-center">
                <span className="text-4xl md:text-6xl font-black text-black uppercase tracking-wider">
                  PERSONALIZE YOUR JOURNEY
                </span>
                <div className="mt-4 bg-black text-white p-2 inline-block">
                  <span className="text-sm font-bold uppercase tracking-widest">
                    BUILD YOUR ANIME PROFILE
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Brutalist Step Progress */}
          <BrutalistStepProgress 
            currentStep={currentStep} 
            totalSteps={TOTAL_STEPS} 
          />

          {/* Main Content Card */}
          <div className="relative">
            {/* Bold Border Frame */}
            <div className="absolute -inset-6 bg-black transform rotate-1"></div>
            <div className="absolute -inset-4 bg-red-500 transform -rotate-1"></div>
            
            {/* Main Container */}
            <div className="relative bg-white border-8 border-black p-8 shadow-[20px_20px_0px_0px_rgba(0,0,0,1)]">
              
              {/* Step Header */}
              <div className="text-center mb-8">
                <div className="relative mb-4">
                  <div className="absolute -inset-2 bg-blue-500 transform rotate-2"></div>
                  <div className="relative bg-white border-4 border-black p-4 text-center">
                    <div className="text-4xl mb-2">{currentStepInfo.icon}</div>
                    <span className="text-2xl md:text-3xl font-black text-black uppercase tracking-wider">
                      {currentStepInfo.title}
                    </span>
                  </div>
                </div>
                
                <div className="bg-black text-white p-3 font-bold text-lg transform -rotate-1 inline-block border-4 border-black">
                  <span className="uppercase tracking-wide">{currentStepInfo.description}</span>
                </div>
              </div>

              {/* Step Content */}
              <div className="mb-8">
                {renderCurrentStep()}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between">
                <div>
                  {currentStep > 1 && (
                    <div className="relative">
                      <div className="absolute -inset-1 bg-gray-500 transform rotate-1"></div>
                      <button
                        onClick={handlePrevious}
                        className="relative bg-white hover:bg-gray-100 border-4 border-black text-black font-black text-lg py-3 px-6 uppercase tracking-wider shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transform hover:translate-x-1 hover:translate-y-1 transition-all duration-150"
                      >
                        ← BACK
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  {currentStep < TOTAL_STEPS ? (
                    <div className="relative">
                      <div className="absolute -inset-1 bg-green-500 transform -rotate-1"></div>
                      <button
                        onClick={handleNext}
                        disabled={!canProceed}
                        className={`relative border-4 border-black font-black text-lg py-3 px-6 uppercase tracking-wider shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transform hover:translate-x-1 hover:translate-y-1 transition-all duration-150 ${
                          canProceed 
                            ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        NEXT →
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="absolute -inset-2 bg-yellow-400 transform rotate-2"></div>
                      <div className="absolute -inset-1 bg-black transform -rotate-1"></div>
                      <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="relative bg-red-500 hover:bg-red-600 border-4 border-black text-white font-black text-xl py-4 px-8 uppercase tracking-wider shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transform hover:translate-x-1 hover:translate-y-1 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? 'CREATING...' : '🎉 COMPLETE!'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-8">
                <div className="relative">
                  <div className="absolute -inset-1 bg-black transform rotate-1"></div>
                  <div className="relative bg-white border-2 border-black p-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black text-black uppercase tracking-wider">PROGRESS</span>
                      <span className="text-xs font-black text-black">{Math.round((currentStep / TOTAL_STEPS) * 100)}%</span>
                    </div>
                    <div className="h-4 bg-gray-200 border-2 border-black">
                      <div
                        className="h-full bg-red-500 border-r-2 border-black transition-all duration-300"
                        style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Brutalist Custom CSS */}
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700;800;900&display=swap');
        
        .font-brutal {
          font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
          font-weight: 900;
          letter-spacing: 0.1em;
        }

        .text-shadow-brutal {
          text-shadow: 3px 3px 0px rgba(0,0,0,1);
        }
      `}</style>
    </div>
  );
}