// BRUTALIST ADMIN DASHBOARD - AdminDashboardPage.tsx
import React, { useState, memo } from "react";
import StyledButton from "../animuse/shared/StyledButton";
import UserManagementPage from "./UserManagementPage";
import ReviewModerationPage from "./ReviewModerationPage";
import { useMobileOptimizations } from "../../../convex/useMobileOptimizations";

interface AdminDashboardPageProps {
  onNavigateBack: () => void;
}

type AdminView = "overview" | "user_management" | "anime_management" | "review_moderation";

// BRUTALIST loading component
const BrutalistLoading: React.FC<{ sectionTitle: string }> = memo(({ sectionTitle }) => {
  const { shouldReduceAnimations } = useMobileOptimizations();
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 bg-black border-4 border-white">
      <div className="relative w-24 h-24 mb-8 border-4 border-white">
        <div className={`absolute inset-0 border-4 border-white ${shouldReduceAnimations ? '' : 'animate-spin'}`} style={{ animationDuration: '1s' }}></div>
        <div className="absolute inset-4 w-16 h-16 bg-white"></div>
      </div>
      
      <h3 className="text-4xl font-black text-white mb-6 uppercase tracking-wider">
        {sectionTitle}
      </h3>
      
      <div className="flex gap-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`w-4 h-4 bg-white ${shouldReduceAnimations ? 'opacity-100' : 'animate-pulse'}`}
            style={{ animationDelay: `${i * 0.2}s` }}
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
    performanceMetrics
  } = useMobileOptimizations();

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
    <div className="space-y-8">
      {/* BRUTALIST HERO SECTION */}
      <div className="bg-black border-4 border-white p-12">
        <div className="text-center">
          <h1 className="text-6xl md:text-8xl font-black text-white mb-6 uppercase tracking-wider">
            ADMIN CONSOLE
          </h1>
          <p className="text-2xl text-white font-bold max-w-4xl mx-auto mb-8 uppercase tracking-wide">
            BRUTALIST COMMAND CENTER FOR ANIME UNIVERSE MANAGEMENT
          </p>
          
          {/* BRUTALIST PERFORMANCE STATUS */}
          <div className="flex justify-center gap-6 text-lg">
            <div className="flex items-center gap-3 bg-white text-black px-6 py-3 border-4 border-black">
              <div className={`w-4 h-4 ${performanceMetrics.fps > 50 ? 'bg-green-500' : performanceMetrics.fps > 30 ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
              <span className="font-black">{performanceMetrics.fps} FPS</span>
            </div>
            <div className="flex items-center gap-3 bg-white text-black px-6 py-3 border-4 border-black">
              <div className="w-4 h-4 bg-blue-500"></div>
              <span className="font-black">{isMobile ? 'MOBILE' : 'DESKTOP'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* BRUTALIST ACTION CARDS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
        {navigationItems.slice(1).map((item, index) => (
          <div
            key={item.view}
            onClick={() => setCurrentAdminView(item.view)}
            className="group cursor-pointer border-4 border-white bg-black hover:bg-white hover:text-black transition-all duration-200 p-8"
          >
            <div className="text-6xl mb-6">{item.icon}</div>
            <h3 className="text-3xl font-black text-white group-hover:text-black mb-4 uppercase tracking-wider">{item.label}</h3>
            <p className="text-lg text-white group-hover:text-black font-bold uppercase tracking-wide mb-6">
              {item.description}
            </p>
            
            <div className="flex justify-end">
              <div className="w-12 h-12 bg-white text-black flex items-center justify-center group-hover:bg-black group-hover:text-white border-4 border-black transition-all duration-200">
                <span className="text-2xl font-black">→</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* BRUTALIST STATS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'TOTAL ANIME', value: '1,247', change: '+12%', icon: '🎬' },
          { label: 'ACTIVE USERS', value: '8,439', change: '+5.2%', icon: '👥' },
          { label: 'REVIEWS TODAY', value: '156', change: '+8.1%', icon: '📝' },
          { label: 'SYSTEM HEALTH', value: '98.5%', change: '+0.3%', icon: '⚡' },
        ].map((stat, index) => (
          <div key={index} className="bg-black border-4 border-white p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-4xl">{stat.icon}</div>
              <div className="text-sm bg-green-500 text-black px-3 py-1 font-black uppercase">
                {stat.change}
              </div>
            </div>
            <div className="text-4xl font-black text-white mb-2">{stat.value}</div>
            <div className="text-lg text-white font-bold uppercase tracking-wide">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderMainContent = () => {
    switch (currentAdminView) {
      case "user_management":
        return <UserManagementPage />;
      case "review_moderation":
        return <ReviewModerationPage />;
      case "overview":
      default:
        return renderOverview();
    }
  };

  return (
    <div className="min-h-screen bg-black relative">
      {/* BRUTALIST BACKGROUND PATTERN */}
      {!shouldUseSimpleBackgrounds && (
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
      
      {/* Main Container */}
      <div className="relative z-10 min-h-screen">
        {/* BRUTALIST TOP NAVIGATION BAR */}
        <nav className="bg-white border-b-4 border-black sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="flex justify-between items-center h-20">
              {/* Left side */}
              <div className="flex items-center gap-6">
                {isMobile && (
                  <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="p-3 bg-black text-white hover:bg-gray-800 transition-colors border-2 border-black"
                  >
                    <span className="text-2xl font-black">☰</span>
                  </button>
                )}
                
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-black text-white flex items-center justify-center border-4 border-black">
                    <span className="text-2xl font-black">A</span>
                  </div>
                  <div>
                    <h1 className="text-3xl font-black text-black uppercase tracking-wider">ADMIN CONSOLE</h1>
                    <p className="text-sm text-black font-bold uppercase tracking-wide">COMMAND CENTER</p>
                  </div>
                </div>
              </div>

              {/* Right side */}
              <div className="flex items-center gap-6">
                <div className="hidden lg:flex items-center gap-3 bg-black text-white px-4 py-2 border-2 border-black">
                  <div className={`w-3 h-3 ${performanceMetrics.fps > 50 ? 'bg-green-500' : performanceMetrics.fps > 30 ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                  <span className="font-black">{performanceMetrics.fps} FPS</span>
                </div>
                
                <button 
                  onClick={onNavigateBack} 
                  className="bg-black text-white hover:bg-gray-800 border-4 border-black px-6 py-3 font-black uppercase tracking-wide transition-colors"
                >
                  ← BACK TO APP
                </button>
              </div>
            </div>
          </div>
        </nav>

        <div className="flex">
          {/* BRUTALIST SIDEBAR */}
          <aside className={`${isMobile ? 'fixed inset-y-0 left-0 z-40 w-80' : 'w-80'} 
            ${isMobile && !sidebarOpen ? '-translate-x-full' : 'translate-x-0'}
            bg-white border-r-4 border-black transition-transform duration-300`}>
            
            <div className="p-8">
              {isMobile && (
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-black text-black uppercase tracking-wider">NAVIGATION</h2>
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="p-3 bg-black text-white hover:bg-gray-800 border-2 border-black"
                  >
                    <span className="text-xl font-black">✕</span>
                  </button>
                </div>
              )}
              
              <nav className="space-y-4">
                {navigationItems.map((item) => (
                  <button
                    key={item.view}
                    onClick={() => {
                      setCurrentAdminView(item.view);
                      if (isMobile) setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-4 p-4 transition-all duration-200 border-4
                      ${currentAdminView === item.view 
                        ? 'bg-black text-white border-black' 
                        : 'bg-white text-black border-black hover:bg-gray-100'
                      }`}
                  >
                    <span className="text-3xl">{item.icon}</span>
                    <div className="flex-1 text-left">
                      <div className="font-black text-lg uppercase tracking-wider">{item.label}</div>
                      <div className="text-sm font-bold uppercase tracking-wide opacity-70">{item.description}</div>
                    </div>
                    {currentAdminView === item.view && (
                      <div className="w-4 h-4 bg-white"></div>
                    )}
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          {/* Mobile overlay */}
          {isMobile && sidebarOpen && (
            <div 
              className="fixed inset-0 bg-black/50 z-30"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Main content */}
          <main className="flex-1 p-8">
            <div className="max-w-7xl mx-auto">
              {currentAdminView === 'overview' ? (
                renderOverview()
              ) : (
                <div className="bg-black border-4 border-white overflow-hidden">
                  <div className="p-8">
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