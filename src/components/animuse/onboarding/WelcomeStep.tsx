import React from "react";
import StyledButton from "../shared/StyledButton"; // Assuming you'll create this

interface WelcomeStepProps {
  data: { name: string };
  updateData: (data: { name: string }) => void;
}

export default function WelcomeStep({ data, updateData }: WelcomeStepProps) {
  return (
    <div className="text-center">
      <h3 className="text-2xl font-orbitron text-neon-cyan mb-4">Welcome to AniMuse!</h3>
      <p className="text-brand-text-secondary mb-6">
        Let's get to know you a bit to tailor your anime discovery experience.
        What should we call you?
      </p>
      <input
        type="text"
        placeholder="Your Nickname"
        value={data.name}
        onChange={(e) => updateData({ name: e.target.value })}
        className="neumorphic-input w-full max-w-xs mx-auto"
      />
    </div>
  );
}
