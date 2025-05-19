import React from "react";
import StyledButton from "../shared/StyledButton";

const EXPERIENCE_LEVELS = ["Newbie (Just starting!)", "Casual Viewer", "Seasoned Fan", "Otaku Legend"];

interface ExperienceStepProps {
  data: { experienceLevel: string };
  updateData: (data: { experienceLevel: string }) => void;
}

export default function ExperienceStep({ data, updateData }: ExperienceStepProps) {
  return (
    <div>
      <h3 className="text-xl font-orbitron text-neon-cyan mb-4 text-center">Your Anime Experience Level?</h3>
      <p className="text-sm text-brand-text-secondary mb-6 text-center">How deep are you in the anime world?</p>
      <div className="space-y-3">
        {EXPERIENCE_LEVELS.map((level) => (
          <StyledButton
            key={level}
            onClick={() => updateData({ experienceLevel: level })}
            variant={data.experienceLevel === level ? "primary" : "secondary"}
            className="w-full"
          >
            {level}
          </StyledButton>
        ))}
      </div>
    </div>
  );
}
