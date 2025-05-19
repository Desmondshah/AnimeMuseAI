import React from "react";
import { twMerge } from "tailwind-merge";

interface StyledButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "primary_small" | "secondary_small";
  children: React.ReactNode;
}

export default function StyledButton({
  variant = "primary",
  children,
  className,
  ...props
}: StyledButtonProps) {
  const baseClasses = "font-orbitron rounded-lg transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-opacity-50";
  
  let variantClasses = "";
  switch (variant) {
    case "primary":
      variantClasses = "bg-electric-blue text-white hover:bg-blue-500 shadow-neumorphic-light hover:shadow-neumorphic-light-inset focus:ring-electric-blue px-6 py-3 text-base";
      break;
    case "secondary":
      variantClasses = "bg-brand-surface text-neon-cyan border border-neon-cyan hover:bg-neon-cyan hover:text-brand-dark shadow-neumorphic-light hover:shadow-neumorphic-light-inset focus:ring-neon-cyan px-6 py-3 text-base";
      break;
    case "primary_small":
      variantClasses = "bg-electric-blue text-white hover:bg-blue-500 shadow-neumorphic-light hover:shadow-neumorphic-light-inset focus:ring-electric-blue px-3 py-1.5 text-sm";
      break;
    case "secondary_small":
       variantClasses = "bg-brand-surface text-neon-cyan border border-neon-cyan hover:bg-neon-cyan hover:text-brand-dark shadow-neumorphic-light hover:shadow-neumorphic-light-inset focus:ring-neon-cyan px-3 py-1.5 text-sm";
      break;
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
