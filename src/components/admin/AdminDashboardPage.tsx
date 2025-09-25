// FIXED AdminDashboardPage.tsx - Proper Landscape Layouts
import React, { useState, memo, useEffect } from "react";
import StyledButton from "../animuse/shared/StyledButton";
import UserManagementPage from "./UserManagementPage";
import EnhancedAnimeManagementPage from "./EnhancedAnimeManagementPage";
import AdminHomeSectionsManager from "./AdminHomeSectionsManager";
import ReviewModerationPage from "./ReviewModerationPage";
import CharacterEnrichmentPage from "./CharacterEnrichmentPage";
import { useMobileOptimizations } from "../../hooks/useMobileOptimizations";

interface AdminDashboardPageProps {
  onNavigateBack: () => void;
}

type AdminView = "overview" | "user_management" | "anime_management" | "review_moderation" | "character_enrichment" | "home_sections";

// FIXED: Proper responsive layout detection
const useResponsiveLayout = () => {
  const [dimensions, setDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  });

  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  const { width, height } = dimensions;
  const isLandscape = width > height;
  const isPortrait = height >= width;
  
  // FIXED: Better device detection
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1200;
  const isDesktop = width >= 1200;
  
  // FIXED: Layout modes based on actual usage patterns
  const shouldUseMobileLayout = isMobile && isPortrait;
  const shouldUseTabletLayout = (isMobile && isLandscape) || (isTablet);
  const shouldUseDesktopLayout = isDesktop;

  return {
    width,
    height,
    isLandscape,
    isPortrait,
    isMobile,
    isTablet,
    isDesktop,
    shouldUseMobileLayout,
    shouldUseTabletLayout,
    shouldUseDesktopLayout,
  };
};

// Enhanced Loading Component
const BrutalistLoading: React.FC<{ sectionTitle: string }> = memo(({ sectionTitle }) => {
  const { shouldReduceAnimations } = useMobileOptimizations();
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-6 bg-black border-4 border-white">
      <div className="relative w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 mb-6 border-4 border-white">
        <div className={`absolute inset-0 border-4 border-white ${shouldReduceAnimations ? '' : 'animate-spin'}`} 
             style={{ animationDuration: shouldReduceAnimations ? '0s' : '1s' }}>
        </div>
        <div className="absolute inset-2 md:inset-4 bg-white"></div>
      </div>
      
      <h3 className="text-2xl md:text-3xl lg:text-4xl font-black text-white mb-4 uppercase tracking-wider text-center">
        {sectionTitle}
      </h3>
    </div>
  );
});

