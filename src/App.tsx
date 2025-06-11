// src/App.tsx
import React, { useState } from "react";
import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { motion } from "framer-motion";

// Import the new theme system
import { ThemeProvider } from "./components/ThemeProvider";
import { AdaptiveBackground } from "./components/AdaptiveBackground";
import { ThemeToggle } from "./components/ThemeToggle";
import { useTheme } from "./hooks/useTheme";

// Import components
import OnboardingFlow from "./components/animuse/onboarding/OnboardingFlow";
import GlassMainApp from "./components/animuse/GlassMainApp"; // Use the new glass-enhanced main app
import PhoneVerificationPrompt from "./components/animuse/onboarding/PhoneVerificationPrompt";
import NotificationsBell from "./components/animuse/onboarding/NotificationsBell";
import NotificationsPanel from "./components/animuse/onboarding/NotificationsPanel";

// Enhanced Header Component with Glass Theme
const EnhancedHeader: React.FC<{
  isNotificationsPanelOpen: boolean;
  onToggleNotifications: () => void;
}> = ({ isNotificationsPanelOpen, onToggleNotifications }) => {
  const { isGlassTheme } = useTheme();

  return (
    <motion.header
      className={`sticky top-0 z-50 p-4 flex justify-between items-center border-b transition-all duration-300 ${
        isGlassTheme
          ? 'bg-white/80 backdrop-blur-xl border-gray-200/50'
          : 'bg-brand-surface/80 backdrop-blur-sm border-electric-blue/30'
      }`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <motion.h2
        className={`text-2xl font-orbitron ${
          isGlassTheme 
            ? 'bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent'
            : 'text-neon-cyan'
        }`}
        whileHover={{ scale: 1.05 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
      >
        AniMuse
      </motion.h2>
      
      <div className="flex items-center gap-4">
        <Authenticated>
          <div className="relative">
            <NotificationsBell onTogglePanel={onToggleNotifications} />
            <NotificationsPanel
              isOpen={isNotificationsPanelOpen}
              onClose={() => onToggleNotifications()}
            />
          </div>
        </Authenticated>
        
        {/* Theme Toggle */}
        <ThemeToggle showLabel={false} />
        
        <SignOutButton />
      </div>
    </motion.header>
  );
};

// Main App Component
export default function App() {
  const [isNotificationsPanelOpen, setIsNotificationsPanelOpen] = useState(false);
  const [verificationFlowKey, setVerificationFlowKey] = useState(0);

  const toggleNotificationsPanel = () => {
    setIsNotificationsPanelOpen(prev => !prev);
  };

  const handleVerified = () => {
    setVerificationFlowKey(prev => prev + 1);
  };

  return (
    <ThemeProvider defaultTheme="glass"> {/* Set glass as default, or "dark" */}
      <AdaptiveBackground>
        <div className="min-h-screen flex flex-col">
          <EnhancedHeader
            isNotificationsPanelOpen={isNotificationsPanelOpen}
            onToggleNotifications={toggleNotificationsPanel}
          />
          
          <main className="flex-1 flex flex-col items-center justify-center w-full">
            <div className="w-full max-w-lg mx-auto">
              <Content
                key={verificationFlowKey}
                onPhoneVerified={handleVerified}
              />
            </div>
          </main>
          
          <Toaster 
            richColors 
            theme="dark" 
            position="top-center"
            toastOptions={{
              style: {
                background: 'rgba(0, 0, 0, 0.8)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: 'white',
              }
            }}
          />
        </div>
      </AdaptiveBackground>
    </ThemeProvider>
  );
}

// Content Component with Theme Awareness
interface ContentProps {
  onPhoneVerified: () => void;
}

function Content({ onPhoneVerified }: ContentProps) {
  const { isGlassTheme } = useTheme();
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const userProfile = useQuery(api.users.getMyUserProfile);
  const verificationStatus = useQuery(api.users.checkVerificationStatus);

  // Loading state
  if (loggedInUser === undefined || verificationStatus === undefined) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="relative">
          <motion.div
            className={`w-12 h-12 border-4 border-transparent rounded-full ${
              isGlassTheme
                ? 'border-t-blue-500 border-r-purple-500'
                : 'border-t-neon-cyan border-r-brand-primary-action'
            }`}
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          
          {isGlassTheme && (
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(102, 126, 234, 0.2) 0%, transparent 70%)',
                filter: 'blur(8px)',
              }}
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          )}
        </div>
        <p className={`ml-3 ${isGlassTheme ? 'text-gray-700' : 'text-white'}`}>
          Loading status...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Unauthenticated>
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className={`text-5xl font-orbitron mb-4 ${
            isGlassTheme
              ? 'bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent'
              : 'text-sakura-pink'
          }`}>
            Welcome to AniMuse
          </h1>
          <p className={`text-xl ${
            isGlassTheme ? 'text-gray-600' : 'text-white'
          }`}>
            Sign in to discover your next favorite anime.
          </p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <SignInForm />
        </motion.div>
      </Unauthenticated>

      <Authenticated>
        {(() => {
          // Case 1: Anonymous User
          if (verificationStatus.isAnonymous) {
            if (userProfile === undefined) {
              return (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neon-cyan"></div>
                  <p className={`ml-3 ${isGlassTheme ? 'text-gray-700' : 'text-white'}`}>
                    Loading profile for guest...
                  </p>
                </div>
              );
            }
            
            if (userProfile === null || !userProfile.onboardingCompleted) {
              return <OnboardingFlow />;
            }
            
            if (userProfile.onboardingCompleted) {
              return <GlassMainApp />; {/* Use the enhanced main app */}
            }
          }

          // Case 2: Non-Anonymous User - Needs Phone Verification
          if (!verificationStatus.isVerified) {
            return (
              <PhoneVerificationPrompt
                onVerified={onPhoneVerified}
                userIdForLog={loggedInUser?._id.toString()}
              />
            );
          }

          // Case 3: Non-Anonymous User - Phone Verified - Check Onboarding
          if (verificationStatus.isVerified) {
            if (userProfile === undefined) {
              return (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neon-cyan"></div>
                  <p className={`ml-3 ${isGlassTheme ? 'text-gray-700' : 'text-white'}`}>
                    Loading profile...
                  </p>
                </div>
              );
            }
            
            if (userProfile === null || !userProfile.onboardingCompleted) {
              return <OnboardingFlow />;
            }
            
            if (userProfile.onboardingCompleted) {
              return <GlassMainApp />; {/* Use the enhanced main app */}
            }
          }

          // Fallback
          return (
            <div className={`text-center ${isGlassTheme ? 'text-gray-700' : 'text-white'}`}>
              Determining application state...
            </div>
          );
        })()}
      </Authenticated>
    </div>
  );
}