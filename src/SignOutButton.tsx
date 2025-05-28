// src/SignOutButton.tsx
"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import StyledButton from "./components/animuse/shared/StyledButton"; // Ensure path is correct

export function SignOutButton() {
  const { isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();

  if (!isAuthenticated) {
    return null;
  }

  return (
    // Using the new StyledButton with a "ghost" or "secondary_small" variant
    // for a less prominent sign-out button in the header.
    <StyledButton
      variant="ghost" // Or "secondary_small" if you prefer a border
      onClick={() => void signOut()}
      className="text-sm" // Ensure text size is appropriate for header
    >
      Sign out
    </StyledButton>
  );
}