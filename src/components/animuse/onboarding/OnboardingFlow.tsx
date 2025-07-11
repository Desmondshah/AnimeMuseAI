import React, { useState } from "react";
import WelcomeStep from "./WelcomeStep";
import GenreStep from "./GenreStep";
import MoodStep from "./MoodStep";
import ExperienceStep from "./ExperienceStep";
import FavoritesStep from "./FavoritesStep";
import DislikedStep from "./DislikedStep";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

// Brutalist Shape Components
const BrutalistShape = ({ 
  children, 
  className = "", 
  rotation = 0, 
  color = "bg-red-400" 
}: {
  children?: React.ReactNode;
  className?: string;
  rotation?: number;
  color?: string;
}) => (
  <div 
    className={`absolute ${color} border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] ${className}`}
    style={{ transform: `rotate(${rotation}deg)` }}
  >
    {children}
  </div>
);

const BrutalistStepProgress = ({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) => (
  <div className="flex space-x-2 mb-8">
    {Array.from({ length: totalSteps }, (_, i) => (
      <div
        key={i}
        className={`h-4 w-12 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transform rotate-1 ${
          i < currentStep ? 'bg-green-400' : 'bg-gray-200'
        }`}
      />
    ))}
  </div>
);

interface FormData {
  name: string;
  genres: string[];
  moods: string[];
  experienceLevel: string;
  favoriteAnimes: string[];
  dislikedGenres: string[];
}

const OnboardingFlow: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    genres: [],
    moods: [],
    experienceLevel: "",
    favoriteAnimes: [],
    dislikedGenres: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createUserProfile = useMutation(api.users.createUserProfile);

  const updateData = (data: Partial<FormData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  const steps = [
    WelcomeStep,
    GenreStep,
    MoodStep,
    ExperienceStep,
    FavoritesStep,
    DislikedStep,
  ];

  const CurrentStepComponent = steps[currentStep];

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return formData.name.trim() !== "";
      case 1:
        return formData.genres.length > 0;
      case 2:
        return formData.moods.length > 0;
      case 3:
        return formData.experienceLevel !== "";
      case 4:
        return formData.favoriteAnimes.length > 0;
      case 5:
        return true;
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      await createUserProfile({
        name: formData.name,
        favoriteGenres: formData.genres,
        mood: formData.moods[0] || "",
        experience: formData.experienceLevel,
        favoriteAnime: formData.favoriteAnimes,
        dislikedGenres: formData.dislikedGenres,
      });
    } catch (err) {
      console.error("Failed to create user profile:", err);
      setError("Failed to create profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-yellow-100 relative overflow-hidden">
      {/* Brutalist Background Shapes */}
      <BrutalistShape 
        className="w-32 h-32 top-10 left-10" 
        rotation={15}
        color="bg-red-400"
      />
      <BrutalistShape 
        className="w-20 h-40 top-20 right-20" 
        rotation={-25}
        color="bg-blue-400"
      />
      <BrutalistShape 
        className="w-28 h-16 bottom-20 left-1/4" 
        rotation={45}
        color="bg-green-400"
      />
      <BrutalistShape 
        className="w-16 h-24 top-1/2 right-10" 
        rotation={-10}
        color="bg-purple-400"
      />
      <BrutalistShape 
        className="w-40 h-12 bottom-32 right-1/3" 
        rotation={30}
        color="bg-pink-400"
      />

      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-2xl">
          {/* Brutalist Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-black mb-4 transform -rotate-2 font-['Space_Grotesk']">
              PERSONALIZE
            </h1>
            <h2 className="text-4xl font-black text-red-600 mb-6 transform rotate-1 font-['Space_Grotesk']">
              YOUR JOURNEY
            </h2>
            <BrutalistStepProgress currentStep={currentStep + 1} totalSteps={steps.length} />
          </div>

          {/* Main Content Area */}
          <div className="bg-white border-8 border-black shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] transform rotate-1 p-8">
            <CurrentStepComponent
              data={formData}
              updateData={updateData}
            />

            {error && (
              <div className="mt-6 p-4 bg-red-100 border-4 border-red-600 shadow-[8px_8px_0px_0px_rgba(220,38,38,1)] transform -rotate-1">
                <p className="text-red-800 font-black text-lg font-['Space_Grotesk']">
                  ERROR: {error}
                </p>
              </div>
            )}

            {/* Brutalist Navigation */}
            <div className="flex justify-between mt-8">
              <button
                onClick={prevStep}
                disabled={currentStep === 0}
                className={`px-8 py-4 border-4 border-black font-black text-lg transform rotate-2 transition-all font-['Space_Grotesk'] ${
                  currentStep === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-400 text-black hover:bg-blue-500 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1'
                }`}
              >
                ← BACK
              </button>

              <button
                onClick={nextStep}
                disabled={!canProceed() || isSubmitting}
                className={`px-8 py-4 border-4 border-black font-black text-lg transform -rotate-2 transition-all font-['Space_Grotesk'] ${
                  !canProceed() || isSubmitting
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : currentStep === steps.length - 1
                    ? 'bg-green-400 text-black hover:bg-green-500 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1'
                    : 'bg-red-400 text-black hover:bg-red-500 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1'
                }`}
              >
                {isSubmitting ? 'CREATING...' : currentStep === steps.length - 1 ? 'COMPLETE!' : 'NEXT →'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingFlow;