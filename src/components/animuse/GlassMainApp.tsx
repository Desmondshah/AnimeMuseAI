// src/components/animuse/GlassMainApp.tsx - Glass Theme Enhanced Main App
import React, { useState, useEffect, useCallback, memo, useRef } from "react";
import { useQuery, useAction, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id, Doc } from "../../../convex/_generated/dataModel";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../../hooks/useTheme";
import { useMobileOptimizations } from "../../../convex/useMobileOptimizations";

// Import existing components
import AnimeDetailPage from "./AnimeDetailPage";
import WatchlistPage from "./onboarding/WatchlistPage";
import DiscoverPage from "./onboarding/DiscoverPage";
import AdminDashboardPage from "../admin/AdminDashboardPage";
import ProfileSettingsPage from "./onboarding/ProfileSettingsPage";
import EnhancedAIAssistantPage from "./AIAssistantPage";
import EnhancedBottomNavigationBar from "./EnhancedBottomNavigationBar";
import MoodboardPage from "./onboarding/MoodboardPage";
import CharacterDetailPage from "./onboarding/CharacterDetailPage";
import AnimeCard from "./AnimeCard";
import Carousel from "./shared/Carousel";
import { EnhancedStyledButton } from "./shared/EnhancedStyledButton";
import { ThemeToggle } from "../ThemeToggle";

// Import types
import { AnimeRecommendation } from "../../../convex/types";
import { ValidViewName, CurrentView } from "./MainApp";

// Glass theme utility functions
const ensureCompleteRecommendations = (recommendations: any[]): AnimeRecommendation[] => {
  return recommendations.map((rec: any): AnimeRecommendation => {
    const moodMatchScore = rec.moodMatchScore ?? 
                          rec.similarityScore ?? 
                          (typeof rec.rating === 'number' ? Math.min(10, Math.max(1, rec.rating)) : 7);

    return {
      title: rec.title || "Unknown Title",
      description: rec.description || "No description available.",
      posterUrl: rec.posterUrl || "",
      genres: Array.isArray(rec.genres) ? rec.genres : [],
      year: typeof rec.year === 'number' ? rec.year : undefined,
      rating: typeof rec.rating === 'number' ? rec.rating : undefined,
      emotionalTags: Array.isArray(rec.emotionalTags) ? rec.emotionalTags : [],
      trailerUrl: rec.trailerUrl || undefined,
      studios: Array.isArray(rec.studios) ? rec.studios : [],
      themes: Array.isArray(rec.themes) ? rec.themes : [],
      reasoning: rec.reasoning || "AI recommendation",
      moodMatchScore,
      ...(rec._id && { _id: rec._id }),
      ...(rec.characterHighlights && { characterHighlights: rec.characterHighlights }),
      ...(rec.plotTropes && { plotTropes: rec.plotTropes }),
      ...(rec.artStyleTags && { artStyleTags: rec.artStyleTags }),
      ...(rec.surpriseFactors && { surpriseFactors: rec.surpriseFactors }),
      ...(rec.foundInDatabase !== undefined && { foundInDatabase: rec.foundInDatabase }),
    };
  });
};

// Glass Theme Loading Component
const GlassLoadingSpinner: React.FC<{ message?: string; className?: string }> = memo(({ 
  message = "Loading...", 
  className = "" 
}) => {
  const { isGlassTheme } = useTheme();
  
  return (
    <div className={`flex flex-col justify-center items-center py-10 ${className}`}>
      <div className="relative">
        <motion.div
          className={`w-10 h-10 rounded-full border-4 border-transparent ${
            isGlassTheme 
              ? 'border-t-blue-500 border-r-purple-500' 
              : 'border-t-brand-primary-action border-r-brand-accent-gold'
          }`}
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        
        {isGlassTheme && (
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(102, 126, 234, 0.2) 0%, transparent 70%)',
              filter: 'blur(8px)',
            }}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
      </div>
      
      {message && (
        <p className={`mt-3 text-sm ${
          isGlassTheme ? 'text-gray-600' : 'text-white'
        }`}>
          {message}
        </p>
      )}
    </div>
  );
});

