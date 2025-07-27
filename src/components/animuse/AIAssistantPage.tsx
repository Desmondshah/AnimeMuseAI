// src/components/animuse/AIAssistantPage.tsx - BRUTALIST MINIMALIST AI CHAT
import React, { useState, FormEvent, useRef, useEffect, useCallback, memo } from "react";
import { useAction, useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import StyledButton from "./shared/StyledButton";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { AnimeRecommendation } from "../../../convex/types";
import AnimeCard from "./AnimeCard";
import { usePersistentChatHistory } from '../../hooks/usePersistentChatHistory';
import { useMobileOptimizations } from '../../hooks/useMobileOptimizations';

// Enhanced types
type RecommendationResult = { recommendations: AnimeRecommendation[]; error?: string; };
type AnalysisResult = { analysis: any; error?: string; };
type GuideResult = { guide: any; error?: string; };
type WhatIfResult = { analysis: any; error?: string; };
type AIActionResult = RecommendationResult | AnalysisResult | GuideResult | WhatIfResult;

function isRecommendationResult(result: AIActionResult): result is RecommendationResult {
  return 'recommendations' in result;
}

function isAnalysisResult(result: AIActionResult): result is AnalysisResult {
  return 'analysis' in result;
}

function isGuideResult(result: AIActionResult): result is GuideResult {
  return 'guide' in result;
}

function isWhatIfResult(result: AIActionResult): result is WhatIfResult {
  return 'analysis' in result && 
         result.analysis && 
         (result.analysis.analysisType === 'what_if_scenario' || 
          result.analysis.scenario || 
          result.analysis.immediateImpact ||
          result.analysis.characterImpact ||
          result.analysis.creativePossibilities);
}

interface ChatMessage {
  id: string;
  type: "user" | "ai" | "error" | "analysis" | "guide" | "what_if";
  content: string;
  recommendations?: AnimeRecommendation[];
  analysis?: any;
  guide?: any;
  whatIfAnalysis?: any;
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
    <div className={className}>
      {isExpanded ? text : `${text.substring(0, maxLength)}...`}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="ml-2 bg-black text-white px-2 py-1 text-xs font-mono border-2 border-white hover:bg-white hover:text-black"
      >
        {isExpanded ? '[LESS]' : '[MORE]'}
      </button>
    </div>
  );
};

