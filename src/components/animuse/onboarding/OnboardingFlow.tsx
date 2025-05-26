// src/components/animuse/onboarding/OnboardingFlow.tsx
import React, { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { toast } from "sonner";
import WelcomeStep from "./WelcomeStep";
import MoodStep from "./MoodStep";
import GenreStep from "./GenreStep";
import FavoritesStep from "./FavoritesStep";
import ExperienceStep from "./ExperienceStep";
import DislikedStep from "./DislikedStep"; // Added for Phase 2
import StyledButton from "../shared/StyledButton";

const TOTAL_STEPS = 6; // Updated for Phase 2

export default function OnboardingFlow() {
  const [currentStep, setCurrentStep] = useState(1);
  const [onboardingData, setOnboardingData] = useState({
    name: "",
    moods: [] as string[],
    genres: [] as string[],
    favoriteAnimes: [] as string[],
    experienceLevel: "",
    dislikedGenres: [] as string[], // Added for Phase 2
  });

  const completeOnboarding = useMutation(api.users.completeOnboarding);

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, TOTAL_STEPS));
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  const updateData = (data: Partial<typeof onboardingData>) => {
    setOnboardingData((prev) => ({ ...prev, ...data }));
  };

  const handleSubmit = async () => {
    toast.loading("Saving your preferences...", { id: "onboarding-submit" });
    try {
      // Ensure all data is passed, including new dislikedGenres
      await completeOnboarding({
        name: onboardingData.name,
        moods: onboardingData.moods,
        genres: onboardingData.genres,
        favoriteAnimes: onboardingData.favoriteAnimes,
        experienceLevel: onboardingData.experienceLevel,
        dislikedGenres: onboardingData.dislikedGenres, // Pass new data
      });
      toast.success("Welcome to AniMuse! Your profile is set.", { id: "onboarding-submit" });
    } catch (error) {
      console.error("Failed to complete onboarding:", error);
      toast.error("Could not save preferences. Please try again.", { id: "onboarding-submit" });
    }
  };

  return (
    <div className="w-full p-4 neumorphic-card flex flex-col items-center">
      <h2 className="text-3xl font-orbitron text-sakura-pink mb-2">
        Personalize Your Journey
      </h2>
      <p className="text-brand-text-secondary mb-6">Step {currentStep} of {TOTAL_STEPS}</p>

      <div className="w-full mb-8 min-h-[200px]"> {/* Added min-h for consistent step height */}
        {currentStep === 1 && <WelcomeStep data={onboardingData} updateData={updateData} />}
        {currentStep === 2 && <MoodStep data={onboardingData} updateData={updateData} />}
        {currentStep === 3 && <GenreStep data={onboardingData} updateData={updateData} />}
        {currentStep === 4 && <DislikedStep data={onboardingData} updateData={updateData} />} {/* Added for Phase 2 */}
        {currentStep === 5 && <FavoritesStep data={onboardingData} updateData={updateData} />}
        {currentStep === 6 && <ExperienceStep data={onboardingData} updateData={updateData} />}
      </div>

      <div className="flex justify-between w-full mt-auto">
        <StyledButton onClick={prevStep} disabled={currentStep === 1} variant="secondary">
          Back
        </StyledButton>
        {currentStep < TOTAL_STEPS ? (
          <StyledButton onClick={nextStep} variant="primary">
            Next
          </StyledButton>
        ) : (
          <StyledButton onClick={handleSubmit} variant="primary">
            Finish Setup
          </StyledButton>
        )}
      </div>
      <div className="w-full h-2 bg-brand-dark rounded-full mt-6 overflow-hidden">
        <div
          className="h-full bg-neon-cyan rounded-full transition-all duration-300 ease-out"
          style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
        ></div>
      </div>
    </div>
  );
}