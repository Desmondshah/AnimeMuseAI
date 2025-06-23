// src/App.tsx
import React, { useState, lazy, Suspense } from "react";
import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api"; // Adjust path if needed
import { SignInForm } from "./SignInForm"; // Adjust path if needed
import { SignOutButton } from "./SignOutButton"; // Adjust path if needed
import { Toaster } from "sonner";
const OnboardingFlow = lazy(() => import("./components/animuse/onboarding/OnboardingFlow"));
const MainApp = lazy(() => import("./components/animuse/MainApp"));
const PhoneVerificationPrompt = lazy(() => import("./components/animuse/onboarding/PhoneVerificationPrompt"));
import { motion, AnimatePresence } from "framer-motion";
import PageTransition from "./components/animuse/shared/PageTransition";
import { useMobileOptimizations } from "../convex/useMobileOptimizations";
import { GlobalIOSOptimizationProvider } from "../convex/useGlobalIOSOptimizations";

import NotificationsBell from "./components/animuse/onboarding/NotificationsBell"; // Adjust path if needed
const NotificationsPanel = lazy(() => import("./components/animuse/onboarding/NotificationsPanel"));

export default function App() {
  const [isNotificationsPanelOpen, setIsNotificationsPanelOpen] = useState(false);
  // Key to help React differentiate states if PhoneVerificationPrompt needs a full reset
  const [verificationFlowKey, setVerificationFlowKey] = useState(0);

  // Get iPad detection for conditional header styling
  const { iPad } = useMobileOptimizations();

  const toggleNotificationsPanel = () => {
    setIsNotificationsPanelOpen(prev => !prev);
  };

  // This function is called by PhoneVerificationPrompt upon successful verification
  const handleVerified = () => {
    // Incrementing the key will cause the Content component (or its children)
    // to re-evaluate or re-mount, helping to pick up the new verification status.
    setVerificationFlowKey(prev => prev + 1);
  };

  // Check if we're on an iPad using multiple detection methods
  const isIPadDevice = iPad.isIPad || 
    (typeof window !== 'undefined' && (
      /iPad/.test(navigator.userAgent) || 
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
      (window.innerWidth >= 768 && window.innerWidth <= 1366 && 'ontouchstart' in window)
    ));

  // Dynamic header classes and styles based on device type
  const getHeaderStyles = () => {
    const baseClasses = "z-50 bg-brand-surface/80 backdrop-blur-sm p-4 flex justify-between items-center border-b border-electric-blue/30";
    
    if (isIPadDevice) {
      return {
        className: `${baseClasses}`,
        style: {
          position: 'fixed' as const,
          top: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          width: '100%'
        }
      };
    } else {
      return {
        className: `sticky top-0 ${baseClasses}`,
        style: {}
      };
    }
  };

  const headerConfig = getHeaderStyles();

  return (
    <GlobalIOSOptimizationProvider>
      <div className="min-h-screen flex flex-col text-white">
        <header 
          className={headerConfig.className}
          style={headerConfig.style}
        >
          <h2 className="text-2xl font-orbitron text-neon-cyan">AniMuse</h2>
          <div className="flex items-center gap-4">
            <Authenticated>
              <div className="relative">
                <NotificationsBell onTogglePanel={toggleNotificationsPanel} />
                <Suspense fallback={null}>
                  <NotificationsPanel
                    isOpen={isNotificationsPanelOpen}
                    onClose={() => setIsNotificationsPanelOpen(false)}
                  />
                </Suspense>
              </div>
            </Authenticated>
            <SignOutButton />
          </div>
        </header>
        <main className={`flex-1 flex flex-col items-center justify-center w-full ${isIPadDevice ? 'pt-20' : ''}`}>
          <div className="w-full max-w-lg sm:max-w-xl md:max-w-2xl mx-auto">
            <AnimatePresence mode="sync">
              <PageTransition key={verificationFlowKey}>
                <Content
                  key={verificationFlowKey}
                  onPhoneVerified={handleVerified}
                />
              </PageTransition>
            </AnimatePresence>
          </div>
        </main>
        <Toaster richColors theme="dark" />
      </div>
    </GlobalIOSOptimizationProvider>
  );
}

interface ContentProps {
  onPhoneVerified: () => void;
}

function Content({ onPhoneVerified }: ContentProps) {
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const userProfile = useQuery(api.users.getMyUserProfile);
  // verificationStatus now reflects phone verification and handles anonymous users
  const verificationStatus = useQuery(api.users.checkVerificationStatus);

  // Loading state for authentication data and initial verification status
  if (loggedInUser === undefined || verificationStatus === undefined) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neon-cyan"></div>
        <p className="ml-3 text-white">Loading status...</p>
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
          <h1 className="text-5xl font-orbitron text-sakura-pink mb-4">Welcome to AniMuse</h1>
          <p className="text-xl text-white">Sign in to discover your next favorite anime.</p>
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
            // Anonymous users are considered "verified" for immediate app access.
            // They might go through a simplified onboarding or directly to MainApp.
            // MainApp needs to handle a potentially null userProfile for anonymous users
            // or OnboardingFlow should create a basic profile.

            // If userProfile is still loading for an anonymous user (less common scenario,
            // as profile creation might be tied to onboarding)
            if (userProfile === undefined) {
               return (
                 <div className="flex justify-center items-center h-64">
                   <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neon-cyan"></div>
                   <p className="ml-3 text-white">Loading profile for guest...</p>
                 </div>
               );
            }
            // If anonymous user has no profile yet, or profile exists but onboarding not done
            if (userProfile === null || !userProfile.onboardingCompleted) {
              return (
                <Suspense fallback={<div className="p-6 text-white">Loading...</div>}>
                  <OnboardingFlow />
                </Suspense>
              );
            }
            // If anonymous user has completed onboarding
            if (userProfile.onboardingCompleted) {
              return (
                <Suspense fallback={<div className="p-6 text-white">Loading app...</div>}>
                  <MainApp />
                </Suspense>
              );
            }
          }

          // Case 2: Non-Anonymous User - Needs Phone Verification
          if (!verificationStatus.isVerified) {
            return (
              <Suspense fallback={<div className="p-6 text-white">Verifying...</div>}>
                <PhoneVerificationPrompt
                  onVerified={onPhoneVerified}
                  userIdForLog={loggedInUser?._id.toString()}
                />
              </Suspense>
            );
          }

          // Case 3: Non-Anonymous User - Phone Verified - Check Onboarding
          if (verificationStatus.isVerified) {
            // Profile is still loading for the verified user
            if (userProfile === undefined) {
              return (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neon-cyan"></div>
                  <p className="ml-3 text-white">Loading profile...</p>
                </div>
              );
            }
            // Profile loaded, check if onboarding is complete
            if (userProfile === null || !userProfile.onboardingCompleted) {
              return (
                <Suspense fallback={<div className="p-6 text-white">Loading...</div>}>
                  <OnboardingFlow />
                </Suspense>
              );
            }
            // Onboarding complete, show the main application
            if (userProfile.onboardingCompleted) {
              return (
                <Suspense fallback={<div className="p-6 text-white">Loading app...</div>}>
                  <MainApp />
                </Suspense>
              );
            }
          }

          // Fallback: Should ideally not be reached if logic is exhaustive
          return (
            <div className="text-center text-white">
              Determining application state...
            </div>
          );
        })()}
      </Authenticated>
    </div>
  );
}