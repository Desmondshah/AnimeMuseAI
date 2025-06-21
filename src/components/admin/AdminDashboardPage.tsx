// DRAMATIC Visual Transformation - AdminDashboardPage.tsx
import React, { useState, memo } from "react";
import StyledButton from "../animuse/shared/StyledButton";
import UserManagementPage from "./UserManagementPage";
import EnhancedAnimeManagementPage from "./EnhancedAnimeManagementPage";
import ReviewModerationPage from "./ReviewModerationPage";
import { useMobileOptimizations } from "../../../convex/useMobileOptimizations"; // Adjust path

interface AdminDashboardPageProps {
  onNavigateBack: () => void;
}

type AdminView = "overview" | "user_management" | "anime_management" | "review_moderation";

// Completely redesigned loading component
const FuturisticLoading: React.FC<{ sectionTitle: string }> = memo(({ sectionTitle }) => {
  const { shouldReduceAnimations } = useMobileOptimizations();
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      {/* Multi-ring loader */}
      <div className="relative w-24 h-24 mb-8">
        <div className="absolute inset-0 rounded-full border-4 border-brand-primary-action/20"></div>
        <div className={`absolute inset-2 rounded-full border-4 border-brand-accent-gold/40 ${shouldReduceAnimations ? '' : 'animate-spin'}`} style={{ animationDuration: '3s' }}></div>
        <div className={`absolute inset-4 rounded-full border-4 border-brand-primary-action ${shouldReduceAnimations ? '' : 'animate-spin'}`} style={{ animationDuration: '1.5s', animationDirection: 'reverse' }}></div>
        <div className="absolute inset-8 w-8 h-8 bg-gradient-to-br from-brand-primary-action to-brand-accent-gold rounded-full opacity-80"></div>
      </div>
      
      <h3 className="text-2xl font-heading bg-gradient-to-r from-brand-primary-action to-brand-accent-gold bg-clip-text text-transparent mb-4">
        {sectionTitle}
      </h3>
      
      {/* Animated dots */}
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`w-3 h-3 bg-brand-primary-action rounded-full ${shouldReduceAnimations ? 'opacity-50' : 'animate-bounce'}`}
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
    { view: "overview" as AdminView, icon: "📊", label: "Dashboard", color: "from-blue-500 to-purple-600" },
    { view: "user_management" as AdminView, icon: "👥", label: "Users", color: "from-green-500 to-emerald-600" },
    { view: "anime_management" as AdminView, icon: "🎬", label: "Anime", color: "from-orange-500 to-red-600" },
    { view: "review_moderation" as AdminView, icon: "📝", label: "Reviews", color: "from-purple-500 to-pink-600" },
  ];

  const renderOverview = () => (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center py-12 px-6 bg-gradient-to-br from-brand-primary-action/10 via-brand-accent-gold/5 to-transparent rounded-2xl border border-brand-primary-action/20">
        <div className="mb-6">
          <h1 className="text-4xl md:text-6xl font-heading bg-gradient-to-r from-white via-brand-accent-gold to-brand-primary-action bg-clip-text text-transparent mb-4">
            Admin Command Center
          </h1>
          <p className="text-lg text-white/70 max-w-2xl mx-auto">
            Advanced dashboard for managing your anime universe with real-time insights and powerful tools.
          </p>
        </div>
        
        {/* Performance Status */}
        <div className="flex justify-center gap-4 text-sm">
          <div className="flex items-center gap-2 bg-black/20 px-4 py-2 rounded-full">
            <div className={`w-2 h-2 rounded-full ${performanceMetrics.fps > 50 ? 'bg-green-400' : performanceMetrics.fps > 30 ? 'bg-yellow-400' : 'bg-red-400'}`}></div>
            <span className="text-white/80">{performanceMetrics.fps} FPS</span>
          </div>
          <div className="flex items-center gap-2 bg-black/20 px-4 py-2 rounded-full">
            <div className="w-2 h-2 rounded-full bg-blue-400"></div>
            <span className="text-white/80">{isMobile ? 'Mobile' : 'Desktop'}</span>
          </div>
        </div>
      </div>

      {/* Action Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {navigationItems.slice(1).map((item, index) => (
          <div
            key={item.view}
            onClick={() => setCurrentAdminView(item.view)}
            className={`group relative overflow-hidden bg-gradient-to-br ${item.color} p-1 rounded-2xl cursor-pointer
              ${shouldReduceAnimations ? 'hover:scale-105' : 'hover:scale-110 hover:rotate-1'} 
              transition-all duration-300 shadow-lg hover:shadow-2xl`}
          >
            {/* Inner card */}
            <div className="bg-black/40 backdrop-blur-xl rounded-xl p-6 h-full border border-white/10">
              <div className="text-4xl mb-4">{item.icon}</div>
              <h3 className="text-xl font-heading text-white mb-2">{item.label}</h3>
              <p className="text-sm text-white/70 mb-4">
                {item.view === 'user_management' && 'Manage accounts & permissions'}
                {item.view === 'anime_management' && 'Edit anime & character data'}
                {item.view === 'review_moderation' && 'Moderate content & reviews'}
              </p>
              
              {/* Action arrow */}
              <div className="flex justify-end">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center group-hover:bg-white/30 transition-colors">
                  <span className="text-white text-sm">→</span>
                </div>
              </div>
            </div>
            
            {/* Glow effect */}
            <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-0 group-hover:opacity-20 transition-opacity duration-300 rounded-2xl`}></div>
          </div>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Anime', value: '1,247', change: '+12%' },
          { label: 'Active Users', value: '8,439', change: '+5.2%' },
          { label: 'Reviews Today', value: '156', change: '+8.1%' },
          { label: 'System Health', value: '98.5%', change: '+0.3%' },
        ].map((stat, index) => (
          <div key={index} className="bg-black/20 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <div className="text-2xl font-bold text-white">{stat.value}</div>
            <div className="text-sm text-white/70">{stat.label}</div>
            <div className="text-xs text-green-400">{stat.change}</div>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated background */}
      {!shouldUseSimpleBackgrounds && (
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute top-40 left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>
      )}
      
      {/* Main Container */}
      <div className="relative z-10 min-h-screen">
        {/* Top Navigation Bar */}
        <nav className={`bg-black/20 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50 
          ${hasNotch ? 'pt-safe-area-inset-top' : ''}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Left side */}
              <div className="flex items-center gap-4">
                {isMobile && (
                  <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                    style={{ minHeight: '44px', minWidth: '44px' }}
                  >
                    <span className="text-white text-lg">☰</span>
                  </button>
                )}
                
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-brand-primary-action to-brand-accent-gold rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">A</span>
                  </div>
                  <h1 className="text-xl font-heading text-white">Admin Console</h1>
                </div>
              </div>

              {/* Right side */}
              <div className="flex items-center gap-4">
                {/* Performance indicator */}
                <div className="hidden sm:flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-full">
                  <div className={`w-2 h-2 rounded-full ${performanceMetrics.fps > 50 ? 'bg-green-400' : performanceMetrics.fps > 30 ? 'bg-yellow-400' : 'bg-red-400'}`}></div>
                  <span className="text-white/80 text-sm">{performanceMetrics.fps} FPS</span>
                </div>
                
                <StyledButton 
                  onClick={onNavigateBack} 
                  variant="secondary_small"
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                >
                  ← Back to App
                </StyledButton>
              </div>
            </div>
          </div>
        </nav>

        <div className="flex">
          {/* Sidebar */}
          <aside className={`${isMobile ? 'fixed inset-y-0 left-0 z-40 w-64' : 'w-64'} 
            ${isMobile && !sidebarOpen ? '-translate-x-full' : 'translate-x-0'}
            bg-black/20 backdrop-blur-xl border-r border-white/10 transition-transform duration-300`}>
            
            <div className="p-6">
              {isMobile && (
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-heading text-white">Navigation</h2>
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20"
                    style={{ minHeight: '44px', minWidth: '44px' }}
                  >
                    <span className="text-white">✕</span>
                  </button>
                </div>
              )}
              
              <nav className="space-y-2">
                {navigationItems.map((item) => (
                  <button
                    key={item.view}
                    onClick={() => {
                      setCurrentAdminView(item.view);
                      if (isMobile) setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200
                      ${currentAdminView === item.view 
                        ? `bg-gradient-to-r ${item.color} text-white shadow-lg` 
                        : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                      }`}
                    style={{ minHeight: isMobile ? '44px' : 'auto' }}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span className="font-medium">{item.label}</span>
                    {currentAdminView === item.view && (
                      <div className="ml-auto w-2 h-2 bg-white rounded-full"></div>
                    )}
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          {/* Mobile overlay */}
          {isMobile && sidebarOpen && (
            <div 
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Main content */}
          <main className="flex-1 p-6">
            <div className="max-w-7xl mx-auto">
              {currentAdminView === 'overview' ? (
                renderOverview()
              ) : (
                <div className="bg-black/20 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
                  <div className="p-6">
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