// Glass Theme Hero Section
const GlassHeroSection: React.FC<{
  userProfile: any;
  onNavigateToAI: () => void;
}> = memo(({ userProfile, onNavigateToAI }) => {
  const { isGlassTheme } = useTheme();
  const { shouldReduceAnimations } = useMobileOptimizations();

  return (
    <motion.div
      className="text-center space-y-6 px-4 py-12"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: shouldReduceAnimations ? 0 : 0.8 }}
    >
      <motion.div
        className="inline-block group"
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        transition={{ duration: shouldReduceAnimations ? 0 : 0.6 }}
        whileHover={shouldReduceAnimations ? {} : { scale: 1.02 }}
      >
        <h1 className={`text-4xl sm:text-5xl md:text-6xl font-heading font-bold mb-4 ${
          isGlassTheme 
            ? 'bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent'
            : 'bg-gradient-to-r from-white via-brand-accent-gold to-white bg-clip-text text-transparent animate-pulse'
        }`}>
          Welcome, {userProfile?.name || "Explorer"}!
        </h1>
        
        <motion.div 
          className={`h-1 w-full rounded-full mt-4 ${
            isGlassTheme
              ? 'bg-gradient-to-r from-transparent via-blue-500 to-transparent'
              : 'bg-gradient-to-r from-transparent via-brand-primary-action to-transparent animate-pulse'
          } group-hover:opacity-100 opacity-80 transition-opacity duration-500`}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
        />
      </motion.div>
      
      <motion.p
        className={`text-lg max-w-2xl mx-auto leading-relaxed ${
          isGlassTheme ? 'text-gray-600' : 'text-white/80'
        }`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: shouldReduceAnimations ? 0 : 0.8, delay: shouldReduceAnimations ? 0 : 0.3 }}
      >
        Your personalized anime universe awaits. Let's discover something extraordinary together.
      </motion.p>

      {/* AI Assistant CTA */}
      <motion.div
        className="flex justify-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: shouldReduceAnimations ? 0 : 0.8, delay: shouldReduceAnimations ? 0 : 0.5 }}
      >
        <motion.div
          className="relative group"
          whileHover={shouldReduceAnimations ? {} : { scale: 1.05, rotate: 1 }}
          transition={{ type: shouldReduceAnimations ? 'tween' : 'spring', stiffness: 300 }}
        >
          {/* Glow effect */}
          <motion.div
            className={`absolute -inset-4 rounded-3xl blur-xl opacity-60 ${
              isGlassTheme
                ? 'bg-gradient-to-r from-blue-500/30 to-purple-500/30'
                : 'bg-gradient-to-r from-brand-primary-action/50 to-brand-accent-gold/50'
            } group-hover:opacity-100 transition-opacity duration-300`}
            animate={shouldReduceAnimations ? {} : { 
              scale: [1, 1.05, 1],
              opacity: [0.6, 0.8, 0.6]
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          
          <div className={`relative rounded-3xl p-1 ${
            isGlassTheme
              ? 'bg-white/20 backdrop-blur-md border border-white/30 hover:bg-white/30'
              : 'bg-black/40 backdrop-blur-sm border border-white/20 hover:border-white/40'
          } transition-all duration-300`}>
            <EnhancedStyledButton
              onClick={onNavigateToAI}
              variant="primary"
              className={`!text-lg sm:!text-xl !px-8 sm:!px-12 !py-4 sm:!py-6 !border-0 relative overflow-hidden ${
                isGlassTheme
                  ? '!bg-gradient-to-r !from-blue-500 !to-purple-600 hover:!from-purple-600 hover:!to-pink-500'
                  : '!bg-gradient-to-r !from-brand-primary-action !to-brand-accent-gold hover:!from-brand-accent-gold hover:!to-brand-primary-action'
              } !transition-all !duration-500 !shadow-2xl`}
            >
              <span className="flex items-center gap-3 relative z-10">
                <motion.span 
                  className="text-2xl"
                  animate={shouldReduceAnimations ? {} : { rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  🤖
                </motion.span>
                <span className="font-heading">Talk to AniMuse AI</span>
                <span className="text-lg opacity-80">✨</span>
              </span>
              
              {/* Shimmer effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  repeatDelay: 2,
                  ease: 'easeInOut'
                }}
              />
            </EnhancedStyledButton>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
});

// Glass Theme Section Header
const GlassSectionHeader: React.FC<{
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
  isLoading?: boolean;
  lastUpdated?: number;
}> = memo(({ title, subtitle, onRefresh, isLoading, lastUpdated }) => {
  const { isGlassTheme } = useTheme();

  return (
    <div className="text-center space-y-4 mb-8">
      <div className="inline-block">
        <div className="flex items-center justify-center gap-4 mb-2">
          <h2 className={`text-2xl sm:text-3xl md:text-4xl font-heading font-bold whitespace-nowrap ${
            isGlassTheme ? 'text-gray-800' : 'text-white'
          }`}>
            {title}
          </h2>
          
          {onRefresh && (
            <motion.button
              onClick={onRefresh}
              disabled={isLoading}
              className={`group flex items-center gap-1 px-3 py-1.5 rounded-full border transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                isGlassTheme
                  ? 'bg-white/20 hover:bg-white/30 backdrop-blur-md border-white/30 hover:border-white/40'
                  : 'bg-white/10 hover:bg-white/20 backdrop-blur-sm border-white/20 hover:border-white/40'
              }`}
              title={`Last updated: ${lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : 'Never'}`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <motion.span 
                className={`text-sm transition-transform duration-300 ${
                  isLoading ? 'animate-spin' : 'group-hover:rotate-180'
                }`}
              >
                🔄
              </motion.span>
              <span className={`text-xs font-medium ${
                isGlassTheme ? 'text-gray-700' : 'text-white/80'
              }`}>
                {isLoading ? 'Updating...' : 'Refresh'}
              </span>
            </motion.button>
          )}
        </div>
        
        <motion.div 
          className={`h-0.5 w-full rounded-full ${
            isGlassTheme
              ? 'bg-gradient-to-r from-transparent via-blue-500 to-transparent'
              : 'bg-gradient-to-r from-transparent via-white/50 to-transparent animate-pulse'
          }`}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.8 }}
        />
      </div>
      
      {subtitle && (
        <motion.div
          className={`inline-flex items-center space-x-2 rounded-full px-6 py-3 border ${
            isGlassTheme
              ? 'bg-white/20 backdrop-blur-md border-white/30'
              : 'bg-black/30 backdrop-blur-sm border-white/10'
          }`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <span className={`text-sm italic ${
            isGlassTheme ? 'text-gray-600' : 'text-white/70'
          }`}>
            {subtitle}
          </span>
        </motion.div>
      )}
    </div>
  );
});

// Glass Theme Anime Section
const GlassAnimeSection: React.FC<{
  title: string;
  anime: AnimeRecommendation[];
  onAnimeClick: (animeId: Id<"anime">) => void;
  isLoading?: boolean;
}> = memo(({ title, anime, onAnimeClick, isLoading }) => {
  const { isGlassTheme } = useTheme();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <GlassSectionHeader title={title} />
        <GlassLoadingSpinner message="Loading anime..." />
      </div>
    );
  }

  if (anime.length === 0) {
    return null;
  }

  return (
    <motion.div 
      className="space-y-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="text-left">
        <h2 className={`text-xl sm:text-2xl font-heading font-bold ${
          isGlassTheme ? 'text-gray-800' : 'text-white'
        }`}>
          {title}
        </h2>
        <motion.div 
          className={`h-0.5 w-full rounded-full mt-2 ${
            isGlassTheme
              ? 'bg-gradient-to-r from-blue-500/50 via-purple-500/50 to-transparent'
              : 'bg-gradient-to-r from-transparent via-white/50 to-transparent'
          }`}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        />
      </div>
      
      <div className="relative">
        <motion.div
          className={`absolute inset-0 rounded-3xl blur-xl ${
            isGlassTheme
              ? 'bg-gradient-to-r from-blue-500/10 via-transparent to-purple-500/10'
              : 'bg-gradient-to-r from-brand-primary-action/20 via-transparent to-brand-accent-gold/20'
          }`}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        
        <div className={`relative rounded-3xl p-6 sm:p-8 ${
          isGlassTheme
            ? 'bg-white/20 backdrop-blur-md border border-white/30'
            : 'bg-black/20 backdrop-blur-sm border border-white/10'
        }`}>
          {isGlassTheme && (
            <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
          )}
          
          <Carousel variant="shuffle">
            {anime.map((animeRec, index) => (
              <motion.div
                key={`${title}-${index}-${animeRec.title}`}
                className="group flex-shrink-0 w-32 xs:w-36 sm:w-40 transform cursor-pointer"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
              >
                {/* Glow effect */}
                <motion.div
                  className={`absolute -inset-3 rounded-3xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                    isGlassTheme
                      ? 'bg-gradient-to-r from-blue-500/30 to-purple-500/30'
                      : 'bg-gradient-to-r from-brand-primary-action/30 to-brand-accent-gold/30'
                  }`}
                  layoutId={`glow-${animeRec.title}`}
                />
                
                <div className={`relative rounded-2xl overflow-hidden border transition-all duration-300 ${
                  isGlassTheme
                    ? 'bg-white/10 backdrop-blur-sm border-white/20 group-hover:border-white/40'
                    : 'bg-black/30 backdrop-blur-sm border-white/10 group-hover:border-white/30'
                }`}>
                  <div className="relative">
                    <AnimeCard 
                      anime={animeRec} 
                      isRecommendation={true} 
                      onViewDetails={onAnimeClick}
                      className="w-full"
                    />
                    
                    {/* Hover overlay */}
                    <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                      isGlassTheme
                        ? 'bg-gradient-to-t from-white/20 via-transparent to-transparent'
                        : 'bg-gradient-to-t from-black/60 via-transparent to-transparent'
                    }`}>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className={`rounded-full p-3 border ${
                          isGlassTheme
                            ? 'bg-white/30 backdrop-blur-sm border-white/40'
                            : 'bg-black/70 backdrop-blur-sm border-white/30'
                        }`}>
                          <span className={isGlassTheme ? 'text-gray-700' : 'text-white'}>👀</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className={`p-3 ${
                    isGlassTheme
                      ? 'bg-gradient-to-t from-white/30 to-transparent'
                      : 'bg-gradient-to-t from-black/80 to-transparent'
                  }`}>
                    <h4 
                      className={`text-sm font-medium text-center line-clamp-2 transition-colors duration-300 ${
                        isGlassTheme
                          ? 'text-gray-800 group-hover:text-blue-600'
                          : 'text-white group-hover:text-brand-accent-gold'
                      }`}
                      title={animeRec.title}
                    >
                      {animeRec.title}
                    </h4>
                    
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 mt-1">
                      <p className={`text-xs text-center ${
                        isGlassTheme ? 'text-gray-600' : 'text-white/60'
                      }`}>
                        Click to explore
                      </p>
                      {animeRec.genres && animeRec.genres.length > 0 && (
                        <p className={`text-xs text-center truncate mt-0.5 ${
                          isGlassTheme ? 'text-blue-600' : 'text-brand-accent-gold'
                        }`} title={animeRec.genres.join(", ")}>
                          {animeRec.genres.slice(0, 2).join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </Carousel>
          
          <div className="mt-4 text-center">
            <span className={`text-xs rounded-full px-3 py-1 ${
              isGlassTheme
                ? 'text-gray-600 bg-white/20 backdrop-blur-sm'
                : 'text-white/50 bg-black/30 backdrop-blur-sm'
            }`}>
              {anime.length} recommendations
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

// Main Enhanced Glass App Component
export default function GlassMainApp() {
  // All the existing MainApp logic would go here
  // This is a simplified version showing the key glass theme integrations
  
  const { isGlassTheme } = useTheme();
  const [currentView, setCurrentView] = useState<CurrentView>("dashboard");
  const [selectedAnimeId, setSelectedAnimeId] = useState<Id<"anime"> | null>(null);
  
  // Sample data for demonstration
  const userProfile = useQuery(api.users.getMyUserProfile);
  const isUserAdmin = useQuery(api.admin.isCurrentUserAdmin);
  
  const navigateTo = useCallback((view: CurrentView) => {
    setCurrentView(view);
    window.scrollTo(0, 0);
  }, []);

  const navigateToDetail = useCallback((animeId: Id<"anime">) => { 
    navigateTo("anime_detail"); 
    setSelectedAnimeId(animeId); 
  }, [navigateTo]);

  const handleTabChange = (view: ValidViewName) => {
    navigateTo(view);
  };

  const renderDashboard = () => (
    <div className="relative min-h-screen">
      {/* Enhanced background for glass theme */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {isGlassTheme ? (
          // Glass theme background
          <>
            <motion.div
              className="absolute w-96 h-96 rounded-full opacity-20"
              style={{
                background: 'radial-gradient(circle, rgba(102, 126, 234, 0.3) 0%, transparent 70%)',
                filter: 'blur(40px)',
                top: '10%',
                left: '10%',
              }}
              animate={{
                x: [0, 100, 0],
                y: [0, -50, 0],
              }}
              transition={{
                duration: 20,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
            <motion.div
              className="absolute w-80 h-80 rounded-full opacity-15"
              style={{
                background: 'radial-gradient(circle, rgba(240, 147, 251, 0.4) 0%, transparent 70%)',
                filter: 'blur(60px)',
                bottom: '20%',
                right: '15%',
              }}
              animate={{
                x: [0, -80, 0],
                y: [0, 60, 0],
              }}
              transition={{
                duration: 25,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: 5,
              }}
            />
          </>
        ) : (
          // Dark theme background (existing)
          <>
            <motion.div
              className="absolute top-10 left-10 w-80 h-80 bg-gradient-to-br from-brand-primary-action/15 to-transparent rounded-full blur-3xl animate-pulse"
            />
            <motion.div
              className="absolute bottom-20 right-16 w-96 h-96 bg-gradient-to-tr from-brand-accent-gold/12 to-transparent rounded-full blur-3xl animate-pulse"
              style={{ animationDelay: '1s' }}
            />
          </>
        )}
      </div>

      {/* Main Content */}
      <div className="relative z-10 px-4 sm:px-6 py-8 space-y-12">
        {/* Hero Section */}
        <GlassHeroSection 
          userProfile={userProfile}
          onNavigateToAI={() => navigateTo("ai_assistant")}
        />

        {/* Sample anime sections */}
        <GlassAnimeSection
          title="🔥 Trending Now"
          anime={[]} // Would be populated with real data
          onAnimeClick={navigateToDetail}
        />

        {/* Theme Toggle for Demo */}
        <div className="flex justify-center">
          <ThemeToggle showLabel={true} />
        </div>

        {/* Admin Section */}
        {isUserAdmin && (
          <motion.div 
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="relative inline-block group">
              <motion.div
                className={`absolute -inset-4 rounded-3xl blur-xl opacity-60 group-hover:opacity-100 transition-opacity duration-300 ${
                  isGlassTheme
                    ? 'bg-gradient-to-r from-purple-500/40 to-pink-500/40'
                    : 'bg-gradient-to-r from-brand-accent-gold/40 to-brand-primary-action/40'
                }`}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />
              
              <div className={`relative rounded-3xl p-6 border transition-all duration-300 ${
                isGlassTheme
                  ? 'bg-white/20 backdrop-blur-md border-purple-500/30 group-hover:border-purple-500/60'
                  : 'bg-black/40 backdrop-blur-sm border-brand-accent-gold/30 group-hover:border-brand-accent-gold/60'
              }`}>
                <div className="flex items-center justify-center space-x-3 mb-4">
                  <span className="text-3xl animate-pulse">🛡️</span>
                  <h3 className={`text-xl font-heading ${
                    isGlassTheme ? 'text-purple-600' : 'text-brand-accent-gold'
                  }`}>
                    Admin Access
                  </h3>
                  <span className="text-3xl animate-pulse">⚡</span>
                </div>
                <p className={`text-sm mb-4 ${
                  isGlassTheme ? 'text-gray-600' : 'text-white/70'
                }`}>
                  Manage users, anime database, and system settings
                </p>
                <EnhancedStyledButton 
                  onClick={() => navigateTo("admin_dashboard")} 
                  variant="secondary"
                  className={isGlassTheme 
                    ? '!border-purple-500 !text-purple-600 hover:!bg-purple-500 hover:!text-white'
                    : '!border-brand-accent-gold !text-brand-accent-gold hover:!bg-brand-accent-gold hover:!text-brand-surface'
                  }
                >
                  🚀 Enter Admin Dashboard
                </EnhancedStyledButton>
              </div>
            </div>
          </motion.div>
        )}

        <div className="h-24"></div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (currentView) {
      case "ai_assistant": 
        return <EnhancedAIAssistantPage navigateToDetail={navigateToDetail} />;
      
      case "anime_detail": 
        return selectedAnimeId ? (
          <AnimeDetailPage 
            animeId={selectedAnimeId} 
            onBack={() => navigateTo("dashboard")} 
            navigateToDetail={navigateToDetail}
            onCharacterClick={() => {}} // Would handle character navigation
          />
        ) : <GlassLoadingSpinner className="text-white" />;
      
      case "my_list": 
        return (
          <WatchlistPage 
            onViewDetails={navigateToDetail} 
            onBack={() => navigateTo("dashboard")} 
            onNavigateToCustomLists={() => {}} 
          />
        );
      
      case "browse": 
        return (
          <DiscoverPage 
            onViewDetails={navigateToDetail} 
            onBack={() => navigateTo("dashboard")} 
          />
        );
      
      case "admin_dashboard": 
        return <AdminDashboardPage onNavigateBack={() => navigateTo("dashboard")} />;
      
      case "profile_settings": 
        return <ProfileSettingsPage onBack={() => navigateTo("dashboard")} />;
      
      case "moodboard_page": 
        return (
          <MoodboardPage 
            navigateToDetail={navigateToDetail}
            selectedMoodCues={[]}
            onMoodCuesChange={() => {}}
            moodBoardRecommendations={[]}
            onRecommendationsChange={() => {}}
            isLoadingMoodBoard={false}
            onLoadingChange={() => {}}
          />
        );
      
      case "dashboard":
      default: 
        return renderDashboard();
    }
  };

  return (
    <div className="w-full pb-20">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentView}
          className="pt-0"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>
      
      <EnhancedBottomNavigationBar 
        currentView={currentView} 
        onTabChange={handleTabChange} 
      />
    </div>
  );
}