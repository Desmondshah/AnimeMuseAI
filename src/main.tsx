import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { ConvexErrorBoundary } from "./components/ConvexErrorBoundary";
import "./index.css";
import App from "./App";

// TypeScript declarations
declare global {
  interface Window {
    // Keep any essential window declarations here if needed
  }
}

// Loading component
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-100">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
      <p className="text-gray-600">Loading AnimeMuseAI...</p>
    </div>
  </div>
);

// iOS 100vh fix: update the --vh custom property
const setVh = () => {
  document.documentElement.style.setProperty(
    "--vh",
    `${window.innerHeight * 0.01}px`
  );
};

// Initialize viewport height fix
if (typeof window !== 'undefined') {
  setVh();
  const handleResize = () => requestAnimationFrame(setVh);
  window.addEventListener("resize", handleResize, { passive: true });
}

// Initialize Convex client with better error handling
const convexUrl = import.meta.env.VITE_CONVEX_URL;
if (!convexUrl) {
  console.error("VITE_CONVEX_URL environment variable is required");
  // For development, show a helpful error message
  if (import.meta.env.DEV) {
    document.body.innerHTML = `
      <div class="min-h-screen flex items-center justify-center bg-red-50">
        <div class="text-center p-8">
          <h1 class="text-2xl font-bold text-red-600 mb-4">Configuration Error</h1>
          <p class="text-gray-700 mb-4">VITE_CONVEX_URL environment variable is missing.</p>
          <p class="text-gray-600">Please run <code class="bg-gray-200 px-2 py-1 rounded">npx convex dev</code> first.</p>
        </div>
      </div>
    `;
    throw new Error("VITE_CONVEX_URL environment variable is required");
  }
}

const convex = new ConvexReactClient(convexUrl);

// Create the app
const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <ConvexErrorBoundary>
      <Suspense fallback={<LoadingSpinner />}>
        <ConvexAuthProvider client={convex}>
          <App />
        </ConvexAuthProvider>
      </Suspense>
    </ConvexErrorBoundary>
  </StrictMode>,
);