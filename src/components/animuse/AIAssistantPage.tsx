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



        {/* ENHANCED FULLSCREEN CHAT INTERFACE */}
        <div className={`${isFullscreen ? 'fixed inset-0 z-[9999] bg-black text-white flex flex-col overflow-hidden' : `flex-1 ${isMobile ? 'px-0 pb-32 mb-4' : 'px-0 pb-32'} ${hasNotch ? 'pt-safe-top' : ''}`}`}
             style={isFullscreen ? {
               position: 'fixed',
               top: 0,
               left: 0,
               right: 0,
               bottom: 0,
               width: '100vw',
               height: '100vh',
               zIndex: 9999,
               background: '#000000',
               color: '#ffffff',
               overflow: 'hidden'
             } : undefined}>

          {isFullscreen ? (
            // MOBILE FULLSCREEN LAYOUT
            <>
              {/* MINIMALIST TOP BAR */}
              <div className="flex-shrink-0 bg-black border-b-4 border-red-500 px-4 py-3 flex items-center justify-between relative"
                   style={{
                     paddingTop: `max(0.75rem, env(safe-area-inset-top))`,
                     zIndex: 9998
                   }}>
                
                {/* LEFT: Status & Title */}
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="font-mono text-sm font-black uppercase tracking-wider">
                    {isMobile ? 'ANIMUSE' : 'ANIMUSE AI'}
                  </span>
                  {chatHistory.length > 0 && (
                    <span className="bg-white text-black px-2 py-1 text-xs font-mono font-black">
                      {chatHistory.length}
                    </span>
                  )}
                </div>

                {/* RIGHT: Action Buttons */}
                <div className="flex items-center gap-2">
                  {/* Clear Chat */}
                  {chatHistory.length > 0 && (
                    <button
                      onClick={clearChatHistory}
                      className="p-2 bg-red-600 text-white border-2 border-white font-mono text-xs font-black uppercase touch-target transition-all duration-200 active:scale-95"
                      style={{ minHeight: '40px', minWidth: '40px' }}
                    >
                      🗑
                    </button>
                  )}
                  
                  {/* Exit Fullscreen */}
                  <button
                    onClick={() => setIsFullscreen(false)}
                    className="px-4 py-2 bg-red-500 text-white border-2 border-white font-mono text-sm font-black uppercase touch-target transition-all duration-200 active:scale-95 flex items-center gap-2"
                    style={{ minHeight: '44px' }}
                  >
                    <span>✕</span>
                    <span>EXIT</span>
                  </button>
                </div>
              </div>

              {/* SWIPE GESTURE HELPER */}
              <div className="flex-shrink-0 bg-red-500 px-4 py-2 flex items-center justify-center border-b-2 border-white">
                <div className="flex items-center gap-2 text-white">
                  <span className="text-xs font-mono font-black uppercase">SWIPE DOWN TO EXIT</span>
                  <div className="flex flex-col gap-1">
                    <div className="w-4 h-0.5 bg-white animate-pulse"></div>
                    <div className="w-4 h-0.5 bg-white animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>

              {/* MAIN CHAT AREA */}
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                
                {/* MESSAGES CONTAINER */}
                <div
                  ref={chatContainerRef}
                  className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-black"
                  style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#ef4444 #1f1f1f',
                    WebkitOverflowScrolling: 'touch',
                    overscrollBehavior: 'contain'
                  }}
                  onTouchStart={(e) => {
                    const touch = e.touches[0];
                    const container = e.currentTarget;
                    if (container.scrollTop === 0 && touch) {
                      container.dataset.touchStartY = touch.clientY.toString();
                    }
                  }}
                  onTouchMove={(e) => {
                    const touch = e.touches[0];
                    const container = e.currentTarget;
                    const startY = container.dataset.touchStartY;
                    
                    if (startY && touch && container.scrollTop === 0) {
                      const deltaY = touch.clientY - parseInt(startY);
                      if (deltaY > 100) { // 100px swipe down threshold
                        setIsFullscreen(false);
                        delete container.dataset.touchStartY;
                      }
                    }
                  }}
                  onTouchEnd={(e) => {
                    const container = e.currentTarget;
                    delete container.dataset.touchStartY;
                  }}
                >
                  {!chatHistoryLoaded && (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="w-8 h-8 bg-white border-4 border-red-500 animate-pulse mx-auto mb-4"></div>
                        <p className="text-white font-mono font-bold uppercase text-sm">LOADING...</p>
                      </div>
                    </div>
                  )}

                  {chatHistory.length === 0 && !isLoading && chatHistoryLoaded && (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center max-w-sm">
                        <div className="bg-red-500 border-4 border-white p-6 mb-6 transform rotate-1">
                          <h3 className="text-white font-mono font-black text-lg uppercase mb-2">
                            AI READY
                          </h3>
                          <p className="text-white font-mono text-sm">
                            ASK FOR ANIME RECOMMENDATIONS
                          </p>
                        </div>
                        
                        {/* Quick Actions */}
                        <div className="grid grid-cols-2 gap-3">
                          {getModeExamples().slice(0, 4).map((example, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleSubmit(example)}
                              className="p-3 bg-white text-black border-4 border-red-500 font-mono text-xs font-black uppercase transform hover:scale-105 active:scale-95 transition-all duration-200 hover:bg-red-500 hover:text-white"
                              style={{ transform: `rotate(${idx * 2 - 3}deg)` }}
                            >
                              {example.substring(0, 25)}...
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* CHAT MESSAGES */}
                  {chatHistory.map((msg, index) => (
                    <div key={msg.id} className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"} chat-message`}>
                      <div className={`max-w-[85%] ${msg.type === "user" ? "ml-8" : "mr-8"}`}>
                        
                        {/* MESSAGE BUBBLE */}
                        <div className={`border-4 font-mono relative ${
                          msg.type === "user"
                            ? "bg-yellow-400 text-black border-white transform rotate-1"
                            : msg.type === "error"
                            ? "bg-red-500 text-white border-red-500 transform -rotate-1"
                            : "bg-white text-black border-red-500 transform -rotate-0.5"
                        }`}>
                          
                          {/* MESSAGE HEADER */}
                          <div className={`px-3 py-2 border-b-2 flex justify-between items-center ${
                            msg.type === "user" ? "border-black" : "border-gray-300"
                          }`}>
                            <span className="text-xs font-black uppercase">
                              {msg.type === "user" ? "YOU" : msg.type === "error" ? "ERROR" : "AI"}
                            </span>
                            <span className="text-xs font-mono opacity-70">
                              {new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          {/* MESSAGE CONTENT */}
                          <div className="p-4">
                            <p className="text-sm leading-relaxed">{msg.content}</p>

                            {/* RECOMMENDATIONS */}
                            {msg.type === "ai" && msg.recommendations && msg.recommendations.length > 0 && (
                              <div className="mt-4 space-y-3">
                                <div className="bg-red-500 text-white border-3 border-black p-2 text-center transform -rotate-1">
                                  <span className="font-black text-xs uppercase">RECOMMENDATIONS</span>
                                </div>
                                
                                {msg.recommendations.map((anime, idx) => (
                                  <div key={idx} className="bg-gray-100 border-3 border-black p-3 transform hover:scale-102 transition-transform duration-200">
                                    
                                    {/* ANIME HEADER */}
                                    <div className="bg-black text-white p-2 mb-3 flex justify-between items-center">
                                      <span className="font-black text-xs uppercase">ANIME {idx + 1}</span>
                                      <span className="bg-yellow-400 text-black px-2 py-1 text-xs font-black">
                                        {Math.floor(Math.random() * 20 + 80)}% MATCH
                                      </span>
                                    </div>

                                    {/* ANIME CONTENT */}
                                    <h4 className="font-black text-sm uppercase mb-2 leading-tight">
                                      {anime.title}
                                    </h4>
                                    
                                    {anime.year && (
                                      <p className="text-xs font-mono bg-gray-200 border-2 border-black px-2 py-1 inline-block mb-2">
                                        {anime.year}
                                      </p>
                                    )}
                                    
                                    {anime.description && (
                                      <ExpandableText
                                        text={anime.description}
                                        maxLength={100}
                                        className="text-xs mb-3 leading-relaxed"
                                      />
                                    )}

                                    {/* GENRES */}
                                    {anime.genres && anime.genres.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mb-3">
                                        {anime.genres.slice(0, 3).map((genre: string) => (
                                          <span key={genre} className="bg-black text-white px-2 py-1 text-xs font-black uppercase">
                                            {genre}
                                          </span>
                                        ))}
                                      </div>
                                    )}

                                    {/* ACTIONS */}
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => handleAiRecommendationAddToWatchlist(anime, "Plan to Watch")}
                                        disabled={!isAuthenticated || isLoading}
                                        className="bg-black text-white px-3 py-2 text-xs font-black uppercase border-2 border-white hover:bg-white hover:text-black transition-colors duration-200 touch-target flex-1"
                                      >
                                        ADD TO LIST
                                      </button>
                                      {anime.trailerUrl && (
                                        <a href={anime.trailerUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                                          <button className="w-full bg-red-500 text-white px-3 py-2 text-xs font-black uppercase border-2 border-white hover:bg-white hover:text-red-500 transition-colors duration-200">
                                            TRAILER
                                          </button>
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* FEEDBACK BUTTONS */}
                            {msg.type === "ai" && (
                              <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-gray-300">
                                <button
                                  onClick={() => handleFeedback(msg.id, "up")}
                                  className={`px-3 py-1 text-xs font-mono border-2 border-black transition-all duration-200 ${
                                    msg.feedback === "up" ? "bg-green-500 text-white" : "bg-white text-black hover:bg-green-100"
                                  }`}
                                >
                                  👍
                                </button>
                                <button
                                  onClick={() => handleFeedback(msg.id, "down")}
                                  className={`px-3 py-1 text-xs font-mono border-2 border-black transition-all duration-200 ${
                                    msg.feedback === "down" ? "bg-red-500 text-white" : "bg-white text-black hover:bg-red-100"
                                  }`}
                                >
                                  👎
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* LOADING INDICATOR */}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white text-black border-4 border-red-500 p-4 mr-8 max-w-[85%]">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 bg-red-500 border-2 border-white animate-pulse"></div>
                          <span className="font-mono font-bold uppercase text-sm">AI THINKING...</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* ENHANCED INPUT AREA */}
                <div className="flex-shrink-0 bg-black border-t-4 border-red-500 p-4"
                     style={{ paddingBottom: `max(1rem, env(safe-area-inset-bottom))` }}>
                  
                  {/* MODE SELECTOR */}
                  <div className="mb-3">
                    <div className="flex overflow-x-auto gap-2 pb-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                      {modeConfigs.slice(0, 6).map((mode) => (
                        <button
                          key={mode.id}
                          onClick={() => setAiMode(mode.id as AIMode)}
                          className={`flex-shrink-0 px-3 py-2 border-2 font-mono text-xs font-black uppercase transition-all duration-200 ${
                            aiMode === mode.id
                              ? "bg-red-500 text-white border-white"
                              : "bg-white text-black border-red-500 hover:bg-red-100"
                          }`}
                        >
                          {mode.icon} {mode.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* INPUT FORM */}
                  <form onSubmit={handleSubmit} className="space-y-3">
                    
                    {/* MODE-SPECIFIC CONTROLS */}
                    {aiMode === "compare" && (
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="FIRST ANIME"
                          value={animeA}
                          onChange={(e) => setAnimeA(e.target.value)}
                          className="bg-white text-black border-3 border-red-500 p-3 font-mono text-sm font-bold placeholder-gray-500 focus:outline-none focus:border-yellow-400"
                          style={{ fontSize: '16px' }}
                        />
                        <input
                          type="text"
                          placeholder="SECOND ANIME"
                          value={animeB}
                          onChange={(e) => setAnimeB(e.target.value)}
                          className="bg-white text-black border-3 border-red-500 p-3 font-mono text-sm font-bold placeholder-gray-500 focus:outline-none focus:border-yellow-400"
                          style={{ fontSize: '16px' }}
                        />
                      </div>
                    )}

                    {aiMode === "hidden_gems" && (
                      <div className="bg-red-500 border-3 border-white p-3">
                        <div className="flex gap-2 mb-2">
                          {(["mild", "moderate", "wild"] as const).map((level) => (
                            <button
                              key={level}
                              type="button"
                              onClick={() => setSurpriseLevel(level)}
                              className={`px-3 py-2 border-2 text-xs font-black uppercase transition-all duration-200 ${
                                surpriseLevel === level
                                  ? "bg-white text-black border-black"
                                  : "bg-black text-white border-white hover:bg-gray-800"
                              }`}
                            >
                              {level}
                            </button>
                          ))}
                        </div>
                        <label className="flex items-center gap-2 text-white font-mono text-xs">
                          <input
                            type="checkbox"
                            checked={avoidPopular}
                            onChange={(e) => setAvoidPopular(e.target.checked)}
                            className="w-4 h-4"
                          />
                          AVOID MAINSTREAM
                        </label>
                      </div>
                    )}

                    {/* MAIN INPUT */}
                    {aiMode !== "compare" && aiMode !== "hidden_gems" && (
                      <div className="relative">
                        <input
                          type="text"
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          placeholder={
                            aiMode === "franchise"
                              ? "ENTER FRANCHISE NAME..."
                              : "DESCRIBE WHAT YOU'RE LOOKING FOR..."
                          }
                          className="w-full bg-white text-black border-3 border-red-500 p-4 font-mono text-base font-bold placeholder-gray-500 focus:outline-none focus:border-yellow-400 pr-20"
                          disabled={isLoading || !isAuthenticated}
                          style={{ fontSize: '16px', minHeight: '56px' }}
                        />
                        
                        {/* CHARACTER COUNT */}
                        <div className="absolute bottom-1 right-16 text-xs font-mono text-gray-500">
                          {prompt.length}/500
                        </div>
                      </div>
                    )}

                    {/* SEND BUTTON */}
                    <button
                      type="submit"
                      disabled={
                        isLoading ||
                        !isAuthenticated ||
                        (aiMode === "compare" ? (!animeA.trim() || !animeB.trim()) : (!prompt.trim() && aiMode !== "hidden_gems"))
                      }
                      className="w-full bg-red-500 text-white border-3 border-white p-4 font-mono text-lg font-black uppercase transition-all duration-200 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                      style={{ minHeight: '56px' }}
                    >
                      {isLoading ? (
                        <>
                          <div className="w-6 h-6 bg-white border-2 border-red-500 animate-pulse"></div>
                          <span>PROCESSING...</span>
                        </>
                      ) : (
                        <>
                          <span>SEND</span>
                          <span className="text-2xl">→</span>
                        </>
                      )}
                    </button>

                    {/* AUTH NOTICE */}
                    {!isAuthenticated && (
                      <div className="bg-red-600 text-white border-2 border-white p-3 text-center">
                        <p className="font-mono font-bold uppercase text-sm">
                          LOG IN TO CHAT WITH AI
                        </p>
                      </div>
                    )}
                  </form>
                </div>
              </div>

              {/* FLOATING EXIT BUTTON - Mobile Alternative */}
              {isMobile && (
                <button
                  onClick={() => setIsFullscreen(false)}
                  className="fixed bottom-6 right-6 w-14 h-14 bg-red-500 text-white border-4 border-white rounded-full flex items-center justify-center font-mono text-lg font-black uppercase shadow-brutal-lg z-[9999] touch-target transition-all duration-200 active:scale-95 hover:bg-red-600"
                  style={{ 
                    minHeight: '56px', 
                    minWidth: '56px',
                    marginBottom: 'max(1.5rem, env(safe-area-inset-bottom))'
                  }}
                  title="Exit Fullscreen"
                >
                  ✕
                </button>
              )}
            </>
          ) : (
            // REGULAR NON-FULLSCREEN LAYOUT (unchanged)
            <div className={`w-full mx-auto`}>
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
                                  onClick={() => handleSubmit(example)}
                                  className={`relative overflow-hidden prompt-button ${isMobile ? (isFullscreen ? 'p-3' : 'p-2') : 'p-3'} font-mono text-left transition-all duration-500 touch-target group`}
                                  style={{
                                    transform: `rotate(${idx * 1.5 - 2.25}deg)`,
                                  }}
                                >
                                  {/* Dynamic background based on mode */}
                                  <div className={`absolute inset-0 bg-gradient-to-br ${
                                    modeConfigs.find(m => m.id === aiMode)?.gradient || "from-gray-400/50 to-gray-600/50"
                                  } opacity-60 transition-opacity duration-300 group-hover:opacity-80`}></div>
                                  
                                  {/* Border frame */}
                                  <div className="absolute inset-0 border-4 border-black group-hover:border-white transition-colors duration-300"></div>

                                  {/* Content */}
                                  <div className="relative z-10 bg-white border-2 border-black p-3 group-hover:bg-black group-hover:text-white transition-all duration-300">
                                    <p className={`${isMobile ? (isFullscreen ? 'text-xs' : 'text-xs') : 'text-sm'} font-bold leading-tight text-black group-hover:text-white`}>
                                      {example.length > (isMobile ? (isFullscreen ? 60 : 45) : 65) 
                                        ? `${example.substring(0, isMobile ? (isFullscreen ? 60 : 45) : 65)}...` 
                                        : example}
                                    </p>
                                  </div>

                                  {/* Corner accents */}
                                  <div className="absolute -top-1 -left-1 w-3 h-3 bg-brand-primary-action border border-white group-hover:bg-brand-accent-gold transition-colors duration-300"></div>
                                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-brand-accent-peach border border-white group-hover:bg-brand-primary-action transition-colors duration-300"></div>
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

                    {/* Chat messages will be rendered here */}
                      {chatHistory.map((msg, index) => (
                        // Chat message rendering component calls go here - keeping existing implementation
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
          )}
        </div>

        {/* SWIPE GESTURE HELPER */}
        {isFullscreen && isMobile && (
          <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-[9997] pointer-events-none">
            <div className="bg-red-500 text-white border-2 border-white px-3 py-1 font-mono text-xs opacity-75 animate-pulse">
              SWIPE UP FROM BOTTOM TO ACCESS MORE OPTIONS
            </div>
          </div>
        )}
      </div>

      {/* Enhanced mobile fullscreen styles */}
      <style jsx>{`
        .active\\:scale-98:active {
          transform: scale(0.98);
        }
        
        .touch-target {
          min-height: 44px;
          min-width: 44px;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }

        .hover\\:scale-102:hover {
          transform: scale(1.02);
        }

        .chat-message {
          animation: messageSlideIn 0.3s ease-out;
        }

        .mobile-touch-target {
          min-height: 48px;
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
        }

        .mobile-chat-container {
          max-height: calc(100vh - 400px);
          min-height: 300px;
        }

        .chat-messages-container {
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
        }

        .sticky-input-area {
          position: sticky;
          bottom: 0;
          z-index: 50;
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 4px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 4px;
          border: 1px solid #000;
        }

        input, textarea {
          font-size: 16px !important;
          -webkit-text-size-adjust: 100%;
        }

        @media (prefers-reduced-motion: reduce) {
          .transition-all,
          .animate-pulse,
          .animate-spin {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default memo(EnhancedAIAssistantPageComponent);