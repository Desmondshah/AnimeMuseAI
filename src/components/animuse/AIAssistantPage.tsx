// src/components/animuse/AIAssistantPage.tsx - Advanced Artistic Version
import React, { useState, FormEvent, useRef, useEffect, useCallback, memo } from "react";
import { useAction, useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import StyledButton from "./shared/StyledButton";
import { toast } from "sonner";
import { AnimeRecommendation } from "../../../convex/types";
import AnimeCard from "./AnimeCard";
import { usePersistentChatHistory } from 'C:/Users/desmo/AnimeMuseAI/convex/usePersistentChatHistory.ts';

// Enhanced types
type RecommendationResult = { recommendations: AnimeRecommendation[]; error?: string; };
type AnalysisResult = { analysis: any; error?: string; };
type GuideResult = { guide: any; error?: string; };
type AIActionResult = RecommendationResult | AnalysisResult | GuideResult;

function isRecommendationResult(result: AIActionResult): result is RecommendationResult {
  return 'recommendations' in result;
}

function isAnalysisResult(result: AIActionResult): result is AnalysisResult {
  return 'analysis' in result;
}

function isGuideResult(result: AIActionResult): result is GuideResult {
  return 'guide' in result;
}

interface ChatMessage {
  id: string;
  type: "user" | "ai" | "error" | "analysis" | "guide";
  content: string;
  recommendations?: AnimeRecommendation[];
  analysis?: any;
  guide?: any;
  feedback?: "up" | "down" | null;
  rawAiResponse?: any[];
  rawAiText?: string;
  actionType?: string;
}

interface ExpandableTextProps {
  text: string;
  maxLength?: number;
  className?: string;
}

type AIMode = "general" | "character" | "trope" | "art_style" | "compare" | "hidden_gems" | "franchise";

interface EnhancedAIAssistantPageProps {
  navigateToDetail: (animeId: Id<"anime">) => void;
}

const ExpandableText: React.FC<ExpandableTextProps> = ({ 
  text, 
  maxLength = 150, 
  className = "" 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (text.length <= maxLength) {
    return <p className={className}>{text}</p>;
  }

  return (
    <p className={className}>
      {isExpanded ? text : `${text.substring(0, maxLength)}...`}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="ml-2 text-brand-accent-gold hover:text-brand-primary-action text-xs font-medium underline"
      >
        {isExpanded ? 'Show less' : 'Show more'}
      </button>
    </p>
  );
};

// Artistic Loading Component with particle effects
const ArtisticLoadingSpinner: React.FC<{ size?: string; message?: string }> = memo(({ 
  size = "h-12 w-12", 
  message = "AniMuse is thinking..." 
}) => (
  <div className="flex flex-col items-center justify-center py-8">
    <div className="relative">
      {/* Main spinning ring */}
      <div className={`${size} border-4 border-transparent border-t-brand-primary-action border-r-brand-accent-gold rounded-full animate-spin`}></div>
      
      {/* Inner counter-rotating ring */}
      <div className="absolute top-1 left-1 h-10 w-10 border-4 border-transparent border-b-brand-accent-peach border-l-white/50 rounded-full animate-spin animate-reverse"></div>
      
      {/* Pulsing core */}
      <div className="absolute top-3 left-3 h-6 w-6 bg-gradient-to-r from-brand-primary-action to-brand-accent-gold rounded-full animate-pulse"></div>
      
      {/* Orbiting particles */}
      <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s' }}>
        <div className="absolute top-0 left-1/2 w-1 h-1 -ml-0.5 bg-brand-accent-gold rounded-full"></div>
        <div className="absolute bottom-0 left-1/2 w-1 h-1 -ml-0.5 bg-brand-primary-action rounded-full"></div>
      </div>
      <div className="absolute inset-0 animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }}>
        <div className="absolute top-1/2 left-0 w-1 h-1 -mt-0.5 bg-brand-accent-peach rounded-full"></div>
        <div className="absolute top-1/2 right-0 w-1 h-1 -mt-0.5 bg-white/70 rounded-full"></div>
      </div>
    </div>
    
    {message && (
      <div className="mt-4 text-center">
        <p className="text-white/90 text-sm font-medium animate-pulse">{message}</p>
        <div className="flex justify-center mt-2 space-x-1">
          <div className="w-2 h-2 bg-brand-primary-action rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-brand-accent-gold rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-brand-accent-peach rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    )}
  </div>
));

// Floating Particle Component
const FloatingParticle: React.FC<{ delay?: number; size?: string; color?: string }> = memo(({ 
  delay = 0, 
  size = "w-2 h-2", 
  color = "bg-brand-accent-gold/30" 
}) => (
  <div 
    className={`absolute ${size} ${color} rounded-full animate-ping`}
    style={{ 
      animationDelay: `${delay}s`, 
      left: `${Math.random() * 100}%`, 
      top: `${Math.random() * 100}%`,
      animationDuration: `${2 + Math.random() * 3}s`
    }}
  ></div>
));

// Enhanced Mode Card Component
const ModeCard: React.FC<{
  mode: { id: string; label: string; desc: string; icon: string; gradient: string };
  isActive: boolean;
  onClick: () => void;
}> = memo(({ mode, isActive, onClick }) => (
  <div className="group relative">
    {/* Glow effect */}
    <div className={`absolute -inset-2 bg-gradient-to-r ${mode.gradient} rounded-2xl blur-xl opacity-0 group-hover:opacity-60 transition-opacity duration-300 ${isActive ? 'opacity-40' : ''}`}></div>
    
    <button
      onClick={onClick}
      className={`relative w-full p-4 rounded-2xl border transition-all duration-300 transform hover:scale-105 ${
        isActive 
          ? `bg-gradient-to-br ${mode.gradient} border-white/30 shadow-2xl scale-105` 
          : 'bg-black/40 backdrop-blur-sm border-white/10 hover:border-white/30 hover:bg-black/60'
      }`}
    >
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent transform rotate-45"></div>
      </div>
      
      <div className="relative z-10 text-center space-y-2">
        <div className={`text-3xl transition-transform duration-300 ${isActive ? 'animate-bounce' : 'group-hover:animate-pulse'}`}>
          {mode.icon}
        </div>
        <div className="text-sm font-medium text-white/90">{mode.label}</div>
        <div className="text-xs text-white/60 leading-relaxed">{mode.desc}</div>
      </div>
      
      {/* Selection indicator */}
      {isActive && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-brand-primary-action rounded-full border-2 border-white animate-pulse"></div>
      )}
    </button>
  </div>
));

const EnhancedAIAssistantPageComponent: React.FC<EnhancedAIAssistantPageProps> = ({ navigateToDetail }) => {
  const [prompt, setPrompt] = useState("");
  const [aiMode, setAiMode] = useState<AIMode>("general");
  const { 
  chatHistory, 
  setChatHistory, 
  addMessage, 
  updateMessage, 
  clearChatHistory,
  isLoaded: chatHistoryLoaded 
} = usePersistentChatHistory();
  const [isLoading, setIsLoading] = useState(false);

  const [animeA, setAnimeA] = useState("");
  const [animeB, setAnimeB] = useState("");
  const [surpriseLevel, setSurpriseLevel] = useState<"mild" | "moderate" | "wild">("moderate");
  const [avoidPopular, setAvoidPopular] = useState(false);

  // AI Actions
  const getAnimeRecommendationAction = useAction(api.ai.getAnimeRecommendation);
  const getCharacterBasedRecommendationsAction = useAction(api.ai.getCharacterBasedRecommendations);
  const getTropeBasedRecommendationsAction = useAction(api.ai.getTropeBasedRecommendations);
  const getArtStyleRecommendationsAction = useAction(api.ai.getArtStyleRecommendations);
  const getComparativeAnalysisAction = useAction(api.ai.getComparativeAnalysis);
  const getHiddenGemRecommendationsAction = useAction(api.ai.getHiddenGemRecommendations);
  const getFranchiseGuideAction = useAction(api.ai.getFranchiseGuide);

  const userProfileQuery = useQuery(api.users.getMyUserProfile);
  const storeAiFeedback = useMutation(api.ai.storeAiFeedback);
  const { isAuthenticated, isLoading: authIsLoading } = useConvexAuth();

  const addAnimeByUserMutation = useMutation(api.anime.addAnimeByUser);
  const upsertToWatchlistMutation = useMutation(api.anime.upsertToWatchlist);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Enhanced mode configurations with gradients
  const modeConfigs = [
    { id: "general", label: "General", desc: "Personalized recommendations", icon: "🎯", gradient: "from-blue-500/50 to-cyan-400/50" },
    { id: "character", label: "Character", desc: "Character-focused finds", icon: "👤", gradient: "from-purple-500/50 to-pink-400/50" },
    { id: "trope", label: "Plot/Trope", desc: "Story structure based", icon: "📖", gradient: "from-green-500/50 to-emerald-400/50" },
    { id: "art_style", label: "Art Style", desc: "Visual aesthetics focused", icon: "🎨", gradient: "from-orange-500/50 to-yellow-400/50" },
    { id: "compare", label: "Compare", desc: "Analyze two anime", icon: "⚖️", gradient: "from-red-500/50 to-pink-400/50" },
    { id: "hidden_gems", label: "Hidden Gems", desc: "Surprise discoveries", icon: "💎", gradient: "from-indigo-500/50 to-purple-400/50" },
    { id: "franchise", label: "Franchise", desc: "Series watch guides", icon: "📚", gradient: "from-teal-500/50 to-blue-400/50" },
  ];

  const getModeExamples = useCallback(() => {
    const examples = {
      general: [
        "I want something emotionally impactful like Your Lie in April",
        "Suggest anime for a cozy weekend binge",
        "Something with amazing character development",
        "I'm in the mood for a tearjerker"
      ],
      character: [
        "Characters like L from Death Note - strategic masterminds",
        "Strong female protagonists who break stereotypes", 
        "Anti-heroes with complex moral codes",
        "Mentors who guide the main character's growth"
      ],
      trope: [
        "Time loop stories that use the concept meaningfully",
        "Found family dynamics that feel genuine",
        "Tournament arcs that actually develop characters",
        "Redemption arcs that are earned and satisfying"
      ],
      art_style: [
        "Studio Ghibli-esque beautiful animation",
        "Dark and gritty visual aesthetic like Attack on Titan",
        "Vibrant, colorful art style that pops",
        "Unique artistic approach that stands out"
      ],
      compare: [
        "Your Name vs Weathering With You",
        "Naruto vs One Piece storytelling approaches", 
        "Death Note vs Code Geass strategic protagonists",
        "Studio Ghibli vs Makoto Shinkai styles"
      ],
      hidden_gems: [
        "Surprise me with something completely unique",
        "Hidden classics from the 2000s era",
        "Underrated masterpieces I've never heard of",
        "Weird but wonderful experimental anime"
      ],
      franchise: [
        "How to watch the Fate series in order",
        "Monogatari series viewing guide for beginners",
        "Ghost in the Shell franchise roadmap",
        "Gundam series - where should I start?"
      ],
    };
    return examples[aiMode] || examples.general;
  }, [aiMode]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [chatHistory]);

  const generateMessageId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const executeAIAction = useCallback(async (currentPrompt: string, aiMessageId: string): Promise<AIActionResult> => {
    const profileDataForAI = userProfileQuery ? {
      name: userProfileQuery.name, moods: userProfileQuery.moods, genres: userProfileQuery.genres,
      favoriteAnimes: userProfileQuery.favoriteAnimes, experienceLevel: userProfileQuery.experienceLevel,
      dislikedGenres: userProfileQuery.dislikedGenres, dislikedTags: userProfileQuery.dislikedTags,
      characterArchetypes: userProfileQuery.characterArchetypes, tropes: userProfileQuery.tropes,
      artStyles: userProfileQuery.artStyles, narrativePacing: userProfileQuery.narrativePacing,
    } : undefined;

    switch (aiMode) {
      case "character":
        return await getCharacterBasedRecommendationsAction({ characterDescription: currentPrompt, userProfile: profileDataForAI, messageId: aiMessageId });
      case "trope":
        return await getTropeBasedRecommendationsAction({ plotDescription: currentPrompt, userProfile: profileDataForAI, messageId: aiMessageId });
      case "art_style":
        return await getArtStyleRecommendationsAction({ artStyleDescription: currentPrompt, userProfile: profileDataForAI, messageId: aiMessageId });
      case "compare":
        if (!animeA || !animeB) throw new Error("Please enter both anime titles to compare");
        return await getComparativeAnalysisAction({ animeA, animeB, messageId: aiMessageId });
      case "hidden_gems":
        return await getHiddenGemRecommendationsAction({ surpriseLevel, avoidPopular, userProfile: profileDataForAI, messageId: aiMessageId });
      case "franchise":
        return await getFranchiseGuideAction({ franchiseName: currentPrompt, userExperience: userProfileQuery?.experienceLevel, messageId: aiMessageId });
      default:
        return await getAnimeRecommendationAction({ prompt: currentPrompt, userProfile: profileDataForAI, messageId: aiMessageId });
    }
  }, [aiMode, userProfileQuery, animeA, animeB, surpriseLevel, avoidPopular, getCharacterBasedRecommendationsAction, getTropeBasedRecommendationsAction, getArtStyleRecommendationsAction, getComparativeAnalysisAction, getHiddenGemRecommendationsAction, getFranchiseGuideAction, getAnimeRecommendationAction]);

  const handleSubmit = useCallback(async (e: FormEvent | string) => {
  if (e instanceof Object && typeof e.preventDefault === 'function') e.preventDefault();
  const currentPromptText = typeof e === 'string' ? e : (aiMode === "compare" ? `Compare ${animeA} vs ${animeB}` : prompt);
  if (!currentPromptText.trim() && aiMode !== "hidden_gems") return;
  if (aiMode === "compare" && (!animeA.trim() || !animeB.trim())) {
    toast.error("Please enter both anime titles for comparison.");
    return;
  }

  const userMessageId = generateMessageId();
  const newUserMessage: ChatMessage = { 
    id: userMessageId, 
    type: "user", 
    content: currentPromptText, 
    actionType: aiMode 
  };
  
  // Use addMessage instead of setChatHistory
  addMessage(newUserMessage);
  setIsLoading(true);
  if (typeof e !== 'string') setPrompt("");

  const aiMessageId = generateMessageId();
  let responseToLog: Partial<ChatMessage> = { 
    recommendations: undefined, 
    analysis: undefined, 
    guide: undefined, 
    rawAiText: undefined, 
  };

  try {
    const result = await executeAIAction(currentPromptText, aiMessageId);
    let aiResponseMessage!: ChatMessage;

    if (result.error) {
      aiResponseMessage = { 
        id: aiMessageId, 
        type: "error", 
        content: `Error: ${result.error.substring(0,150)}`, 
        rawAiText: result.error, 
        feedback: null, 
        actionType: aiMode 
      };
      responseToLog.rawAiText = result.error;
      toast.error("AniMuse had trouble with that request.");
    } else if (isAnalysisResult(result) && result.analysis) {
      aiResponseMessage = { 
        id: aiMessageId, 
        type: "analysis", 
        content: "Here's the comparative analysis:", 
        analysis: result.analysis, 
        feedback: null, 
        actionType: aiMode 
      };
      responseToLog.analysis = result.analysis;
      responseToLog.rawAiText = JSON.stringify(result.analysis);
      toast.success("Analysis complete!");
    } else if (isGuideResult(result) && result.guide) {
      aiResponseMessage = { 
        id: aiMessageId, 
        type: "guide", 
        content: `Your guide to ${result.guide.franchiseName || 'the franchise'}:`, 
        guide: result.guide, 
        feedback: null, 
        actionType: aiMode 
      };
      responseToLog.guide = result.guide;
      responseToLog.rawAiText = JSON.stringify(result.guide);
      toast.success("Franchise guide ready!");
    } else if (isRecommendationResult(result) && result.recommendations && result.recommendations.length > 0) {
      const modeLabels: Record<AIMode, string> = { 
        general: "recommendations", 
        character: "character picks", 
        trope: "plot/trope ideas", 
        art_style: "visual suggestions", 
        compare: "comparisons", 
        hidden_gems: "hidden gems", 
        franchise: "franchise guides" 
      };
      aiResponseMessage = { 
        id: aiMessageId, 
        type: "ai", 
        content: `Here are some ${modeLabels[aiMode] || "recommendations"}:`, 
        recommendations: result.recommendations, 
        rawAiResponse: result.recommendations, 
        feedback: null, 
        actionType: aiMode 
      };
      responseToLog.recommendations = result.recommendations;
      toast.success(`Found some ${modeLabels[aiMode] || "ideas"}!`);
    } else {
      const noRecContent = "I couldn't find specific matches for that request. Try adjusting your criteria or switching modes!";
      aiResponseMessage = { 
        id: aiMessageId, 
        type: "ai", 
        content: noRecContent, 
        rawAiText: noRecContent, 
        feedback: null, 
        actionType: aiMode 
      };
      responseToLog.rawAiText = noRecContent;
      toast.info("No matches found - try a different approach!");
    }
    
    // Use addMessage instead of setChatHistory
    addMessage(aiResponseMessage);
  } catch (error: any) {
    console.error("Failed to get AI response:", error);
    const errorContent = error.message || "Something went wrong on my end.";
    const errorMsg: ChatMessage = { 
      id: aiMessageId, 
      type: "error", 
      content: errorContent.substring(0,150), 
      rawAiText: errorContent, 
      feedback: null, 
      actionType: aiMode 
    };
    responseToLog.rawAiText = errorContent;
    
    // Use addMessage instead of setChatHistory
    addMessage(errorMsg);
    toast.error("An error occurred processing your request.");
  } finally {
    setIsLoading(false);
    try {
      await storeAiFeedback({
        prompt: currentPromptText, 
        aiAction: aiMode, 
        aiResponseRecommendations: responseToLog.recommendations,
        aiResponseText: responseToLog.rawAiText, 
        feedbackType: "none", 
        messageId: aiMessageId,
      });
    } catch (feedbackError) {
      console.error("Failed to store AI feedback:", feedbackError);
    }
  }
}, [prompt, aiMode, animeA, animeB, executeAIAction, storeAiFeedback, userProfileQuery, addMessage]);

  const handleFeedback = async (messageId: string, feedbackScore: "up" | "down") => {
  // Use updateMessage instead of setChatHistory
  updateMessage(messageId, { feedback: feedbackScore });
  
  const message = chatHistory.find(msg => msg.id === messageId);
  if (message && (message.type === "ai" || message.type === "analysis" || message.type === "guide" || message.type === "error")) {
    let relatedUserPrompt = "N/A";
    const messageIndex = chatHistory.findIndex(m => m.id === messageId);
    if (messageIndex > 0) {
      for (let i = messageIndex - 1; i >= 0; i--) {
        if (chatHistory[i].type === "user") {
          relatedUserPrompt = chatHistory[i].content;
          break;
        }
      }
    }
    
    try {
      await storeAiFeedback({
        prompt: relatedUserPrompt, 
        aiAction: message.actionType || aiMode,
        aiResponseRecommendations: message.recommendations,
        aiResponseText: message.rawAiText || JSON.stringify(message.analysis) || JSON.stringify(message.guide) || message.content,
        feedbackType: feedbackScore, 
        messageId: message.id,
      });
      toast.success("Thanks for your feedback!");
    } catch (error) {
      console.error("Error storing feedback:", error);
      // Revert the feedback change if storing failed
      updateMessage(messageId, { feedback: null });
      toast.error("Could not save feedback at this time.");
    }
  }
};

  const handleAiRecommendationAddToWatchlist = async (recommendedAnime: AnimeRecommendation, status: string) => {
    if (!isAuthenticated) {
      toast.error("Please log in to add to watchlist.");
      return;
    }

    const toastId = `ai-watchlist-${recommendedAnime.title}-${Date.now()}`;
    toast.loading(`Adding "${recommendedAnime.title}" to watchlist...`, { id: toastId });

    try {
      const animeDbId = await addAnimeByUserMutation({
        title: recommendedAnime.title,
        description: recommendedAnime.description || "No description available.",
        posterUrl: recommendedAnime.posterUrl || `https://placehold.co/300x450/ECB091/321D0B/png?text=${encodeURIComponent(recommendedAnime.title.substring(0,10))}&font=poppins`,
        genres: recommendedAnime.genres || [],
        year: recommendedAnime.year,
        rating: recommendedAnime.rating,
        emotionalTags: recommendedAnime.emotionalTags || [],
        trailerUrl: recommendedAnime.trailerUrl || undefined,
        studios: recommendedAnime.studios || [],
        themes: recommendedAnime.themes || [],
      });

      if (!animeDbId) {
        throw new Error("Failed to add or find the anime in the database.");
      }

      await upsertToWatchlistMutation({ animeId: animeDbId, status: status });
      toast.success(`"${recommendedAnime.title}" added to ${status}!`, { id: toastId });

    } catch (error: any) {
      console.error("Failed to add AI recommendation to watchlist:", error);
      toast.error(error.data?.message || error.message || `Could not add "${recommendedAnime.title}" to watchlist.`, { id: toastId });
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Enhanced Floating Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Primary floating orbs */}
        <div className="absolute top-20 left-10 w-96 h-96 bg-gradient-to-br from-brand-primary-action/15 to-transparent rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-32 right-16 w-[500px] h-[500px] bg-gradient-to-tr from-brand-accent-gold/12 to-transparent rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/3 right-1/5 w-80 h-80 bg-gradient-to-l from-brand-accent-peach/10 to-transparent rounded-full blur-3xl animate-pulse delay-2000"></div>
        <div className="absolute bottom-1/2 left-1/4 w-96 h-96 bg-gradient-to-r from-purple-500/8 to-transparent rounded-full blur-3xl animate-pulse delay-3000"></div>
        
        {/* Floating particles */}
        {Array.from({ length: 20 }).map((_, i) => (
          <FloatingParticle 
            key={i} 
            delay={i * 0.5} 
            size={Math.random() > 0.7 ? "w-3 h-3" : "w-2 h-2"}
            color={
              Math.random() > 0.6 ? "bg-brand-primary-action/20" :
              Math.random() > 0.3 ? "bg-brand-accent-gold/20" : "bg-brand-accent-peach/20"
            }
          />
        ))}
        
        {/* Animated grid pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)',
            backgroundSize: '50px 50px',
            animation: 'float 20s ease-in-out infinite'
          }}></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Hero Header */}
        <div className="text-center py-8 px-4">
          <div className="inline-block group">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-heading font-bold mb-4">
              <span className="bg-gradient-to-r from-brand-primary-action via-brand-accent-gold via-brand-accent-peach to-brand-primary-action bg-clip-text text-transparent animate-pulse">
                🤖 AniMuse AI
              </span>
            </h1>
            <div className="h-1 w-full bg-gradient-to-r from-transparent via-brand-primary-action via-brand-accent-gold to-transparent animate-pulse group-hover:animate-none transition-opacity duration-500"></div>
          </div>
          <p className="text-lg text-white/80 max-w-2xl mx-auto leading-relaxed mt-4">
            Your intelligent anime companion, ready to discover your next obsession
          </p>
        </div>

        {/* AI Mode Selector */}
        <div className="px-4 mb-6">
          <div className="max-w-6xl mx-auto">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-brand-primary-action/20 via-transparent to-brand-accent-gold/20 rounded-3xl blur-xl"></div>
              <div className="relative bg-black/30 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
                <h2 className="text-2xl font-heading text-white text-center mb-6">Choose Your AI Experience</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
                  {modeConfigs.map((mode) => (
                    <ModeCard
                      key={mode.id}
                      mode={mode}
                      isActive={aiMode === mode.id}
                      onClick={() => { setAiMode(mode.id as AIMode); setPrompt(""); setAnimeA(""); setAnimeB(""); }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mode-Specific Controls */}
        <div className="px-4 mb-6">
          <div className="max-w-4xl mx-auto">
            {aiMode === "compare" && (
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-pink-400/20 rounded-2xl blur-lg"></div>
                <div className="relative bg-black/40 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                  <h3 className="text-lg font-heading text-white mb-4 text-center">⚖️ Compare Two Anime</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="First anime title"
                      value={animeA}
                      onChange={(e) => setAnimeA(e.target.value)}
                      className="w-full bg-black/40 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/60 focus:border-brand-primary-action focus:ring-2 focus:ring-brand-primary-action/50 focus:outline-none transition-all duration-300"
                    />
                    <input
                      type="text"
                      placeholder="Second anime title"
                      value={animeB}
                      onChange={(e) => setAnimeB(e.target.value)}
                      className="w-full bg-black/40 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/60 focus:border-brand-primary-action focus:ring-2 focus:ring-brand-primary-action/50 focus:outline-none transition-all duration-300"
                    />
                  </div>
                </div>
              </div>
            )}

            {aiMode === "hidden_gems" && (
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-400/20 rounded-2xl blur-lg"></div>
                <div className="relative bg-black/40 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                  <h3 className="text-lg font-heading text-white mb-4 text-center">💎 Hidden Gems Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-white/90 mb-2">Surprise Level:</label>
                      <div className="flex gap-3 justify-center">
                        {(["mild", "moderate", "wild"] as const).map(level => (
                          <button
                            key={level}
                            onClick={() => setSurpriseLevel(level)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                              surpriseLevel === level
                                ? 'bg-gradient-to-r from-brand-primary-action to-brand-accent-gold text-white shadow-lg'
                                : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white'
                            }`}
                          >
                            {level.charAt(0).toUpperCase() + level.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                    <label className="flex items-center justify-center space-x-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={avoidPopular}
                        onChange={(e) => setAvoidPopular(e.target.checked)}
                        className="w-5 h-5 rounded border-2 border-white/30 bg-transparent checked:bg-brand-primary-action checked:border-brand-primary-action focus:ring-2 focus:ring-brand-primary-action/50 transition-all duration-200"
                      />
                      <span className="text-white/90 group-hover:text-white transition-colors">Avoid mainstream anime</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chat Interface */}
        <div className="flex-1 px-4 pb-32">
          <div className="max-w-4xl mx-auto">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-b from-purple-500/10 to-blue-500/10 rounded-3xl blur-xl"></div>
              <div className="relative bg-black/30 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden">
                
                {/* Chat Messages Area */}
                <div 
                  ref={chatContainerRef}
                  className="h-96 overflow-y-auto p-6 space-y-6 custom-scrollbar"
                  style={{ scrollbarWidth: 'thin' }}
                >
                  {chatHistory.length === 0 && !isLoading && chatHistoryLoaded && (
  <div className="text-center py-8">
    <div className="text-6xl mb-4 animate-bounce">✨</div>
    <h3 className="text-xl font-heading text-white mb-4">Ready to discover amazing anime?</h3>
    <p className="text-white/70 mb-6">Try these {aiMode} prompts to get started:</p>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
      {getModeExamples().slice(0, 4).map((example, idx) => (
        <button key={idx} onClick={() => handleSubmit(example)} className="group relative overflow-hidden bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl p-4 text-left hover:border-white/30 hover:bg-black/60 transition-all duration-300 transform hover:scale-105">
          <div className="absolute inset-0 bg-gradient-to-r from-brand-primary-action/10 to-brand-accent-gold/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <p className="relative text-sm text-white/80 group-hover:text-white transition-colors">"{example}"</p>
        </button>
      ))}
    </div>
    {/* Add clear history button */}
    {chatHistory.length > 0 && (
      <div className="mt-6">
        <button 
          onClick={clearChatHistory}
          className="text-xs text-white/50 hover:text-white/80 transition-colors underline"
        >
          Clear chat history
        </button>
      </div>
    )}
  </div>
)}


{!chatHistoryLoaded && (
  <div className="text-center py-8">
    <ArtisticLoadingSpinner message="Loading your chat history..." />
  </div>
)}

                  {/* Chat Messages */}
                  {chatHistory.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] ${
                        msg.type === "user" ? "order-2" : "order-1"
                      }`}>
                        <div className={`relative p-4 rounded-2xl shadow-lg ${
                          msg.type === "user" 
                            ? "bg-gradient-to-r from-brand-primary-action to-brand-accent-gold text-white rounded-br-none ml-4"
                            : msg.type === "error"
                            ? "bg-red-900/20 text-red-400 border border-red-500/20 rounded-bl-none mr-4 backdrop-blur-sm"
                            : "bg-black/40 backdrop-blur-sm text-white border border-white/10 rounded-bl-none mr-4"
                        }`}>
                          
                          {/* Message content */}
                          <p className="whitespace-pre-wrap leading-relaxed text-sm">{msg.content}</p>
                          
                          {/* Enhanced Content Display */}
                          {msg.type === "ai" && msg.recommendations && msg.recommendations.length > 0 && (
  <div className="mt-4 space-y-4">
    {msg.recommendations.map((animeRec, idx) => (
      <div key={`${msg.id}-rec-${idx}`} className="relative group">
        <div className="absolute -inset-2 bg-gradient-to-r from-brand-primary-action/20 to-brand-accent-gold/20 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <div className="relative bg-black/60 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/10 group-hover:border-white/30 transition-all duration-300">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* FIXED: Smaller poster container with fixed dimensions */}
            <div className="w-20 h-28 sm:w-16 sm:h-24 flex-shrink-0 rounded-lg overflow-hidden">
              <AnimeCard 
                anime={animeRec} 
                onViewDetails={(id) => navigateToDetail(id as Id<"anime">)} 
                className="w-full h-full"
              />
            </div>
            <div className="flex-1 space-y-2 min-w-0"> {/* Added min-w-0 to prevent overflow */}
              <h4 className="font-heading text-lg text-brand-primary-action font-semibold truncate">
                {animeRec.title}
              </h4>
              {animeRec.year && (
                <p className="text-xs text-white/70">{animeRec.year}</p>
              )}
              {animeRec.description && (
  <ExpandableText 
    text={animeRec.description}
    maxLength={200}
    className="text-sm text-white/85 leading-relaxed"
  />
)}
{animeRec.reasoning && (
  <ExpandableText 
    text={`💡 ${animeRec.reasoning}`}
    maxLength={150}
    className="text-sm italic text-brand-accent-gold leading-relaxed"
  />
)}
              {animeRec.genres && animeRec.genres.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {animeRec.genres.slice(0, 4).map((g: string) => (
                    <span 
                      key={g} 
                      className="text-xs bg-brand-accent-gold/20 text-brand-accent-gold font-medium px-2 py-1 rounded-full"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-2 pt-2">
                <StyledButton 
                  onClick={() => handleAiRecommendationAddToWatchlist(animeRec, "Plan to Watch")} 
                  variant="primary_small" 
                  disabled={!isAuthenticated || isLoading}
                >
                  📚 Add to Watchlist
                </StyledButton>
                {animeRec.trailerUrl && (
                  <a href={animeRec.trailerUrl} target="_blank" rel="noopener noreferrer">
                    <StyledButton variant="secondary_small">🎥 Trailer</StyledButton>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
)}

                          {/* Analysis Results Display */}
                          {msg.type === "analysis" && msg.analysis && (
                            <div className="mt-4 space-y-3">
                              <div className="bg-black/60 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                                <h4 className="text-lg font-heading text-brand-primary-action mb-3 flex items-center gap-2">
                                  <span>⚖️</span> Comparative Analysis
                                </h4>
                                
                                {msg.analysis.animeA && msg.analysis.animeB && (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                    <div className="bg-brand-accent-peach/10 p-3 rounded-lg">
                                      <h5 className="font-semibold text-brand-accent-gold text-sm mb-1">Anime A</h5>
                                      <p className="text-white/90 text-sm">{msg.analysis.animeA}</p>
                                    </div>
                                    <div className="bg-brand-accent-gold/10 p-3 rounded-lg">
                                      <h5 className="font-semibold text-brand-accent-gold text-sm mb-1">Anime B</h5>
                                      <p className="text-white/90 text-sm">{msg.analysis.animeB}</p>
                                    </div>
                                  </div>
                                )}

                                <div className="space-y-3">
                                  {msg.analysis.plotComparison && (
                                    <div className="bg-white/5 p-3 rounded-lg">
                                      <h6 className="font-semibold text-brand-accent-peach text-sm mb-1">📖 Plot & Story</h6>
                                      <p className="text-white/85 text-sm leading-relaxed">{msg.analysis.plotComparison}</p>
                                    </div>
                                  )}
                                  {msg.analysis.characterComparison && (
                                    <div className="bg-white/5 p-3 rounded-lg">
                                      <h6 className="font-semibold text-brand-accent-peach text-sm mb-1">👥 Characters</h6>
                                      <p className="text-white/85 text-sm leading-relaxed">{msg.analysis.characterComparison}</p>
                                    </div>
                                  )}
                                  {msg.analysis.visualComparison && (
                                    <div className="bg-white/5 p-3 rounded-lg">
                                      <h6 className="font-semibold text-brand-accent-peach text-sm mb-1">🎨 Visual Style</h6>
                                      <p className="text-white/85 text-sm leading-relaxed">{msg.analysis.visualComparison}</p>
                                    </div>
                                  )}
                                  {msg.analysis.overallSummary && (
                                    <div className="bg-brand-primary-action/10 p-3 rounded-lg border border-brand-primary-action/30">
                                      <h6 className="font-semibold text-brand-primary-action text-sm mb-1">🎯 Summary</h6>
                                      <p className="text-white/90 text-sm leading-relaxed">{msg.analysis.overallSummary}</p>
                                    </div>
                                  )}
                                </div>

                                {msg.analysis.recommendations && Array.isArray(msg.analysis.recommendations) && msg.analysis.recommendations.length > 0 && (
                                  <div className="mt-4 pt-3 border-t border-white/10">
                                    <h6 className="font-semibold text-brand-accent-gold text-sm mb-2">💡 You Might Also Like</h6>
                                    <div className="flex flex-wrap gap-2">
                                      {msg.analysis.recommendations.map((rec: string, idx: number) => (
                                        <span key={idx} className="bg-brand-accent-gold/20 text-brand-accent-gold text-xs px-2 py-1 rounded-full">
                                          {rec}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Franchise Guide Display */}
                          {msg.type === "guide" && msg.guide && (
                            <div className="mt-4 space-y-3">
                              <div className="bg-black/60 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                                <h4 className="text-lg font-heading text-brand-primary-action mb-3 flex items-center gap-2">
                                  <span>📚</span> {msg.guide.franchiseName || 'Franchise'} Watch Guide
                                </h4>

                                {msg.guide.overview && (
                                  <div className="bg-brand-accent-peach/10 p-3 rounded-lg mb-4">
                                    <p className="text-white/90 text-sm leading-relaxed">{msg.guide.overview}</p>
                                  </div>
                                )}

                                {msg.guide.complexity && (
                                  <div className="mb-4">
                                    <span className="bg-brand-accent-gold/20 text-brand-accent-gold text-xs px-3 py-1 rounded-full font-medium">
                                      Complexity: {msg.guide.complexity}
                                    </span>
                                  </div>
                                )}

                                {msg.guide.recommendedOrder && msg.guide.recommendedOrder.length > 0 && (
                                  <div className="space-y-3">
                                    <h5 className="font-semibold text-brand-accent-gold text-base">🎯 Recommended Watch Order</h5>
                                    {msg.guide.recommendedOrder.map((item: any, idx: number) => (
                                      <div key={idx} className="bg-white/5 p-3 rounded-lg border-l-4 border-brand-primary-action">
                                        <div className="flex items-center gap-2 mb-2">
                                          <span className="bg-brand-primary-action text-white text-xs font-bold px-2 py-1 rounded-full min-w-[24px] text-center">
                                            {idx + 1}
                                          </span>
                                          <h6 className="font-semibold text-white text-sm">{item.title}</h6>
                                          <span className="text-xs text-white/60 bg-white/10 px-2 py-1 rounded-full">
                                            {item.type}, {item.year}
                                          </span>
                                        </div>
                                        <p className="text-white/80 text-sm leading-relaxed mb-2 ml-8">{item.description}</p>
                                        <div className="flex items-center gap-3 ml-8">
                                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                            item.importance === 'Essential' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                                            item.importance === 'Recommended' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' :
                                            'bg-green-500/20 text-green-300 border border-green-500/30'
                                          }`}>
                                            {item.importance}
                                          </span>
                                          <span className="text-xs text-white/60">
                                            Accessibility: {item.accessibilityRating}/5
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {msg.guide.tips && msg.guide.tips.length > 0 && (
                                  <div className="mt-4 pt-3 border-t border-white/10">
                                    <h6 className="font-semibold text-brand-accent-gold text-sm mb-2 flex items-center gap-1">
                                      <span>💡</span> Pro Tips
                                    </h6>
                                    <ul className="space-y-1">
                                      {msg.guide.tips.map((tip: string, idx: number) => (
                                        <li key={idx} className="text-white/80 text-sm leading-relaxed flex items-start gap-2">
                                          <span className="text-brand-accent-gold mt-1">•</span>
                                          <span>{tip}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {/* Feedback buttons */}
                          {(msg.type === "ai" || msg.type === "analysis" || msg.type === "guide" || msg.type === "error") && (
                            <div className="mt-3 flex justify-end gap-2">
                              <button
                                onClick={() => handleFeedback(msg.id, "up")}
                                className={`p-2 rounded-full text-sm transition-all duration-200 ${
                                  msg.feedback === "up" 
                                    ? "bg-brand-primary-action text-white shadow-lg" 
                                    : "bg-white/10 text-white/60 hover:bg-white/20 hover:text-white"
                                }`}
                                disabled={!isAuthenticated || isLoading}
                              >
                                👍
                              </button>
                              <button
                                onClick={() => handleFeedback(msg.id, "down")}
                                className={`p-2 rounded-full text-sm transition-all duration-200 ${
                                  msg.feedback === "down" 
                                    ? "bg-red-500 text-white shadow-lg" 
                                    : "bg-white/10 text-white/60 hover:bg-white/20 hover:text-white"
                                }`}
                                disabled={!isAuthenticated || isLoading}
                              >
                                👎
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Loading indicator */}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="max-w-xs">
                        <ArtisticLoadingSpinner size="h-8 w-8" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Input Area */}
                <div className="border-t border-white/10 bg-black/20 backdrop-blur-sm p-4">
                  <form onSubmit={handleSubmit} className="flex gap-3 items-end">
                    {(aiMode === "compare" || aiMode === "hidden_gems") ? (
                      <div className="flex-1 text-center text-sm text-white/60 italic py-3">
                        Use controls above and hit Send ✨
                      </div>
                    ) : (
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          placeholder={aiMode === "franchise" ? "Enter franchise name..." : "Ask AniMuse anything..."}
                          className="w-full bg-black/40 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-3 pr-12 text-white placeholder-white/60 focus:border-brand-primary-action focus:ring-2 focus:ring-brand-primary-action/50 focus:outline-none transition-all duration-300"
                          disabled={isLoading || authIsLoading || !isAuthenticated}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40">
                          ✨
                        </div>
                      </div>
                    )}
                    
                    <div className="relative group">
                      <div className="absolute -inset-2 bg-gradient-to-r from-brand-primary-action/50 to-brand-accent-gold/50 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <StyledButton
                        type="submit"
                        variant="primary"
                        className="relative !px-6 !py-3 !bg-gradient-to-r !from-brand-primary-action !to-brand-accent-gold hover:!from-brand-accent-gold hover:!to-brand-primary-action !transition-all !duration-500"
                        disabled={
                          isLoading || authIsLoading || !isAuthenticated || 
                          (aiMode === "compare" ? (!animeA.trim() || !animeB.trim()) : 
                           aiMode === "hidden_gems" ? false : !prompt.trim())
                        }
                      >
                        {isLoading ? (
                          <ArtisticLoadingSpinner size="h-5 w-5" message="" />
                        ) : (
                          <span className="flex items-center gap-2">
                            <span>Send</span>
                            <span className="text-lg">🚀</span>
                          </span>
                        )}
                      </StyledButton>
                    </div>
                  </form>
                  
                  {!isAuthenticated && !authIsLoading && (
                    <p className="text-xs text-brand-accent-gold mt-2 text-center">
                      Please log in to chat with AniMuse AI ✨
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
        
        .animate-spin-reverse {
          animation: spin 1s linear infinite reverse;
        }
        
        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default memo(EnhancedAIAssistantPageComponent);