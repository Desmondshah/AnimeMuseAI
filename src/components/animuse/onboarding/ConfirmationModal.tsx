// src/components/animuse/shared/ConfirmationModal.tsx
import React, { memo, useEffect } from "react";
import StyledButton from "../shared/StyledButton";

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const ConfirmationModalComponent: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "warning",
  onConfirm,
  onCancel,
  isLoading = false
}) => {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isLoading) {
        onCancel();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onCancel, isLoading]);

  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case "danger":
        return {
          icon: "🚨",
          iconBg: "bg-red-500/20",
          iconColor: "text-red-600",
          titleColor: "text-red-700"
        };
      case "warning":
        return {
          icon: "⚠️",
          iconBg: "bg-yellow-500/20",
          iconColor: "text-yellow-600",
          titleColor: "text-yellow-700"
        };
      case "info":
        return {
          icon: "ℹ️",
          iconBg: "bg-blue-500/20",
          iconColor: "text-blue-600",
          titleColor: "text-blue-700"
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div 
      className="fixed inset-0 bg-brand-background/80 backdrop-blur-sm flex items-center justify-center z-[200] p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onCancel();
        }
      }}
    >
      <div 
        className="bg-brand-surface text-brand-text-primary rounded-xl shadow-2xl w-full max-w-md mx-auto border border-brand-accent-peach/30"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-center mb-4">
            <div className={`w-12 h-12 rounded-full ${styles.iconBg} flex items-center justify-center mr-4`}>
              <span className="text-2xl">{styles.icon}</span>
            </div>
            <h3 className={`text-lg sm:text-xl font-heading font-semibold ${styles.titleColor}`}>
              {title}
            </h3>
          </div>
          <p className="text-sm sm:text-base text-brand-text-primary/90 leading-relaxed">
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6">
          <div className="flex gap-3 justify-end">
            <StyledButton 
              onClick={onCancel} 
              variant="secondary_small"
              disabled={isLoading}
            >
              {cancelText}
            </StyledButton>
            <StyledButton 
              onClick={onConfirm}
              variant={variant === "danger" ? "primary_small" : "primary_small"}
              disabled={isLoading}
              className={variant === "danger" ? "!bg-red-600 hover:!bg-red-700 !text-white" : ""}
            >
              {isLoading ? "Processing..." : confirmText}
            </StyledButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(ConfirmationModalComponent);

// Hook for easier usage
export const useConfirmationModal = () => {
  const [modalState, setModalState] = React.useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: "danger" | "warning" | "info";
    onConfirm: () => void;
    isLoading?: boolean;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    isLoading: false
  });

  const showConfirmation = (config: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: "danger" | "warning" | "info";
    onConfirm: () => void | Promise<void>;
  }) => {
    setModalState({
      ...config,
      isOpen: true,
      onConfirm: async () => {
        setModalState(prev => ({ ...prev, isLoading: true }));
        try {
          await config.onConfirm();
          hideConfirmation();
        } catch (error) {
          setModalState(prev => ({ ...prev, isLoading: false }));
          throw error;
        }
      }
    });
  };

  const hideConfirmation = () => {
    setModalState(prev => ({ ...prev, isOpen: false, isLoading: false }));
  };

  const ConfirmationModal = () => (
    <ConfirmationModalComponent
      {...modalState}
      onCancel={hideConfirmation}
    />
  );

  return {
    showConfirmation,
    hideConfirmation,
    ConfirmationModal
  };
};