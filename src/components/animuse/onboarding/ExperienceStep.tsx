// src/components/animuse/onboarding/ExperienceStep.tsx
import React from "react";
import StyledButton from "../shared/StyledButton";

const EXPERIENCE_LEVELS = ["Newbie (Just starting!)", "Casual Viewer", "Seasoned Fan", "Otaku Legend"];

interface ExperienceStepProps {
  data: { experienceLevel: string };
  updateData: (data: { experienceLevel: string }) => void;
}

export default function ExperienceStep({ data, updateData }: ExperienceStepProps) {
  return (
    <div className="text-center">
      <h3 className="text-xl sm:text-2xl font-heading text-brand-primary-action mb-3">
        Your Anime Experience?
      </h3>
      <p className="text-xs sm:text-sm text-brand-text-primary/70 mb-5 sm:mb-6">
        How deep are you in the anime world?
      </p>
      <div className="space-y-2.5 sm:space-y-3">
        {EXPERIENCE_LEVELS.map((level) => (
          <StyledButton
            key={level}
            onClick={() => updateData({ experienceLevel: level })}
            selected={data.experienceLevel === level}
            variant={data.experienceLevel === level ? "primary" : "secondary"} // Using regular size buttons here
            className="w-full max-w-xs mx-auto py-2.5 sm:py-3" // Centered and consistent padding
          >
            {level}
          </StyledButton>
        ))}
      </div>
    </div>
  );
}