import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import OnboardingFlow from "./components/animuse/onboarding/OnboardingFlow";
import MainApp from "./components/animuse/MainApp"; // Placeholder for the main app

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-brand-dark text-brand-text">
      <header className="sticky top-0 z-50 bg-brand-surface/80 backdrop-blur-sm p-4 flex justify-between items-center border-b border-electric-blue/30">
        <h2 className="text-2xl font-orbitron text-neon-cyan">AniMuse</h2>
        <SignOutButton />
      </header>
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 w-full">
        <div className="w-full max-w-lg mx-auto"> {/* Adjusted max-width for mobile-like feel */}
          <Content />
        </div>
      </main>
      <Toaster richColors theme="dark" />
    </div>
  );
}

function Content() {
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const userProfile = useQuery(api.users.getMyUserProfile);

  if (loggedInUser === undefined || userProfile === undefined) {
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
        {userProfile && userProfile.onboardingCompleted ? (
          <MainApp />
        ) : (
          <OnboardingFlow />
        )}
      </Authenticated>
    </div>
  );
}
