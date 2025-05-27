// src/App.tsx
import React, { useState } from "react";
import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import OnboardingFlow from "./components/animuse/onboarding/OnboardingFlow";
import MainApp from "./components/animuse/MainApp";
import PhoneVerificationPrompt from "./components/animuse/onboarding/PhoneVerificationPrompt";

import NotificationsBell from "./components/animuse/onboarding/NotificationsBell";
import NotificationsPanel from "./components/animuse/onboarding/NotificationsPanel";

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
            key={verificationFlowKey}
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
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const userProfile = useQuery(api.users.getMyUserProfile);
  const verificationStatus = useQuery(api.users.checkVerificationStatus);

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
        {verificationStatus.isAnonymous && (
          <>
            {userProfile === undefined && !loggedInUser?.isAnonymous && (
               <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neon-cyan"></div>
                <p className="ml-3 text-brand-text-secondary">Loading profile...</p>
              </div>
            )}
            {/* If user is anonymous, MainApp should handle this.
                It might create a default profile on first load if userProfile is null,
                or offer limited functionality.
            */}
            {(userProfile === null && loggedInUser?.isAnonymous) ? <OnboardingFlow /> : null }
            {(userProfile && !userProfile.onboardingCompleted && loggedInUser?.isAnonymous) ? <OnboardingFlow /> : null}
            {(userProfile && userProfile.onboardingCompleted && loggedInUser?.isAnonymous) ? <MainApp /> : null }

            {/* Fallback to MainApp if profile is somehow loaded for anonymous, but onboarding not done (edge case) */}
            { (userProfile !== null && userProfile !== undefined && !userProfile.onboardingCompleted && loggedInUser?.isAnonymous) && <OnboardingFlow/> }
            { (userProfile !== null && userProfile !== undefined && userProfile.onboardingCompleted && loggedInUser?.isAnonymous) && <MainApp/> }


          </>
        )}

        {!verificationStatus.isAnonymous && !verificationStatus.isVerified && (
          <PhoneVerificationPrompt
            onVerified={onPhoneVerified}
            userIdForLog={loggedInUser?._id.toString()}
          />
        )}

        {!verificationStatus.isAnonymous && verificationStatus.isVerified && (
          <>
            {userProfile === undefined && (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neon-cyan"></div>
                <p className="ml-3 text-brand-text-secondary">Loading profile...</p>
              </div>
            )}
            {userProfile === null && <OnboardingFlow />}
            {userProfile && !userProfile.onboardingCompleted && <OnboardingFlow />}
            {userProfile && userProfile.onboardingCompleted && <MainApp />}
          </>
        )}
      </Authenticated>
    </div>
  );
}