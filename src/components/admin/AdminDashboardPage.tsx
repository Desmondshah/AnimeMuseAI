// Updated AdminDashboardPage.tsx with proper iPad layout handling
import React, { useState, memo } from "react";
import StyledButton from "../animuse/shared/StyledButton";
import UserManagementPage from "./UserManagementPage";
import EnhancedAnimeManagementPage from "./EnhancedAnimeManagementPage";
import ReviewModerationPage from "./ReviewModerationPage";
import { useMobileOptimizations, useAdminLayoutOptimization } from "../../../convex/useMobileOptimizations";

interface AdminDashboardPageProps {
  onNavigateBack: () => void;
}

type AdminView = "overview" | "user_management" | "anime_management" | "review_moderation";

// Enhanced Loading Component with iPad optimization
const BrutalistLoading: React.FC<{ sectionTitle: string }> = memo(({ sectionTitle }) => {
  const { shouldReduceAnimations, iPad } = useMobileOptimizations();
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-6 md:p-8 bg-black border-4 border-white">
      <div className="relative w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 mb-6 md:mb-8 border-4 border-white">
        <div className={`absolute inset-0 border-4 border-white ${shouldReduceAnimations ? '' : 'animate-spin'}`} 
             style={{ animationDuration: shouldReduceAnimations ? '0s' : iPad.isIPad ? '1.5s' : '1s' }}>
        </div>
        <div className="absolute inset-2 md:inset-4 bg-white"></div>
      </div>
      
      <h3 className="text-2xl md:text-3xl lg:text-4xl font-black text-white mb-4 md:mb-6 uppercase tracking-wider text-center">
        {sectionTitle}
      </h3>
      
      <div className="flex gap-3 md:gap-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`w-3 h-3 md:w-4 md:h-4 bg-white ${shouldReduceAnimations ? 'opacity-100' : 'animate-pulse'}`}
            style={{ animationDelay: shouldReduceAnimations ? '0s' : `${i * 0.2}s` }}
          />
        ))}
      </div>
    </div>
  );
});

