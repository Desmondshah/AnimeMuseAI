import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import "./index.css";
import App from "./App";

// TypeScript declarations
declare global {
  interface Window {
    forceLandscapeLayout: () => void;
  }
}

// iOS 100vh fix: update the --vh custom property
const setVh = () => {
  document.documentElement.style.setProperty(
    "--vh",
    `${window.innerHeight * 0.01}px`
  );
};
setVh();
const handleResize = () => requestAnimationFrame(setVh);
window.addEventListener("resize", handleResize, { passive: true });

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConvexAuthProvider client={convex}>
      <App />
    </ConvexAuthProvider>
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