// BRUTALIST MINIMAL Loading Component
const BrutalistLoadingSpinner: React.FC<{ size?: string; message?: string }> = memo(({ 
  size = "h-8 w-8", 
  message = "PROCESSING..." 
}) => (
  <div className="flex flex-col items-center justify-center py-4">
    <div className="relative">
      <div className={`${size} bg-black border-4 border-white animate-pulse`}></div>
      <div className="absolute inset-0 bg-white border-4 border-black animate-ping"></div>
      </div>
    {message && (
      <div className="mt-2 bg-black text-white px-3 py-1 font-mono text-xs border-2 border-white">
        {message}
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

// ENHANCED BRUTALIST Mode Card Component
const BrutalistModeCard: React.FC<{
  mode: { id: string; label: string; desc: string; icon: string; gradient: string };
  isActive: boolean;
  onClick: () => void;
  className?: string;
}> = memo(({ mode, isActive, onClick, className }) => (
  <div className={`${className || ''} relative`}>
    <button
      onClick={onClick}
      className={`w-full p-4 border-6 font-mono text-left transition-all duration-200 transform hover:scale-105 active:scale-95 ${
        isActive 
          ? 'bg-black text-white border-white shadow-brutal-lg' 
          : 'bg-white text-black border-black hover:bg-black hover:text-white hover:border-white hover:shadow-brutal'
      }`}
    >
      {/* Aggressive corner accents */}
      {isActive && (
        <>
          <div className="absolute -top-1 -left-1 w-3 h-3 bg-brand-primary-action border-2 border-white"></div>
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-brand-accent-gold border-2 border-white"></div>
          <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-brand-accent-peach border-2 border-white"></div>
          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-white border-2 border-black"></div>
        </>
      )}
      
      <div className="flex items-center gap-3">
        <div className={`text-2xl p-2 border-3 ${isActive ? 'bg-white text-black border-black' : 'bg-black text-white border-white'}`}>
          {mode.icon}
        </div>
        <div className="flex-1">
          <div className="font-black text-sm uppercase tracking-wider leading-none mb-1">
            {mode.label}
          </div>
          <div className={`text-xs font-bold uppercase tracking-wide ${isActive ? 'opacity-90' : 'opacity-70'}`}>
            {mode.desc}
          </div>
        </div>
      </div>
      
      {/* Brutal underline effect */}
      <div className={`mt-2 h-1 ${isActive ? 'bg-white' : 'bg-black'} transform ${isActive ? 'scale-x-100' : 'scale-x-0'} transition-transform duration-300 origin-left`}></div>
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
      // ESC to exit fullscreen - disabled for mobile
      if (e.key === 'Escape' && isFullscreen && !isMobile) {
        setIsFullscreen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, isMobile]);

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
  const analyzeWhatIfScenarioAction = useAction(api.ai.analyzeWhatIfScenario);

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
        
      // FIXED: Now calls the analysis action instead of recommendations
      case "what_if":
        return await analyzeWhatIfScenarioAction({ 
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
    analyzeWhatIfScenarioAction, // UPDATED: Use analysis action instead of recommendations
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
    } else if (isWhatIfResult(result) && result.analysis) {
      // Handle What If results FIRST, before other analysis types
      aiResponseMessage = { 
        id: aiMessageId, 
        type: "what_if", 
        content: `Here's my analysis of your "what if" scenario:`, 
        whatIfAnalysis: result.analysis, 
        feedback: null, 
        actionType: aiMode 
      };
      responseToLog.rawAiText = JSON.stringify(result.analysis);
      toast.success("What if analysis complete!");
    } else if (isAnalysisResult(result) && result.analysis) {
      // Handle comparative analysis (for compare mode)
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
  if (message && (message.type === "ai" || message.type === "analysis" || message.type === "guide" || message.type === "what_if" || message.type === "error")) {
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
        aiResponseText: message.rawAiText || JSON.stringify(message.analysis) || JSON.stringify(message.guide) || JSON.stringify(message.whatIfAnalysis) || message.content,
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
    <div className="relative min-h-screen bg-white overflow-hidden">
      {/* ENHANCED BRUTAL GEOMETRIC BACKGROUND */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Aggressive grid overlay with multiple layers */}
        <div className="absolute inset-0 bg-black opacity-5" 
             style={{
               backgroundImage: `
                 linear-gradient(0deg, transparent 24%, rgba(255, 107, 53, .3) 25%, rgba(255, 107, 53, .3) 26%, transparent 27%, transparent 74%, rgba(255, 107, 53, .3) 75%, rgba(255, 107, 53, .3) 76%, transparent 77%, transparent),
                 linear-gradient(90deg, transparent 24%, rgba(0, 0, 0, .3) 25%, rgba(0, 0, 0, .3) 26%, transparent 27%, transparent 74%, rgba(0, 0, 0, .3) 75%, rgba(0, 0, 0, .3) 76%, transparent 77%, transparent)
               `,
               backgroundSize: '50px 50px'
             }}>
        </div>
        
        {/* Massive floating geometric shapes - more aggressive */}
        <div className="absolute top-16 left-2 w-40 h-40 bg-black border-8 border-brand-primary-action transform rotate-45 opacity-15 animate-pulse"></div>
        <div className="absolute top-32 right-4 w-32 h-32 bg-brand-accent-gold border-6 border-black opacity-25 transform rotate-12 animate-bounce-slow"></div>
        <div className="absolute bottom-24 left-4 w-48 h-24 bg-brand-primary-action border-8 border-black transform -rotate-12 opacity-20"></div>
        <div className="absolute bottom-16 right-2 w-36 h-36 bg-black border-8 border-white transform rotate-12 opacity-15"></div>
        <div className="absolute top-1/2 left-1/3 w-20 h-20 bg-brand-accent-peach border-6 border-black transform -rotate-45 opacity-30"></div>
        <div className="absolute top-1/3 right-1/4 w-24 h-12 bg-black border-4 border-brand-accent-gold transform rotate-45 opacity-20"></div>
        
        {/* Additional chaotic geometric elements */}
        <div className="absolute top-1/4 left-1/2 w-16 h-64 bg-brand-primary-action border-4 border-black transform -rotate-12 opacity-10"></div>
        <div className="absolute bottom-1/3 right-1/3 w-28 h-28 bg-brand-accent-gold border-6 border-black transform rotate-45 opacity-25"></div>
        
        {/* Harsh diagonal stripes - more intense */}
        <div className="absolute top-0 left-0 w-full h-4 bg-black transform -skew-y-12 opacity-40"></div>
        <div className="absolute top-8 left-0 w-full h-2 bg-brand-primary-action transform -skew-y-6 opacity-30"></div>
        <div className="absolute bottom-0 right-0 w-full h-4 bg-brand-primary-action transform skew-y-12 opacity-40"></div>
        <div className="absolute bottom-8 right-0 w-full h-2 bg-black transform skew-y-6 opacity-30"></div>
        
        {/* More brutal corner elements */}
        <div className="absolute top-0 left-0 w-12 h-12 bg-brand-accent-gold border-r-6 border-b-6 border-black"></div>
        <div className="absolute top-0 right-0 w-12 h-12 bg-brand-accent-peach border-l-6 border-b-6 border-black"></div>
        <div className="absolute bottom-0 left-0 w-12 h-12 bg-brand-primary-action border-r-6 border-t-6 border-black"></div>
        <div className="absolute bottom-0 right-0 w-12 h-12 bg-black border-l-6 border-t-6 border-white"></div>
        
        {/* Jagged edge elements */}
        <div className="absolute top-1/2 left-0 w-8 h-32 bg-black transform -skew-y-12 opacity-30"></div>
        <div className="absolute top-1/4 right-0 w-8 h-40 bg-brand-primary-action transform skew-y-12 opacity-30"></div>
        
        {/* Noise texture overlay */}
        <div className="absolute inset-0 opacity-20" 
             style={{
               backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='1'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.4'/%3E%3C/svg%3E")`
             }}>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col p-4">
        {/* ENHANCED BRUTAL HERO HEADER */}
        <div className="relative bg-black border-8 border-white shadow-brutal-lg p-8 mb-8 transform hover:scale-[1.01] transition-transform duration-200">
          {/* Aggressive accent corners */}
          <div className="absolute -top-2 -left-2 w-6 h-6 bg-brand-primary-action border-4 border-black"></div>
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-brand-accent-gold border-4 border-black"></div>
          <div className="absolute -bottom-2 -left-2 w-6 h-6 bg-brand-accent-peach border-4 border-black"></div>
          <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-white border-4 border-black"></div>
          
          <div className="relative bg-brand-primary-action border-6 border-black p-6 mb-6 transform -rotate-1 hover:rotate-0 transition-transform duration-300">
            <div className="bg-black border-4 border-white p-2 mb-2 transform rotate-1">
              <h1 className="text-2xl md:text-5xl font-black text-white uppercase tracking-wider text-center font-mono leading-none">
                🤖 ANIMUSE
              </h1>
            </div>
            <div className="bg-white border-4 border-black p-2">
              <h2 className="text-lg md:text-2xl font-black text-black uppercase tracking-wider text-center font-mono leading-none">
                AI ASSISTANT
              </h2>
            </div>
          </div>
          
          <div className="bg-white border-6 border-black p-6 transform rotate-1 hover:-rotate-1 transition-transform duration-300">
            <div className="bg-black border-2 border-white p-3 mb-3">
              <p className="text-white font-black text-center text-xs md:text-sm uppercase font-mono tracking-widest">
                BRUTAL ANIME DISCOVERY ENGINE
              </p>
            </div>
            <p className="text-black font-black text-center text-sm md:text-base uppercase font-mono leading-tight">
              YOUR INTELLIGENT COMPANION FOR DISCOVERY
            </p>
          </div>
        </div>

        {/* BRUTAL AI MODE SELECTOR */}
        <div className="mb-6">
          <div className="bg-black border-4 border-white shadow-brutal-lg p-6">
            <div className="bg-brand-accent-gold border-4 border-black p-4 mb-6">
              <h2 className="text-xl font-black text-black uppercase tracking-wider text-center">
                CHOOSE YOUR AI EXPERIENCE
              </h2>
            </div>

            {/* 2-column grid for iPhone optimization */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {modeConfigs.map((mode, index) => (
                <BrutalistModeCard
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

        {/* BRUTAL MODE-SPECIFIC CONTROLS */}
        <div className="mb-6">
          {aiMode === "compare" && (
            <div className="bg-red-500 border-4 border-black shadow-brutal-lg p-6">
              <div className="bg-white border-4 border-black p-4 mb-4">
                <h3 className="text-lg font-black text-black uppercase tracking-wider text-center">
                  ⚖️ COMPARE TWO ANIME
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-100 border-4 border-black p-1">
                  <input
                    type="text"
                    placeholder="FIRST ANIME TITLE"
                    value={animeA}
                    onChange={(e) => setAnimeA(e.target.value)}
                    className="w-full bg-gray-100 border-none outline-none p-3 text-black font-bold placeholder-gray-600 text-sm uppercase"
                  />
                </div>
                <div className="bg-gray-100 border-4 border-black p-1">
                  <input
                    type="text"
                    placeholder="SECOND ANIME TITLE"
                    value={animeB}
                    onChange={(e) => setAnimeB(e.target.value)}
                    className="w-full bg-gray-100 border-none outline-none p-3 text-black font-bold placeholder-gray-600 text-sm uppercase"
                  />
                </div>
              </div>
            </div>
          )}

          {aiMode === "hidden_gems" && (
            <div className="bg-purple-500 border-4 border-black shadow-brutal-lg p-6">
              <div className="bg-white border-4 border-black p-4 mb-4">
                <h3 className="text-lg font-black text-black uppercase tracking-wider text-center">
                  💎 HIDDEN GEMS SETTINGS
                </h3>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="bg-gray-200 border-4 border-black p-3 mb-3">
                    <label className="block text-sm font-black text-black uppercase">
                      SURPRISE LEVEL:
                    </label>
                  </div>
                  <div className="flex gap-3 justify-center">
                    {(["mild", "moderate", "wild"] as const).map(
                      (level) => (
                        <button
                          key={level}
                          onClick={() => setSurpriseLevel(level)}
                          className={`px-4 py-2 border-4 border-black text-sm font-black uppercase transition-all duration-200 touch-target ${
                            surpriseLevel === level
                              ? "bg-brand-primary-action text-black shadow-brutal"
                              : "bg-white text-black hover:bg-gray-200"
                          }`}
                        >
                          {level.charAt(0).toUpperCase() + level.slice(1)}
                        </button>
                      )
                    )}
                  </div>
                </div>
                <label className="flex items-center justify-center space-x-3 cursor-pointer touch-target">
                  <div className="bg-white border-4 border-black p-1">
                    <input
                      type="checkbox"
                      checked={avoidPopular}
                      onChange={(e) => setAvoidPopular(e.target.checked)}
                      className="w-4 h-4 border-2 border-black bg-white checked:bg-brand-primary-action focus:outline-none"
                    />
                  </div>
                  <span className="text-white font-black uppercase">
                    AVOID MAINSTREAM ANIME
                  </span>
                </label>
              </div>
            </div>
          )}

          {aiMode === "what_if" && (
            <div className="bg-violet-500 border-4 border-black shadow-brutal-lg p-6">
              <div className="bg-white border-4 border-black p-4 mb-4">
                <h3 className="text-lg font-black text-black uppercase tracking-wider text-center">
                  🤔 WHAT IF SCENARIOS
                </h3>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="bg-gray-200 border-4 border-black p-3 mb-3">
                    <label className="block text-sm font-black text-black uppercase">
                      SCENARIO TYPE:
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {(["Character Choice", "World Rules", "Historical Event", "Power/Ability"] as const).map(
                      (type) => (
                        <button
                          key={type}
                          onClick={() => setPrompt(`What if ${type.toLowerCase()} changed? `)}
                          className="px-3 py-2 border-4 border-black text-xs font-black uppercase transition-all duration-200 bg-white text-black hover:bg-gray-200 touch-target"
                        >
                          {type}
                        </button>
                      )
                    )}
                  </div>
                </div>
                <div className="bg-yellow-400 border-4 border-black p-4">
                  <p className="text-sm text-black font-bold text-center uppercase">
                    EXPLORE HYPOTHETICAL ANIME SCENARIOS! ASK "WHAT IF..." QUESTIONS
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>



        {/* BRUTAL CHAT INTERFACE */}
        <div className={`${isFullscreen ? 'fixed inset-0 z-[9999] bg-white flex flex-col' : `flex-1 ${isMobile ? 'px-0 pb-32 mb-4' : 'px-0 pb-32'} ${hasNotch ? 'pt-safe-top' : ''}`}`}>
          <div className={`${isFullscreen ? 'h-full flex flex-col' : 'w-full mx-auto'}`}>
            <div className={`${isFullscreen ? 'flex-1 flex flex-col min-h-0' : 'relative'}`}>
              {/* BRUTALIST CHAT CONTAINER WITH EXPOSED GRID */}
              <div className={`bg-white border-6 border-black ${isFullscreen ? 'flex-1 flex flex-col min-h-0' : isMobile ? 'min-h-[450px] mobile-chat-container' : 'min-h-[500px]'} overflow-hidden relative`}
                   style={{
                     backgroundImage: `
                       linear-gradient(rgba(0,0,0,0.02) 1px, transparent 1px),
                       linear-gradient(90deg, rgba(0,0,0,0.02) 1px, transparent 1px)
                     `,
                     backgroundSize: '20px 20px'
                   }}>
                
                {/* Chat Header with brutalist styling */}
                <div className={`${isFullscreen ? 'flex-shrink-0' : 'sticky'} top-0 bg-black text-white border-b-6 border-red-500 ${isMobile ? (isFullscreen ? 'p-3' : 'p-3') : (isFullscreen ? 'p-4' : 'p-4')} flex justify-between items-center z-[9998] relative`}>
                  <div className="flex items-center">
                    <div className="relative">
                      <span className={`${isMobile ? (isFullscreen ? 'text-base' : 'text-sm') : (isFullscreen ? 'text-lg' : 'text-lg')} font-mono uppercase font-black tracking-wider`}>
                    {chatHistory.length > 0 && chatHistoryLoaded ? (
                          isMobile ? (isFullscreen ? 'CHAT HISTORY' : 'HISTORY') : 'CHAT//HISTORY'
                        ) : (
                          isMobile ? (isFullscreen ? 'ANIMUSE AI' : 'AI') : 'ANIMUSE//AI'
                        )}
                      </span>
                      {chatHistory.length === 0 && (
                        <span className="absolute -top-1 -right-8 text-yellow-400 text-xs font-mono rotate-12">
                          READY
                      </span>
                    )}
                    </div>
                  </div>
                  
                  <div className={`flex items-center ${isMobile ? 'gap-2' : 'gap-3'}`}>
                    {/* Fullscreen toggle button - hidden on mobile when in fullscreen */}
                    {!(isMobile && isFullscreen) && (
                      <button
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        className={`${isFullscreen ? (isMobile ? 'px-3 py-2' : 'px-4 py-2') : (isMobile ? 'px-2 py-1' : 'p-2')} bg-white text-black border-3 border-white hover:bg-black hover:text-white font-mono ${isMobile ? 'text-xs' : 'text-xs'} touch-target transition-all duration-200 transform hover:scale-105`}
                        title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                      >
                        {isFullscreen ? (isMobile ? "[EXIT]" : "[EXIT FULL]") : (isMobile ? "[F]" : "[FULL]")}
                      </button>
                    )}
                    
                    {/* Clear chat button */}
                    {chatHistory.length > 0 && chatHistoryLoaded && (
                      <button
                        onClick={clearChatHistory}
                        className={`${isFullscreen ? (isMobile ? 'px-3 py-2' : 'px-4 py-2') : (isMobile ? 'px-2 py-1' : 'p-2')} bg-red-500 text-white border-3 border-red-500 hover:bg-black hover:text-white font-mono ${isMobile ? 'text-xs' : 'text-xs'} touch-target transition-all duration-200 transform hover:scale-105`}
                      >
                        {isFullscreen ? (isMobile ? "[CLEAR]" : "[CLEAR CHAT]") : (isMobile ? "[C]" : "[CLEAR]")}
                      </button>
                    )}
                  </div>
                </div>

                {/* MAIN CONTENT AREA - SCROLLABLE */}
                <div className={`${isFullscreen ? 'flex-1 min-h-0 overflow-hidden' : ''}`}>
                {!chatHistoryLoaded && (
                  <div className="text-center py-8">
                    <BrutalistLoadingSpinner message="LOADING..." />
                  </div>
                )}

                {chatHistory.length === 0 &&
                  !isLoading &&
                  chatHistoryLoaded && (
                      <div className={`text-center ${isMobile ? (isFullscreen ? 'py-8 px-4' : 'py-6 px-3') : 'py-12 px-6'}`}>
                        {/* BRUTALIST WELCOME MESSAGE */}
                        <div className={`bg-black text-white ${isMobile ? (isFullscreen ? 'p-5' : 'p-4') : 'p-6'} border-6 border-black mb-6 font-mono transform rotate-1 hover:-rotate-1 transition-transform duration-300`}>
                          <h3 className={`${isMobile ? (isFullscreen ? 'text-xl' : 'text-lg') : 'text-2xl'} font-black mb-3 uppercase tracking-widest`}>
                            {isMobile ? (isFullscreen ? 'ANIMUSE AI READY' : 'AI READY') : 'ANIMUSE//AI READY'}
                      </h3>
                          <p className={`${isMobile ? (isFullscreen ? 'text-base' : 'text-sm') : 'text-base'} text-yellow-400 font-bold`}>
                          TYPE A PROMPT TO BEGIN
                      </p>
                      </div>
                        
                        {/* BRUTALIST EXAMPLE PROMPTS */}
                        <div className={`grid ${isMobile ? (isFullscreen ? 'grid-cols-1 sm:grid-cols-2 gap-4' : 'grid-cols-1 gap-3') : 'grid-cols-1 sm:grid-cols-2 gap-4'} max-w-3xl mx-auto`}>
                        {getModeExamples()
                            .slice(0, isMobile ? (isFullscreen ? 4 : 3) : 4)
                          .map((example, idx) => (
                            <button
                              key={idx}
                                onClick={() => {
                                  // Add click animation
                                  const button = document.activeElement as HTMLElement;
                                  if (button) {
                                    button.classList.add('brutal-shatter');
                                    setTimeout(() => button.classList.remove('brutal-shatter'), 600);
                                  }
                                  handleSubmit(example);
                                }}
                                className={`relative overflow-hidden prompt-button ${isMobile ? (isFullscreen ? 'p-3' : 'p-2') : 'p-3'} font-mono text-left transition-all duration-500 touch-target group`}
                                style={{
                                  transform: `rotate(${idx * 1.5 - 2.25}deg)`,
                                }}
                              >
                                {/* BRUTALIST PROMPT BACKGROUND */}
                                <div className={`absolute inset-0 border-3 border-black transition-all duration-300 brutal-gradient-animate ${
                                  idx === 0 ? 'bg-gradient-to-br from-yellow-400 via-orange-400 to-red-400' :
                                  idx === 1 ? 'bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400' :
                                  idx === 2 ? 'bg-gradient-to-br from-green-400 via-teal-400 to-cyan-400' :
                                  'bg-gradient-to-br from-indigo-400 via-violet-400 to-purple-400'
                                }`}></div>
                                
                                {/* BRUTALIST PROMPT CONTENT */}
                                <div className="relative z-10 bg-white border-3 border-black p-2 transform transition-all duration-300 group-hover:scale-105 group-hover:rotate-1 group-hover:brutal-electric">
                                  {/* PROMPT HEADER */}
                                  <div className="flex justify-between items-center mb-2">
                                    <div className="bg-black text-white border-2 border-white px-2 py-1 transform -rotate-2 group-hover:brutal-glitch">
                                      <span className="font-black uppercase text-xs tracking-wider">
                                        PROMPT {idx + 1}
                                      </span>
                                    </div>
                                    <div className="bg-yellow-400 text-black border-2 border-black px-1 py-1 transform rotate-2 group-hover:brutal-float">
                                      <span className="font-black uppercase text-xs">
                                        {idx === 0 ? 'EMOTIONAL' : idx === 1 ? 'COZY' : idx === 2 ? 'CHARACTER' : 'STYLE'}
                                      </span>
                                    </div>
                                  </div>

                                  {/* PROMPT TEXT */}
                                  <div className="space-y-1">
                                    <p className={`font-black uppercase tracking-wider ${isMobile ? (isFullscreen ? 'text-sm' : 'text-xs') : 'text-sm'} leading-tight group-hover:brutal-typewriter`}>
                                      {isMobile && example.length > 30 ? `${example.substring(0, 30)}...` : example}
                                    </p>
                                    
                                    {/* BRUTALIST DECORATIVE ELEMENTS */}
                                    <div className="flex justify-between items-center mt-2">
                                      <div className="flex gap-1">
                                        {[...Array(3)].map((_, i) => (
                                          <div 
                                            key={i}
                                            className={`w-1 h-1 border border-black transform rotate-45 transition-all duration-300 group-hover:brutal-pulse-ring ${
                                              idx === 0 ? 'bg-red-400' :
                                              idx === 1 ? 'bg-blue-400' :
                                              idx === 2 ? 'bg-green-400' :
                                              'bg-purple-400'
                                            }`}
                                          ></div>
                                        ))}
                                      </div>
                                      <div className="bg-black text-white border border-white px-1 py-1 transform rotate-1 group-hover:brutal-matrix">
                                        <span className="font-black uppercase text-xs">
                                          {idx === 0 ? 'IMPACT' : idx === 1 ? 'BINGE' : idx === 2 ? 'DEV' : 'AESTHETIC'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* BRUTALIST HOVER EFFECTS */}
                                  <div className="absolute -top-1 -right-1 bg-black text-white border border-white px-1 py-1 transform rotate-12 opacity-0 group-hover:opacity-100 transition-opacity duration-300 group-hover:brutal-neon">
                                    <span className="font-black uppercase text-xs">CLICK</span>
                                  </div>
                                  
                                  <div className="absolute -bottom-1 -left-1 bg-yellow-400 text-black border border-black px-1 py-1 transform -rotate-12 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <span className="font-black uppercase text-xs">GO</span>
                                  </div>

                                  {/* BRUTALIST SCAN LINE EFFECT */}
                                  <div className="absolute inset-0 brutal-scan opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                </div>

                                {/* BRUTALIST SHADOW EFFECT */}
                                <div className="absolute inset-0 bg-black transform translate-x-1 translate-y-1 -z-10 group-hover:translate-x-2 group-hover:translate-y-2 transition-transform duration-300"></div>

                                {/* BRUTALIST PARTICLE EFFECTS */}
                                <div className="absolute inset-0 pointer-events-none">
                                  {[...Array(3)].map((_, i) => (
                                    <div
                                      key={i}
                                      className={`absolute w-1 h-1 bg-yellow-400 opacity-0 group-hover:opacity-100 group-hover:brutal-particle`}
                                      style={{
                                        left: `${20 + i * 15}%`,
                                        top: `${30 + i * 10}%`,
                                        animationDelay: `${i * 0.1}s`
                                      }}
                                    ></div>
                                  ))}
                                </div>
                            </button>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* BRUTALIST CHAT MESSAGES CONTAINER */}
                <div
                  ref={chatContainerRef}
                    className={`${isFullscreen ? 'flex-1 min-h-0 overflow-y-auto' : isMobile ? 'h-72' : 'h-96'} overflow-y-auto custom-scrollbar ${isMobile ? (isFullscreen ? 'p-4 space-y-4 pb-32' : 'p-2 space-y-2 pb-32 chat-messages-container') : 'p-6 space-y-4 pb-32'} bg-white`}
                  style={{ 
                    scrollbarWidth: "thin",
                    WebkitOverflowScrolling: "touch",
                    overscrollBehavior: "contain",
                    touchAction: "pan-y"
                  }}
                >
                  {!chatHistoryLoaded && (
                    <div className="text-center py-8">
                      <BrutalistLoadingSpinner message="LOADING..." />
                    </div>
                  )}

                  {/* Chat Messages */}
                    {chatHistory.map((msg, index) => (
                    <div
                      key={msg.id}
                        className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"} mb-6`}
                    >
                      <div
                          className={`${isMobile ? 'max-w-[92%]' : 'max-w-[85%]'}`}
                      >
                          {/* BRUTALIST MESSAGE BLOCK */}
                        <div
                            className={`${isMobile ? 'p-4' : 'p-5'} border-4 font-mono ${
                            msg.type === "user"
                                ? `bg-yellow-400 text-black border-black ${isMobile ? 'ml-6' : 'ml-8'} transform rotate-1`
                              : msg.type === "error"
                                  ? `bg-red-500 text-white border-red-500 ${isMobile ? 'mr-6' : 'mr-8'} transform -rotate-1`
                                  : `bg-white text-black border-black ${isMobile ? 'mr-6' : 'mr-8'} transform -rotate-0.5`
                            } transition-all duration-300 hover:scale-105`}
                          >
                            {/* BRUTALIST MESSAGE HEADER */}
                            <div className={`flex justify-between items-center mb-3 pb-2 border-b-2 ${msg.type === "user" ? "border-black" : "border-gray-300"}`}>
                              <div className="flex items-center gap-2">
                                <span className={`font-black uppercase tracking-wider ${isMobile ? 'text-xs' : 'text-sm'} ${
                                  msg.type === "user" ? "text-black" : 
                                  msg.type === "error" ? "text-white" : "text-gray-700"
                                }`}>
                                  {msg.type === "user" ? "YOU" : msg.type === "error" ? "ERROR" : "ANIMUSE AI"}
                                </span>
                                <div className={`w-2 h-2 rounded-full ${
                                  msg.type === "user" ? "bg-black" : 
                                  msg.type === "error" ? "bg-white" : "bg-green-500"
                                }`}></div>
                              </div>
                              <span className={`font-mono ${isMobile ? 'text-xs' : 'text-sm'} ${
                                msg.type === "user" ? "text-black" : 
                                msg.type === "error" ? "text-white" : "text-gray-500"
                              }`}>
                                {new Date().toLocaleTimeString('en-US', { 
                                  hour12: false, 
                                  hour: '2-digit', 
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>

                            {/* Message content with improved typography */}
                            <div className={`whitespace-pre-wrap leading-relaxed ${isMobile ? 'text-sm' : 'text-base'} ${
                              msg.type === "user" ? "font-semibold" : "font-normal"
                            }`}>
                            {msg.content}
                          </div>

                          {/* Enhanced Content Display */}
                          {msg.type === "ai" &&
                            msg.recommendations &&
                            msg.recommendations.length > 0 && (
                                <div className={`${isMobile ? 'mt-4' : 'mt-5'} space-y-4 border-t-3 border-black ${isMobile ? 'pt-4' : 'pt-5'}`}>
                                  <div className="bg-yellow-400 text-black border-3 border-black p-3 mb-4 transform -rotate-1">
                                    <h3 className="font-mono font-black uppercase text-sm tracking-wider text-center">
                                      RECOMMENDATIONS FOUND
                                    </h3>
                                  </div>
                                {msg.recommendations.map((animeRec, idx) => (
                                  <div
                                    key={`${msg.id}-rec-${idx}`}
                                      className={`bg-white border-3 border-black ${isMobile ? 'p-3' : 'p-4'} transform hover:scale-105 transition-all duration-300`}
                                      style={{
                                        transform: `rotate(${idx * 0.2 - 0.4}deg)`,
                                      }}
                                    >
                                      {/* BRUTALIST RECOMMENDATION HEADER */}
                                      <div className="bg-black text-white border-2 border-white p-2 mb-3 transform rotate-1">
                                        <div className="flex justify-between items-center">
                                          <span className="font-mono font-black uppercase text-xs tracking-wider">
                                            ANIME {idx + 1}
                                          </span>
                                          <span className="font-mono text-xs bg-yellow-400 text-black px-2 py-1 border border-black">
                                            {Math.floor(Math.random() * 20 + 80)}% MATCH
                                          </span>
                                        </div>
                                      </div>

                                      <div className={`flex flex-col ${isMobile ? 'gap-2' : 'gap-3'}`}>
                                        <h4 className={`font-mono font-black ${isMobile ? 'text-sm' : 'text-base'} uppercase tracking-wider border-b-2 border-black pb-2 leading-tight`}>
                                        {isMobile && animeRec.title.length > 25 
                                          ? `${animeRec.title.substring(0, 25)}...` 
                                          : animeRec.title}
                                          </h4>
                                          {animeRec.year && (
                                          <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-mono font-bold bg-gray-200 border-2 border-black px-2 py-1 inline-block w-fit`}>
                                          YEAR: {animeRec.year}
                                            </p>
                                          )}
                                          {animeRec.description && (
                                          <div className="bg-gray-100 border-2 border-black p-2">
                                            <ExpandableText
                                              text={animeRec.description}
                                              maxLength={isMobile ? 80 : 250}
                                              className={`${isMobile ? 'text-xs' : 'text-sm'} font-mono leading-relaxed`}
                                            />
                                          </div>
                                          )}
                                          {animeRec.reasoning && (
                                          <div className="bg-yellow-100 border-2 border-black p-2">
                                            <ExpandableText
                                          text={`REASON: ${animeRec.reasoning}`}
                                              maxLength={isMobile ? 60 : 200}
                                              className={`${isMobile ? 'text-xs' : 'text-sm'} font-mono leading-relaxed font-bold`}
                                            />
                                          </div>
                                          )}
                                          {animeRec.genres &&
                                            animeRec.genres.length > 0 && (
                                            <div className={`flex flex-wrap ${isMobile ? 'gap-1' : 'gap-2'}`}>
                                                {animeRec.genres
                                              .slice(0, isMobile ? 3 : 4)
                                                  .map((g: string) => (
                                                    <span
                                                      key={g}
                                                    className={`${isMobile ? 'text-xs' : 'text-sm'} bg-black text-white ${isMobile ? 'px-2 py-1' : 'px-3 py-1'} font-mono border-2 border-black font-bold uppercase tracking-wider transform hover:scale-110 transition-transform duration-200`}
                                                    >
                                                  {isMobile && g.length > 8 ? `${g.substring(0, 8)}...` : g}
                                                    </span>
                                                  ))}
                                              </div>
                                            )}
                                        <div className={`flex ${isMobile ? 'flex-col gap-2' : 'gap-3'} pt-3 border-t-2 border-black`}>
                                        <button
                                              onClick={() =>
                                                handleAiRecommendationAddToWatchlist(
                                                  animeRec,
                                                  "Plan to Watch"
                                                )
                                              }
                                              disabled={
                                                !isAuthenticated || isLoading
                                              }
                                            className={`bg-black text-white ${isMobile ? 'px-3 py-2' : 'px-4 py-2'} text-sm font-mono border-3 border-black hover:bg-white hover:text-black disabled:opacity-50 touch-target transition-all duration-200 transform hover:scale-105 font-black uppercase`}
                                            >
                                          [ADD TO WATCHLIST]
                                        </button>
                                            {animeRec.trailerUrl && (
                                              <a
                                                href={animeRec.trailerUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                              >
                                              <button className={`bg-white text-black ${isMobile ? 'px-3 py-2 w-full' : 'px-4 py-2'} text-sm font-mono border-3 border-black hover:bg-black hover:text-white touch-target transition-all duration-200 transform hover:scale-105 font-black uppercase`}>
                                              [WATCH TRAILER]
                                            </button>
                                              </a>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                ))}
                              </div>
                            )}

                            {/* Feedback buttons for AI messages */}
                            {msg.type === "ai" && (
                              <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-gray-300">
                              <button
                                onClick={() => handleFeedback(msg.id, "up")}
                                  className={`px-2 py-1 text-xs font-mono border-2 border-black transition-all duration-200 ${
                                  msg.feedback === "up"
                                      ? "bg-green-500 text-white" 
                                      : "bg-white text-black hover:bg-green-100"
                                }`}
                              >
                                  👍 HELPFUL
                              </button>
                              <button
                                onClick={() => handleFeedback(msg.id, "down")}
                                  className={`px-2 py-1 text-xs font-mono border-2 border-black transition-all duration-200 ${
                                  msg.feedback === "down"
                                      ? "bg-red-500 text-white" 
                                      : "bg-white text-black hover:bg-red-100"
                                }`}
                              >
                                  👎 NOT HELPFUL
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Loading indicator */}
                  {isLoading && (
                      <div className="flex justify-start mb-6">
                        <div className={`bg-white text-black border-4 border-black ${isMobile ? 'p-3 mr-6' : 'p-4 mr-8'}`}>
                          <div className="flex items-center gap-3">
                        <BrutalistLoadingSpinner size={isMobile ? "h-4 w-4" : "h-6 w-6"} />
                            <span className="font-mono font-bold uppercase text-sm">ANIMUSE IS THINKING...</span>
                          </div>
                      </div>
                    </div>
                  )}
                </div>

                  {/* BRUTALIST INPUT AREA */}
                  <div className={`${isFullscreen ? 'flex-shrink-0' : 'sticky bottom-0 z-50 sticky-input-area'} border-t-6 border-black bg-black text-white ${isMobile ? (isFullscreen ? 'p-4' : 'p-1.5 mobile-safe-bottom') : 'p-5'} ${hasNotch ? 'pb-safe-bottom' : isIOS ? 'pb-4' : 'pb-4'} relative`}
                       style={{
                         backgroundImage: `
                           linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)
                         `,
                         backgroundSize: '15px 15px'
                       }}>
                    
                    {/* INPUT HEADER - Condensed for mobile */}
                    <div className={`flex justify-between items-center ${isMobile ? 'mb-1.5' : 'mb-4'}`}>
                      <div className="flex items-center gap-2">
                        <span className={`font-mono font-black uppercase tracking-wider ${isMobile ? 'text-xs' : 'text-sm'}`}>
                          {isMobile ? "MESSAGE" : "SEND MESSAGE"}
                        </span>
                        <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-gray-400">
                          {prompt.length}/500
                        </span>
                        <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                          prompt.length > 400 ? 'bg-red-400' : 
                          prompt.length > 300 ? 'bg-yellow-400' : 'bg-green-400'
                        }`}></div>
                      </div>
                    </div>

                  <form
                    onSubmit={handleSubmit}
                      className={`flex ${isMobile ? (isFullscreen ? 'flex-col gap-4' : 'flex-col gap-1.5') : 'gap-4 items-end'}`}
                  >
                    {aiMode === "compare" || aiMode === "hidden_gems" ? (
                      <div className="flex-1 relative">
                          <div className={`w-full bg-white text-black border-4 border-white ${isMobile ? (isFullscreen ? 'px-4 py-3' : 'px-4 py-3') : 'px-6 py-4'} text-center ${isMobile ? (isFullscreen ? 'text-sm' : 'text-sm') : 'text-base'} font-mono font-black uppercase`}>
                            {isMobile ? (isFullscreen ? "USE CONTROLS ABOVE AND HIT SEND" : "USE CONTROLS ABOVE") : "USE CONTROLS ABOVE AND HIT SEND"}
                        </div>
                        <button
                          type="submit"
                            className={`${isMobile ? 'absolute right-3 top-1/2 -translate-y-1/2' : 'absolute right-3 top-1/2 -translate-y-1/2'} bg-black text-white ${isMobile ? (isFullscreen ? 'px-3 py-2' : 'px-2 py-1.5') : 'px-4 py-2'} text-sm font-mono border-3 border-white hover:bg-white hover:text-black disabled:opacity-50 touch-target transition-all duration-200 transform hover:scale-105`}
                          disabled={
                            isLoading ||
                            authIsLoading ||
                            !isAuthenticated ||
                            (aiMode === "compare"
                              ? !animeA.trim() || !animeB.trim()
                              : false)
                          }
                        >
                          {isLoading ? "..." : "[SEND]"}
                        </button>
                      </div>
                    ) : (
                      <>
                          <div className={`${isMobile ? 'w-full' : 'flex-1'} relative`}>
                        <input
                          type="text"
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          placeholder={
                            aiMode === "franchise"
                                  ? (isMobile ? (isFullscreen ? "Enter franchise name to get watch guide..." : "Franchise name...") : "Enter franchise name to get watch guide...")
                                  : (isMobile ? (isFullscreen ? "Describe what you're looking for in anime..." : "What anime are you looking for?") : "Describe what you're looking for in anime...")
                          }
                              className={`w-full bg-white text-black border-4 border-white ${isMobile ? (isFullscreen ? 'px-4 py-3' : 'px-2 py-1.5') : 'px-6 py-4'} font-mono ${isMobile ? (isFullscreen ? 'text-base' : 'text-sm') : 'text-lg'} placeholder-gray-500 focus:outline-none ${isMobile ? 'mobile-touch-target' : 'touch-target'} font-bold transition-all duration-300`}
                          disabled={
                            isLoading || authIsLoading || !isAuthenticated
                          }
                          style={{
                            fontSize: "16px",
                                minHeight: isMobile ? "38px" : "56px",
                              }}
                            />
                            {/* BRUTALIST INPUT DECORATION */}
                            <div className="absolute -top-2 -right-2 bg-yellow-400 text-black px-2 py-1 text-xs font-mono font-black uppercase border-2 border-black transform rotate-12">
                              INPUT
                            </div>
                            
                            {/* CHARACTER COUNT INDICATOR */}
                            {prompt.length > 0 && (
                              <div className="absolute -bottom-8 left-0 text-xs font-mono text-gray-400">
                                {prompt.length} characters
                              </div>
                            )}
                          </div>
                        <button
                          type="submit"
                            className={`bg-white text-black ${isMobile ? (isFullscreen ? 'w-full px-4 py-3' : 'w-full px-2 py-1.5') : 'px-6 py-4'} ${isMobile ? (isFullscreen ? 'text-base' : 'text-sm') : 'text-lg'} font-mono border-4 border-white hover:bg-black hover:text-white hover:border-white disabled:opacity-50 ${isMobile ? 'mobile-touch-target' : 'touch-target'} transition-all duration-200 transform hover:scale-105 font-black uppercase flex items-center gap-2 justify-center`}
                          disabled={
                            isLoading ||
                            authIsLoading ||
                            !isAuthenticated ||
                            !prompt.trim()
                          }
                        >
                            {isLoading ? (
                              <>
                                <span className="animate-spin">⚡</span>
                                <span>{isMobile && !isFullscreen ? "..." : "PROCESSING..."}</span>
                              </>
                            ) : (
                              <>
                                <span>{isMobile && !isFullscreen ? "SEND" : "SEND"}</span>
                                <span className="text-lg">→</span>
                              </>
                            )}
                        </button>
                      </>
                    )}
                  </form>

                  {!isAuthenticated && !authIsLoading && (
                      <div className="mt-4 text-center">
                        <div className="bg-red-500 text-white border-2 border-white p-3 transform rotate-1">
                          <p className={`${isMobile ? (isFullscreen ? 'text-sm' : 'text-sm') : 'text-base'} font-mono font-bold uppercase tracking-wider`}>
                            LOG IN TO CHAT
                          </p>
                          <div className="w-16 h-1 bg-white mx-auto mt-2 transform rotate-1"></div>
                        </div>
                      </div>
                    )}

                    {/* QUICK TIPS - Hide on mobile when not in fullscreen */}
                    {chatHistory.length === 0 && (!isMobile || isFullscreen) && (
                      <div className="mt-4 p-3 bg-gray-900 border-2 border-white transform -rotate-1">
                        <p className="text-xs font-mono text-gray-300 text-center">
                          💡 TIP: Be specific about genres, mood, or themes you're interested in
                        </p>
                      </div>
                    )}
                  </div>
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

        @keyframes brutal-pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1) rotate(0deg);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.05) rotate(1deg);
          }
        }

        @keyframes brutal-shake {
          0%, 100% {
            transform: translateX(0) rotate(0deg);
          }
          25% {
            transform: translateX(-2px) rotate(-0.5deg);
          }
          75% {
            transform: translateX(2px) rotate(0.5deg);
          }
        }

        .animate-spin-reverse {
          animation: spin 1s linear infinite reverse;
        }

        .animate-brutal-pulse {
          animation: brutal-pulse 2s ease-in-out infinite;
        }

        .animate-brutal-shake {
          animation: brutal-shake 0.5s ease-in-out;
        }

        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        /* BRUTALIST GRID OVERLAY */
        .brutal-grid-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image: 
            linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px);
          background-size: 20px 20px;
          pointer-events: none;
          z-index: 1;
        }

        /* BRUTALIST SHADOW EFFECTS */
        .brutal-shadow {
          box-shadow: 
            4px 4px 0px rgba(0,0,0,0.8),
            8px 8px 0px rgba(0,0,0,0.4);
        }

        .brutal-shadow-lg {
          box-shadow: 
            6px 6px 0px rgba(0,0,0,0.8),
            12px 12px 0px rgba(0,0,0,0.4);
        }

        /* BRUTALIST BORDER EFFECTS */
        .border-brutal {
          border-width: 6px;
          border-style: solid;
        }

        .border-brutal-thick {
          border-width: 8px;
          border-style: solid;
        }

        /* BRUTALIST TYPOGRAPHY */
        .font-brutal {
          font-family: 'JetBrains Mono', monospace;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        /* BRUTALIST HOVER EFFECTS */
        .brutal-hover {
          transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }

        .brutal-hover:hover {
          transform: scale(1.05) rotate(1deg);
          box-shadow: 
            6px 6px 0px rgba(0,0,0,0.8),
            12px 12px 0px rgba(0,0,0,0.4);
        }

        /* BRUTALIST INPUT FOCUS */
        input:focus {
          outline: none;
          border-color: #ffff00;
          box-shadow: 
            0 0 0 4px rgba(255, 255, 0, 0.3),
            4px 4px 0px rgba(0,0,0,0.8);
          transform: scale(1.02) rotate(0.5deg);
        }

        /* BRUTALIST BUTTON ACTIVE STATE */
        button:active {
          transform: scale(0.95) rotate(-1deg);
          box-shadow: 
            2px 2px 0px rgba(0,0,0,0.8),
            4px 4px 0px rgba(0,0,0,0.4);
        }

        /* BRUTALIST SCROLLBAR */
        ::-webkit-scrollbar {
          width: 12px;
          height: 12px;
        }

        ::-webkit-scrollbar-track {
          background: #f0f0f0;
          border: 2px solid #000;
        }

        ::-webkit-scrollbar-thumb {
          background: #000;
          border: 2px solid #fff;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: #333;
        }

        /* BRUTALIST SELECTION */
        ::selection {
          background: #ffff00;
          color: #000;
        }

        /* BRUTALIST FOCUS OUTLINE */
        *:focus {
          outline: 3px solid #ffff00;
          outline-offset: 2px;
        }

        /* BRUTALIST LOADING ANIMATION */
        @keyframes brutal-loading {
          0% {
            transform: rotate(0deg) scale(1);
          }
          50% {
            transform: rotate(180deg) scale(1.2);
          }
          100% {
            transform: rotate(360deg) scale(1);
          }
        }

        .brutal-loading {
          animation: brutal-loading 1.5s ease-in-out infinite;
        }

        /* BRUTALIST MESSAGE ANIMATIONS */
        .message-enter {
          animation: brutal-shake 0.6s ease-out;
        }

        /* BRUTALIST RESPONSIVE GRID */
        @media (max-width: 768px) {
          .brutal-grid-overlay {
            background-size: 15px 15px;
          }
        }

                 /* Fullscreen chat optimizations */
         .z-\\[9999\\] {
           z-index: 9999 !important;
           position: fixed !important;
         }
         
         .z-\\[9998\\] {
           z-index: 9998 !important;
         }

        /* BRUTALIST TOUCH TARGETS */
        .touch-target {
          min-height: 44px;
          min-width: 44px;
        }

        /* BRUTALIST SAFE AREAS */
        .pt-safe-top {
          padding-top: env(safe-area-inset-top);
        }

        .pb-safe-bottom {
          padding-bottom: env(safe-area-inset-bottom);
        }

        /* BRUTALIST ROTATION UTILITIES */
        .rotate-0\\.5 {
          transform: rotate(0.5deg);
        }

        .-rotate-0\\.5 {
          transform: rotate(-0.5deg);
        }

        .rotate-12 {
          transform: rotate(12deg);
        }

        /* BRUTALIST BORDER WIDTHS */
        .border-3 {
          border-width: 3px;
        }

        .border-6 {
          border-width: 6px;
        }

        /* BRUTALIST TRACKING */
        .tracking-wider {
          letter-spacing: 0.1em;
        }

        .tracking-widest {
          letter-spacing: 0.2em;
        }

        /* BRUTALIST PROMPT BUTTON EFFECTS */
        .prompt-button {
          position: relative;
          overflow: hidden;
        }

        .prompt-button::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
          transition: left 0.5s;
        }

        .prompt-button:hover::before {
          left: 100%;
        }

        /* BRUTALIST GLITCH EFFECT */
        @keyframes brutal-glitch {
          0% {
            transform: translate(0);
          }
          20% {
            transform: translate(-2px, 2px);
          }
          40% {
            transform: translate(-2px, -2px);
          }
          60% {
            transform: translate(2px, 2px);
          }
          80% {
            transform: translate(2px, -2px);
          }
          100% {
            transform: translate(0);
          }
        }

        .brutal-glitch {
          animation: brutal-glitch 0.3s ease-in-out;
        }

        /* BRUTALIST PARTICLE EFFECT */
        @keyframes brutal-particle {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(-20px) rotate(360deg);
            opacity: 0;
          }
        }

        .brutal-particle {
          animation: brutal-particle 1s ease-out forwards;
        }

        /* BRUTALIST GRADIENT ANIMATION */
        @keyframes brutal-gradient {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }

        .brutal-gradient-animate {
          background-size: 200% 200%;
          animation: brutal-gradient 3s ease infinite;
        }

        /* BRUTALIST NEON EFFECT */
        .brutal-neon {
          box-shadow: 
            0 0 5px currentColor,
            0 0 10px currentColor,
            0 0 15px currentColor,
            0 0 20px currentColor;
        }

        /* BRUTALIST SCAN LINE EFFECT */
        @keyframes brutal-scan {
          0% {
            transform: translateY(-100%);
          }
          100% {
            transform: translateY(100%);
          }
        }

        .brutal-scan::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: rgba(255, 255, 0, 0.8);
          animation: brutal-scan 2s linear infinite;
        }

        /* BRUTALIST TYPEWRITER EFFECT */
        @keyframes brutal-typewriter {
          from {
            width: 0;
          }
          to {
            width: 100%;
          }
        }

        .brutal-typewriter {
          overflow: hidden;
          white-space: nowrap;
          animation: brutal-typewriter 2s steps(40, end);
        }

        /* BRUTALIST MATRIX EFFECT */
        @keyframes brutal-matrix {
          0% {
            opacity: 0;
            transform: translateY(-10px);
          }
          50% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translateY(10px);
          }
        }

        .brutal-matrix {
          animation: brutal-matrix 0.5s ease-in-out;
        }

        /* BRUTALIST PULSE RING */
        @keyframes brutal-pulse-ring {
          0% {
            transform: scale(0.8);
            opacity: 1;
          }
          100% {
            transform: scale(2);
            opacity: 0;
          }
        }

        .brutal-pulse-ring {
          animation: brutal-pulse-ring 1.5s ease-out infinite;
        }

        /* BRUTALIST FLOATING EFFECT */
        @keyframes brutal-float {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          33% {
            transform: translateY(-5px) rotate(1deg);
          }
          66% {
            transform: translateY(5px) rotate(-1deg);
          }
        }

        .brutal-float {
          animation: brutal-float 3s ease-in-out infinite;
        }

        /* BRUTALIST SHATTER EFFECT */
        @keyframes brutal-shatter {
          0% {
            transform: scale(1) rotate(0deg);
            opacity: 1;
          }
          50% {
            transform: scale(1.1) rotate(5deg);
            opacity: 0.8;
          }
          100% {
            transform: scale(1) rotate(0deg);
            opacity: 1;
          }
        }

        .brutal-shatter {
          animation: brutal-shatter 0.6s ease-in-out;
        }

        /* BRUTALIST ELECTRIC EFFECT */
        @keyframes brutal-electric {
          0%, 100% {
            box-shadow: 
              0 0 5px #ffff00,
              0 0 10px #ffff00,
              0 0 15px #ffff00;
          }
          50% {
            box-shadow: 
              0 0 10px #ffff00,
              0 0 20px #ffff00,
              0 0 30px #ffff00;
          }
        }

        .brutal-electric {
          animation: brutal-electric 0.5s ease-in-out infinite;
        }

        /* MOBILE INPUT SPACING FIX */
        @media (max-width: 768px) {
          /* Main container height adjustments */
          .mobile-chat-container {
            min-height: calc(70vh - 160px);
            max-height: calc(80vh - 80px);
          }

          /* Ensure chat messages have enough bottom padding */
          .chat-messages-container {
            padding-bottom: 160px !important;
            margin-bottom: 0 !important;
          }
          
          /* Sticky input area improvements */
          .sticky-input-area {
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            box-shadow: 0 -5px 20px rgba(0, 0, 0, 0.3);
            position: sticky !important;
            bottom: 0 !important;
            z-index: 1000 !important;
            max-height: 30vh; /* Prevent taking too much screen space */
          }

          /* Better touch target for mobile */
          .mobile-touch-target {
            min-height: 38px;
            min-width: 38px;
            touch-action: manipulation;
            -webkit-tap-highlight-color: transparent;
          }

          /* Prevent zoom on input focus */
          input[type="text"] {
            font-size: 16px !important;
            transform-origin: left top;
            zoom: 1;
            -webkit-text-size-adjust: 100%;
          }

          /* Safe area handling for newer phones */
          .mobile-safe-bottom {
            padding-bottom: calc(env(safe-area-inset-bottom) + 1rem);
          }

          /* iPhone X and newer notch handling */
          @supports (padding: max(0px)) {
            .mobile-safe-bottom {
              padding-bottom: max(1rem, env(safe-area-inset-bottom));
            }
          }

          /* Landscape mode adjustments */
          @media (orientation: landscape) {
            .mobile-chat-container {
              min-height: calc(60vh - 150px);
              max-height: calc(70vh - 80px);
            }
            
            .chat-messages-container {
              padding-bottom: 160px !important;
            }
          }

          /* Small mobile screens (iPhone SE, etc.) */
          @media (max-height: 600px) {
            .mobile-chat-container {
              min-height: calc(50vh - 80px);
            }
            
            .chat-messages-container {
              padding-bottom: 140px !important;
            }
            
            .sticky-input-area {
              padding: 0.5rem !important;
            }
          }

          /* Very small screens */
          @media (max-height: 500px) {
            .mobile-chat-container {
              min-height: calc(40vh - 80px);
            }
            
            .chat-messages-container {
              padding-bottom: 160px !important;
            }
          }
        }

        /* MOBILE FULLSCREEN OPTIMIZATIONS */
        @media (max-width: 768px) {
          /* Fullscreen mobile specific styles */
          .z-\\[9999\\] {
            z-index: 9999 !important;
            position: fixed !important;
           top: 0 !important;
           left: 0 !important;
           right: 0 !important;
           bottom: 0 !important;
           width: 100vw !important;
           height: 100vh !important;
            height: 100dvh !important; /* Dynamic viewport height for mobile */
           overflow: hidden !important;
            display: flex !important;
            flex-direction: column !important;
          }

          /* Ensure fullscreen header is properly positioned */
          .z-\\[9999\\] .flex-shrink-0.top-0 {
            position: relative !important;
            top: auto !important;
           z-index: 9998 !important;
           background: black !important;
            border-bottom: 6px solid #ef4444 !important;
            flex-shrink: 0 !important;
          }

          /* Fullscreen chat container */
          .z-\\[9999\\] .flex-1.flex.flex-col.min-h-0 {
            flex: 1 !important;
            min-height: 0 !important;
            display: flex !important;
            flex-direction: column !important;
            overflow: hidden !important;
          }

          /* Fullscreen main content area */
          .z-\\[9999\\] .flex-1.min-h-0.overflow-hidden {
            flex: 1 !important;
            min-height: 0 !important;
            overflow: hidden !important;
            display: flex !important;
            flex-direction: column !important;
          }

          /* Fullscreen messages container */
          .z-\\[9999\\] .overflow-y-auto {
            flex: 1 !important;
            min-height: 0 !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
            -webkit-overflow-scrolling: touch !important;
            scrollbar-width: thin !important;
          }

          /* Fullscreen input area */
          .z-\\[9999\\] .flex-shrink-0 {
            flex-shrink: 0 !important;
            position: relative !important;
            bottom: auto !important;
            background: black !important;
            border-top: 6px solid black !important;
            z-index: 9997 !important;
          }

          /* Touch-friendly buttons in fullscreen */
          .z-\\[9999\\] button {
            min-height: 44px !important;
            min-width: 44px !important;
            touch-action: manipulation !important;
            -webkit-tap-highlight-color: transparent !important;
          }

          /* Fullscreen input field */
          .z-\\[9999\\] input {
            font-size: 16px !important; /* Prevents zoom on iOS */
            min-height: 48px !important;
            touch-action: manipulation !important;
          }

          /* Fullscreen scrollbar */
          .z-\\[9999\\] ::-webkit-scrollbar {
            width: 8px !important;
          }

          .z-\\[9999\\] ::-webkit-scrollbar-track {
            background: #f0f0f0 !important;
            border: 2px solid #000 !important;
          }

          .z-\\[9999\\] ::-webkit-scrollbar-thumb {
            background: #000 !important;
            border: 2px solid #fff !important;
          }

          /* Fullscreen safe areas */
          .z-\\[9999\\] .pb-safe-bottom {
            padding-bottom: env(safe-area-inset-bottom) !important;
          }

          .z-\\[9999\\] .pt-safe-top {
            padding-top: env(safe-area-inset-top) !important;
          }

          /* Fullscreen animations */
          .z-\\[9999\\] .transition-all {
            transition: all 0.2s ease-out !important;
          }

          /* Fullscreen hover effects - disable on mobile */
          @media (hover: none) {
            .z-\\[9999\\] .group-hover\\:scale-105 {
              transform: none !important;
            }
            
            .z-\\[9999\\] .group-hover\\:rotate-1 {
              transform: none !important;
            }
            
            .z-\\[9999\\] .hover\\:scale-105 {
              transform: none !important;
            }
          }

          /* Fullscreen active states for mobile */
          .z-\\[9999\\] button:active {
            transform: scale(0.95) !important;
            transition: transform 0.1s ease-out !important;
          }

          /* Fullscreen focus states */
          .z-\\[9999\\] *:focus {
            outline: 3px solid #ffff00 !important;
            outline-offset: 2px !important;
          }

          /* Fullscreen selection */
          .z-\\[9999\\] ::selection {
            background: #ffff00 !important;
            color: #000 !important;
          }

          /* Ensure proper flex layout in fullscreen */
          .z-\\[9999\\] .h-full.flex.flex-col {
            height: 100% !important;
            display: flex !important;
            flex-direction: column !important;
            overflow: hidden !important;
          }

          /* Fix for content being blocked by input */
          .z-\\[9999\\] .flex-1.min-h-0.overflow-y-auto {
            padding-bottom: 0 !important;
            margin-bottom: 0 !important;
          }
        }

        /* LANDSCAPE MOBILE FULLSCREEN */
        @media (max-width: 768px) and (orientation: landscape) {
          .z-\\[9999\\] {
            height: 100vh !important;
            height: 100dvh !important;
          }

          .z-\\[9999\\] .sticky.top-0 {
            padding: 0.5rem !important;
          }

          .z-\\[9999\\] .flex-shrink-0 {
            padding: 0.5rem !important;
          }

          .z-\\[9999\\] .overflow-y-auto {
            padding: 0.5rem !important;
          }
        }

        /* TABLET FULLSCREEN OPTIMIZATIONS */
        @media (min-width: 769px) and (max-width: 1024px) {
          .z-\\[9999\\] {
            height: 100vh !important;
            height: 100dvh !important;
          }

          .z-\\[9999\\] .sticky.top-0 {
            padding: 1rem !important;
          }

          .z-\\[9999\\] .flex-shrink-0 {
            padding: 1rem !important;
          }
        }

        /* DESKTOP FULLSCREEN OPTIMIZATIONS */
        @media (min-width: 1025px) {
          .z-\\[9999\\] {
            height: 100vh !important;
          }

          .z-\\[9999\\] .sticky.top-0 {
            padding: 1.5rem !important;
          }

          .z-\\[9999\\] .flex-shrink-0 {
            padding: 1.5rem !important;
          }
        }

        /* Enhanced scrollbar for all devices */
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(255, 107, 53, 0.5) rgba(255, 255, 255, 0.1);
          -webkit-overflow-scrolling: touch;
          scroll-behavior: smooth;
          overscroll-behavior: contain;
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

        /* iPhone specific scrolling improvements */
        @media (max-width: 414px) {
          .custom-scrollbar {
            -webkit-overflow-scrolling: touch;
            scrollbar-width: thin;
            overscroll-behavior: contain;
            touch-action: pan-y;
          }
          
          .custom-scrollbar::-webkit-scrollbar {
            width: 3px;
          }
          
          .custom-scrollbar::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.1);
          }
          
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(0, 0, 0, 0.3);
            border-radius: 2px;
          }

          /* Ensure mobile chat container is scrollable */
          .custom-scrollbar {
            height: 18rem; /* 288px = h-72 */
            min-height: 18rem;
            max-height: 18rem;
            overflow-y: scroll !important;
          }
        }
      `}</style>
    </div>
  );
};

export default memo(EnhancedAIAssistantPageComponent);