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
import DislikedStep from "./DislikedStep";
import StyledButton from "../shared/StyledButton";

const TOTAL_STEPS = 6;

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

  const completeOnboarding = useMutation(api.users.completeOnboarding);

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, TOTAL_STEPS));
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  const updateData = (data: Partial<typeof onboardingData>) => {
    setOnboardingData((prev) => ({ ...prev, ...data }));
  };

  const handleSubmit = async () => {
    toast.loading("Saving your preferences...", { id: "onboarding-submit" });
    try {
      await completeOnboarding({
        name: onboardingData.name,
        moods: onboardingData.moods,
        genres: onboardingData.genres,
        favoriteAnimes: onboardingData.favoriteAnimes,
        experienceLevel: onboardingData.experienceLevel,
        dislikedGenres: onboardingData.dislikedGenres,
      });
      toast.success("Welcome to AniMuse! Your profile is set.", { id: "onboarding-submit" });
      // Usually, after successful onboarding, you'd navigate the user or trigger a state change in App.tsx
      // For now, this component doesn't handle that navigation directly.
    } catch (error) {
      console.error("Failed to complete onboarding:", error);
      toast.error("Could not save preferences. Please try again.", { id: "onboarding-submit" });
    }
  };

  return (
    // Main card using new theme
    <div className="w-full max-w-lg mx-auto bg-brand-surface text-white rounded-xl shadow-xl p-6 sm:p-8 flex flex-col items-center">
      <h2 className="text-2xl sm:text-3xl font-heading text-brand-primary-action mb-2 text-center">
        Personalize Your Journey
      </h2>
      <p className="text-sm text-white/70 mb-6 sm:mb-8">Step {currentStep} of {TOTAL_STEPS}</p>

      {/* Container for the current step's content */}
      <div className="w-full mb-8 min-h-[250px] sm:min-h-[300px] flex flex-col justify-center">
        {currentStep === 1 && <WelcomeStep data={onboardingData} updateData={updateData} />}
        {currentStep === 2 && <MoodStep data={onboardingData} updateData={updateData} />}
        {currentStep === 3 && <GenreStep data={onboardingData} updateData={updateData} />}
        {currentStep === 4 && <DislikedStep data={onboardingData} updateData={updateData} />}
        {currentStep === 5 && <FavoritesStep data={onboardingData} updateData={updateData} />}
        {currentStep === 6 && <ExperienceStep data={onboardingData} updateData={updateData} />}
      </div>

      {/* Navigation Buttons */}
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

      {/* Progress Bar */}
      <div className="w-full h-2 bg-brand-accent-peach/30 rounded-full mt-6 sm:mt-8 overflow-hidden">
        <div
          className="h-full bg-brand-primary-action rounded-full transition-all duration-300 ease-out"
          style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
        ></div>
      </div>
    </div>
  );
}