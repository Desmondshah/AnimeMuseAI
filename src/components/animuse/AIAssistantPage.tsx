// src/components/animuse/AIAssistantPage.tsx - Fixed JSX Tag Issues
import React, { useState, FormEvent, useRef, useEffect, useCallback, memo } from "react";
import { useAction, useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import StyledButton from "./shared/StyledButton";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { AnimeRecommendation } from "../../../convex/types";
import AnimeCard from "./AnimeCard";
import { usePersistentChatHistory } from '../../../convex/usePersistentChatHistory.ts';
import { useMobileOptimizations } from '../../../convex/useMobileOptimizations.ts';


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

type AIMode = "general" | "character" | "trope" | "art_style" | "compare" | "hidden_gems" | "franchise" | "what_if";

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

const listVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0 },
};

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
  className?: string;
}> = memo(({ mode, isActive, onClick, className }) => (
  <div className={`group relative ${className || ''}`}>
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
        <div className={`mode-icon text-3xl transition-transform duration-300 ${isActive ? 'animate-bounce' : 'group-hover:animate-pulse'}`}>
          {mode.icon}
        </div>
        <div className="mode-label text-sm font-medium text-white/90">{mode.label}</div>
        <div className="mode-desc text-xs text-white/60 leading-relaxed">{mode.desc}</div>
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Mobile optimization hook for iPhone support
  const { isMobile, isIOS, hasNotch } = useMobileOptimizations();

  // Keyboard shortcut for fullscreen (F11 or Cmd/Ctrl + Shift + F)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F11' || (e.key === 'f' && (e.metaKey || e.ctrlKey) && e.shiftKey)) {
        e.preventDefault();
        setIsFullscreen(prev => !prev);
      }
      // ESC to exit fullscreen
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  const [animeA, setAnimeA] = useState("");
  const [animeB, setAnimeB] = useState("");
  const [surpriseLevel, setSurpriseLevel] = useState<"mild" | "moderate" | "wild">("moderate");
  const [avoidPopular, setAvoidPopular] = useState(false);

  // AI Actions
  const getAnimeRecommendationAction = useAction(api.ai.getAnimeRecommendationWithBetterLogging);
  const getCharacterBasedRecommendationsAction = useAction(api.ai.getCharacterBasedRecommendations);
  const getTropeBasedRecommendationsAction = useAction(api.ai.getTropeBasedRecommendations);
  const getArtStyleRecommendationsAction = useAction(api.ai.getArtStyleRecommendations);
  const getComparativeAnalysisAction = useAction(api.ai.getComparativeAnalysis);
  const getHiddenGemRecommendationsAction = useAction(api.ai.getHiddenGemRecommendations);
  const getFranchiseGuideAction = useAction(api.ai.getFranchiseGuide);
  const getWhatIfRecommendationsAction = useAction(api.ai.getWhatIfRecommendations);

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
    { id: "what_if", label: "What If", desc: "Hypothetical scenarios", icon: "🤔", gradient: "from-violet-500/50 to-fuchsia-400/50" },
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
      what_if: [
        "What if Light Yagami never found the Death Note?",
        "What if Goku was raised by villains instead of Grandpa Gohan?",
        "What if the Titans never existed in Attack on Titan?",
        "What if Edward Elric succeeded in bringing his mother back?"
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
      name: userProfileQuery.name, 
      moods: userProfileQuery.moods, 
      genres: userProfileQuery.genres,
      favoriteAnimes: userProfileQuery.favoriteAnimes, 
      experienceLevel: userProfileQuery.experienceLevel,
      dislikedGenres: userProfileQuery.dislikedGenres, 
      dislikedTags: userProfileQuery.dislikedTags,
      characterArchetypes: userProfileQuery.characterArchetypes, 
      tropes: userProfileQuery.tropes,
      artStyles: userProfileQuery.artStyles, 
      narrativePacing: userProfileQuery.narrativePacing,
    } : undefined;
  
    switch (aiMode) {
      case "character":
        return await getCharacterBasedRecommendationsAction({ 
          characterDescription: currentPrompt, 
          userProfile: profileDataForAI, 
          messageId: aiMessageId 
        });
        
      case "trope":
        return await getTropeBasedRecommendationsAction({ 
          plotDescription: currentPrompt, 
          userProfile: profileDataForAI, 
          messageId: aiMessageId 
        });
        
      case "art_style":
        return await getArtStyleRecommendationsAction({ 
          artStyleDescription: currentPrompt, 
          userProfile: profileDataForAI, 
          messageId: aiMessageId 
        });
        
      case "compare":
        if (!animeA || !animeB) throw new Error("Please enter both anime titles to compare");
        return await getComparativeAnalysisAction({ 
          animeA, 
          animeB, 
          messageId: aiMessageId 
        });
        
      case "hidden_gems":
        return await getHiddenGemRecommendationsAction({ 
          surpriseLevel, 
          avoidPopular, 
          userProfile: profileDataForAI, 
          messageId: aiMessageId 
        });
        
      case "franchise":
        return await getFranchiseGuideAction({ 
          franchiseName: currentPrompt, 
          userExperience: userProfileQuery?.experienceLevel, 
          messageId: aiMessageId 
        });
        
      // FIXED: This was the problem - what_if mode should call getWhatIfRecommendationsAction
      case "what_if":
        return await getWhatIfRecommendationsAction({ 
          whatIfScenario: currentPrompt, 
          userProfile: profileDataForAI, 
          messageId: aiMessageId 
        });
        
      default:
        return await getAnimeRecommendationAction({ 
          prompt: currentPrompt, 
          userProfile: profileDataForAI, 
          messageId: aiMessageId 
        });
    }
  }, [
    aiMode, 
    userProfileQuery, 
    animeA, 
    animeB, 
    surpriseLevel, 
    avoidPopular, 
    getCharacterBasedRecommendationsAction, 
    getTropeBasedRecommendationsAction, 
    getArtStyleRecommendationsAction, 
    getComparativeAnalysisAction, 
    getHiddenGemRecommendationsAction, 
    getFranchiseGuideAction, 
    getWhatIfRecommendationsAction, // Make sure this is in dependencies
    getAnimeRecommendationAction
  ]);

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
        franchise: "franchise guides",
        what_if: "what if scenarios"
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

  const handleAiRecommendationAddToWatchlist = async (recommendedAnime: AnimeRecommendation, status: "Watching" | "Completed" | "Plan to Watch" | "Dropped") => {
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
              Math.random() > 0.6
                ? "bg-brand-primary-action/20"
                : Math.random() > 0.3
                  ? "bg-brand-accent-gold/20"
                  : "bg-brand-accent-peach/20"
            }
          />
        ))}

        {/* Animated grid pattern */}
        <div className="absolute inset-0 opacity-5">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)",
              backgroundSize: "50px 50px",
              animation: "float 20s ease-in-out infinite",
            }}
          ></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Hero Header */}
        <div className="text-center py-8 px-4">
          <div className="inline-block group">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-heading font-bold mb-4">
              <span className="bg-gradient-to-r from-brand-primary-action via-brand-accent-gold to-brand-primary-action bg-clip-text text-transparent animate-pulse">
                🤖 AniMuse AI
              </span>
            </h1>
            <div className="h-1 w-full bg-gradient-to-r from-transparent via-brand-primary-action to-transparent animate-pulse group-hover:animate-none transition-opacity duration-500"></div>
          </div>
          <p className="text-lg text-white/80 max-w-2xl mx-auto leading-relaxed mt-4">
            Your intelligent anime companion, ready to discover your next
            obsession
          </p>
        </div>

        {/* AI Mode Selector */}
        <div className="px-4 mb-6">
          <div className="max-w-6xl mx-auto">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-brand-primary-action/20 via-transparent to-brand-accent-gold/20 rounded-3xl blur-xl"></div>
              <div className="relative bg-black/30 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
                <h2 className="text-xl sm:text-2xl font-heading text-white text-center mb-6">
                  Choose Your AI Experience
                </h2>

                {/* Updated grid with CSS classes for mobile layout */}
                <div className="ai-modes-grid grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-4">
                  {modeConfigs.map((mode, index) => (
                    <ModeCard
                      key={mode.id}
                      mode={mode}
                      isActive={aiMode === mode.id}
                      onClick={() => {
                        setAiMode(mode.id as AIMode);
                        setPrompt("");
                        setAnimeA("");
                        setAnimeB("");
                      }}
                      className="ai-mode-card"
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
                  <h3 className="text-lg font-heading text-white mb-4 text-center">
                    ⚖️ Compare Two Anime
                  </h3>
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
                  <h3 className="text-lg font-heading text-white mb-4 text-center">
                    💎 Hidden Gems Settings
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-white/90 mb-2">
                        Surprise Level:
                      </label>
                      <div className="flex gap-3 justify-center">
                        {(["mild", "moderate", "wild"] as const).map(
                          (level) => (
                            <button
                              key={level}
                              onClick={() => setSurpriseLevel(level)}
                              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                                surpriseLevel === level
                                  ? "bg-gradient-to-r from-brand-primary-action to-brand-accent-gold text-white shadow-lg"
                                  : "bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
                              }`}
                            >
                              {level.charAt(0).toUpperCase() + level.slice(1)}
                            </button>
                          )
                        )}
                      </div>
                    </div>
                    <label className="flex items-center justify-center space-x-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={avoidPopular}
                        onChange={(e) => setAvoidPopular(e.target.checked)}
                        className="w-5 h-5 rounded border-2 border-white/30 bg-transparent checked:bg-brand-primary-action checked:border-brand-primary-action focus:ring-2 focus:ring-brand-primary-action/50 transition-all duration-200"
                      />
                      <span className="text-white/90 group-hover:text-white transition-colors">
                        Avoid mainstream anime
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {aiMode === "what_if" && (
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-violet-500/20 to-fuchsia-400/20 rounded-2xl blur-lg"></div>
                <div className="relative bg-black/40 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                  <h3 className="text-lg font-heading text-white mb-4 text-center">
                    🤔 What If Scenarios
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-white/90 mb-2">
                        Scenario Type:
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {(["Character Choice", "World Rules", "Historical Event", "Power/Ability"] as const).map(
                          (type) => (
                            <button
                              key={type}
                              onClick={() => setPrompt(`What if ${type.toLowerCase()} changed? `)}
                              className="px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 bg-white/10 text-white/80 hover:bg-white/20 hover:text-white border border-white/10 hover:border-white/30"
                            >
                              {type}
                            </button>
                          )
                        )}
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-white/70 leading-relaxed">
                        Explore hypothetical anime scenarios! Ask "What if..." questions about characters, worlds, or events to discover anime that explore similar concepts.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chat Interface */}
        <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-brand-surface p-4' : `flex-1 ${isMobile ? 'px-2 pb-24' : 'px-4 pb-32'} ${hasNotch ? 'pt-safe-top' : ''}`}`}>
          <div className={`${isFullscreen ? 'h-full flex flex-col' : `${isMobile ? 'max-w-full' : 'max-w-4xl'} mx-auto`}`}>
            <div className={`${isFullscreen ? 'flex-1 flex flex-col min-h-0' : 'relative'}`}>
              {!isMobile && !isFullscreen && <div className="absolute inset-0 bg-gradient-to-b from-purple-500/10 to-blue-500/10 rounded-3xl blur-xl"></div>}
              <div className={`relative bg-black/30 backdrop-blur-xl border border-white/10 ${isFullscreen ? 'rounded-xl flex-1 flex flex-col min-h-0' : isMobile ? 'rounded-2xl' : 'rounded-3xl'} overflow-hidden`}>
                {/* Chat Header with controls */}
                <div className="sticky top-0 bg-black/60 backdrop-blur-sm border-b border-white/10 p-3 flex justify-between items-center z-10">
                  <div className="flex items-center gap-3">
                    {chatHistory.length > 0 && chatHistoryLoaded ? (
                      <span className="text-sm text-white/70">Chat History</span>
                    ) : (
                      <span className="text-sm text-white/70">AniMuse Chat</span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* Fullscreen toggle button */}
                    <button
                      onClick={() => setIsFullscreen(!isFullscreen)}
                      className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200 touch-manipulation"
                      title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                    >
                      {isFullscreen ? (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zM17 4a1 1 0 00-1-1h-4a1 1 0 000 2h1.586l-2.293 2.293a1 1 0 001.414 1.414L15 6.414V8a1 1 0 002 0V4zM17 16a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 011.414-1.414L15 13.586V12a1 1 0 012 0v4zM3 16a1 1 0 001 1h4a1 1 0 000-2H6.414l2.293-2.293a1 1 0 00-1.414-1.414L5 13.586V12a1 1 0 00-2 0v4z"/>
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zM16 4a1 1 0 00-1-1h-4a1 1 0 000 2h1.586l-2.293 2.293a1 1 0 001.414 1.414L15 6.414V8a1 1 0 002 0V4zM4 16a1 1 0 001-1v-4a1 1 0 00-2 0v1.586l-2.293-2.293a1 1 0 00-1.414 1.414L2.586 14H1a1 1 0 000 2h4zM16 12a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 011.414-1.414L15 15.586V13a1 1 0 011-1z"/>
                        </svg>
                      )}
                    </button>
                    
                    {/* Clear chat button */}
                    {chatHistory.length > 0 && chatHistoryLoaded && (
                      <StyledButton
                        onClick={clearChatHistory}
                        variant="ghost"
                        className="!text-xs !bg-red-500/20 !border-red-500/30 !text-red-300 hover:!bg-red-500/30 hover:!text-red-100 !px-3 !py-1"
                      >
                        🗑️ {isFullscreen ? "Clear" : "Start New Chat"}
                      </StyledButton>
                    )}
                  </div>
                </div>

                {!chatHistoryLoaded && (
                  <div className="text-center py-8">
                    <ArtisticLoadingSpinner message="Loading your chat history..." />
                  </div>
                )}

                {chatHistory.length === 0 &&
                  !isLoading &&
                  chatHistoryLoaded && (
                    <div className="text-center py-8">
                      <div className="text-6xl mb-4 animate-bounce">✨</div>
                      <h3 className="text-xl font-heading text-white mb-4">
                        Ready to discover amazing anime?
                      </h3>
                      <p className="text-white/70 mb-6">
                        Try these {aiMode} prompts to get started:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
                        {getModeExamples()
                          .slice(0, 4)
                          .map((example, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleSubmit(example)}
                              className="group relative overflow-hidden bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl p-4 text-left hover:border-white/30 hover:bg-black/60 transition-all duration-300 transform hover:scale-105"
                            >
                              <div className="absolute inset-0 bg-gradient-to-r from-brand-primary-action/10 to-brand-accent-gold/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                              <p className="relative text-sm text-white/80 group-hover:text-white transition-colors">
                                "{example}"
                              </p>
                            </button>
                          ))}
                      </div>
                    </div>
                  )}

                <motion.div
                  ref={chatContainerRef}
                  className={`${isFullscreen ? 'flex-1 min-h-0' : isMobile ? 'h-80' : 'h-96'} overflow-y-auto ${isMobile ? 'p-3 space-y-4' : 'p-6 space-y-6'} custom-scrollbar`}
                  style={{ 
                    scrollbarWidth: "thin",
                    // Ensure proper scrolling on iOS
                    WebkitOverflowScrolling: "touch"
                  }}
                  variants={listVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {!chatHistoryLoaded && (
                    <div className="text-center py-8">
                      <ArtisticLoadingSpinner message="Loading your chat history..." />
                    </div>
                  )}

                  {/* Chat Messages */}
                  {chatHistory.map((msg) => (
                    <motion.div
                      key={msg.id}
                      className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
                      variants={itemVariants}
                    >
                      <div
                        className={`${isMobile ? 'max-w-[92%]' : 'max-w-[85%]'} ${
                          msg.type === "user" ? "order-2" : "order-1"
                        }`}
                      >
                        <div
                          className={`relative ${isMobile ? 'p-3' : 'p-4'} ${isMobile ? 'rounded-xl' : 'rounded-2xl'} shadow-lg ${
                            msg.type === "user"
                              ? `bg-gradient-to-r from-brand-primary-action to-brand-accent-gold text-white ${isMobile ? 'rounded-br-md ml-2' : 'rounded-br-none ml-4'}`
                              : msg.type === "error"
                                ? `bg-red-900/20 text-red-400 border border-red-500/20 ${isMobile ? 'rounded-bl-md mr-2' : 'rounded-bl-none mr-4'} backdrop-blur-sm`
                                : `bg-black/40 backdrop-blur-sm text-white border border-white/10 ${isMobile ? 'rounded-bl-md mr-2' : 'rounded-bl-none mr-4'}`
                          }`}
                        >
                          {/* Message content */}
                          <p className={`whitespace-pre-wrap leading-relaxed ${isMobile ? 'text-sm' : 'text-sm'}`}>
                            {msg.content}
                          </p>

                          {/* Enhanced Content Display */}
                          {msg.type === "ai" &&
                            msg.recommendations &&
                            msg.recommendations.length > 0 && (
                              <motion.div
                                className="mt-4 space-y-4"
                                variants={listVariants}
                                initial="hidden"
                                animate="visible"
                              >
                                {msg.recommendations.map((animeRec, idx) => (
                                  <motion.div
                                    key={`${msg.id}-rec-${idx}`}
                                    className="relative group"
                                    variants={itemVariants}
                                  >
                                    <div className="absolute -inset-2 bg-gradient-to-r from-brand-primary-action/20 to-brand-accent-gold/20 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                    <div className={`relative bg-black/60 backdrop-blur-sm rounded-xl ${isMobile ? 'p-2' : 'p-3 sm:p-4'} border border-white/10 group-hover:border-white/30 transition-all duration-300`}>
                                      <div className={`flex ${isMobile ? 'flex-col gap-2' : 'flex-col sm:flex-row gap-4'}`}>
                                        {/* Optimized poster container for mobile */}
                                        <div className={`${isMobile ? 'w-16 h-20 mx-auto' : 'w-20 h-28 sm:w-16 sm:h-24'} flex-shrink-0 rounded-lg overflow-hidden`}>
                                          <AnimeCard
                                            anime={animeRec}
                                            onViewDetails={navigateToDetail}
                                            isRecommendation={true}
                                            className="w-full h-full"
                                          />
                                        </div>
                                        <div className={`flex-1 ${isMobile ? 'space-y-1' : 'space-y-2'} min-w-0`}>
                                          <h4 className={`font-heading ${isMobile ? 'text-base' : 'text-lg'} text-brand-primary-action font-semibold truncate ${isMobile ? 'text-center' : ''}`}>
                                            {animeRec.title}
                                          </h4>
                                          {animeRec.year && (
                                            <p className={`text-xs text-white/70 ${isMobile ? 'text-center' : ''}`}>
                                              {animeRec.year}
                                            </p>
                                          )}
                                          {animeRec.description && (
                                            <ExpandableText
                                              text={animeRec.description}
                                              maxLength={isMobile ? 100 : 200}
                                              className={`${isMobile ? 'text-xs' : 'text-sm'} text-white/85 leading-relaxed ${isMobile ? 'text-center' : ''}`}
                                            />
                                          )}
                                          {animeRec.reasoning && (
                                            <ExpandableText
                                              text={`💡 ${animeRec.reasoning}`}
                                              maxLength={isMobile ? 80 : 150}
                                              className={`${isMobile ? 'text-xs' : 'text-sm'} italic text-brand-accent-gold leading-relaxed ${isMobile ? 'text-center' : ''}`}
                                            />
                                          )}
                                          {animeRec.genres &&
                                            animeRec.genres.length > 0 && (
                                              <div className="flex flex-wrap gap-1">
                                                {animeRec.genres
                                                  .slice(0, 4)
                                                  .map((g: string) => (
                                                    <span
                                                      key={g}
                                                      className="text-xs bg-brand-accent-gold/20 text-brand-accent-gold font-medium px-2 py-1 rounded-full"
                                                    >
                                                      {g}
                                                    </span>
                                                  ))}
                                              </div>
                                            )}
                                          <div className={`flex ${isMobile ? 'flex-col gap-1' : 'flex-wrap gap-2'} pt-2`}>
                                            <StyledButton
                                              onClick={() =>
                                                handleAiRecommendationAddToWatchlist(
                                                  animeRec,
                                                  "Plan to Watch"
                                                )
                                              }
                                              variant="primary_small"
                                              disabled={
                                                !isAuthenticated || isLoading
                                              }
                                              className={isMobile ? '!text-xs !py-1 !px-2' : ''}
                                            >
                                              📚 {isMobile ? 'Add' : 'Add to Watchlist'}
                                            </StyledButton>
                                            {animeRec.trailerUrl && (
                                              <a
                                                href={animeRec.trailerUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                              >
                                                <StyledButton 
                                                  variant="secondary_small"
                                                  className={isMobile ? '!text-xs !py-1 !px-2' : ''}
                                                >
                                                  🎥 Trailer
                                                </StyledButton>
                                              </a>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </motion.div>
                                ))}
                              </motion.div>
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
                                      <h5 className="font-semibold text-brand-accent-gold text-sm mb-1">
                                        Anime A
                                      </h5>
                                      <p className="text-white/90 text-sm">
                                        {msg.analysis.animeA}
                                      </p>
                                    </div>
                                    <div className="bg-brand-accent-gold/10 p-3 rounded-lg">
                                      <h5 className="font-semibold text-brand-accent-gold text-sm mb-1">
                                        Anime B
                                      </h5>
                                      <p className="text-white/90 text-sm">
                                        {msg.analysis.animeB}
                                      </p>
                                    </div>
                                  </div>
                                )}

                                <div className="space-y-3">
                                  {msg.analysis.plotComparison && (
                                    <div className="bg-white/5 p-3 rounded-lg">
                                      <h6 className="font-semibold text-brand-accent-peach text-sm mb-1">
                                        📖 Plot & Story
                                      </h6>
                                      <p className="text-white/85 text-sm leading-relaxed">
                                        {msg.analysis.plotComparison}
                                      </p>
                                    </div>
                                  )}
                                  {msg.analysis.characterComparison && (
                                    <div className="bg-white/5 p-3 rounded-lg">
                                      <h6 className="font-semibold text-brand-accent-peach text-sm mb-1">
                                        👥 Characters
                                      </h6>
                                      <p className="text-white/85 text-sm leading-relaxed">
                                        {msg.analysis.characterComparison}
                                      </p>
                                    </div>
                                  )}
                                  {msg.analysis.visualComparison && (
                                    <div className="bg-white/5 p-3 rounded-lg">
                                      <h6 className="font-semibold text-brand-accent-peach text-sm mb-1">
                                        🎨 Visual Style
                                      </h6>
                                      <p className="text-white/85 text-sm leading-relaxed">
                                        {msg.analysis.visualComparison}
                                      </p>
                                    </div>
                                  )}
                                  {msg.analysis.overallSummary && (
                                    <div className="bg-brand-primary-action/10 p-3 rounded-lg border border-brand-primary-action/30">
                                      <h6 className="font-semibold text-brand-primary-action text-sm mb-1">
                                        🎯 Summary
                                      </h6>
                                      <p className="text-white/90 text-sm leading-relaxed">
                                        {msg.analysis.overallSummary}
                                      </p>
                                    </div>
                                  )}
                                </div>

                                {msg.analysis.recommendations &&
                                  Array.isArray(msg.analysis.recommendations) &&
                                  msg.analysis.recommendations.length > 0 && (
                                    <motion.div
                                      className="mt-4 pt-3 border-t border-white/10"
                                      variants={listVariants}
                                      initial="hidden"
                                      animate="visible"
                                    >
                                      <h6 className="font-semibold text-brand-accent-gold text-sm mb-2">
                                        💡 You Might Also Like
                                      </h6>
                                      <motion.div className="flex flex-wrap gap-2" variants={listVariants}>
                                        {msg.analysis.recommendations.map(
                                          (rec: string, idx: number) => (
                                            <motion.span
                                              key={idx}
                                              className="bg-brand-accent-gold/20 text-brand-accent-gold text-xs px-2 py-1 rounded-full"
                                              variants={itemVariants}
                                            >
                                              {rec}
                                            </motion.span>
                                          )
                                        )}
                                      </motion.div>
                                    </motion.div>
                                  )}
                              </div>
                            </div>
                          )}

                          {/* Franchise Guide Display */}
                          {msg.type === "guide" && msg.guide && (
                            <div className="mt-4 space-y-3">
                              <div className="bg-black/60 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                                <h4 className="text-lg font-heading text-brand-primary-action mb-3 flex items-center gap-2">
                                  <span>📚</span>{" "}
                                  {msg.guide.franchiseName || "Franchise"} Watch
                                  Guide
                                </h4>

                                {msg.guide.overview && (
                                  <div className="bg-brand-accent-peach/10 p-3 rounded-lg mb-4">
                                    <p className="text-white/90 text-sm leading-relaxed">
                                      {msg.guide.overview}
                                    </p>
                                  </div>
                                )}

                                {msg.guide.complexity && (
                                  <div className="mb-4">
                                    <span className="bg-brand-accent-gold/20 text-brand-accent-gold text-xs px-3 py-1 rounded-full font-medium">
                                      Complexity: {msg.guide.complexity}
                                    </span>
                                  </div>
                                )}

                                {msg.guide.recommendedOrder &&
                                  msg.guide.recommendedOrder.length > 0 && (
                                    <div className="space-y-3">
                                      <h5 className="font-semibold text-brand-accent-gold text-base">
                                        🎯 Recommended Watch Order
                                      </h5>
                                      {msg.guide.recommendedOrder.map(
                                        (item: any, idx: number) => (
                                          <div
                                            key={idx}
                                            className="bg-white/5 p-3 rounded-lg border-l-4 border-brand-primary-action"
                                          >
                                            <div className="flex items-center gap-2 mb-2">
                                              <span className="bg-brand-primary-action text-white text-xs font-bold px-2 py-1 rounded-full min-w-[24px] text-center">
                                                {idx + 1}
                                              </span>
                                              <h6 className="font-semibold text-white text-sm">
                                                {item.title}
                                              </h6>
                                              <span className="text-xs text-white/60 bg-white/10 px-2 py-1 rounded-full">
                                                {item.type}, {item.year}
                                              </span>
                                            </div>
                                            <p className="text-white/80 text-sm leading-relaxed mb-2 ml-8">
                                              {item.description}
                                            </p>
                                            <div className="flex items-center gap-3 ml-8">
                                              <span
                                                className={`text-xs px-2 py-1 rounded-full font-medium ${
                                                  item.importance ===
                                                  "Essential"
                                                    ? "bg-red-500/20 text-red-300 border border-red-500/30"
                                                    : item.importance ===
                                                        "Recommended"
                                                      ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
                                                      : "bg-green-500/20 text-green-300 border border-green-500/30"
                                                }`}
                                              >
                                                {item.importance}
                                              </span>
                                              <span className="text-xs text-white/60">
                                                Accessibility:{" "}
                                                {item.accessibilityRating}/5
                                              </span>
                                            </div>
                                          </div>
                                        )
                                      )}
                                    </div>
                                  )}

                                {msg.guide.tips &&
                                  msg.guide.tips.length > 0 && (
                                    <div className="mt-4 pt-3 border-t border-white/10">
                                      <h6 className="font-semibold text-brand-accent-gold text-sm mb-2 flex items-center gap-1">
                                        <span>💡</span> Pro Tips
                                      </h6>
                                      <ul className="space-y-1">
                                        {msg.guide.tips.map(
                                          (tip: string, idx: number) => (
                                            <li
                                              key={idx}
                                              className="text-white/80 text-sm leading-relaxed flex items-start gap-2"
                                            >
                                              <span className="text-brand-accent-gold mt-1">
                                                •
                                              </span>
                                              <span>{tip}</span>
                                            </li>
                                          )
                                        )}
                                      </ul>
                                    </div>
                                  )}
                              </div>
                            </div>
                          )}

                          {/* Feedback buttons */}
                          {(msg.type === "ai" ||
                            msg.type === "analysis" ||
                            msg.type === "guide" ||
                            msg.type === "error") && (
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
                    </motion.div>
                  ))}

                  {/* Loading indicator */}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="max-w-xs">
                        <ArtisticLoadingSpinner size="h-8 w-8" />
                      </div>
                    </div>
                  )}
                </motion.div>

                {/* Input Area */}
                <div className={`${isFullscreen ? 'flex-shrink-0' : ''} border-t border-white/10 bg-black/20 backdrop-blur-sm ${isMobile ? 'p-2' : 'p-4'} ${hasNotch ? 'pb-safe-bottom' : isIOS ? 'pb-6' : 'pb-4'}`}>
                  <form
                    onSubmit={handleSubmit}
                    className={`flex ${isMobile ? 'gap-2' : 'gap-3'} items-end`}
                  >
                    {aiMode === "compare" || aiMode === "hidden_gems" ? (
                      <div className="flex-1 relative">
                        <div className="w-full bg-black/40 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-3 pr-14 text-center text-sm text-white/60 italic">
                          Use controls above and hit Send ✨
                        </div>
                        {/* Send button for special modes */}
                        <button
                          type="submit"
                          className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 text-brand-primary-action hover:text-brand-accent-gold transition-all duration-300 touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed group`}
                          disabled={
                            isLoading ||
                            authIsLoading ||
                            !isAuthenticated ||
                            (aiMode === "compare"
                              ? !animeA.trim() || !animeB.trim()
                              : false)
                          }
                        >
                          {isLoading ? (
                            <ArtisticLoadingSpinner size="h-5 w-5" message="" />
                          ) : (
                            <svg 
                              className="w-6 h-6 transform group-hover:translate-x-0.5 transition-transform duration-200" 
                              fill="currentColor" 
                              viewBox="0 0 20 20"
                            >
                              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/>
                            </svg>
                          )}
                        </button>
                      </div>
                    ) : (
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          placeholder={
                            aiMode === "franchise"
                              ? (isMobile ? "Franchise name..." : "Enter franchise name...")
                              : (isMobile ? "Ask AniMuse..." : "Ask AniMuse anything...")
                          }
                          className={`w-full bg-black/40 backdrop-blur-sm border border-white/20 ${isMobile ? 'rounded-lg px-3 py-2' : 'rounded-xl px-4 py-3'} ${isMobile ? 'pr-12' : 'pr-14'} text-white placeholder-white/60 focus:border-brand-primary-action focus:ring-2 focus:ring-brand-primary-action/50 focus:outline-none transition-all duration-300 text-base touch-manipulation`}
                          disabled={
                            isLoading || authIsLoading || !isAuthenticated
                          }
                          style={{
                            fontSize: "16px", // Prevent iOS zoom
                            minHeight: isMobile ? "44px" : "auto", // iOS minimum touch target
                          }}
                        />
                        {/* Send button inside input */}
                        <button
                          type="submit"
                          className={`absolute ${isMobile ? 'right-2' : 'right-3'} top-1/2 -translate-y-1/2 p-2 text-brand-primary-action hover:text-brand-accent-gold transition-all duration-300 touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed group`}
                          disabled={
                            isLoading ||
                            authIsLoading ||
                            !isAuthenticated ||
                            !prompt.trim()
                          }
                        >
                          {isLoading ? (
                            <ArtisticLoadingSpinner size={isMobile ? "h-4 w-4" : "h-5 w-5"} message="" />
                          ) : (
                            <svg 
                              className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} transform group-hover:translate-x-0.5 transition-transform duration-200`} 
                              fill="currentColor" 
                              viewBox="0 0 20 20"
                            >
                              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/>
                            </svg>
                          )}
                        </button>
                      </div>
                    )}

                    {/* Remove the separate send button */}
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

      {/* Custom CSS for animations and iPhone optimizations */}
      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-20px) rotate(180deg);
          }
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

        /* iPhone specific optimizations */
        @media (max-width: 414px) {
          .custom-scrollbar {
            -webkit-overflow-scrolling: touch;
            scrollbar-width: thin;
          }
          
          .custom-scrollbar::-webkit-scrollbar {
            width: 2px;
          }
          
          .custom-scrollbar::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.1);
          }
          
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(255, 107, 53, 0.5);
            border-radius: 4px;
          }
        }

        /* Enhanced scrollbar for all devices */
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(255, 107, 53, 0.5) rgba(255, 255, 255, 0.1);
          -webkit-overflow-scrolling: touch;
          scroll-behavior: smooth;
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 107, 53, 0.5);
          border-radius: 3px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 107, 53, 0.7);
        }

        /* iPhone safe areas */
        .pt-safe-top {
          padding-top: env(safe-area-inset-top);
        }
        
        .pb-safe-bottom {
          padding-bottom: env(safe-area-inset-bottom);
        }

        /* Touch improvements for iPhone */
        .touch-manipulation {
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
        }

        /* Fullscreen chat animations */
        .chat-fullscreen-enter {
          transform: scale(0.95);
          opacity: 0;
        }
        
        .chat-fullscreen-enter-active {
          transform: scale(1);
          opacity: 1;
          transition: all 0.2s ease-out;
        }
        
        .chat-fullscreen-exit {
          transform: scale(1);
          opacity: 1;
        }
        
        .chat-fullscreen-exit-active {
          transform: scale(0.95);
          opacity: 0;
          transition: all 0.2s ease-in;
        }
      `}</style>
    </div>
  );
};

export default memo(EnhancedAIAssistantPageComponent);