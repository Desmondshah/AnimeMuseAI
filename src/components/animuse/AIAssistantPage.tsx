// src/components/animuse/AIAssistantPage.tsx
import React, { useState, FormEvent, useRef, useEffect, useCallback } from "react";
import { useAction, useQuery, useConvexAuth } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import StyledButton from "./shared/StyledButton";
import { toast } from "sonner";
import { AnimeRecommendation } from "../../../convex/types";
import AnimeCard from "./AnimeCard";

// Type definitions
type RecommendationResult = { recommendations: AnimeRecommendation[]; error?: string; };
type AnalysisResult = { analysis: any; error?: string; };
type GuideResult = { guide: any; error?: string; };
type AIActionResult = RecommendationResult | AnalysisResult | GuideResult;

interface ChatMessage {
  id: string; type: "user" | "ai" | "error" | "analysis" | "guide"; content: string;
  recommendations?: AnimeRecommendation[]; analysis?: any; guide?: any;
  feedback?: "up" | "down" | null; rawAiResponse?: any[]; rawAiText?: string; actionType?: string;
}
type AIMode = "general" | "character" | "trope" | "art_style" | "compare" | "hidden_gems" | "franchise";

// Simplified Loading Spinner for this page
const LocalSpinner: React.FC<{ size?: string; colorClass?: string }> = ({ size = "h-5 w-5", colorClass = "border-brand-primary-action" }) => (
    <div className={`animate-spin rounded-full ${size} border-b-2 ${colorClass}`}></div>
);

// Props for AIAssistantPage, including navigateToDetail
interface EnhancedAIAssistantPageProps {
  navigateToDetail: (animeId: Id<"anime">) => void;
}

