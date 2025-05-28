// src/components/animuse/onboarding/WelcomeStep.tsx
import React from "react";
// StyledButton is not used here, so import can be removed if not needed elsewhere.

interface WelcomeStepProps {
  data: { name: string };
  updateData: (data: { name: string }) => void;
}

export default function WelcomeStep({ data, updateData }: WelcomeStepProps) {
  return (
    <div className="text-center flex flex-col items-center justify-center h-full">
      <h3 className="text-xl sm:text-2xl font-heading text-brand-primary-action mb-3">
        Welcome to AniMuse!
      </h3>
      <p className="text-brand-text-primary/80 mb-6 text-sm sm:text-base max-w-md">
        Let's get to know you a bit to tailor your anime discovery experience.
        What should we call you?
      </p>
      <input
        type="text"
        placeholder="Your Nickname"
        value={data.name}
        onChange={(e) => updateData({ name: e.target.value })}
        className="form-input w-full max-w-xs mx-auto text-center" // Use form-input style
      />
    </div>
  );
}