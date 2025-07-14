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
    forceLandscapeLayout: () => void;
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

// Connection monitoring with better error handling
let retryCount = 0;
const maxRetries = 3;

const handleConnectionError = () => {
  if (retryCount < maxRetries) {
    retryCount++;
    console.warn(`Convex connection attempt ${retryCount}/${maxRetries}`);
    setTimeout(() => {
      // Convex client will automatically retry
    }, 1000 * retryCount);
  } else {
    console.error('Max Convex connection retries reached');
  }
};

// Monitor connection state with better lifecycle management
let connectionMonitor: NodeJS.Timeout;

if (typeof window !== 'undefined') {
  connectionMonitor = setInterval(() => {
    try {
      const state = convex.connectionState();
      if (!state.isWebSocketConnected) {
        handleConnectionError();
      } else {
        retryCount = 0; // Reset on successful connection
      }
    } catch (error) {
      console.error('Error checking connection state:', error);
    }
  }, 5000);

  // Clean up on page unload
  window.addEventListener('beforeunload', () => {
    if (connectionMonitor) {
      clearInterval(connectionMonitor);
    }
  });
}

// Create the app with better error boundary
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

// Force Landscape Layout - Fixed TypeScript version
function forceLandscapeLayout() {
  const isLandscape = window.innerWidth > window.innerHeight;
  const isTabletOrLarger = window.innerWidth >= 768;
  
  if (isLandscape && isTabletOrLarger) {
    console.log('🔧 Forcing landscape layout...');
    
    // 1. Remove all max-width constraints
    document.querySelectorAll('*').forEach(el => {
      const htmlElement = el as HTMLElement;
      const computedStyle = window.getComputedStyle(htmlElement);
      if (computedStyle.maxWidth !== 'none' && computedStyle.maxWidth !== '') {
        htmlElement.style.maxWidth = 'none';
        htmlElement.style.width = 'auto';
      }
    });
    
    // 2. Force grids to use landscape columns
    document.querySelectorAll('.grid').forEach(grid => {
      const gridElement = grid as HTMLElement;
      const gridStyle = window.getComputedStyle(gridElement);
      const gridColumns = gridStyle.gridTemplateColumns;
      
      // If it's a single column or two columns, make it use more
      if (gridColumns.includes('1fr 1fr') || gridColumns === 'none') {
        // Count how many children it has
        const childCount = gridElement.children.length;
        
        if (childCount >= 4) {
          gridElement.style.gridTemplateColumns = 'repeat(4, 1fr)';
        } else if (childCount >= 3) {
          gridElement.style.gridTemplateColumns = 'repeat(3, 1fr)';
        } else {
          gridElement.style.gridTemplateColumns = 'repeat(2, 1fr)';
        }
        
        gridElement.style.gap = '2rem';
        gridElement.style.width = '100%';
        
        console.log(`✅ Fixed grid with ${childCount} children:`, gridElement);
      }
    });
    
    // 3. Find and fix the main admin container
    const adminContainers = document.querySelectorAll('[class*="admin"], [class*="Admin"]');
    adminContainers.forEach(container => {
      const containerElement = container as HTMLElement;
      containerElement.style.width = '100%';
      containerElement.style.maxWidth = 'none';
      containerElement.style.margin = '0';
      
      console.log('✅ Fixed admin container:', containerElement);
    });
    
    // 4. Force the main app wrapper to full width
    const appWrapper = document.querySelector('.w-full.max-w-lg, .w-full.max-w-xl, .w-full.max-w-2xl') as HTMLElement;
    if (appWrapper) {
      appWrapper.style.maxWidth = 'none';
      appWrapper.style.width = '100%';
      appWrapper.style.margin = '0';
      
      console.log('✅ Fixed app wrapper:', appWrapper);
    }
    
    // 5. Check if we're in the admin dashboard specifically
    const pathname = window.location.pathname;
    if (pathname.includes('admin') || document.querySelector('[class*="AdminDashboard"]')) {
      document.body.classList.add('admin-landscape-mode');
      
      // Add emergency CSS
      if (!document.getElementById('landscape-fix-css')) {
        const style = document.createElement('style');
        style.id = 'landscape-fix-css';
        style.textContent = `
          .admin-landscape-mode * {
            max-width: none !important;
          }
          
          .admin-landscape-mode .grid {
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)) !important;
            gap: 2rem !important;
            width: 100% !important;
          }
          
          .admin-landscape-mode .space-y-6 > div:first-child .grid {
            grid-template-columns: repeat(4, 1fr) !important;
          }
          
          .admin-landscape-mode .space-y-6 > div:last-child .grid {
            grid-template-columns: repeat(3, 1fr) !important;
          }
        `;
        document.head.appendChild(style);
        
        console.log('✅ Added emergency landscape CSS');
      }
    }
    
    console.log('🎉 Landscape layout force complete!');
  } else {
    console.log('📱 Portrait or mobile mode - keeping original layout');
  }
}

// Auto-run the fix
if (typeof window !== 'undefined') {
  // Run immediately
  forceLandscapeLayout();
  
  // Run on resize/orientation change
  let resizeTimeout: NodeJS.Timeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(forceLandscapeLayout, 100);
  });
  
  window.addEventListener('orientationchange', () => {
    setTimeout(forceLandscapeLayout, 500);
  });
  
  // Run when DOM changes (for React re-renders)
  const observer = new MutationObserver(() => {
    const isLandscape = window.innerWidth > window.innerHeight;
    const isTabletOrLarger = window.innerWidth >= 768;
    
    if (isLandscape && isTabletOrLarger) {
      forceLandscapeLayout();
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style']
  });
  
  console.log('🚀 Landscape layout forcer initialized');
  
  // Expose globally
  window.forceLandscapeLayout = forceLandscapeLayout;
}