export default function EnhancedAIAssistantPage({ navigateToDetail }: EnhancedAIAssistantPageProps) {
  const [prompt, setPrompt] = useState("");
  const [aiMode, setAiMode] = useState<AIMode>("general");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [animeA, setAnimeA] = useState("");
  const [animeB, setAnimeB] = useState("");
  const [surpriseLevel, setSurpriseLevel] = useState<"mild" | "moderate" | "wild">("moderate");
  const [avoidPopular, setAvoidPopular] = useState(false);

  const getAnimeRecommendationAction = useAction(api.ai.getAnimeRecommendation);
  const getCharacterBasedRecommendationsAction = useAction(api.ai.getCharacterBasedRecommendations);
  const getTropeBasedRecommendationsAction = useAction(api.ai.getTropeBasedRecommendations);
  const getArtStyleRecommendationsAction = useAction(api.ai.getArtStyleRecommendations);
  const getComparativeAnalysisAction = useAction(api.ai.getComparativeAnalysis);
  const getHiddenGemRecommendationsAction = useAction(api.ai.getHiddenGemRecommendations);
  const getFranchiseGuideAction = useAction(api.ai.getFranchiseGuide);

  const userProfileQuery = useQuery(api.users.getMyUserProfile);
  const { isAuthenticated, isLoading: authIsLoading } = useConvexAuth();
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatContainerRef.current?.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' });
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
        default: // general
          return await getAnimeRecommendationAction({ prompt: currentPrompt, userProfile: profileDataForAI, messageId: aiMessageId });
      }
  }, [aiMode, userProfileQuery, animeA, animeB, surpriseLevel, avoidPopular, getCharacterBasedRecommendationsAction, getTropeBasedRecommendationsAction, getArtStyleRecommendationsAction, getComparativeAnalysisAction, getHiddenGemRecommendationsAction, getFranchiseGuideAction, getAnimeRecommendationAction]);


  const handleSubmit = useCallback(async (e: FormEvent | string) => {
    if (e instanceof Object && typeof e.preventDefault === 'function') e.preventDefault();

    const currentPromptText = typeof e === 'string' ? e :
      (aiMode === "compare" ? `Compare ${animeA} vs ${animeB}` : prompt);

    if (!currentPromptText.trim() && aiMode !== "hidden_gems") return;
    if (aiMode === "compare" && (!animeA.trim() || !animeB.trim())) {
      toast.error("Please enter both anime titles for comparison.");
      return;
    }

    const userMessageId = generateMessageId();
    const newUserMessage: ChatMessage = {
      id: userMessageId, type: "user", content: currentPromptText, actionType: aiMode
    };
    setChatHistory((prev) => [...prev, newUserMessage]);
    setIsLoading(true);
    setPrompt("");

    const aiMessageId = generateMessageId();

    try {
      const result = await executeAIAction(currentPromptText, aiMessageId);
      let aiResponseMessage: ChatMessage;

      if (result.error) {
        aiResponseMessage = { id: aiMessageId, type: "error", content: `Error: ${result.error.substring(0,150)}`, rawAiText: result.error, feedback: null, actionType: aiMode };
        toast.error("AniMuse had trouble with that request.");
      } else if ('analysis' in result && result.analysis) {
        aiResponseMessage = { id: aiMessageId, type: "analysis", content: "Here's the comparative analysis:", analysis: result.analysis, feedback: null, actionType: aiMode };
        toast.success("Analysis complete!");
      } else if ('guide' in result && result.guide) {
        aiResponseMessage = { id: aiMessageId, type: "guide", content: `Your guide to ${result.guide.franchiseName || 'the franchise'}:`, guide: result.guide, feedback: null, actionType: aiMode };
        toast.success("Franchise guide ready!");
      } else if ('recommendations' in result && result.recommendations && result.recommendations.length > 0) {
        const modeLabels: Record<AIMode, string> = { general: "recommendations", character: "character picks", trope: "plot/trope ideas", art_style: "visual suggestions", compare: "comparisons", hidden_gems: "hidden gems", franchise: "franchise guides" };
        aiResponseMessage = { id: aiMessageId, type: "ai", content: `Here are some ${modeLabels[aiMode] || "recommendations"}:`, recommendations: result.recommendations, rawAiResponse: result.recommendations, feedback: null, actionType: aiMode };
        toast.success(`Found some ${modeLabels[aiMode] || "ideas"}!`);
      } else {
        const noRecContent = "I couldn't find specific matches. Try adjusting your criteria or switching modes!";
        aiResponseMessage = { id: aiMessageId, type: "ai", content: noRecContent, rawAiText: noRecContent, feedback: null, actionType: aiMode };
        toast.info("No matches found - try a different approach!");
      }
      setChatHistory((prev) => [...prev, aiResponseMessage]);
    } catch (error: any) {
      console.error("Failed to get AI response:", error);
      const errorContent = error.message || "Something went wrong on my end.";
      const errorResponseMessage: ChatMessage = { id: aiMessageId, type: "error", content: errorContent.substring(0,150), rawAiText: errorContent, feedback: null, actionType: aiMode };
      setChatHistory((prev) => [...prev, errorResponseMessage]);
      toast.error("An error occurred processing your request.");
    } finally {
      setIsLoading(false);
    }
  }, [prompt, aiMode, animeA, animeB, executeAIAction]);

  const getModeExamples = useCallback((): string[] => {
    switch (aiMode) {
      case "character": return ["Characters like L from Death Note", "Strong female protagonists", "Anti-heroes with complex morals"];
      case "trope": return ["Time loop stories done right", "Found family but make it heartbreaking", "Tournament arcs that serve plot"];
      case "art_style": return ["Retro 90s aesthetic like Cowboy Bebop", "Studio Ghibli-esque art", "Dark, gritty animation"];
      case "hidden_gems": return ["Surprise me!", "Hidden gems from the 2000s", "Weird but wonderful anime"];
      case "franchise": return ["How do I watch Fate series?", "Monogatari series order", "Gundam guide"];
      default: return ["Suggest something to watch", "Similar to Your Name?", "Anime that'll make me cry"];
    }
  }, [aiMode]);

  const renderModeSelector = () => (
    <div className="mb-3 p-3 bg-brand-background/10 rounded-lg">
      <h3 className="text-xs font-heading text-brand-accent-gold mb-1.5">AI Mode:</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2">
        {[
          { id: "general", label: "🎯 General" }, { id: "character", label: "👤 Character" },
          { id: "trope", label: "📖 Plot/Trope" }, { id: "art_style", label: "🎨 Art Style" },
          { id: "compare", label: "⚖️ Compare" }, { id: "hidden_gems", label: "💎 Hidden Gems" },
          { id: "franchise", label: "📚 Franchise" },
        ].map((mode) => (
          <StyledButton
            key={mode.id}
            onClick={() => { setAiMode(mode.id as AIMode); setPrompt(""); setAnimeA(""); setAnimeB("");}}
            variant={aiMode === mode.id ? "primary_small" : "secondary_small"}
            selected={aiMode === mode.id}
            className={`w-full !text-[10px] sm:!text-xs !py-1.5 !px-1 sm:!px-2 ${aiMode !== mode.id ? '!border-brand-accent-peach/50 !text-brand-text-primary/80 hover:!bg-brand-accent-peach/20' : ''}`}
          >
            {mode.label}
          </StyledButton>
        ))}
      </div>
    </div>
  );

  const renderModeSpecificInputs = () => {
    const inputClasses = "form-input !bg-brand-surface !border-brand-accent-peach/70 !text-brand-text-primary !placeholder-brand-text-primary/50 text-sm py-2 focus:!border-brand-primary-action focus:!ring-brand-primary-action";
    switch (aiMode) {
      case "compare": return (
        <div className="mb-3 p-3 bg-brand-accent-peach/10 rounded-lg space-y-2">
          <input type="text" placeholder="First anime title" value={animeA} onChange={(e) => setAnimeA(e.target.value)} className={inputClasses}/>
          <input type="text" placeholder="Second anime title" value={animeB} onChange={(e) => setAnimeB(e.target.value)} className={inputClasses}/>
        </div>
      );
      case "hidden_gems": return (
        <div className="mb-3 p-3 bg-brand-accent-peach/10 rounded-lg space-y-3">
          <div>
            <label className="text-xs font-medium text-brand-text-primary/80 mb-1 block">Surprise Level:</label>
            <div className="flex gap-2">
              {(["mild", "moderate", "wild"] as const).map(level => (
                <StyledButton key={level} onClick={() => setSurpriseLevel(level)} selected={surpriseLevel === level} variant={surpriseLevel === level ? "primary_small" : "secondary_small"} className={`flex-1 !text-xs !py-1.5 ${surpriseLevel !== level ? '!border-brand-accent-peach/50 !text-brand-text-primary/80 hover:!bg-brand-accent-peach/20' : ''}`}>{level.charAt(0).toUpperCase() + level.slice(1)}</StyledButton>
              ))}
            </div>
          </div>
          <label className="flex items-center text-xs sm:text-sm cursor-pointer text-brand-text-primary/90">
            <input type="checkbox" checked={avoidPopular} onChange={(e) => setAvoidPopular(e.target.checked)} className="mr-2 accent-brand-primary-action h-3.5 w-3.5 rounded border-brand-accent-peach focus:ring-brand-primary-action focus:ring-offset-brand-surface"/>
            Avoid popular / mainstream anime
          </label>
        </div>
      );
      default: return null;
    }
  };

  const renderAnalysisResult = (analysis: any) => (
    <div className="mt-2 space-y-1.5 text-xs leading-normal">
      {(Object.keys(analysis) as Array<keyof typeof analysis>).map(key_ => {
        const key = String(key_); // Ensure key is a string for React key and .replace
        return analysis[key] && typeof analysis[key] === 'string' && (
          <div key={key} className="p-1.5 bg-brand-accent-peach/20 rounded">
            <h4 className="font-heading text-brand-accent-gold font-semibold capitalize text-[11px] mb-0.5">{key.replace(/([A-Z]|\d+)/g, ' $1').trim()}:</h4>
            <p className="text-brand-text-primary/90 whitespace-pre-wrap">{analysis[key]}</p>
          </div>
        );
      })}
      {analysis.recommendations && Array.isArray(analysis.recommendations) && analysis.recommendations.length > 0 && (
        <div className="p-1.5 bg-brand-accent-peach/20 rounded">
           <h4 className="font-heading text-brand-accent-gold font-semibold text-[11px] mb-0.5">Consider Also:</h4>
           <ul className="list-disc list-inside space-y-0.5 text-brand-text-primary/90 pl-1">
            {analysis.recommendations.map((rec: string, idx: number) => <li key={idx} className="text-[11px]">{rec}</li>)}
           </ul>
        </div>
      )}
    </div>
  );

  const renderFranchiseGuide = (guide: any) => (
    <div className="mt-2 space-y-1.5 text-xs leading-normal">
      {guide.overview && <div className="p-1.5 bg-brand-accent-peach/20 rounded"><h4 className="font-heading text-brand-accent-gold font-semibold text-[11px] mb-0.5">Overview:</h4><p>{guide.overview}</p></div>}
      {guide.complexity && <p className="text-[10px] px-1.5 py-0.5 rounded-full inline-block bg-brand-accent-gold text-brand-surface font-medium my-1">Complexity: {guide.complexity}</p>}
      {guide.recommendedOrder && guide.recommendedOrder.length > 0 && (
        <div>
          <h4 className="font-heading text-brand-accent-gold font-semibold my-1 text-[11px]">Recommended Order:</h4>
          {guide.recommendedOrder.map((item: any, idx: number) => (
            <div key={idx} className="p-1 my-0.5 bg-brand-accent-peach/10 rounded">
              <p className="font-semibold text-brand-primary-action/90 text-[11px]">{idx + 1}. {item.title} <span className="text-[10px] opacity-70">({item.type}, {item.year})</span></p>
              <p className="text-[10px] opacity-80">{item.description}</p>
              <p className="text-[9px] opacity-70 mt-0.5">Importance: {item.importance} | Access: {item.accessibilityRating}/5</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-brand-surface text-brand-text-primary rounded-xl shadow-xl p-3 sm:p-4 flex flex-col h-[calc(100vh-110px)] sm:h-[calc(100vh-120px)] md:h-[calc(100vh-130px)] max-h-[650px] sm:max-h-[700px] w-full max-w-lg mx-auto">
      <h2 className="text-lg sm:text-xl font-heading text-brand-primary-action mb-2.5 text-center">
        AniMuse AI Assistant
      </h2>

      {renderModeSelector()}
      {renderModeSpecificInputs()}

      {chatHistory.length === 0 && !isLoading && (
        <div className="mb-2.5 p-2.5 bg-brand-accent-peach/10 rounded-lg overflow-y-auto flex-grow custom-scrollbar">
          <h3 className="text-xs sm:text-sm font-heading text-brand-accent-gold mb-1.5">Try {aiMode} prompts...</h3>
          <div className="space-y-1.5">
            {getModeExamples().slice(0,3).map((example, idx) => (
              <button
                key={idx} onClick={() => handleSubmit(example)}
                className="block w-full text-left p-1.5 sm:p-2 bg-brand-surface hover:bg-brand-accent-peach/30 transition-colors rounded text-[11px] sm:text-xs text-brand-text-primary/90 shadow-sm"
              >
                "{example}"
              </button>
            ))}
          </div>
        </div>
      )}

      <div ref={chatContainerRef} className="flex-grow overflow-y-auto mb-2.5 space-y-2.5 p-1.5 sm:p-2 bg-brand-background/5 rounded-lg min-h-[150px] sm:min-h-[200px] custom-scrollbar">
        {chatHistory.map((msg) => (
          <div key={msg.id} className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] sm:max-w-[80%] p-2 sm:p-2.5 rounded-lg shadow-sm text-xs sm:text-sm ${
              msg.type === "user" ? "bg-brand-primary-action text-brand-surface rounded-br-none" :
              msg.type === "error" ? "bg-red-500/10 text-red-700 border border-red-500/20 rounded-bl-none" : // Adjusted error color
              "bg-brand-surface text-brand-text-primary border border-brand-accent-peach/30 rounded-bl-none"
            }`}>
              <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              {msg.type === "analysis" && msg.analysis && renderAnalysisResult(msg.analysis)}
              {msg.type === "guide" && msg.guide && renderFranchiseGuide(msg.guide)}
              {msg.type === "ai" && msg.recommendations && msg.recommendations.length > 0 && (
                <div className="mt-1.5 space-y-1.5">
                  {msg.recommendations.map((animeRec, idx) => (
                    <AnimeCard key={`${msg.id}-rec-${idx}`} anime={animeRec} variant="compact" onViewDetails={(id) => navigateToDetail(id as Id<"anime">)} />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-xs p-2 rounded-lg bg-brand-surface text-brand-text-primary shadow-sm border border-brand-accent-peach/30">
              <div className="flex items-center space-x-1.5">
                <LocalSpinner size="h-3.5 w-3.5" />
                <span className="text-xs">AniMuse is thinking...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-1.5 sm:gap-2 items-center mt-auto pt-2 border-t border-brand-accent-peach/30">
        {aiMode !== "compare" && aiMode !== "hidden_gems" && (
          <input
            type="text" value={prompt} onChange={(e) => setPrompt(e.target.value)}
            placeholder={ aiMode === "franchise" ? "Franchise name..." : "Ask AniMuse..." }
            className="form-input flex-grow !text-xs sm:!text-sm !py-2 !px-2.5"
            disabled={isLoading || authIsLoading || !isAuthenticated}
          />
        )}
         {(aiMode === "compare" || aiMode === "hidden_gems") && ( <div className="flex-grow text-xs text-brand-text-primary/60 italic text-center">Use controls above &amp; hit Send</div> )}
        <StyledButton
          type="submit" variant="primary" className="!px-3 sm:!px-4 !py-2 !text-xs sm:!text-sm"
          disabled={ isLoading || authIsLoading || !isAuthenticated || (aiMode === "compare" ? (!animeA.trim() || !animeB.trim()) : aiMode === "hidden_gems" ? false : !prompt.trim()) }
        >
          {isLoading ? <LocalSpinner size="h-4 w-4" colorClass="border-brand-surface"/> : "Send"}
        </StyledButton>
      </form>
      {!isAuthenticated && !authIsLoading && (
        <p className="text-[10px] sm:text-xs text-brand-accent-gold mt-1 text-center">Please log in to chat with AniMuse.</p>
      )}
    </div>
  );
}