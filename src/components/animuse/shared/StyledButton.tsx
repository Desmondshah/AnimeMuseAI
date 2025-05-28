import React from "react";
import { twMerge } from "tailwind-merge";

interface StyledButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "primary_small" | "secondary_small" | "ghost"; // Added ghost variant
  children: React.ReactNode;
  selected?: boolean; // For toggle buttons or selected states
}

export default function StyledButton({
  variant = "primary",
  children,
  className,
  selected, // For selected state styling
  ...props
}: StyledButtonProps) {
  const baseClasses = "font-heading rounded-md transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-brand-background";
  // Added focus:ring-offset-brand-background for better focus visibility on dark backgrounds

  let variantClasses = "";
  switch (variant) {
    case "primary":
      variantClasses = `
        bg-brand-primary-action text-brand-surface
        hover:bg-opacity-90
        focus:ring-brand-primary-action
        px-5 py-2.5 text-sm sm:text-base shadow-md hover:shadow-lg
        disabled:bg-brand-accent-peach disabled:text-brand-surface/70 disabled:shadow-none disabled:cursor-not-allowed
      `;
      break;
    case "secondary":
      variantClasses = `
        bg-brand-surface text-brand-primary-action border border-brand-primary-action
        hover:bg-brand-primary-action hover:text-brand-surface
        focus:ring-brand-primary-action
        px-5 py-2.5 text-sm sm:text-base shadow-sm hover:shadow-md
        disabled:bg-brand-surface/70 disabled:text-brand-primary-action/50 disabled:border-brand-accent-peach disabled:shadow-none disabled:cursor-not-allowed
      `;
      break;
    case "primary_small":
      variantClasses = `
        bg-brand-primary-action text-brand-surface
        hover:bg-opacity-90
        focus:ring-brand-primary-action
        px-3 py-1.5 text-xs sm:text-sm shadow
        disabled:bg-brand-accent-peach disabled:text-brand-surface/70 disabled:shadow-none disabled:cursor-not-allowed
      `;
      break;
    case "secondary_small":
      variantClasses = `
        bg-brand-surface text-brand-primary-action border border-brand-primary-action
        hover:bg-brand-primary-action hover:text-brand-surface
        focus:ring-brand-primary-action
        px-3 py-1.5 text-xs sm:text-sm shadow-sm
        disabled:bg-brand-surface/70 disabled:text-brand-primary-action/50 disabled:border-brand-accent-peach disabled:shadow-none disabled:cursor-not-allowed
      `;
      break;
    case "ghost": // New variant for minimal buttons, e.g., icon buttons or less prominent actions
      variantClasses = `
        bg-transparent text-brand-accent-gold
        hover:bg-brand-accent-gold/10 hover:text-brand-primary-action
        focus:ring-brand-accent-gold
        px-3 py-1.5 text-xs sm:text-sm
        disabled:text-brand-accent-gold/50 disabled:cursor-not-allowed
      `;
      break;
  }

  if (selected) {
    if (variant.includes("primary")) {
      variantClasses += " bg-opacity-80 ring-2 ring-brand-primary-action ring-offset-1 ring-offset-brand-background";
    } else if (variant.includes("secondary")) {
      variantClasses += " bg-brand-primary-action/10 ring-2 ring-brand-primary-action ring-offset-1 ring-offset-brand-surface";
    } else {
        variantClasses += " bg-brand-accent-gold/20";
    }
  }


  return (
    <button
      className={twMerge(baseClasses, variantClasses, className)}
      {...props}
    >
      {children}
    </button>
  );
}