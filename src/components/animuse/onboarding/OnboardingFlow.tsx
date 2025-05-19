import React, { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { toast } from "sonner";
import WelcomeStep from "./WelcomeStep";
import MoodStep from "./MoodStep";
import GenreStep from "./GenreStep";
import FavoritesStep from "./FavoritesStep";
import ExperienceStep from "./ExperienceStep";
import StyledButton from "../shared/StyledButton";

const TOTAL_STEPS = 5;

export default function OnboardingFlow() {
  const [currentStep, setCurrentStep] = useState(1);
  const [onboardingData, setOnboardingData] = useState({
    name: "",
    moods: [] as string[],
    genres: [] as string[],
    favoriteAnimes: [] as string[],
    experienceLevel: "",
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
      await completeOnboarding(onboardingData);
      toast.success("Welcome to AniMuse! Your profile is set.", { id: "onboarding-submit" });
      // The parent component (App.tsx) will automatically switch to MainApp
      // due to the reactive query `api.users.getMyUserProfile`.
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

      <div className="w-full mb-8">
        {currentStep === 1 && <WelcomeStep data={onboardingData} updateData={updateData} />}
        {currentStep === 2 && <MoodStep data={onboardingData} updateData={updateData} />}
        {currentStep === 3 && <GenreStep data={onboardingData} updateData={updateData} />}
        {currentStep === 4 && <FavoritesStep data={onboardingData} updateData={updateData} />}
        {currentStep === 5 && <ExperienceStep data={onboardingData} updateData={updateData} />}
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
