// src/components/animuse/shared/StyledButton.tsx
import React from "react";
import { twMerge } from "tailwind-merge";

interface StyledButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "primary_small" | "secondary_small" | "ghost";
  children: React.ReactNode;
  selected?: boolean;
}

export default function StyledButton({
  variant = "primary",
  children,
  className,
  selected,
  ...props
}: StyledButtonProps) {
  const baseClasses = "font-heading rounded-md transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-brand-background disabled:opacity-60 disabled:cursor-not-allowed";

  let variantClasses = "";
  switch (variant) {
    case "primary":
      variantClasses = `
        bg-brand-primary-action text-brand-surface
        hover:bg-opacity-90 active:bg-opacity-80 active:text-brand-surface  // Ensure text stays cream on active
        focus:ring-brand-primary-action
        px-5 py-2.5 text-sm sm:text-base shadow-md hover:shadow-lg active:shadow-sm
        disabled:!bg-brand-accent-peach disabled:!text-brand-surface/70 disabled:!shadow-none
      `;
      break;
    case "secondary":
      variantClasses = `
        bg-brand-surface text-brand-primary-action border border-brand-primary-action
        hover:bg-brand-primary-action hover:text-brand-surface
        active:bg-brand-primary-action/80 active:text-brand-surface // Ensure text contrasts with active coral
        focus:ring-brand-primary-action
        px-5 py-2.5 text-sm sm:text-base shadow-sm hover:shadow-md active:shadow-none
        disabled:!bg-brand-surface/70 disabled:!text-brand-primary-action/50 disabled:!border-brand-accent-peach disabled:!shadow-none
      `;
      break;
    case "primary_small":
      variantClasses = `
        bg-brand-primary-action text-brand-surface
        hover:bg-opacity-90 active:bg-opacity-80 active:text-brand-surface
        focus:ring-brand-primary-action
        px-3 py-1.5 text-xs sm:text-sm shadow active:shadow-sm
        disabled:!bg-brand-accent-peach disabled:!text-brand-surface/70 disabled:!shadow-none
      `;
      break;
    case "secondary_small":
      variantClasses = `
        bg-brand-surface text-brand-primary-action border border-brand-primary-action
        hover:bg-brand-primary-action hover:text-brand-surface
        active:bg-brand-primary-action/80 active:text-brand-surface
        focus:ring-brand-primary-action
        px-3 py-1.5 text-xs sm:text-sm shadow-sm active:shadow-none
        disabled:!bg-brand-surface/70 disabled:!text-brand-primary-action/50 disabled:!border-brand-accent-peach disabled:!shadow-none
      `;
      break;
    case "ghost":
      variantClasses = `
        bg-transparent text-brand-accent-gold
        hover:bg-brand-accent-gold/10 hover:text-brand-primary-action
        active:bg-brand-accent-gold/20 active:text-brand-primary-action // Ensure text visible on active ghost
        focus:ring-brand-accent-gold
        px-3 py-1.5 text-xs sm:text-sm
        disabled:!text-brand-accent-gold/50
      `;
      break;
  }

  if (selected) {
    if (variant.includes("primary")) {
      variantClasses += " bg-opacity-70 ring-2 ring-brand-primary-action ring-offset-1 ring-offset-brand-background !shadow-inner";
    } else if (variant.includes("secondary")) {
      variantClasses += " bg-brand-primary-action/10 ring-2 ring-brand-primary-action ring-offset-1 ring-offset-brand-surface !shadow-inner";
    } else { // ghost selected
        variantClasses += " bg-brand-accent-gold/20 !text-brand-primary-action";
    }
  }

  // Add active:scale-95 for a subtle press effect if desired, but ensure it doesn't cause layout shifts.
  // variantClasses += " active:scale-[0.98]";

  return (
    <button
      className={twMerge(baseClasses, variantClasses, className)}
      {...props}
    >
      {children}
    </button>
  );
}