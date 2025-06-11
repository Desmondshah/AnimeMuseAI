// src/components/animuse/shared/EnhancedStyledButton.tsx
import React from "react";
import { twMerge } from "tailwind-merge";
import { useTheme } from "../../../hooks/useTheme";
import { motion } from "framer-motion";

interface EnhancedStyledButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "glass";
  children: React.ReactNode;
  selected?: boolean;
  loading?: boolean;
}

export const EnhancedStyledButton: React.FC<EnhancedStyledButtonProps> = ({
  variant = "primary",
  children,
  className,
  selected,
  loading,
  disabled,
  onClick,
  onMouseDown,
  onMouseUp,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  tabIndex,
  type = "button",
  form,
  formAction,
  formEncType,
  formMethod,
  formNoValidate,
  formTarget,
  name,
  value,
  autoFocus,
  ...restProps
}) => {
  const { isGlassTheme } = useTheme();

  const getVariantClasses = () => {
    if (isGlassTheme) {
      // Glass theme variants
      switch (variant) {
        case "primary":
          return `
            glass-button-primary
            bg-gradient-to-r from-blue-500 to-purple-600 text-white
            shadow-glass-blue hover:shadow-glass-purple
            border border-white/20
          `;
        case "secondary":
          return `
            glass-button
            bg-white/10 text-gray-700 border border-white/30
            hover:bg-white/20 backdrop-blur-md
          `;
        case "ghost":
          return `
            bg-transparent text-gray-600 hover:bg-white/10
            border border-transparent hover:border-white/20
          `;
        case "glass":
          return `
            glass-card
            bg-white/20 backdrop-blur-lg border border-white/30
            text-gray-700 hover:bg-white/30
          `;
        default:
          return `glass-button-primary`;
      }
    } else {
      // Dark theme variants (existing)
      switch (variant) {
        case "primary":
          return `
            bg-brand-primary-action text-white
            hover:bg-brand-primary-action/90
            shadow-glow-primary hover:shadow-glow-accent
          `;
        case "secondary":
          return `
            bg-brand-surface text-brand-primary-action border border-brand-primary-action
            hover:bg-brand-primary-action hover:text-white
          `;
        case "ghost":
          return `
            bg-transparent text-brand-accent-gold
            hover:bg-brand-accent-gold/10 hover:text-brand-primary-action
          `;
        default:
          return `bg-brand-primary-action text-white`;
      }
    }
  };

  // Filter out any props that might conflict with motion.button
  const safeButtonProps = {
    onClick,
    onMouseDown,
    onMouseUp,
    onMouseEnter,
    onMouseLeave,
    onFocus,
    onBlur,
    tabIndex,
    type,
    form,
    formAction,
    formEncType,
    formMethod,
    formNoValidate,
    formTarget,
    name,
    value,
    autoFocus,
    disabled: disabled || loading,
    // Add any other safe button props here
    'aria-pressed': selected,
    'aria-disabled': disabled || loading,
  };

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className={twMerge(
        `
          relative overflow-hidden
          font-heading rounded-glass px-6 py-3
          transition-all duration-300 ease-glass
          focus:outline-none focus:ring-2 focus:ring-offset-2
          disabled:opacity-60 disabled:cursor-not-allowed
          touch-manipulation min-h-[44px]
        `,
        getVariantClasses(),
        isGlassTheme ? 'focus:ring-blue-500' : 'focus:ring-brand-primary-action',
        selected && 'ring-2 ring-offset-2',
        loading && 'pointer-events-none',
        className
      )}
      {...safeButtonProps}
    >
      {/* Shimmer effect for glass theme */}
      {isGlassTheme && !disabled && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
          initial={{ x: '-100%' }}
          animate={{ x: '100%' }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatDelay: 3,
            ease: 'easeInOut'
          }}
        />
      )}
      
      {/* Content */}
      <span className="relative z-10 flex items-center justify-center gap-2">
        {loading && (
          <motion.div
            className={`w-4 h-4 rounded-full border-2 border-t-transparent ${
              isGlassTheme ? 'border-current' : 'border-current'
            }`}
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
        )}
        {children}
      </span>
    </motion.button>
  );
};