// FIXED: Responsive Navigation Component with proper landscape support
const ResponsiveNavigation: React.FC<{
  activeView: AdminView;
  setActiveView: (view: AdminView) => void;
  navigationItems: any[];
  onNavigateBack: () => void;
}> = ({ activeView, setActiveView, navigationItems, onNavigateBack }) => {
  const { shouldUseMobileLayout, shouldUseTabletLayout, shouldUseDesktopLayout, isLandscape } = useResponsiveLayout();

  // Mobile Portrait: Bottom navigation
  if (shouldUseMobileLayout) {
    return (
      <>
        {/* Top bar for mobile portrait */}
        <div className="fixed top-0 left-0 right-0 bg-white border-b-4 border-black z-50 p-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-black text-black uppercase tracking-wider">
              ADMIN
            </h1>
            <button 
              onClick={onNavigateBack}
              className="bg-black text-white px-4 py-2 border-4 border-black font-black uppercase text-sm"
            >
              ← BACK
            </button>
          </div>
        </div>

        {/* Bottom navigation for mobile portrait */}
        <div className="fixed bottom-0 left-0 right-0 bg-black border-t-4 border-white z-50">
          <div className="grid grid-cols-4">
            {navigationItems.map((item) => (
              <button
                key={item.view}
                onClick={() => setActiveView(item.view)}
                className={`py-3 px-2 text-center transition-colors border-r-4 border-white last:border-r-0 ${
                  activeView === item.view 
                    ? 'bg-white text-black' 
                    : 'bg-black text-white'
                }`}
              >
                <div className="text-xl mb-1">{item.icon}</div>
                <div className="text-xs font-black uppercase tracking-wide">
                  {item.shortLabel || item.label}
                </div>
              </button>
            ))}
          </div>
        </div>
      </>
    );
  }

  // FIXED: Tablet and Mobile Landscape - Use horizontal layout
  if (shouldUseTabletLayout) {
    return (
      <div className="bg-black border-b-4 border-white">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-xl md:text-2xl font-black text-white uppercase tracking-wider">
            ADMIN CONSOLE
          </h1>
          <button 
            onClick={onNavigateBack}
            className="bg-white text-black border-4 border-white font-black uppercase px-4 py-2 md:px-6 md:py-3 text-sm md:text-base"
          >
            ← BACK
          </button>
        </div>
        
        {/* FIXED: Horizontal navigation that actually uses landscape space */}
        <div className="flex overflow-x-auto scrollbar-hide">
          {navigationItems.map((item) => (
            <button
              key={item.view}
              onClick={() => setActiveView(item.view)}
              className={`flex items-center gap-3 whitespace-nowrap border-r-4 border-white last:border-r-0 transition-colors px-6 py-4 min-w-max
                ${activeView === item.view 
                  ? 'bg-white text-black' 
                  : 'bg-black text-white hover:bg-gray-800'
                }`}
            >
              <span className="text-2xl">{item.icon}</span>
              <div className="text-left">
                <div className="font-black uppercase tracking-wide text-base">
                  {item.label}
                </div>
                <div className="font-bold uppercase tracking-wide opacity-70 text-xs">
                  {item.description}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Desktop: Left sidebar
  return (
    <>
      <aside className="fixed left-0 top-0 h-full w-80 bg-black border-r-4 border-white z-40">
        <div className="p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-black text-white uppercase tracking-wider mb-2">
              ADMIN CONSOLE
            </h2>
            <p className="text-white/70 text-sm font-bold uppercase tracking-wide">
              COMMAND CENTER
            </p>
          </div>
          
          <nav className="space-y-4">
            {navigationItems.map((item) => (
              <button
                key={item.view}
                onClick={() => setActiveView(item.view)}
                className={`w-full flex items-center gap-4 p-4 transition-colors border-4 ${
                  activeView === item.view 
                    ? 'bg-white text-black border-white' 
                    : 'bg-black text-white border-white hover:bg-gray-800'
                }`}
              >
                <span className="text-3xl">{item.icon}</span>
                <div className="flex-1 text-left">
                  <div className="font-black uppercase tracking-wider text-lg">
                    {item.label}
                  </div>
                  <div className="font-bold uppercase tracking-wide text-sm opacity-70">
                    {item.description}
                  </div>
                </div>
              </button>
            ))}
          </nav>

          <div className="mt-8 pt-8 border-t-4 border-white">
            <button 
              onClick={onNavigateBack}
              className="w-full bg-white text-black px-6 py-3 border-4 border-white font-black uppercase tracking-wide hover:bg-gray-100 transition-colors"
            >
              ← BACK TO APP
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

const AdminDashboardPageComponent: React.FC<AdminDashboardPageProps> = ({ onNavigateBack }) => {
  const [currentAdminView, setCurrentAdminView] = useState<AdminView>("overview");
  
  const { performanceMetrics } = useMobileOptimizations();
  const { 
    shouldUseMobileLayout, 
    shouldUseTabletLayout, 
    shouldUseDesktopLayout,
    isLandscape,
    width
  } = useResponsiveLayout();

  const navigationItems = [
    { 
      view: "overview" as AdminView, 
      icon: "⚡", 
      label: "DASHBOARD",
      shortLabel: "DASH",
      description: "SYSTEM OVERVIEW"
    },
    { 
      view: "user_management" as AdminView, 
      icon: "👥", 
      label: "USERS",
      shortLabel: "USERS", 
      description: "MANAGE ACCOUNTS"
    },
    { 
      view: "anime_management" as AdminView, 
      icon: "🎬", 
      label: "ANIME",
      shortLabel: "ANIME",
      description: "EDIT DATA"
    },
    {
      view: "home_sections" as AdminView,
      icon: "🏠",
      label: "HOME SECTIONS",
      shortLabel: "HOME",
      description: "CURATE LAYOUT"
    },
    { 
      view: "character_enrichment" as AdminView, 
      icon: "🤖", 
      label: "AI ENRICHMENT",
      shortLabel: "AI",
      description: "CHARACTER AI"
    },
    { 
      view: "review_moderation" as AdminView, 
      icon: "📝", 
      label: "REVIEWS",
      shortLabel: "REVIEWS",
      description: "MODERATE CONTENT"
    },
  ];

  // FIXED: Calculate main content styles based on actual layout mode
  const getMainContentStyles = () => {
    if (shouldUseMobileLayout) {
      // Mobile Portrait
      return {
        paddingTop: '80px', // Top bar height
        paddingBottom: '80px', // Bottom nav height
        paddingLeft: '16px',
        paddingRight: '16px',
        width: '100%',
        marginLeft: 0,
        marginRight: 0,
      };
    }
    
    if (shouldUseTabletLayout) {
      // FIXED: Tablet and Mobile Landscape - No sidebar, full width
      return {
        paddingTop: '20px',
        paddingLeft: '20px',
        paddingRight: '20px',
        width: '100%',
        marginLeft: 0,
        marginRight: 0,
        maxWidth: 'none', // IMPORTANT: Remove width constraints
      };
    }
    
    // Desktop
    return {
      marginLeft: '320px', // Sidebar width
      paddingTop: '32px',
      paddingLeft: '32px',
      paddingRight: '32px',
      width: 'calc(100% - 320px)',
      maxWidth: 'none', // IMPORTANT: Remove width constraints
    };
  };

  // FIXED: Get responsive grid classes that actually use available space
  const getGridClasses = () => {
    if (shouldUseMobileLayout) {
      return {
        stats: 'grid-cols-2',
        actions: 'grid-cols-1',
        spacing: 'gap-4',
        padding: 'p-4'
      };
    }
    
    if (shouldUseTabletLayout) {
      return {
        // FIXED: Use landscape space properly
        stats: isLandscape ? 'grid-cols-4' : 'grid-cols-2',
        actions: isLandscape ? 'grid-cols-3' : 'grid-cols-2',
        spacing: 'gap-6',
        padding: 'p-6'
      };
    }
    
    // Desktop
    return {
      stats: 'grid-cols-4',
      actions: 'grid-cols-3',
      spacing: 'gap-8',
      padding: 'p-8'
    };
  };

  const gridClasses = getGridClasses();

  const renderOverview = () => (
    <div className="space-y-6 w-full">
      {/* FIXED: Hero Section - Only show on desktop */}
      {shouldUseDesktopLayout && (
        <div className="bg-black border-4 border-white p-12">
          <div className="text-center">
            <h1 className="text-6xl font-black text-white mb-6 uppercase tracking-wider">
              ADMIN CONSOLE
            </h1>
            <p className="text-2xl text-white font-bold uppercase tracking-wide mb-8">
              BRUTALIST COMMAND CENTER FOR ANIME UNIVERSE MANAGEMENT
            </p>
          </div>
        </div>
      )}

      {/* FIXED: Welcome Header for non-desktop layouts */}
      {!shouldUseDesktopLayout && (
        <div className={`bg-white border-4 border-black ${gridClasses.padding}`}>
          <h1 className={`font-black text-black uppercase tracking-wider mb-4 ${
            shouldUseMobileLayout ? 'text-2xl' : 'text-3xl'
          }`}>
            ADMIN CONSOLE
          </h1>
          <p className={`text-black font-bold uppercase tracking-wide ${
            shouldUseMobileLayout ? 'text-sm' : 'text-base'
          }`}>
            BRUTALIST COMMAND CENTER
          </p>
        </div>
      )}

      {/* FIXED: Stats Grid - Use full available width */}
      <div className={`grid ${gridClasses.stats} ${gridClasses.spacing} w-full`}>
        {[
          { label: 'TOTAL ANIME', value: '1,247', change: '+12%', icon: '🎬' },
          { label: 'ACTIVE USERS', value: '8,439', change: '+5.2%', icon: '👥' },
          { label: 'REVIEWS TODAY', value: '156', change: '+8.1%', icon: '📝' },
          { label: 'SYSTEM HEALTH', value: '98.5%', change: '+0.3%', icon: '⚡' },
        ].map((stat, index) => (
          <div key={index} className={`bg-black border-4 border-white ${gridClasses.padding}`}>
            <div className="flex items-center justify-between mb-4">
              <div className={`${
                shouldUseMobileLayout ? 'text-2xl' : 
                shouldUseTabletLayout ? 'text-3xl' : 
                'text-4xl'
              }`}>{stat.icon}</div>
              <div className={`bg-green-500 text-black font-black uppercase ${
                shouldUseMobileLayout ? 'px-2 py-1 text-xs' : 'px-3 py-1 text-sm'
              }`}>
                {stat.change}
              </div>
            </div>
            <div className={`font-black text-white mb-2 ${
              shouldUseMobileLayout ? 'text-xl' : 
              shouldUseTabletLayout ? 'text-2xl' : 
              'text-4xl'
            }`}>{stat.value}</div>
            <div className={`text-white font-bold uppercase tracking-wide ${
              shouldUseMobileLayout ? 'text-xs' : 'text-sm'
            }`}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* FIXED: Action Cards - Use full available width */}
      <div className={`grid ${gridClasses.actions} ${gridClasses.spacing} w-full`}>
        {navigationItems.slice(1).map((item, index) => (
          <div
            key={item.view}
            onClick={() => setCurrentAdminView(item.view)}
            className={`group cursor-pointer border-4 border-white bg-black hover:bg-white hover:text-black transition-all duration-200 ${gridClasses.padding}`}
          >
            <div className={`mb-6 ${
              shouldUseMobileLayout ? 'text-4xl' : 
              shouldUseTabletLayout ? 'text-5xl' : 
              'text-6xl'
            }`}>
              {item.icon}
            </div>
            <h3 className={`font-black text-white group-hover:text-black mb-4 uppercase tracking-wider ${
              shouldUseMobileLayout ? 'text-lg' : 
              shouldUseTabletLayout ? 'text-xl' : 
              'text-3xl'
            }`}>
              {item.label}
            </h3>
            <p className={`text-white group-hover:text-black font-bold uppercase tracking-wide mb-6 ${
              shouldUseMobileLayout ? 'text-sm' : 'text-base'
            }`}>
              {item.description}
            </p>
            
            <div className="flex justify-end">
              <div className={`bg-white text-black flex items-center justify-center group-hover:bg-black group-hover:text-white border-4 border-black transition-all ${
                shouldUseMobileLayout ? 'w-10 h-10' : 
                shouldUseTabletLayout ? 'w-12 h-12' : 
                'w-14 h-14'
              }`}>
                <span className={`font-black ${
                  shouldUseMobileLayout ? 'text-lg' : 'text-2xl'
                }`}>→</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderMainContent = () => {
    switch (currentAdminView) {
      case "user_management":
        return <UserManagementPage />;
      case "anime_management":
        return <EnhancedAnimeManagementPage />;
      case "home_sections":
        return <AdminHomeSectionsManager />;
      case "character_enrichment":
        return <CharacterEnrichmentPage />;
      case "review_moderation":
        return <ReviewModerationPage />;
      case "overview":
      default:
        return renderOverview();
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <ResponsiveNavigation 
        activeView={currentAdminView}
        setActiveView={setCurrentAdminView}
        navigationItems={navigationItems}
        onNavigateBack={onNavigateBack}
      />

      {/* FIXED: Main Content - Remove width constraints */}
      <main style={getMainContentStyles()} className="w-full">
        {currentAdminView === 'overview' ? (
          renderOverview()
        ) : (
          <div className="bg-black border-4 border-white w-full">
            <div className={`w-full ${
              shouldUseMobileLayout ? 'p-4' : 
              shouldUseTabletLayout ? 'p-6' : 
              'p-8'
            }`}>
              {renderMainContent()}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default memo(AdminDashboardPageComponent);