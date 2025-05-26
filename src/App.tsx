// src/App.tsx - Modified with Email Verification
import React, { useState } from "react";
import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import OnboardingFlow from "./components/animuse/onboarding/OnboardingFlow";
import MainApp from "./components/animuse/MainApp";
import EmailVerificationPrompt from "./components/animuse/onboarding/EmailVerificationPrompt";

// Import Notification components
import NotificationsBell from "./components/animuse/onboarding/NotificationsBell";
import NotificationsPanel from "./components/animuse/onboarding/NotificationsPanel";

export default function App() {
  const [isNotificationsPanelOpen, setIsNotificationsPanelOpen] = useState(false);
  const [emailVerificationKey, setEmailVerificationKey] = useState(0); // Force re-render after verification

  const toggleNotificationsPanel = () => {
    setIsNotificationsPanelOpen(prev => !prev);
  };

  return (
    <div className="min-h-screen flex flex-col bg-brand-dark text-brand-text">
      <header className="sticky top-0 z-50 bg-brand-surface/80 backdrop-blur-sm p-4 flex justify-between items-center border-b border-electric-blue/30">
        <h2 className="text-2xl font-orbitron text-neon-cyan">AniMuse</h2>
        <div className="flex items-center gap-4">
          <Authenticated>
            <div className="relative">
              <NotificationsBell onTogglePanel={toggleNotificationsPanel} />
              <NotificationsPanel 
                isOpen={isNotificationsPanelOpen} 
                onClose={() => setIsNotificationsPanelOpen(false)} 
              />
            </div>
          </Authenticated>
          <SignOutButton />
        </div>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 w-full">
        <div className="w-full max-w-lg mx-auto">
          <Content 
            emailVerificationKey={emailVerificationKey}
            onEmailVerified={() => setEmailVerificationKey(prev => prev + 1)}
          />
        </div>
      </main>
      <Toaster richColors theme="dark" />
    </div>
  );
}

interface ContentProps {
  emailVerificationKey: number;
  onEmailVerified: () => void;
}

function Content({ emailVerificationKey, onEmailVerified }: ContentProps) {
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const userProfile = useQuery(api.users.getMyUserProfile);
  const checkVerificationStatus = useQuery(api.users.checkVerificationStatus);

  // Loading state for authentication
  if (loggedInUser === undefined) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neon-cyan"></div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Unauthenticated>
        <div className="text-center mb-8">
          <h1 className="text-5xl font-orbitron text-sakura-pink mb-4">Welcome to AniMuse</h1>
          <p className="text-xl text-brand-text-secondary">Sign in to discover your next favorite anime.</p>
        </div>
        <SignInForm />
      </Unauthenticated>
      
      <Authenticated>
        {/* Loading verification status */}
        {checkVerificationStatus === undefined && (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neon-cyan"></div>
            <p className="ml-3 text-brand-text-secondary">Checking verification status...</p>
          </div>
        )}

        {/* Email not verified - show verification prompt */}
        {checkVerificationStatus && !checkVerificationStatus.isVerified && (
          <EmailVerificationPrompt 
            userEmail={checkVerificationStatus.email}
            onVerified={onEmailVerified}
          />
        )}

        {/* Email verified - proceed with normal flow */}
        {checkVerificationStatus && checkVerificationStatus.isVerified && (
          <>
            {/* Loading user profile */}
            {userProfile === undefined && (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neon-cyan"></div>
                <p className="ml-3 text-brand-text-secondary">Loading profile...</p>
              </div>
            )}
            
            {/* No profile - needs onboarding */}
            {userProfile === null && <OnboardingFlow />}
            
            {/* Has profile but onboarding not completed */}
            {userProfile && !userProfile.onboardingCompleted && <OnboardingFlow />}
            
            {/* Has profile and onboarding completed - show main app */}
            {userProfile && userProfile.onboardingCompleted && <MainApp />}
          </>
        )}
      </Authenticated>
    </div>
  );
}