const AdminDashboardPageComponent: React.FC<AdminDashboardPageProps> = ({ onNavigateBack }) => {
  const [currentAdminView, setCurrentAdminView] = useState<AdminView>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const {
    isMobile,
    isIOS,
    hasNotch,
    shouldReduceAnimations,
    shouldUseSimpleBackgrounds,
    performanceMetrics,
    iPad,
    isLandscape,
    shouldUseSidebarOverlay
  } = useMobileOptimizations();

  const {
    sidebarWidth,
    getGridClasses,
    contentPadding,
    isOptimizedForAdmin
  } = useAdminLayoutOptimization();

  const navigationItems = [
    { 
      view: "overview" as AdminView, 
      icon: "⚡", 
      label: "DASHBOARD", 
      color: "bg-white text-black",
      description: "SYSTEM OVERVIEW"
    },
    { 
      view: "user_management" as AdminView, 
      icon: "👥", 
      label: "USERS", 
      color: "bg-white text-black",
      description: "MANAGE ACCOUNTS"
    },
    { 
      view: "anime_management" as AdminView, 
      icon: "🎬", 
      label: "ANIME", 
      color: "bg-white text-black",
      description: "EDIT DATA"
    },
    { 
      view: "review_moderation" as AdminView, 
      icon: "📝", 
      label: "REVIEWS", 
      color: "bg-white text-black",
      description: "MODERATE CONTENT"
    },
  ];

  const renderOverview = () => (
    <div className={`space-y-6 md:space-y-8 ${iPad.isIPad ? 'iPad-admin-layout' : ''}`}>
      {/* ENHANCED BRUTALIST HERO SECTION - iPad Optimized */}
      <div className={`bg-black border-4 border-white ${
        iPad.isIPadMini ? 'p-4 md:p-6' : 
        iPad.isIPadPro12 ? 'p-8 md:p-12 lg:p-16' : 
        'p-6 md:p-8 lg:p-12'
      }`}>
        <div className="text-center max-w-6xl mx-auto">
          <h1 className={`font-black text-white mb-4 md:mb-6 uppercase tracking-wider ${
            iPad.isIPadMini ? 'text-3xl md:text-4xl' : 
            iPad.isIPadPro12 ? 'text-5xl md:text-6xl lg:text-7xl' : 
            'text-4xl md:text-5xl lg:text-6xl'
          }`}>
            ADMIN CONSOLE
          </h1>
          <p className={`text-white font-bold max-w-5xl mx-auto mb-6 md:mb-8 uppercase tracking-wide leading-relaxed ${
            iPad.isIPadMini ? 'text-base md:text-lg' : 
            iPad.isIPadPro12 ? 'text-lg md:text-xl lg:text-2xl' : 
            'text-lg md:text-xl'
          }`}>
            BRUTALIST COMMAND CENTER FOR ANIME UNIVERSE MANAGEMENT
          </p>
          
          {/* PERFORMANCE STATUS - iPad Optimized */}
          <div className={`flex flex-wrap justify-center gap-3 md:gap-4 lg:gap-6 max-w-4xl mx-auto ${
            iPad.isIPadMini ? 'text-sm' : iPad.isIPadPro12 ? 'text-lg' : 'text-base md:text-lg'
          }`}>
            <div className={`flex items-center gap-2 md:gap-3 bg-white text-black border-4 border-black transition-all hover:bg-gray-100 ${
              iPad.isIPadMini ? 'px-3 py-2' : 'px-4 md:px-6 py-3'
            }`}>
              <div className={`${iPad.isIPadMini ? 'w-3 h-3' : 'w-4 h-4'} ${performanceMetrics.fps > 50 ? 'bg-green-500' : performanceMetrics.fps > 30 ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
              <span className="font-black">{performanceMetrics.fps} FPS</span>
            </div>
            <div className={`flex items-center gap-2 md:gap-3 bg-white text-black border-4 border-black transition-all hover:bg-gray-100 ${
              iPad.isIPadMini ? 'px-3 py-2' : 'px-4 md:px-6 py-3'
            }`}>
              <div className={`${iPad.isIPadMini ? 'w-3 h-3' : 'w-4 h-4'} bg-blue-500`}></div>
              <span className="font-black">
                {iPad.isIPad ? 
                  `IPAD ${iPad.isIPadMini ? 'MINI' : iPad.isIPadPro12 ? 'PRO 12"' : iPad.isIPadPro11 ? 'PRO 11"' : 'AIR'}` : 
                  isMobile ? 'MOBILE' : 'DESKTOP'
                }
              </span>
            </div>
            {iPad.isIPad && (
              <div className={`flex items-center gap-2 md:gap-3 bg-white text-black border-4 border-black transition-all hover:bg-gray-100 ${
                iPad.isIPadMini ? 'px-3 py-2' : 'px-4 md:px-6 py-3'
              }`}>
                <div className={`${iPad.isIPadMini ? 'w-3 h-3' : 'w-4 h-4'} bg-purple-500`}></div>
                <span className="font-black">{isLandscape ? 'LANDSCAPE' : 'PORTRAIT'}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ENHANCED ACTION CARDS GRID - iPad Responsive */}
      <div className={`${getGridClasses('stats')} ${
        iPad.isIPad ? (
          iPad.isIPadMini ? 'grid-cols-1 md:grid-cols-2 gap-4 md:gap-6' :
          iPad.isIPadPro12 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 lg:gap-10' :
          'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-7'
        ) : 'xl:grid-cols-3 gap-4 md:gap-6 lg:gap-8'
      }`}>
        {navigationItems.slice(1).map((item, index) => (
          <div
            key={item.view}
            onClick={() => setCurrentAdminView(item.view)}
            className={`group cursor-pointer border-4 border-white bg-black hover:bg-white hover:text-black transition-all duration-200 touch-target-ipad ${
              iPad.isIPadMini ? 'p-4 md:p-6' : 
              iPad.isIPadPro12 ? 'p-8 md:p-10 lg:p-12' :
              'p-6 md:p-8'
            }`}
          >
            <div className={`mb-4 md:mb-6 ${
              iPad.isIPadMini ? 'text-3xl md:text-4xl' : 
              iPad.isIPadPro12 ? 'text-5xl md:text-6xl lg:text-7xl' : 
              'text-4xl md:text-5xl'
            }`}>
              {item.icon}
            </div>
            <h3 className={`font-black text-white group-hover:text-black mb-3 md:mb-4 uppercase tracking-wider leading-tight ${
              iPad.isIPadMini ? 'text-lg md:text-xl' : 
              iPad.isIPadPro12 ? 'text-xl md:text-2xl lg:text-3xl' : 
              'text-xl md:text-2xl'
            }`}>
              {item.label}
            </h3>
            <p className={`text-white group-hover:text-black font-bold uppercase tracking-wide mb-4 md:mb-6 leading-relaxed ${
              iPad.isIPadMini ? 'text-sm md:text-base' : 
              iPad.isIPadPro12 ? 'text-base md:text-lg' : 
              'text-sm md:text-base'
            }`}>
              {item.description}
            </p>
            
            <div className="flex justify-end">
              <div className={`bg-white text-black flex items-center justify-center group-hover:bg-black group-hover:text-white border-4 border-black transition-all duration-200 touch-target-ipad ${
                iPad.isIPadMini ? 'w-8 h-8' : iPad.isIPadPro12 ? 'w-16 h-16' : 'w-12 h-12 md:w-14 md:h-14'
              }`}>
                <span className={`font-black ${
                  iPad.isIPadMini ? 'text-lg' : iPad.isIPadPro12 ? 'text-2xl md:text-3xl' : 'text-xl md:text-2xl'
                }`}>→</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ENHANCED STATS GRID - iPad Responsive */}
      <div className={`${
        iPad.isIPad ? (
          iPad.isIPadMini ? 'grid grid-cols-2 gap-4' :
          iPad.isIPadPro12 ? 'grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8' :
          'grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-6'
        ) : `${getGridClasses('stats')} gap-4 md:gap-6`
      }`}>
        {[
          { label: 'TOTAL ANIME', value: '1,247', change: '+12%', icon: '🎬' },
          { label: 'ACTIVE USERS', value: '8,439', change: '+5.2%', icon: '👥' },
          { label: 'REVIEWS TODAY', value: '156', change: '+8.1%', icon: '📝' },
          { label: 'SYSTEM HEALTH', value: '98.5%', change: '+0.3%', icon: '⚡' },
        ].map((stat, index) => (
          <div key={index} className={`bg-black border-4 border-white transition-all hover:bg-gray-900 ${
            iPad.isIPadMini ? 'p-3 md:p-4' : 
            iPad.isIPadPro12 ? 'p-6 md:p-8' :
            'p-4 md:p-6'
          }`}>
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div className={`${
                iPad.isIPadMini ? 'text-xl md:text-2xl' : 
                iPad.isIPadPro12 ? 'text-4xl md:text-5xl' :
                'text-2xl md:text-3xl'
              }`}>
                {stat.icon}
              </div>
              <div className={`bg-green-500 text-black font-black uppercase transition-all hover:bg-green-400 ${
                iPad.isIPadMini ? 'px-2 py-1 text-xs' : 
                iPad.isIPadPro12 ? 'px-3 py-1 text-sm md:text-base' :
                'px-2 md:px-3 py-1 text-xs md:text-sm'
              }`}>
                {stat.change}
              </div>
            </div>
            <div className={`font-black text-white mb-1 md:mb-2 leading-none ${
              iPad.isIPadMini ? 'text-xl md:text-2xl' : 
              iPad.isIPadPro12 ? 'text-2xl md:text-3xl lg:text-4xl' : 
              'text-xl md:text-2xl lg:text-3xl'
            }`}>
              {stat.value}
            </div>
            <div className={`text-white font-bold uppercase tracking-wide leading-tight ${
              iPad.isIPadMini ? 'text-xs md:text-sm' : 
              iPad.isIPadPro12 ? 'text-sm md:text-base lg:text-lg' : 
              'text-xs md:text-sm lg:text-base'
            }`}>
              {stat.label}
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
      case "review_moderation":
        return <ReviewModerationPage />;
      case "overview":
      default:
        return renderOverview();
    }
  };

  // Dynamic container classes based on device optimization
  const getContainerClasses = () => {
    const classes = ['min-h-screen', 'bg-black', 'relative'];
    if (shouldUseSimpleBackgrounds) classes.push('simple-backgrounds');
    if (iPad.isIPad) classes.push('ipad-optimized');
    if (shouldReduceAnimations) classes.push('reduce-animations');
    return classes.join(' ');
  };

  // Dynamic sidebar classes
  const getSidebarClasses = () => {
    const classes = ['bg-white', 'border-r-4', 'border-black'];
    
    if (shouldUseSidebarOverlay) {
      classes.push('fixed', 'inset-y-0', 'left-0', 'z-40', 'transition-transform', 'duration-300');
      if (!sidebarOpen) classes.push('-translate-x-full');
    } else {
      classes.push('fixed', 'inset-y-0', 'left-0');
    }
    
    return classes.join(' ');
  };

  return (
    <div className={getContainerClasses()}>
      {/* Enhanced Background Pattern - Simplified for iPad Mini */}
      {!shouldUseSimpleBackgrounds && !iPad.isIPadMini && (
        <div className="absolute inset-0 overflow-hidden opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `repeating-linear-gradient(
              45deg,
              transparent,
              transparent 10px,
              white 10px,
              white 20px
            )`
          }}></div>
        </div>
      )}
      
      {/* Main Container with proper iPad safe areas */}
      <div className="relative z-10 min-h-screen ios-character-page">
        {/* ENHANCED TOP NAVIGATION BAR - iPad Optimized - FIXED TO SCREEN */}
        <nav className="bg-white border-b-4 border-black fixed top-0 left-0 right-0 z-50">
          <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
            <div className={`flex justify-between items-center ${
              iPad.isIPadMini ? 'h-16' : iPad.isIPadPro12 ? 'h-24' : 'h-20'
            }`}>
              {/* Left side */}
              <div className="flex items-center gap-4 md:gap-6">
                {shouldUseSidebarOverlay && (
                  <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="p-2 md:p-3 bg-black text-white hover:bg-gray-800 transition-colors border-2 border-black touch-target-ipad"
                  >
                    <span className="text-xl md:text-2xl font-black">☰</span>
                  </button>
                )}
                
                <div className="flex items-center gap-3 md:gap-4">
                  <div className={`bg-black text-white flex items-center justify-center border-4 border-black ${
                    iPad.isIPadMini ? 'w-12 h-12' : iPad.isIPadPro12 ? 'w-20 h-20' : 'w-16 h-16'
                  }`}>
                    <span className={`font-black ${
                      iPad.isIPadMini ? 'text-xl' : iPad.isIPadPro12 ? 'text-3xl' : 'text-2xl'
                    }`}>A</span>
                  </div>
                  <div>
                    <h1 className={`font-black text-black uppercase tracking-wider ${
                      iPad.isIPadMini ? 'text-xl md:text-2xl' : 
                      iPad.isIPadPro12 ? 'text-2xl md:text-3xl lg:text-4xl' : 
                      'text-xl md:text-2xl lg:text-3xl'
                    }`}>
                      ADMIN CONSOLE
                    </h1>
                    <p className={`text-black font-bold uppercase tracking-wide ${
                      iPad.isIPadMini ? 'text-xs' : iPad.isIPadPro12 ? 'text-sm md:text-base' : 'text-xs md:text-sm'
                    }`}>
                      COMMAND CENTER
                    </p>
                  </div>
                </div>
              </div>

              {/* Right side */}
              <div className="flex items-center gap-4 md:gap-6">
                <div className="hidden lg:flex items-center gap-3 bg-black text-white px-3 md:px-4 py-2 border-2 border-black">
                  <div className={`w-3 h-3 ${performanceMetrics.fps > 50 ? 'bg-green-500' : performanceMetrics.fps > 30 ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                  <span className="font-black text-sm md:text-base">{performanceMetrics.fps} FPS</span>
                </div>
                
                <button 
                  onClick={onNavigateBack} 
                  className={`bg-black text-white hover:bg-gray-800 border-4 border-black font-black uppercase tracking-wide transition-colors touch-target-ipad ${
                    iPad.isIPadMini ? 'px-4 py-2 text-sm' : 'px-6 py-3 text-sm md:text-base'
                  }`}
                >
                  ← BACK TO APP
                </button>
              </div>
            </div>
          </div>
        </nav>

        <div className={`flex ${
          iPad.isIPadMini ? 'pt-16' : iPad.isIPadPro12 ? 'pt-24' : 'pt-20'
        }`}>
          {/* ENHANCED SIDEBAR - iPad Optimized */}
          <aside 
            className={getSidebarClasses()}
            style={{ width: sidebarWidth, top: `${iPad.isIPadMini ? '64px' : iPad.isIPadPro12 ? '96px' : '80px'}` }}
          >
            <div className={`p-6 md:p-8 ${iPad.isIPadMini ? 'p-4' : ''}`}>
              {shouldUseSidebarOverlay && (
                <div className="flex justify-between items-center mb-6 md:mb-8">
                  <h2 className={`font-black text-black uppercase tracking-wider ${
                    iPad.isIPadMini ? 'text-lg' : 'text-xl md:text-2xl'
                  }`}>
                    NAVIGATION
                  </h2>
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="p-2 md:p-3 bg-black text-white hover:bg-gray-800 border-2 border-black"
                  >
                    <span className="text-lg md:text-xl font-black">✕</span>
                  </button>
                </div>
              )}
              
              <nav className="space-y-3 md:space-y-4">
                {navigationItems.map((item) => (
                  <button
                    key={item.view}
                    onClick={() => {
                      setCurrentAdminView(item.view);
                      if (shouldUseSidebarOverlay) setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 md:gap-4 p-3 md:p-4 transition-all duration-200 border-4 touch-target-ipad ${
                      currentAdminView === item.view 
                        ? 'bg-black text-white border-black' 
                        : 'bg-white text-black border-black hover:bg-gray-100'
                    }`}
                  >
                    <span className={`${iPad.isIPadMini ? 'text-2xl' : 'text-2xl md:text-3xl'}`}>
                      {item.icon}
                    </span>
                    <div className="flex-1 text-left">
                      <div className={`font-black uppercase tracking-wider ${
                        iPad.isIPadMini ? 'text-sm' : 'text-sm md:text-base lg:text-lg'
                      }`}>
                        {item.label}
                      </div>
                      <div className={`font-bold uppercase tracking-wide opacity-70 ${
                        iPad.isIPadMini ? 'text-xs' : 'text-xs md:text-sm'
                      }`}>
                        {item.description}
                      </div>
                    </div>
                    {currentAdminView === item.view && (
                      <div className="w-3 h-3 md:w-4 md:h-4 bg-white"></div>
                    )}
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          {/* Mobile overlay */}
          {shouldUseSidebarOverlay && sidebarOpen && (
            <div 
              className="fixed inset-0 bg-black/50 z-30"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Main content - ENHANCED iPad Optimization */}
          <main 
            className="flex-1 min-h-screen overflow-x-hidden"
            style={{ 
              marginLeft: shouldUseSidebarOverlay ? 0 : sidebarWidth
            }}
          >
            {/* ENHANCED CONTAINER WITH iPad-OPTIMIZED SPACING */}
            <div className={`w-full ios-character-page ${
              iPad.isIPad ? (
                iPad.isIPadMini ? 'max-w-6xl mx-auto px-4 py-6' :
                iPad.isIPadPro12 ? 'max-w-7xl mx-auto px-6 py-8 lg:px-8 lg:py-12' :
                'max-w-7xl mx-auto px-5 py-7'
              ) : `max-w-7xl mx-auto ${contentPadding}`
            }`}>
              {currentAdminView === 'overview' ? (
                renderOverview()
              ) : (
                <div className={`bg-black border-4 border-white overflow-hidden w-full box-border rounded-lg ${
                  iPad.isIPad ? 'shadow-2xl' : ''
                }`}>
                  <div className={`w-full box-border ${
                    iPad.isIPadMini ? 'p-4 md:p-6' : 
                    iPad.isIPadPro12 ? 'p-8 md:p-10 lg:p-14' : 
                    'p-6 md:p-8'
                  }`}>
                    {renderMainContent()}
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default memo(AdminDashboardPageComponent);