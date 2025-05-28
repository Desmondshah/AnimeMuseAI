// Conversation Flow Manager - Smart AI interaction orchestrator
// This component manages the enhanced conversation flow

import React, { useState, useCallback, useEffect } from "react";
import { useAction, useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import StyledButton from "../shared/StyledButton";
import { toast } from "sonner";

interface ConversationState {
  currentContext: "fresh_start" | "clarification_needed" | "recommendations_given" | "refinement_mode" | "follow_up";
  lastAction: string | null;
  lastRecommendations: any[];
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
  onRecommendations: (recommendations: any[], context: any) => void;
  onAnalysis: (analysis: any) => void;
  onGuide: (guide: any) => void;
  onError: (error: string) => void;
  userProfile: any;
}

export const ConversationFlowManager: React.FC<ConversationFlowManagerProps> = ({
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

  // AI Actions
  const analyzeUserQuery = useAction(api.ai.analyzeUserQuery);
  const refineRecommendations = useAction(api.ai.refineRecommendations);
  const generateFollowUpSuggestions = useAction(api.ai.generateFollowUpSuggestions);
  const getRoleBasedRecommendations = useAction(api.ai.getRoleBasedRecommendations);
  const getAnimeRecommendation = useAction(api.ai.getAnimeRecommendation);

  // Smart suggestion generation based on context
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
        const followUpResult = await generateFollowUpSuggestions({
          lastRecommendations: conversationState.lastRecommendations,
          userInteractions: conversationState.userInteractions,
          userProfile,
          messageId,
        });

        return followUpResult.suggestions?.map(s => s.actionPrompt) || [
          "Can you refine these recommendations?",
          "Show me something completely different",
          "More like the first recommendation"
        ];
      } catch (error) {
        console.error("Failed to generate follow-up suggestions:", error);
      }
    }

    return [
      "Show me something different",
      "More like what you just suggested", 
      "I need something specific..."
    ];
  }, [conversationState, generateFollowUpSuggestions, userProfile]);

  const [smartSuggestions, setSmartSuggestions] = useState<string[]>([]);

  useEffect(() => {
    generateSmartSuggestions().then(setSmartSuggestions);
  }, [generateSmartSuggestions]);

  // Process user input through the conversation flow
  const processUserInput = useCallback(async (input: string) => {
    setIsProcessing(true);
    const messageId = `conv_${Date.now()}`;

    try {
      // Add to conversation history
      const newHistoryEntry = {
        role: "user" as const,
        content: input,
        timestamp: Date.now(),
      };

      setConversationState(prev => ({
        ...prev,
        conversationHistory: [...prev.conversationHistory, newHistoryEntry]
      }));

      // Analyze the query first
      const analysis = await analyzeUserQuery({
        query: input,
        conversationContext: {
          messageHistory: conversationState.conversationHistory.slice(-5), // Last 5 messages
          userPreferences: {
            genres: userProfile?.genres,
            dislikedGenres: userProfile?.dislikedGenres,
            experienceLevel: userProfile?.experienceLevel,
            recentFeedback: conversationState.userInteractions.map(interaction => ({
              recommendationTitle: interaction.recommendationTitle,
              feedbackType: interaction.action === "liked" ? "up" as const : "down" as const,
              timestamp: interaction.timestamp,
            }))
          }
        },
        messageId,
      });

      // Handle clarification needs
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
        return; // Don't proceed with recommendations
      }

      // Check if this is a refinement request
      if (conversationState.currentContext === "recommendations_given" && 
          (input.toLowerCase().includes("more") || 
           input.toLowerCase().includes("less") || 
           input.toLowerCase().includes("different") ||
           input.toLowerCase().includes("similar"))) {
        
        const refinementResult = await refineRecommendations({
          originalQuery: conversationState.conversationHistory.find(h => h.role === "user")?.content || "",
          originalRecommendations: conversationState.lastRecommendations,
          refinementRequest: input,
          userProfile,
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
        return;
      }

      // Determine which AI action to use based on analysis
      let result;
      const aiRole = determineAIRole(input, userProfile);

      switch (analysis.suggestedAction) {
        case "getCharacterBasedRecommendations":
          result = await api.ai.getCharacterBasedRecommendations({
            characterDescription: input,
            userProfile,
            messageId,
          });
          break;

        case "getTropeBasedRecommendations":
          result = await api.ai.getTropeBasedRecommendations({
            plotDescription: input,
            userProfile,
            messageId,
          });
          break;

        case "getArtStyleRecommendations":
          result = await api.ai.getArtStyleRecommendations({
            artStyleDescription: input,
            userProfile,
            messageId,
          });
          break;

        case "getComparativeAnalysis":
          // This would need parsing to extract two anime names
          const animeNames = extractAnimeNamesForComparison(input);
          if (animeNames.length === 2) {
            result = await api.ai.getComparativeAnalysis({
              animeA: animeNames[0],
              animeB: animeNames[1],
              messageId,
            });
            if (result.analysis) {
              onAnalysis(result.analysis);
              return;
            }
          }
          // Fall back to general recommendations if parsing fails
          result = await getAnimeRecommendation({
            prompt: input,
            userProfile,
            messageId,
          });
          break;

        case "getFranchiseGuide":
          const franchiseName = extractFranchiseName(input);
          result = await api.ai.getFranchiseGuide({
            franchiseName,
            userExperience: userProfile?.experienceLevel,
            messageId,
          });
          if (result.guide) {
            onGuide(result.guide);
            return;
          }
          break;

        case "getHiddenGemRecommendations":
          result = await api.ai.getHiddenGemRecommendations({
            surpriseLevel: "moderate",
            avoidPopular: true,
            userProfile,
            messageId,
          });
          break;

        default:
          // Use role-based recommendations for more personalized responses
          result = await getRoleBasedRecommendations({
            query: input,
            aiRole,
            userProfile,
            messageId,
          });
          break;
      }

      // Handle the result
      if (result?.error) {
        onError(result.error);
      } else if (result?.recommendations?.length) {
        setConversationState(prev => ({
          ...prev,
          currentContext: "recommendations_given",
          lastRecommendations: result.recommendations,
          lastAction: analysis.suggestedAction,
        }));
        onRecommendations(result.recommendations, { 
          type: "primary", 
          action: analysis.suggestedAction,
          role: aiRole 
        });
      } else {
        onError("No recommendations found for your request.");
      }

    } catch (error) {
      console.error("Error processing user input:", error);
      onError("Sorry, I had trouble processing that request.");
    } finally {
      setIsProcessing(false);
    }
  }, [conversationState, userProfile, analyzeUserQuery, refineRecommendations, getAnimeRecommendation, getRoleBasedRecommendations, onRecommendations, onAnalysis, onGuide, onError]);

  // Helper function to determine AI role based on input and user profile
  const determineAIRole = (input: string, profile: any) => {
    const inputLower = input.toLowerCase();
    
    if (inputLower.includes("history") || inputLower.includes("classic") || inputLower.includes("evolution")) {
      return "anime_historian";
    }
    if (inputLower.includes("genre") || inputLower.includes("type") || inputLower.includes("category")) {
      return "genre_specialist";  
    }
    if (inputLower.includes("surprise") || inputLower.includes("discover") || inputLower.includes("hidden")) {
      return "discovery_guide";
    }
    if (profile?.experienceLevel === "Newbie (Just starting!)") {
      return "casual_blogger";
    }
    
    return "casual_blogger"; // Default friendly approach
  };

  // Helper functions for parsing specific requests
  const extractAnimeNamesForComparison = (input: string): string[] => {
    // Simple regex to find "X vs Y" or "X and Y" patterns
    const patterns = [
      /(.+?)\s+vs\.?\s+(.+)/i,
      /(.+?)\s+and\s+(.+)/i,
      /compare\s+(.+?)\s+(?:to|with)\s+(.+)/i,
    ];
    
    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match) {
        return [match[1].trim(), match[2].trim()];
      }
    }
    return [];
  };

  const extractFranchiseName = (input: string): string => {
    // Remove common phrases to extract the franchise name
    return input
      .replace(/(?:watch\s+order|guide|how\s+to\s+watch|order)/gi, "")
      .replace(/(?:for|the|series|franchise)/gi, "")
      .trim();
  };

  // Handle clarification responses
  const handleClarificationResponse = useCallback(async (response: string) => {
    if (!conversationState.pendingClarification) return;

    const fullQuery = `${conversationState.pendingClarification.originalQuery} - ${response}`;
    
    setConversationState(prev => ({
      ...prev,
      currentContext: "fresh_start",
      pendingClarification: undefined,
    }));

    await processUserInput(fullQuery);
  }, [conversationState.pendingClarification, processUserInput]);

  // Record user interaction with recommendations
  const recordInteraction = useCallback((recommendationTitle: string, action: "liked" | "disliked" | "added_to_watchlist" | "viewed_details") => {
    setConversationState(prev => ({
      ...prev,
      userInteractions: [...prev.userInteractions, {
        recommendationTitle,
        action,
        timestamp: Date.now(),
      }],
      currentContext: "follow_up", // Switch to follow-up mode
    }));
  }, []);

  // Submit handler
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentInput.trim() || isProcessing) return;

    const input = currentInput;
    setCurrentInput("");
    setShowSuggestions(false);

    await processUserInput(input);
  }, [currentInput, isProcessing, processUserInput]);

  // Render clarification questions
  if (conversationState.currentContext === "clarification_needed" && conversationState.pendingClarification) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-yellow-600/20 border border-yellow-600/50 rounded-lg">
          <h3 className="text-yellow-400 font-semibold mb-2">I need a bit more info to help you better:</h3>
          <div className="space-y-2">
            {conversationState.pendingClarification.questions.map((question, idx) => (
              <button
                key={idx}
                onClick={() => handleClarificationResponse(question)}
                className="block w-full text-left p-2 bg-brand-surface hover:bg-electric-blue hover:text-white rounded transition-colors text-sm"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
        
        <form onSubmit={(e) => {
          e.preventDefault();
          if (currentInput.trim()) {
            handleClarificationResponse(currentInput);
            setCurrentInput("");
          }
        }}>
          <input
            type="text"
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            placeholder="Or type your own answer..."
            className="neumorphic-input w-full"
          />
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Smart Suggestions */}
      {showSuggestions && smartSuggestions.length > 0 && (
        <div className="p-3 bg-brand-dark rounded-lg">
          <h3 className="text-sm font-orbitron text-electric-blue mb-2">
            {conversationState.currentContext === "fresh_start" 
              ? "Try asking:" 
              : "What's next:"}
          </h3>
          <div className="grid grid-cols-1 gap-2">
            {smartSuggestions.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setCurrentInput(suggestion);
                  setShowSuggestions(false);
                }}
                className="text-left p-2 bg-brand-surface hover:bg-electric-blue hover:text-white rounded transition-colors text-sm"
              >
                "{suggestion}"
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Context indicator */}
      {conversationState.currentContext !== "fresh_start" && (
        <div className="text-xs text-brand-text-secondary flex items-center gap-2">
          <span className={`px-2 py-1 rounded text-xs ${
            conversationState.currentContext === "recommendations_given" ? "bg-green-600" :
            conversationState.currentContext === "refinement_mode" ? "bg-blue-600" :
            conversationState.currentContext === "follow_up" ? "bg-purple-600" : "bg-gray-600"
          }`}>
            {conversationState.currentContext.replace("_", " ")}
          </span>
          {conversationState.lastAction && (
            <span>• Last action: {conversationState.lastAction}</span>
          )}
        </div>
      )}

      {/* Main input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={currentInput}
          onChange={(e) => setCurrentInput(e.target.value)}
          placeholder={
            conversationState.currentContext === "recommendations_given" 
              ? "Want to refine these suggestions?"
              : conversationState.currentContext === "follow_up"
              ? "What would you like to explore next?"
              : "What kind of anime are you looking for?"
          }
          className="neumorphic-input flex-grow"
          disabled={isProcessing}
        />
        <StyledButton
          type="submit"
          variant="primary"
          disabled={isProcessing || !currentInput.trim()}
        >
          {isProcessing ? "..." : "Ask"}
        </StyledButton>
      </form>

      {/* Quick actions based on context */}
      {conversationState.currentContext === "recommendations_given" && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => processUserInput("Show me something completely different")}
            className="text-xs px-3 py-1 bg-brand-surface hover:bg-electric-blue hover:text-white rounded transition-colors"
            disabled={isProcessing}
          >
            🎲 Surprise me instead
          </button>
          <button
            onClick={() => processUserInput("More like the first recommendation")}
            className="text-xs px-3 py-1 bg-brand-surface hover:bg-electric-blue hover:text-white rounded transition-colors"
            disabled={isProcessing}
          >
            👍 More like #1
          </button>
          <button
            onClick={() => processUserInput("Make it more recent")}
            className="text-xs px-3 py-1 bg-brand-surface hover:bg-electric-blue hover:text-white rounded transition-colors"
            disabled={isProcessing}
          >
            📅 Newer anime
          </button>
        </div>
      )}

      {/* Conversation context display for debugging */}
      {process.env.NODE_ENV === "development" && (
        <div className="text-xs text-brand-text-secondary p-2 bg-brand-dark rounded">
          <details>
            <summary>Debug: Conversation State</summary>
            <pre className="mt-2 text-xs overflow-auto">
              {JSON.stringify(conversationState, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
};

export default ConversationFlowManager;