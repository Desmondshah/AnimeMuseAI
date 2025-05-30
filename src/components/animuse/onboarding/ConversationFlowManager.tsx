// src/components/animuse/onboarding/ConversationFlowManager.tsx
import React, { useState, useCallback, useEffect, memo } from "react";
import { useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import StyledButton from "../shared/StyledButton";
import { toast } from "sonner"; // Assuming toast is used for errors or info

// Type definitions (ensure these are accurate and complete)
type RecommendationResult = {
  recommendations: any[]; // Replace 'any' with your AnimeRecommendation type if available
  error?: string;
};

type AnalysisResult = {
  analysis: any; // Replace 'any' with a more specific type if available
  error?: string;
};

type GuideResult = {
  guide: any; // Replace 'any' with a more specific type if available
  error?: string;
};

type AIActionResult = RecommendationResult | AnalysisResult | GuideResult;

// Type guard functions
function hasRecommendations(result: any): result is RecommendationResult {
  return result && 'recommendations' in result;
}

function hasAnalysis(result: any): result is AnalysisResult {
  return result && 'analysis' in result;
}

function hasGuide(result: any): result is GuideResult {
  return result && 'guide' in result;
}

interface ConversationState {
  currentContext: "fresh_start" | "clarification_needed" | "recommendations_given" | "refinement_mode" | "follow_up";
  lastAction: string | null;
  lastRecommendations: any[]; // Use your AnimeRecommendation type here
  userInteractions: Array<{
    recommendationTitle: string;
    action: "liked" | "disliked" | "added_to_watchlist" | "viewed_details";
    timestamp: number;
  }>;
  conversationHistory: Array<{
    role: "user" | "assistant";
    content: string;
    timestamp: number;
    actionType?: string;
  }>;
  pendingClarification?: {
    questions: string[];
    originalQuery: string;
    suggestedAction: string;
  };
}

interface ConversationFlowManagerProps {
  onRecommendations: (recommendations: any[], context: any) => void; // Use AnimeRecommendation here
  onAnalysis: (analysis: any) => void;
  onGuide: (guide: any) => void;
  onError: (error: string) => void;
  userProfile: any; // Use your specific UserProfile type here
}

interface FollowUpSuggestion {
  type: string;
  title: string;
  description: string;
  actionPrompt: string;
}

const ConversationFlowManagerComponent: React.FC<ConversationFlowManagerProps> = ({
  onRecommendations,
  onAnalysis,
  onGuide,
  onError,
  userProfile
}) => {
  const [conversationState, setConversationState] = useState<ConversationState>({
    currentContext: "fresh_start",
    lastAction: null,
    lastRecommendations: [],
    userInteractions: [],
    conversationHistory: [],
  });

  const [currentInput, setCurrentInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [smartSuggestions, setSmartSuggestions] = useState<string[]>([]);

  // AI Actions
  const analyzeUserQuery = useAction(api.ai.analyzeUserQuery);
  const refineRecommendations = useAction(api.ai.refineRecommendations);
  const generateFollowUpSuggestions = useAction(api.ai.generateFollowUpSuggestions);
  const getRoleBasedRecommendations = useAction(api.ai.getRoleBasedRecommendations);
  const getAnimeRecommendationAction = useAction(api.ai.getAnimeRecommendationWithBetterLogging);
  const getCharacterBasedRecommendationsAction = useAction(api.ai.getCharacterBasedRecommendations);
  const getTropeBasedRecommendationsAction = useAction(api.ai.getTropeBasedRecommendations);
  const getArtStyleRecommendationsAction = useAction(api.ai.getArtStyleRecommendations);
  const getComparativeAnalysisAction = useAction(api.ai.getComparativeAnalysis);
  const getFranchiseGuideAction = useAction(api.ai.getFranchiseGuide);
  const getHiddenGemRecommendationsAction = useAction(api.ai.getHiddenGemRecommendations);

  const generateSmartSuggestions = useCallback(async () => {
    if (conversationState.currentContext === "fresh_start") {
      return [
        "I want something with great character development",
        "Surprise me with a hidden gem",
        "What's similar to Attack on Titan?",
        "Something to watch with friends"
      ];
    }

    if (conversationState.currentContext === "recommendations_given" && conversationState.lastRecommendations.length > 0) {
      try {
        const messageId = `followup_${Date.now()}`;
        // Ensure userProfile is passed in a way the AI action expects
        const profileForAI = userProfile ? {
            name: userProfile.name, moods: userProfile.moods, genres: userProfile.genres,
            favoriteAnimes: userProfile.favoriteAnimes, experienceLevel: userProfile.experienceLevel,
            dislikedGenres: userProfile.dislikedGenres, dislikedTags: userProfile.dislikedTags,
            characterArchetypes: userProfile.characterArchetypes, tropes: userProfile.tropes,
            artStyles: userProfile.artStyles, narrativePacing: userProfile.narrativePacing,
            // watchlistIsPublic: userProfile.watchlistIsPublic // if needed by AI
        } : undefined;

        const followUpResult = await generateFollowUpSuggestions({
          lastRecommendations: conversationState.lastRecommendations,
          userInteractions: conversationState.userInteractions,
          userProfile: profileForAI, // Pass the structured profile
          messageId,
        });

        return followUpResult.suggestions?.map((s: FollowUpSuggestion) => s.actionPrompt) || [
          "Can you refine these recommendations?",
          "Show me something completely different",
          "More like the first recommendation"
        ];
      } catch (error) {
        console.error("Failed to generate follow-up suggestions:", error);
        // Consider calling onError prop or using toast
      }
    }

    return [
      "Show me something different",
      "More like what you just suggested",
      "I need something specific..."
    ];
  }, [conversationState, generateFollowUpSuggestions, userProfile]);

  useEffect(() => {
    generateSmartSuggestions().then(setSmartSuggestions);
  }, [generateSmartSuggestions]);

  const processUserInput = useCallback(async (input: string) => {
    setIsProcessing(true);
    const messageId = `conv_${Date.now()}`;

    // Ensure userProfile is structured as expected by AI actions
    const profileForAI = userProfile ? {
        name: userProfile.name, moods: userProfile.moods, genres: userProfile.genres,
        favoriteAnimes: userProfile.favoriteAnimes, experienceLevel: userProfile.experienceLevel,
        dislikedGenres: userProfile.dislikedGenres, dislikedTags: userProfile.dislikedTags,
        characterArchetypes: userProfile.characterArchetypes, tropes: userProfile.tropes,
        artStyles: userProfile.artStyles, narrativePacing: userProfile.narrativePacing,
        // watchlistIsPublic: userProfile.watchlistIsPublic // if needed by AI
    } : undefined;

    try {
      const newHistoryEntry = {
        role: "user" as const,
        content: input,
        timestamp: Date.now(),
      };

      setConversationState(prev => ({
        ...prev,
        conversationHistory: [...prev.conversationHistory, newHistoryEntry]
      }));

      const analysis = await analyzeUserQuery({
        query: input,
        conversationContext: {
          messageHistory: conversationState.conversationHistory.slice(-5),
          userPreferences: { // This structure should match what analyzeUserQuery expects
            genres: profileForAI?.genres,
            dislikedGenres: profileForAI?.dislikedGenres,
            experienceLevel: profileForAI?.experienceLevel,
            recentFeedback: conversationState.userInteractions.map(interaction => ({
              recommendationTitle: interaction.recommendationTitle,
              feedbackType: interaction.action === "liked" ? "up" as const : "down" as const,
              timestamp: interaction.timestamp,
            }))
          }
        },
        messageId,
      });

      if (analysis.needsClarification && analysis.clarificationQuestions?.length) {
        setConversationState(prev => ({
          ...prev,
          currentContext: "clarification_needed",
          pendingClarification: {
            questions: analysis.clarificationQuestions!,
            originalQuery: input,
            suggestedAction: analysis.suggestedAction,
          }
        }));
        setIsProcessing(false);
        return;
      }

      if (conversationState.currentContext === "recommendations_given" &&
          (input.toLowerCase().includes("more") ||
           input.toLowerCase().includes("less") ||
           input.toLowerCase().includes("different") ||
           input.toLowerCase().includes("similar"))) {

        const refinementResult = await refineRecommendations({
          originalQuery: conversationState.conversationHistory.find(h => h.role === "user")?.content || "",
          originalRecommendations: conversationState.lastRecommendations,
          refinementRequest: input,
          userProfile: profileForAI,
          messageId,
        });

        if (refinementResult.recommendations?.length) {
          setConversationState(prev => ({
            ...prev,
            currentContext: "refinement_mode",
            lastRecommendations: refinementResult.recommendations,
            lastAction: "refineRecommendations",
          }));
          onRecommendations(refinementResult.recommendations, {
            type: "refinement",
            originalQuery: input
          });
        } else if (refinementResult.error) {
          onError(refinementResult.error);
        }
        setIsProcessing(false);
        return;
      }

      let result: AIActionResult | undefined;
      const determineAIRole = (query: string, profile: any) => {
          const inputLower = query.toLowerCase();
          if (inputLower.includes("history") || inputLower.includes("classic")) return "anime_historian";
          if (inputLower.includes("genre") || inputLower.includes("type")) return "genre_specialist";
          if (inputLower.includes("surprise") || inputLower.includes("discover")) return "discovery_guide";
          if (profile?.experienceLevel === "Newbie (Just starting!)") return "casual_blogger";
          return "casual_blogger";
      };
      const extractAnimeNamesForComparison = (query: string): string[] => {
          const patterns = [/(.+?)\s+vs\.?\s+(.+)/i, /(.+?)\s+and\s+(.+)/i, /compare\s+(.+?)\s+(?:to|with)\s+(.+)/i];
          for (const pattern of patterns) { const match = query.match(pattern); if (match) return [match[1].trim(), match[2].trim()]; }
          return [];
      };
      const extractFranchiseName = (query: string): string => query.replace(/(?:watch\s+order|guide|how\s+to\s+watch|order|for|the|series|franchise)/gi, "").trim();

      const aiRole = determineAIRole(input, profileForAI);

      switch (analysis.suggestedAction) {
        case "getCharacterBasedRecommendations":
          result = await getCharacterBasedRecommendationsAction({ characterDescription: input, userProfile: profileForAI, messageId });
          break;
        case "getTropeBasedRecommendations":
          result = await getTropeBasedRecommendationsAction({ plotDescription: input, userProfile: profileForAI, messageId });
          break;
        case "getArtStyleRecommendations":
          result = await getArtStyleRecommendationsAction({ artStyleDescription: input, userProfile: profileForAI, messageId });
          break;
        case "getComparativeAnalysis":
          const animeNames = extractAnimeNamesForComparison(input);
          if (animeNames.length === 2) {
            result = await getComparativeAnalysisAction({ animeA: animeNames[0], animeB: animeNames[1], messageId });
            if (hasAnalysis(result) && result.analysis) { onAnalysis(result.analysis); setIsProcessing(false); return; }
          }
          // Fallback if comparison fails
          result = await getAnimeRecommendationAction({ prompt: input, userProfile: profileForAI, messageId });
          break;
        case "getFranchiseGuide":
          const franchiseName = extractFranchiseName(input);
          result = await getFranchiseGuideAction({ franchiseName, userExperience: profileForAI?.experienceLevel, messageId });
          if (hasGuide(result) && result.guide) { onGuide(result.guide); setIsProcessing(false); return; }
          break;
        case "getHiddenGemRecommendations":
          result = await getHiddenGemRecommendationsAction({ surpriseLevel: "moderate", avoidPopular: true, userProfile: profileForAI, messageId });
          break;
        default: // Includes "getAnimeRecommendation" or undefined suggestedAction
          if (analysis.suggestedAction === "getAnimeRecommendation" || !analysis.suggestedAction) {
             result = await getAnimeRecommendationAction({ prompt: input, userProfile: profileForAI, messageId });
          } else { // Fallback to role-based if a specific non-standard action was suggested but not handled
            result = await getRoleBasedRecommendations({ query: input, aiRole, userProfile: profileForAI, messageId });
          }
          break;
      }

      if (result?.error) { onError(result.error); }
      else if (hasRecommendations(result) && result.recommendations.length > 0) {
        setConversationState(prev => ({ ...prev, currentContext: "recommendations_given", lastRecommendations: result.recommendations, lastAction: analysis.suggestedAction }));
        onRecommendations(result.recommendations, { type: "primary", action: analysis.suggestedAction, role: aiRole });
      } else if (hasAnalysis(result)) { onAnalysis(result.analysis); } // Should have been returned earlier
      else if (hasGuide(result)) { onGuide(result.guide); } // Should have been returned earlier
      else { onError("No recommendations or relevant information found for your request."); }

    } catch (error: any) {
      console.error("Error processing user input:", error);
      onError(error.message || "Sorry, I had trouble processing that request.");
    } finally {
      setIsProcessing(false);
    }
  }, [ conversationState, userProfile, analyzeUserQuery, refineRecommendations, getAnimeRecommendationAction, getRoleBasedRecommendations, getCharacterBasedRecommendationsAction, getTropeBasedRecommendationsAction, getArtStyleRecommendationsAction, getComparativeAnalysisAction, getFranchiseGuideAction, getHiddenGemRecommendationsAction, onRecommendations, onAnalysis, onGuide, onError ]);

  const handleClarificationResponse = useCallback(async (response: string) => {
    if (!conversationState.pendingClarification) return;
    const fullQuery = `${conversationState.pendingClarification.originalQuery} - ${response}`;
    setConversationState(prev => ({ ...prev, currentContext: "fresh_start", pendingClarification: undefined, }));
    await processUserInput(fullQuery);
  }, [conversationState.pendingClarification, processUserInput]);

  const recordInteraction = useCallback((recommendationTitle: string, action: "liked" | "disliked" | "added_to_watchlist" | "viewed_details") => {
    setConversationState(prev => ({
      ...prev,
      userInteractions: [...prev.userInteractions, { recommendationTitle, action, timestamp: Date.now(), }],
      currentContext: "follow_up",
    }));
  }, []);

  const handleSubmitForm = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentInput.trim() || isProcessing) return;
    const inputToProcess = currentInput;
    setCurrentInput(""); // Clear input immediately
    setShowSuggestions(false); // Hide suggestions on submit
    await processUserInput(inputToProcess);
  }, [currentInput, isProcessing, processUserInput]);

  // Themed UI for Clarification Needed
  if (conversationState.currentContext === "clarification_needed" && conversationState.pendingClarification) {
    return (
      <div className="space-y-3 p-3 bg-brand-surface text-brand-text-primary rounded-lg shadow-md border border-brand-accent-peach/30">
        <div className="p-3 bg-brand-accent-peach/20 border border-brand-accent-peach/50 rounded-md">
          <h3 className="text-sm font-heading text-brand-accent-gold font-semibold mb-1.5">A little more info, please:</h3>
          <div className="space-y-1.5">
            {conversationState.pendingClarification.questions.map((question, idx) => (
              <StyledButton
                key={idx}
                onClick={() => handleClarificationResponse(question)}
                variant="secondary_small"
                className="w-full text-left !text-xs !justify-start hover:!bg-brand-accent-peach/30 !border-brand-accent-peach/40"
              >
                {question}
              </StyledButton>
            ))}
          </div>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); if (currentInput.trim()) { handleClarificationResponse(currentInput); setCurrentInput(""); } }} className="flex gap-2">
          <input
            type="text"
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            placeholder="Or type your answer..."
            className="form-input flex-grow !text-sm !py-2"
          />
          <StyledButton type="submit" variant="primary_small" className="!py-2" disabled={!currentInput.trim()}>Send</StyledButton>
        </form>
      </div>
    );
  }

  // Main UI for the ConversationFlowManager
  return (
    <div className="space-y-3 sm:space-y-4 p-3 sm:p-4 bg-brand-surface text-brand-text-primary rounded-xl shadow-lg border border-brand-accent-peach/20">
      {showSuggestions && smartSuggestions.length > 0 && (
        <div className="p-2.5 sm:p-3 bg-brand-accent-peach/10 rounded-lg">
          <h3 className="text-xs sm:text-sm font-heading text-brand-accent-gold mb-1.5">
            {conversationState.currentContext === "fresh_start" ? "Try asking:" : "What's next:"}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
            {smartSuggestions.slice(0, 4).map((suggestion, idx) => (
              <StyledButton
                key={idx}
                onClick={() => {
                  // setCurrentInput(suggestion); // Optional: prefill input
                  setShowSuggestions(false); // Hide suggestions on click
                  processUserInput(suggestion); // Process suggestion directly
                }}
                variant="secondary_small"
                className="w-full text-left !text-xs !py-1.5 !px-2 hover:!bg-brand-accent-peach/20 !border-brand-accent-peach/40"
              >
                "{suggestion}"
              </StyledButton>
            ))}
          </div>
        </div>
      )}

      {/* Context Display */}
      {conversationState.currentContext !== "fresh_start" && (
        <div className="text-[10px] sm:text-xs text-brand-text-primary/70 flex items-center gap-1.5 flex-wrap">
          <span className={`px-1.5 py-0.5 rounded font-medium ${
            conversationState.currentContext === "recommendations_given" ? "bg-brand-primary-action/20 text-brand-primary-action" :
            conversationState.currentContext === "refinement_mode" ? "bg-brand-accent-gold/20 text-brand-accent-gold" :
            conversationState.currentContext === "follow_up" ? "bg-brand-accent-peach/30 text-brand-text-primary/90" :
            "bg-gray-400/10 text-gray-600"
          }`}>
            {conversationState.currentContext.replace(/_/g, " ")}
          </span>
          {conversationState.lastAction && (
            <span>• Last: <span className="font-medium">{conversationState.lastAction.replace(/([A-Z])/g, ' $1').trim()}</span></span>
          )}
        </div>
      )}

      {/* Main Input Form */}
      <form onSubmit={handleSubmitForm} className="flex gap-2 items-center">
        <input
          type="text" value={currentInput} onChange={(e) => setCurrentInput(e.target.value)}
          placeholder={
            conversationState.currentContext === "recommendations_given" ? "Want to refine these suggestions?" :
            conversationState.currentContext === "follow_up" ? "What would you like to explore next?" :
            "What kind of anime are you looking for?"
          }
          className="form-input flex-grow !text-sm sm:!text-base !py-2"
          disabled={isProcessing}
        />
        <StyledButton type="submit" variant="primary" className="!py-2" disabled={isProcessing || !currentInput.trim()}>
          {isProcessing ? "..." : "Ask"}
        </StyledButton>
      </form>

      {/* Quick Action Buttons after recommendations */}
      {conversationState.currentContext === "recommendations_given" && (
        <div className="flex flex-wrap gap-1.5 sm:gap-2 pt-1">
          {[
            { label: "🎲 Different", query: "Show me something completely different" },
            { label: "👍 More like #1", query: "More like the first recommendation" },
            { label: "📅 Newer", query: "Make it more recent" },
          ].map(action => (
            <StyledButton
              key={action.label}
              onClick={() => processUserInput(action.query)}
              variant="ghost"
              className="!text-xs !px-2 !py-1 text-brand-accent-gold hover:!text-brand-primary-action hover:!bg-brand-primary-action/10"
              disabled={isProcessing}
            >
              {action.label}
            </StyledButton>
          ))}
        </div>
      )}

      {/* Debug Section - Themed for less prominence */}
      {process.env.NODE_ENV === "development" && (
        <details className="mt-3">
            <summary className="text-xs text-brand-text-primary/60 cursor-pointer hover:text-brand-accent-gold focus:outline-none">Debug: Conversation State</summary>
            <div className="text-[10px] text-brand-text-primary/70 p-2 bg-brand-accent-peach/10 rounded mt-1 max-h-32 overflow-auto custom-scrollbar">
                <pre>{JSON.stringify(conversationState, null, 2)}</pre>
            </div>
        </details>
      )}
    </div>
  );
};

export default memo(ConversationFlowManagerComponent);