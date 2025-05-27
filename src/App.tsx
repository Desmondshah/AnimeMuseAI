// src/App.tsx
import React, { useState } from "react";
import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api"; // Adjust path as needed
import { SignInForm } from "./SignInForm"; // Adjust path as needed
import { SignOutButton } from "./SignOutButton"; // Adjust path as needed
import { Toaster } from "sonner";
import OnboardingFlow from "./components/animuse/onboarding/OnboardingFlow"; // Adjust path
import MainApp from "./components/animuse/MainApp"; // Adjust path
import PhoneVerificationPrompt from "./components/animuse/onboarding/PhoneVerificationPrompt"; // Import new component

import NotificationsBell from "./components/animuse/onboarding/NotificationsBell"; // Adjust path
import NotificationsPanel from "./components/animuse/onboarding/NotificationsPanel"; // Adjust path

export default function App() {
  const [isNotificationsPanelOpen, setIsNotificationsPanelOpen] = useState(false);
  // Key to force re-render/re-check of PhoneVerificationPrompt or related logic after verification
  const [verificationFlowKey, setVerificationFlowKey] = useState(0);

  const toggleNotificationsPanel = () => {
    setIsNotificationsPanelOpen(prev => !prev);
  };

  const handleVerified = () => {
    setVerificationFlowKey(prev => prev + 1); // Trigger re-evaluation
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
            key={verificationFlowKey} // Use key to force re-check after verification
            onPhoneVerified={handleVerified}
          />
        </div>
      </main>
      <Toaster richColors theme="dark" />
    </div>
  );
}

interface ContentProps {
  onPhoneVerified: () => void;
}

function Content({ onPhoneVerified }: ContentProps) {
  // loggedInUser from auth.users table - may not have phone directly
  const loggedInUser = useQuery(api.auth.loggedInUser);
  // userProfile from userProfiles table - will have phoneNumber and phoneNumberVerified
  const userProfile = useQuery(api.users.getMyUserProfile);
  // checkVerificationStatus from users.ts - reflects phone verification
  const verificationStatus = useQuery(api.users.checkVerificationStatus);

  // Loading state for authentication & initial status check
  if (loggedInUser === undefined || verificationStatus === undefined) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neon-cyan"></div>
        <p className="ml-3 text-brand-text-secondary">Loading status...</p>
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
        {/* User is authenticated, now check phone verification status */}
        {!verificationStatus.isVerified && (
          <PhoneVerificationPrompt
            // Pass initial phone from auth record if available and desired,
            // or let user input it. `verificationStatus.identifier` might be phone or email.
            // Forcing user to input phone in the prompt is often clearer.
            // initialPhoneNumber={verificationStatus.identifier?.startsWith('+') ? verificationStatus.identifier : ""}
            onVerified={onPhoneVerified}
            userIdForLog={loggedInUser?._id.toString()}
          />
        )}

        {/* Phone is verified, now check onboarding status */}
        {verificationStatus.isVerified && (
          <>
            {/* Loading user profile (which contains onboardingCompleted flag) */}
            {userProfile === undefined && (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neon-cyan"></div>
                <p className="ml-3 text-brand-text-secondary">Loading profile...</p>
              </div>
            )}

            {/* Profile loaded: check onboarding */}
            {userProfile === null && <OnboardingFlow />}
            {userProfile && !userProfile.onboardingCompleted && <OnboardingFlow />}
            {userProfile && userProfile.onboardingCompleted && <MainApp />}
          </>
        )}
      </Authenticated>
    </div>
  );
}