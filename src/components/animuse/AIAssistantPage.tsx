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
import { usePersistentChatHistory } from '../../../convex/usePersistentChatHistory.ts';
import { useMobileOptimizations } from '../../../convex/useMobileOptimizations.ts';

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

// BRUTALIST Mode Card Component
const BrutalistModeCard: React.FC<{
  mode: { id: string; label: string; desc: string; icon: string; gradient: string };
  isActive: boolean;
  onClick: () => void;
  className?: string;
}> = memo(({ mode, isActive, onClick, className }) => (
  <div className={`${className || ''}`}>
    <button
      onClick={onClick}
      className={`w-full p-4 border-4 font-mono text-left transition-colors ${
        isActive 
          ? 'bg-black text-white border-white' 
          : 'bg-white text-black border-black hover:bg-black hover:text-white hover:border-white'
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{mode.icon}</span>
        <div>
          <div className="font-bold text-sm uppercase">{mode.label}</div>
          <div className="text-xs opacity-80">{mode.desc}</div>
      </div>
        </div>
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
      {/* BRUTAL GEOMETRIC BACKGROUND */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Grid overlay */}
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
        
        {/* Floating geometric shapes */}
        <div className="absolute top-20 left-4 w-32 h-32 bg-black border-4 border-brand-primary-action transform rotate-45 opacity-20"></div>
        <div className="absolute top-40 right-8 w-24 h-24 bg-brand-accent-gold border-4 border-black opacity-30"></div>
        <div className="absolute bottom-32 left-8 w-40 h-20 bg-brand-primary-action border-4 border-black transform -rotate-12 opacity-25"></div>
        <div className="absolute bottom-20 right-4 w-28 h-28 bg-black border-4 border-white transform rotate-12 opacity-20"></div>
        <div className="absolute top-1/2 left-1/2 w-16 h-16 bg-brand-accent-peach border-4 border-black transform -rotate-45 opacity-25"></div>
        
        {/* Diagonal stripes */}
        <div className="absolute top-0 left-0 w-full h-2 bg-black transform -skew-y-12 opacity-30"></div>
        <div className="absolute bottom-0 right-0 w-full h-2 bg-brand-primary-action transform skew-y-12 opacity-30"></div>
        
        {/* Harsh corner elements */}
        <div className="absolute top-0 left-0 w-8 h-8 bg-brand-accent-gold border-r-4 border-b-4 border-black"></div>
        <div className="absolute top-0 right-0 w-8 h-8 bg-brand-accent-peach border-l-4 border-b-4 border-black"></div>
        <div className="absolute bottom-0 left-0 w-8 h-8 bg-brand-primary-action border-r-4 border-t-4 border-black"></div>
        <div className="absolute bottom-0 right-0 w-8 h-8 bg-black border-l-4 border-t-4 border-white"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col p-4">
        {/* BRUTAL HERO HEADER */}
        <div className="bg-black border-4 border-white shadow-brutal-lg p-6 mb-6">
          <div className="bg-brand-primary-action border-4 border-black p-4 mb-4">
            <h1 className="text-2xl md:text-4xl font-black text-black uppercase tracking-wider text-center">
              🤖 ANIMUSE AI ASSISTANT
            </h1>
          </div>
          
          <div className="bg-white border-4 border-black p-4">
            <p className="text-black font-bold text-center text-sm md:text-base uppercase">
              YOUR INTELLIGENT ANIME COMPANION FOR DISCOVERY
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
        <div className={`${isFullscreen ? 'fixed inset-0 z-[9999] bg-white p-2 sm:p-4' : `flex-1 ${isMobile ? 'px-0 pb-20' : 'px-0 pb-32'} ${hasNotch ? 'pt-safe-top' : ''}`}`}>
          <div className={`${isFullscreen ? 'h-full flex flex-col' : 'w-full mx-auto'}`}>
            <div className={`${isFullscreen ? 'flex-1 flex flex-col min-h-0' : 'relative'}`}>
              <div className={`bg-white border-4 border-black ${isFullscreen ? 'flex-1 flex flex-col min-h-0' : isMobile ? 'min-h-[400px]' : 'min-h-[500px]'} overflow-hidden`}>
                {/* Chat Header with controls */}
                <div className={`${isFullscreen ? 'sticky' : 'sticky'} top-0 bg-black text-white border-b-4 border-black ${isMobile ? 'p-2' : 'p-3'} flex justify-between items-center z-[9998] flex-shrink-0`}>
                  <div className="flex items-center">
                    {chatHistory.length > 0 && chatHistoryLoaded ? (
                      <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-mono uppercase font-bold`}>
                        {isMobile ? 'HISTORY' : 'CHAT HISTORY'}
                      </span>
                    ) : (
                      <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-mono uppercase font-bold`}>
                        {isMobile ? 'AI' : 'ANIMUSE AI'}
                      </span>
                    )}
                  </div>
                  
                  <div className={`flex items-center ${isMobile ? 'gap-1' : 'gap-2'}`}>
                    {/* Fullscreen toggle button */}
                    <button
                      onClick={() => setIsFullscreen(!isFullscreen)}
                      className={`${isFullscreen ? (isMobile ? 'px-3 py-2' : 'px-4 py-2') : (isMobile ? 'px-2 py-1' : 'p-2')} bg-white text-black border-2 border-white hover:bg-black hover:text-white font-mono ${isMobile ? 'text-xs' : 'text-xs'} touch-target transition-colors`}
                      title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                    >
                      {isFullscreen ? (isMobile ? "[EXIT]" : "[EXIT FULL]") : (isMobile ? "[F]" : "[FULL]")}
                    </button>
                    
                    {/* Clear chat button */}
                    {chatHistory.length > 0 && chatHistoryLoaded && (
                      <button
                        onClick={clearChatHistory}
                        className={`${isFullscreen ? (isMobile ? 'px-3 py-2' : 'px-4 py-2') : (isMobile ? 'px-2 py-1' : 'p-2')} bg-white text-black border-2 border-white hover:bg-black hover:text-white font-mono ${isMobile ? 'text-xs' : 'text-xs'} touch-target transition-colors`}
                      >
                        {isFullscreen ? (isMobile ? "[CLEAR]" : "[CLEAR CHAT]") : (isMobile ? "[C]" : "[CLEAR]")}
                      </button>
                    )}
                  </div>
                </div>

                {!chatHistoryLoaded && (
                  <div className="text-center py-8">
                    <BrutalistLoadingSpinner message="LOADING..." />
                  </div>
                )}

                {chatHistory.length === 0 &&
                  !isLoading &&
                  chatHistoryLoaded && (
                    <div className={`text-center ${isMobile ? 'py-4 px-2' : 'py-8 px-4'}`}>
                      <div className={`bg-black text-white ${isMobile ? 'p-3' : 'p-4'} border-4 border-black mb-4 font-mono`}>
                        <h3 className={`${isMobile ? 'text-sm' : 'text-lg'} font-bold mb-2 uppercase`}>
                          {isMobile ? 'AI READY' : 'ANIMUSE AI READY'}
                      </h3>
                        <p className={`${isMobile ? 'text-xs' : 'text-sm'}`}>
                          TYPE A PROMPT TO BEGIN
                      </p>
                      </div>
                      <div className={`grid ${isMobile ? 'grid-cols-1 gap-2' : 'grid-cols-1 sm:grid-cols-2 gap-3'} max-w-2xl mx-auto`}>
                        {getModeExamples()
                          .slice(0, isMobile ? 3 : 4)
                          .map((example, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleSubmit(example)}
                              className={`bg-white text-black border-2 border-black ${isMobile ? 'p-2' : 'p-3'} font-mono text-left hover:bg-black hover:text-white transition-colors ${isMobile ? 'text-xs' : 'text-sm'} touch-target`}
                            >
                              {isMobile && example.length > 40 ? `${example.substring(0, 40)}...` : example}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}

                <div
                  ref={chatContainerRef}
                  className={`${isFullscreen ? 'flex-1 min-h-0' : isMobile ? 'h-72' : 'h-96'} overflow-y-auto ${isMobile ? 'p-2 space-y-2' : 'p-6 space-y-4'} bg-white`}
                  style={{ 
                    scrollbarWidth: "thin",
                    WebkitOverflowScrolling: "touch"
                  }}
                >
                  {!chatHistoryLoaded && (
                    <div className="text-center py-8">
                      <BrutalistLoadingSpinner message="LOADING..." />
                    </div>
                  )}

                  {/* Chat Messages */}
                  {chatHistory.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`${isMobile ? 'max-w-[95%]' : 'max-w-[80%]'}`}
                      >
                        <div
                          className={`${isMobile ? 'p-2' : 'p-4'} border-4 font-mono ${
                            msg.type === "user"
                              ? `bg-black text-white border-black ${isMobile ? 'ml-4' : 'ml-8'}`
                              : msg.type === "error"
                                ? `bg-red-500 text-white border-red-500 ${isMobile ? 'mr-4' : 'mr-8'}`
                                : `bg-white text-black border-black ${isMobile ? 'mr-4' : 'mr-8'}`
                          }`}
                        >
                          {/* Message content */}
                          <div className={`whitespace-pre-wrap leading-relaxed ${isMobile ? 'text-xs' : 'text-sm'}`}>
                            {msg.content}
                          </div>

                          {/* Enhanced Content Display */}
                          {msg.type === "ai" &&
                            msg.recommendations &&
                            msg.recommendations.length > 0 && (
                              <div className={`${isMobile ? 'mt-2' : 'mt-4'} space-y-2 border-t-2 border-black ${isMobile ? 'pt-2' : 'pt-4'}`}>
                                {msg.recommendations.map((animeRec, idx) => (
                                  <div
                                    key={`${msg.id}-rec-${idx}`}
                                    className={`bg-white border-2 border-black ${isMobile ? 'p-2' : 'p-3'}`}
                                  >
                                    <div className={`flex flex-col ${isMobile ? 'gap-1' : 'gap-2'}`}>
                                      <h4 className={`font-mono font-bold ${isMobile ? 'text-xs' : 'text-sm'} uppercase`}>
                                        {isMobile && animeRec.title.length > 25 
                                          ? `${animeRec.title.substring(0, 25)}...` 
                                          : animeRec.title}
                                          </h4>
                                          {animeRec.year && (
                                        <p className={`${isMobile ? 'text-xs' : 'text-xs'} font-mono`}>
                                          YEAR: {animeRec.year}
                                            </p>
                                          )}
                                          {animeRec.description && (
                                            <ExpandableText
                                              text={animeRec.description}
                                          maxLength={isMobile ? 60 : 200}
                                          className={`${isMobile ? 'text-xs' : 'text-xs'} font-mono leading-relaxed`}
                                            />
                                          )}
                                          {animeRec.reasoning && (
                                            <ExpandableText
                                          text={`REASON: ${animeRec.reasoning}`}
                                          maxLength={isMobile ? 50 : 150}
                                          className={`${isMobile ? 'text-xs' : 'text-xs'} font-mono leading-relaxed`}
                                            />
                                          )}
                                          {animeRec.genres &&
                                            animeRec.genres.length > 0 && (
                                          <div className={`flex flex-wrap ${isMobile ? 'gap-1' : 'gap-1'}`}>
                                                {animeRec.genres
                                              .slice(0, isMobile ? 3 : 4)
                                                  .map((g: string) => (
                                                    <span
                                                      key={g}
                                                  className={`${isMobile ? 'text-xs' : 'text-xs'} bg-black text-white ${isMobile ? 'px-1 py-0.5' : 'px-2 py-1'} font-mono border border-black`}
                                                    >
                                                  {isMobile && g.length > 8 ? `${g.substring(0, 8)}...` : g}
                                                    </span>
                                                  ))}
                                              </div>
                                            )}
                                      <div className={`flex ${isMobile ? 'flex-col gap-1' : 'gap-2'} pt-2`}>
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
                                          className={`bg-black text-white ${isMobile ? 'px-2 py-1' : 'px-3 py-1'} text-xs font-mono border-2 border-black hover:bg-white hover:text-black disabled:opacity-50 touch-target`}
                                            >
                                          [ADD TO WATCHLIST]
                                        </button>
                                            {animeRec.trailerUrl && (
                                              <a
                                                href={animeRec.trailerUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                              >
                                            <button className={`bg-white text-black ${isMobile ? 'px-2 py-1 w-full' : 'px-3 py-1'} text-xs font-mono border-2 border-black hover:bg-black hover:text-white touch-target`}>
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

                          {/* What If Analysis Display - Add this after the Franchise Guide Display */}
{msg.type === "what_if" && msg.whatIfAnalysis && (
  <div className="mt-4 space-y-3">
    <div className="bg-black/60 backdrop-blur-sm rounded-xl p-4 border border-white/10">
      <h4 className="text-lg font-heading text-brand-primary-action mb-3 flex items-center gap-2">
        <span>🤔</span> What If Analysis
      </h4>

      {/* Scenario Display */}
      {msg.whatIfAnalysis.scenario && (
        <div className="bg-violet-500/10 p-3 rounded-lg mb-4 border-l-4 border-violet-500">
          <h5 className="font-semibold text-violet-300 text-sm mb-1">
            📝 Scenario
          </h5>
          <p className="text-white/90 text-sm leading-relaxed italic">
            "{msg.whatIfAnalysis.scenario}"
          </p>
        </div>
      )}

      <div className="space-y-3">
        {/* Immediate Impact */}
        {msg.whatIfAnalysis.immediateImpact && (
          <div className="bg-white/5 p-3 rounded-lg">
            <h6 className="font-semibold text-brand-accent-peach text-sm mb-2 flex items-center gap-1">
              ⚡ Immediate Impact
            </h6>
            <p className="text-white/85 text-sm leading-relaxed">
              {msg.whatIfAnalysis.immediateImpact}
            </p>
          </div>
        )}

        {/* Character Impact */}
        {msg.whatIfAnalysis.characterImpact && (
          <div className="bg-white/5 p-3 rounded-lg">
            <h6 className="font-semibold text-brand-accent-peach text-sm mb-2 flex items-center gap-1">
              👥 Character Development
            </h6>
            <p className="text-white/85 text-sm leading-relaxed">
              {msg.whatIfAnalysis.characterImpact}
            </p>
          </div>
        )}

        {/* Plot Changes */}
        {msg.whatIfAnalysis.plotChanges && (
          <div className="bg-white/5 p-3 rounded-lg">
            <h6 className="font-semibold text-brand-accent-peach text-sm mb-2 flex items-center gap-1">
              📖 Story Changes
            </h6>
            <p className="text-white/85 text-sm leading-relaxed">
              {msg.whatIfAnalysis.plotChanges}
            </p>
          </div>
        )}

        {/* World Impact */}
        {msg.whatIfAnalysis.worldImpact && (
          <div className="bg-white/5 p-3 rounded-lg">
            <h6 className="font-semibold text-brand-accent-peach text-sm mb-2 flex items-center gap-1">
              🌍 World Changes
            </h6>
            <p className="text-white/85 text-sm leading-relaxed">
              {msg.whatIfAnalysis.worldImpact}
            </p>
          </div>
        )}

        {/* Relationship Changes */}
        {msg.whatIfAnalysis.relationshipChanges && (
          <div className="bg-white/5 p-3 rounded-lg">
            <h6 className="font-semibold text-brand-accent-peach text-sm mb-2 flex items-center gap-1">
              💫 Relationship Dynamics
            </h6>
            <p className="text-white/85 text-sm leading-relaxed">
              {msg.whatIfAnalysis.relationshipChanges}
            </p>
          </div>
        )}

        {/* Thematic Shift */}
        {msg.whatIfAnalysis.thematicShift && (
          <div className="bg-white/5 p-3 rounded-lg">
            <h6 className="font-semibold text-brand-accent-peach text-sm mb-2 flex items-center gap-1">
              🎭 Thematic Impact
            </h6>
            <p className="text-white/85 text-sm leading-relaxed">
              {msg.whatIfAnalysis.thematicShift}
            </p>
          </div>
        )}

        {/* Ripple Effects */}
        {msg.whatIfAnalysis.rippleEffects && (
          <div className="bg-white/5 p-3 rounded-lg">
            <h6 className="font-semibold text-brand-accent-peach text-sm mb-2 flex items-center gap-1">
              🌊 Ripple Effects
            </h6>
            <p className="text-white/85 text-sm leading-relaxed">
              {msg.whatIfAnalysis.rippleEffects}
            </p>
          </div>
        )}

        {/* Alternative Outcomes */}
        {msg.whatIfAnalysis.alternativeOutcomes && (
          <div className="bg-white/5 p-3 rounded-lg">
            <h6 className="font-semibold text-brand-accent-peach text-sm mb-2 flex items-center gap-1">
              🔄 Alternative Outcomes
            </h6>
            <p className="text-white/85 text-sm leading-relaxed">
              {msg.whatIfAnalysis.alternativeOutcomes}
            </p>
          </div>
        )}

        {/* Overall Assessment */}
        {msg.whatIfAnalysis.overallAssessment && (
          <div className="bg-brand-primary-action/10 p-3 rounded-lg border border-brand-primary-action/30">
            <h6 className="font-semibold text-brand-primary-action text-sm mb-2 flex items-center gap-1">
              🎯 Overall Assessment
            </h6>
            <p className="text-white/90 text-sm leading-relaxed">
              {msg.whatIfAnalysis.overallAssessment}
            </p>
          </div>
        )}

        {/* Creative Possibilities */}
        {msg.whatIfAnalysis.creativePossibilities && (
          <div className="bg-violet-500/10 p-3 rounded-lg border border-violet-500/30">
            <h6 className="font-semibold text-violet-300 text-sm mb-2 flex items-center gap-1">
              ✨ Creative Possibilities
            </h6>
            <p className="text-white/90 text-sm leading-relaxed">
              {msg.whatIfAnalysis.creativePossibilities}
            </p>
          </div>
        )}
      </div>
    </div>
  </div>
)}
                          

                          {/* Feedback buttons */}
                          {(msg.type === "ai" ||
  msg.type === "analysis" ||
  msg.type === "guide" ||
                            msg.type === "what_if" ||
  msg.type === "error") && (
                            <div className={`${isMobile ? 'mt-2' : 'mt-3'} flex justify-end ${isMobile ? 'gap-1' : 'gap-2'} border-t-2 border-black ${isMobile ? 'pt-2' : 'pt-2'}`}>
                              <button
                                onClick={() => handleFeedback(msg.id, "up")}
                                className={`${isMobile ? 'px-2 py-1' : 'px-3 py-1'} text-xs font-mono border-2 transition-colors touch-target ${
                                  msg.feedback === "up"
                                    ? "bg-black text-white border-black"
                                    : "bg-white text-black border-black hover:bg-black hover:text-white"
                                }`}
                                disabled={!isAuthenticated || isLoading}
                              >
                                {isMobile ? "[+]" : "[GOOD]"}
                              </button>
                              <button
                                onClick={() => handleFeedback(msg.id, "down")}
                                className={`${isMobile ? 'px-2 py-1' : 'px-3 py-1'} text-xs font-mono border-2 transition-colors touch-target ${
                                  msg.feedback === "down"
                                    ? "bg-red-500 text-white border-red-500"
                                    : "bg-white text-black border-black hover:bg-red-500 hover:text-white hover:border-red-500"
                                }`}
                                disabled={!isAuthenticated || isLoading}
                              >
                                {isMobile ? "[-]" : "[BAD]"}
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
                      <div className={`bg-white text-black border-4 border-black ${isMobile ? 'p-2 mr-4' : 'p-4 mr-8'}`}>
                        <BrutalistLoadingSpinner size={isMobile ? "h-4 w-4" : "h-6 w-6"} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Input Area */}
                <div className={`${isFullscreen ? 'flex-shrink-0' : ''} border-t-4 border-black bg-black text-white ${isMobile ? 'p-2' : 'p-4'} ${hasNotch ? 'pb-safe-bottom' : isIOS ? 'pb-6' : 'pb-4'}`}>
                  <form
                    onSubmit={handleSubmit}
                    className={`flex ${isMobile ? 'flex-col gap-2' : 'gap-3 items-center'}`}
                  >
                    {aiMode === "compare" || aiMode === "hidden_gems" ? (
                      <div className="flex-1 relative">
                        <div className={`w-full bg-white text-black border-4 border-white ${isMobile ? 'px-3 py-2' : 'px-4 py-3'} text-center ${isMobile ? 'text-xs' : 'text-sm'} font-mono`}>
                          {isMobile ? "USE CONTROLS ABOVE" : "USE CONTROLS ABOVE AND HIT SEND"}
                        </div>
                        <button
                          type="submit"
                          className={`${isMobile ? 'absolute right-2 top-1/2 -translate-y-1/2' : 'absolute right-2 top-1/2 -translate-y-1/2'} bg-black text-white ${isMobile ? 'px-2 py-1' : 'px-3 py-1'} text-xs font-mono border-2 border-white hover:bg-white hover:text-black disabled:opacity-50 touch-target`}
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
                        <input
                          type="text"
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          placeholder={
                            aiMode === "franchise"
                              ? (isMobile ? "FRANCHISE" : "FRANCHISE NAME")
                              : (isMobile ? "MESSAGE" : "TYPE MESSAGE")
                          }
                          className={`${isMobile ? 'w-full' : 'flex-1'} bg-white text-black border-4 border-white ${isMobile ? 'px-3 py-2' : 'px-4 py-3'} font-mono ${isMobile ? 'text-sm' : 'text-sm'} placeholder-gray-500 focus:outline-none touch-target`}
                          disabled={
                            isLoading || authIsLoading || !isAuthenticated
                          }
                          style={{
                            fontSize: "16px",
                            minHeight: isMobile ? "44px" : "auto",
                          }}
                        />
                        <button
                          type="submit"
                          className={`bg-white text-black ${isMobile ? 'w-full px-3 py-2' : 'px-4 py-3'} ${isMobile ? 'text-sm' : 'text-sm'} font-mono border-4 border-white hover:bg-black hover:text-white hover:border-white disabled:opacity-50 touch-target`}
                          disabled={
                            isLoading ||
                            authIsLoading ||
                            !isAuthenticated ||
                            !prompt.trim()
                          }
                        >
                          {isLoading ? "PROCESSING..." : (isMobile ? "[SEND MESSAGE]" : "[SEND]")}
                        </button>
                      </>
                    )}
                  </form>

                  {!isAuthenticated && !authIsLoading && (
                    <p className={`${isMobile ? 'text-xs' : 'text-xs'} text-white mt-2 text-center font-mono`}>
                      {isMobile ? "LOGIN TO CHAT" : "LOG IN TO CHAT"}
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

                 /* Fullscreen chat optimizations */
         .z-\\[9999\\] {
           z-index: 9999 !important;
           position: fixed !important;
         }
         
         .z-\\[9998\\] {
           z-index: 9998 !important;
         }

         /* Ensure fullscreen mode covers everything */
         .fixed.inset-0 {
           top: 0 !important;
           left: 0 !important;
           right: 0 !important;
           bottom: 0 !important;
           width: 100vw !important;
           height: 100vh !important;
           overflow: hidden !important;
         }

         /* Fullscreen header positioning */
         .fixed.inset-0 .sticky.top-0 {
           position: sticky !important;
           top: 0 !important;
           z-index: 9998 !important;
           background: black !important;
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

                     /* Fullscreen mobile specific */
           .fixed.inset-0 {
             height: 100vh !important;
             height: 100dvh !important; /* Dynamic viewport height for mobile */
           }
           
           /* Ensure fullscreen header is visible on mobile */
           .fixed.inset-0 .sticky.top-0 {
             position: sticky !important;
             top: 0 !important;
             z-index: 9998 !important;
             background: black !important;
             border-bottom: 4px solid black !important;
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