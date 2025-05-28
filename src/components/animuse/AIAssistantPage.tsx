// Enhanced AIAssistantPage.tsx with new AI capabilities
import React, { useState, FormEvent, useRef, useEffect } from "react";
import { useAction, useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import StyledButton from "./shared/StyledButton";
import { toast } from "sonner";
import { AnimeRecommendation } from "../../../convex/types";

// Export the interface for backward compatibility
export type { AnimeRecommendation };

// Enhanced interface for different types of AI responses
interface ChatMessage {
  id: string;
  type: "user" | "ai" | "error" | "analysis" | "guide";
  content: string;
  recommendations?: AnimeRecommendation[];
  analysis?: any; // For comparative analysis
  guide?: any; // For franchise guides
  feedback?: "up" | "down" | null;
  rawAiResponse?: any[];
  rawAiText?: string;
  actionType?: string; // Track which AI action was used
}

type AIMode = "general" | "character" | "trope" | "art_style" | "compare" | "hidden_gems" | "franchise";

export default function EnhancedAIAssistantPage() {
  const [prompt, setPrompt] = useState("");
  const [aiMode, setAiMode] = useState<AIMode>("general");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Comparison mode specific states
  const [animeA, setAnimeA] = useState("");
  const [animeB, setAnimeB] = useState("");

  // Hidden gems specific states
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

  const userProfile = useQuery(api.users.getMyUserProfile);
  const storeAiFeedback = useMutation(api.ai.storeAiFeedback);
  const { isAuthenticated, isLoading: authIsLoading } = useConvexAuth();

  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Enhanced example prompts based on mode
  const getModeExamples = () => {
    switch (aiMode) {
      case "character":
        return [
          "Characters like L from Death Note - brilliant detectives",
          "Strong female protagonists who aren't just love interests",
          "Anti-heroes with complex moral codes",
          "Mentor figures who actually matter to the story"
        ];
      case "trope":
        return [
          "Time loop stories done right",
          "Found family but make it heartbreaking",
          "Tournament arcs that serve the plot",
          "Redemption arcs that feel earned"
        ];
      case "art_style":
        return [
          "Retro 90s aesthetic like Cowboy Bebop",
          "Studio Ghibli-esque art style",
          "Dark, gritty animation like Berserk",
          "Colorful and vibrant like My Hero Academia"
        ];
      case "hidden_gems":
        return [
          "Surprise me with something completely different!",
          "Hidden gems from the 2000s",
          "Weird but wonderful experimental anime",
          "Underrated masterpieces I've never heard of"
        ];
      case "franchise":
        return [
          "How do I watch the Fate series?",
          "Monogatari series watch order help",
          "Ghost in the Shell franchise guide",
          "Where to start with Gundam?"
        ];
      default:
        return [
          "Suggest me something to watch tonight",
          "What's similar to Your Name?",
          "I want something that'll make me cry",
          "Recommend a badass female lead anime"
        ];
    }
  };

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const generateMessageId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const executeAIAction = async (currentPrompt: string, aiMessageId: string) => {
    const profileDataForAI = userProfile ? {
      name: userProfile.name,
      moods: userProfile.moods,
      genres: userProfile.genres,
      favoriteAnimes: userProfile.favoriteAnimes,
      experienceLevel: userProfile.experienceLevel,
      dislikedGenres: userProfile.dislikedGenres,
      dislikedTags: userProfile.dislikedTags,
      characterArchetypes: userProfile.characterArchetypes,
      tropes: userProfile.tropes,
      artStyles: userProfile.artStyles,
      narrativePacing: userProfile.narrativePacing,
    } : undefined;

    try {
      switch (aiMode) {
        case "character":
          return await getCharacterBasedRecommendationsAction({
            characterDescription: currentPrompt,
            userProfile: profileDataForAI,
            messageId: aiMessageId,
          });

        case "trope":
          return await getTropeBasedRecommendationsAction({
            plotDescription: currentPrompt,
            userProfile: profileDataForAI,
            messageId: aiMessageId,
          });

        case "art_style":
          return await getArtStyleRecommendationsAction({
            artStyleDescription: currentPrompt,
            userProfile: profileDataForAI,
            messageId: aiMessageId,
          });

        case "compare":
          if (!animeA || !animeB) {
            throw new Error("Please enter both anime titles to compare");
          }
          return await getComparativeAnalysisAction({
            animeA,
            animeB,
            messageId: aiMessageId,
          });

        case "hidden_gems":
          return await getHiddenGemRecommendationsAction({
            surpriseLevel,
            avoidPopular,
            userProfile: profileDataForAI,
            messageId: aiMessageId,
          });

        case "franchise":
          return await getFranchiseGuideAction({
            franchiseName: currentPrompt,
            userExperience: userProfile?.experienceLevel,
            messageId: aiMessageId,
          });

        default:
          return await getAnimeRecommendationAction({
            prompt: currentPrompt,
            userProfile: profileDataForAI,
            messageId: aiMessageId,
          });
      }
    } catch (error) {
      throw error;
    }
  };

  const handleSubmit = async (e: FormEvent | string) => {
    if (e instanceof Object && typeof e.preventDefault === 'function') e.preventDefault();

    const currentPromptText = typeof e === 'string' ? e : 
      (aiMode === "compare" ? `Compare ${animeA} vs ${animeB}` : prompt);

    if (!currentPromptText.trim() && aiMode !== "hidden_gems") return;
    if (aiMode === "compare" && (!animeA.trim() || !animeB.trim())) {
      toast.error("Please enter both anime titles to compare");
      return;
    }

    const userMessageId = generateMessageId();
    const newUserMessage: ChatMessage = { 
      id: userMessageId, 
      type: "user", 
      content: currentPromptText,
      actionType: aiMode
    };
    setChatHistory((prev) => [...prev, newUserMessage]);
    setIsLoading(true);
    setPrompt("");

    const aiMessageId = generateMessageId();

    try {
      const result = await executeAIAction(currentPromptText, aiMessageId);
      let aiResponseMessage: ChatMessage;

      // Handle different response types
      if (result.error) {
        aiResponseMessage = {
          id: aiMessageId,
          type: "error",
          content: `Error: ${result.error}`,
          rawAiText: result.error,
          feedback: null,
          actionType: aiMode,
        };
        toast.error("AniMuse had trouble with that request.");
      } else if (result.analysis) {
        // Comparative analysis response
        aiResponseMessage = {
          id: aiMessageId,
          type: "analysis",
          content: "Here's my comparative analysis:",
          analysis: result.analysis,
          feedback: null,
          actionType: aiMode,
        };
        toast.success("Analysis complete!");
      } else if (result.guide) {
        // Franchise guide response
        aiResponseMessage = {
          id: aiMessageId,
          type: "guide",
          content: `Here's your guide to the ${result.guide.franchiseName} franchise:`,
          guide: result.guide,
          feedback: null,
          actionType: aiMode,
        };
        toast.success("Franchise guide ready!");
      } else if (result.recommendations && result.recommendations.length > 0) {
        // Standard recommendations response
        const modeLabels = {
          character: "character-based recommendations",
          trope: "plot/trope recommendations", 
          art_style: "art style recommendations",
          hidden_gems: "hidden gems",
          general: "recommendations"
        };
        
        aiResponseMessage = {
          id: aiMessageId,
          type: "ai",
          content: `Here are some ${modeLabels[aiMode as keyof typeof modeLabels] || "recommendations"} for you:`,
          recommendations: result.recommendations as AnimeRecommendation[],
          rawAiResponse: result.recommendations,
          feedback: null,
          actionType: aiMode,
        };
        toast.success(`Found some great ${modeLabels[aiMode as keyof typeof modeLabels] || "recommendations"}!`);
      } else {
        const noRecContent = "I couldn't find specific matches for that request. Try adjusting your criteria or switching modes!";
        aiResponseMessage = {
          id: aiMessageId,
          type: "ai",
          content: noRecContent,
          rawAiText: noRecContent,
          feedback: null,
          actionType: aiMode,
        };
        toast.info("No matches found - try a different approach!");
      }

      setChatHistory((prev) => [...prev, aiResponseMessage]);

    } catch (error) {
      console.error("Failed to get AI response:", error);
      const errorContent = error instanceof Error ? error.message : "Something went wrong on my end.";
      const errorResponseMessage: ChatMessage = {
        id: aiMessageId,
        type: "error", 
        content: errorContent,
        rawAiText: errorContent,
        feedback: null,
        actionType: aiMode,
      };
      setChatHistory((prev) => [...prev, errorResponseMessage]);
      toast.error("An error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderModeSelector = () => (
    <div className="mb-4 p-3 bg-brand-dark rounded-lg shadow-neumorphic-light-inset">
      <h3 className="text-sm font-orbitron text-electric-blue mb-2">AI Mode:</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {[
          { id: "general", label: "🎯 General", desc: "Standard recommendations" },
          { id: "character", label: "👤 Character", desc: "Character-focused finds" },
          { id: "trope", label: "📖 Plot/Trope", desc: "Story structure based" },
          { id: "art_style", label: "🎨 Art Style", desc: "Visual aesthetics focused" },
          { id: "compare", label: "⚖️ Compare", desc: "Analyze two anime" },
          { id: "hidden_gems", label: "💎 Hidden Gems", desc: "Surprise discoveries" },
          { id: "franchise", label: "📚 Franchise", desc: "Series watch guides" },
        ].map((mode) => (
          <button
            key={mode.id}
            onClick={() => setAiMode(mode.id as AIMode)}
            className={`p-2 text-xs rounded-lg border transition-colors ${
              aiMode === mode.id
                ? "bg-electric-blue text-white border-electric-blue"
                : "bg-brand-surface text-brand-text border-brand-dark hover:border-electric-blue"
            }`}
            title={mode.desc}
          >
            <div className="font-semibold">{mode.label}</div>
            <div className="text-xs opacity-80">{mode.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderModeSpecificInputs = () => {
    switch (aiMode) {
      case "compare":
        return (
          <div className="mb-4 p-3 bg-brand-dark rounded-lg space-y-2">
            <input
              type="text"
              placeholder="First anime (e.g., Attack on Titan)"
              value={animeA}
              onChange={(e) => setAnimeA(e.target.value)}
              className="neumorphic-input w-full text-sm"
            />
            <input
              type="text"
              placeholder="Second anime (e.g., Code Geass)"
              value={animeB}
              onChange={(e) => setAnimeB(e.target.value)}
              className="neumorphic-input w-full text-sm"
            />
          </div>
        );

      case "hidden_gems":
        return (
          <div className="mb-4 p-3 bg-brand-dark rounded-lg space-y-3">
            <div>
              <label className="text-sm text-brand-text-secondary mb-1 block">Surprise Level:</label>
              <div className="flex gap-2">
                {[
                  { value: "mild", label: "😊 Mild", desc: "Safe surprises" },
                  { value: "moderate", label: "🎲 Moderate", desc: "Good surprises" },
                  { value: "wild", label: "🎪 Wild", desc: "Weird & wonderful" }
                ].map((level) => (
                  <button
                    key={level.value}
                    onClick={() => setSurpriseLevel(level.value as any)}
                    className={`flex-1 p-2 text-xs rounded border ${
                      surpriseLevel === level.value
                        ? "bg-electric-blue text-white border-electric-blue"
                        : "bg-brand-surface border-brand-dark hover:border-electric-blue"
                    }`}
                    title={level.desc}
                  >
                    {level.label}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex items-center text-sm">
              <input
                type="checkbox"
                checked={avoidPopular}
                onChange={(e) => setAvoidPopular(e.target.checked)}
                className="mr-2 accent-electric-blue"
              />
              Avoid popular/mainstream anime
            </label>
          </div>
        );

      default:
        return null;
    }
  };

  const renderAnalysisResult = (analysis: any) => (
    <div className="mt-3 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <div className="p-3 bg-brand-dark rounded">
          <h4 className="text-electric-blue font-semibold mb-1">Plot & Themes</h4>
          <p className="text-brand-text-secondary">{analysis.plotComparison}</p>
        </div>
        <div className="p-3 bg-brand-dark rounded">
          <h4 className="text-electric-blue font-semibold mb-1">Characters</h4>
          <p className="text-brand-text-secondary">{analysis.characterComparison}</p>
        </div>
        <div className="p-3 bg-brand-dark rounded">
          <h4 className="text-electric-blue font-semibold mb-1">Visual Style</h4>
          <p className="text-brand-text-secondary">{analysis.visualComparison}</p>
        </div>
        <div className="p-3 bg-brand-dark rounded">
          <h4 className="text-electric-blue font-semibold mb-1">Tone & Atmosphere</h4>
          <p className="text-brand-text-secondary">{analysis.toneComparison}</p>
        </div>
      </div>
      
      {analysis.overallSummary && (
        <div className="p-3 bg-electric-blue/10 rounded border border-electric-blue/30">
          <h4 className="text-electric-blue font-semibold mb-1">Summary</h4>
          <p className="text-brand-text">{analysis.overallSummary}</p>
        </div>
      )}

      {analysis.recommendations && (
        <div className="p-3 bg-sakura-pink/10 rounded border border-sakura-pink/30">
          <h4 className="text-sakura-pink font-semibold mb-1">If You Like These...</h4>
          <ul className="text-sm text-brand-text space-y-1">
            {analysis.recommendations.map((rec: string, idx: number) => (
              <li key={idx}>• {rec}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  const renderFranchiseGuide = (guide: any) => (
    <div className="mt-3 space-y-3">
      <div className="p-3 bg-brand-dark rounded">
        <h4 className="text-electric-blue font-semibold mb-1">Overview</h4>
        <p className="text-brand-text-secondary text-sm">{guide.overview}</p>
        <div className="mt-2 flex gap-2 text-xs">
          <span className={`px-2 py-1 rounded ${
            guide.complexity === 'simple' ? 'bg-green-600' :
            guide.complexity === 'moderate' ? 'bg-yellow-600' : 'bg-red-600'
          }`}>
            {guide.complexity} complexity
          </span>
        </div>
      </div>

      {guide.recommendedOrder && (
        <div className="space-y-2">
          <h4 className="text-sakura-pink font-semibold">Recommended Watch Order:</h4>
          {guide.recommendedOrder.map((item: any, idx: number) => (
            <div key={idx} className="p-2 bg-brand-dark rounded text-sm">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-neon-cyan font-medium">{idx + 1}. {item.title}</span>
                  <span className="text-xs text-brand-text-secondary ml-2">({item.type}, {item.year})</span>
                </div>
                <div className="flex gap-1">
                  <span className={`text-xs px-1 py-0.5 rounded ${
                    item.importance === 'essential' ? 'bg-red-600' :
                    item.importance === 'recommended' ? 'bg-yellow-600' :
                    item.importance === 'optional' ? 'bg-blue-600' : 'bg-gray-600'
                  }`}>
                    {item.importance}
                  </span>
                  <span className="text-xs px-1 py-0.5 rounded bg-electric-blue">
                    {item.accessibilityRating}/5
                  </span>
                </div>
              </div>
              <p className="text-brand-text-secondary mt-1">{item.description}</p>
              {item.notes && <p className="text-yellow-400 text-xs mt-1">💡 {item.notes}</p>}
            </div>
          ))}
        </div>
      )}

      {guide.entryPoints && (
        <div className="p-3 bg-green-600/10 rounded border border-green-600/30">
          <h4 className="text-green-400 font-semibold mb-1">Best Entry Points:</h4>
          <ul className="text-sm space-y-1">
            {guide.entryPoints.map((point: string, idx: number) => (
              <li key={idx}>• {point}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] max-w-4xl w-full mx-auto neumorphic-card p-4 sm:p-6">
      <h2 className="text-2xl font-orbitron text-sakura-pink mb-4 text-center">Enhanced AniMuse AI</h2>

      {renderModeSelector()}
      {renderModeSpecificInputs()}

      {/* Example prompts based on mode */}
      {chatHistory.length === 0 && !isLoading && (
        <div className="mb-4 p-4 bg-brand-dark rounded-lg shadow-neumorphic-light-inset">
          <h3 className="text-lg font-orbitron text-neon-cyan mb-2">Try asking:</h3>
          <div className="grid grid-cols-1 gap-2">
            {getModeExamples().map((example, idx) => (
              <button
                key={idx}
                onClick={() => handleSubmit(example)}
                className="text-left p-2 bg-brand-surface text-brand-text rounded hover:bg-electric-blue hover:text-white transition-colors text-sm"
              >
                "{example}"
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chat history with enhanced rendering */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto mb-4 space-y-4 p-2 bg-brand-dark shadow-neumorphic-light-inset rounded-lg">
        {chatHistory.map((msg) => (
          <div key={msg.id} className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-lg p-3 rounded-xl shadow-md ${
              msg.type === "user" ? "bg-electric-blue text-white" :
              msg.type === "error" ? "bg-red-600 text-white" :
              "bg-brand-surface text-brand-text"
            }`}>
              <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
              
              {/* Render analysis results */}
              {msg.type === "analysis" && msg.analysis && renderAnalysisResult(msg.analysis)}
              
              {/* Render franchise guides */}
              {msg.type === "guide" && msg.guide && renderFranchiseGuide(msg.guide)}

              {/* Enhanced recommendation rendering */}
              {msg.type === "ai" && msg.recommendations && msg.recommendations.length > 0 && (
                <div className="mt-3 grid grid-cols-1 gap-3">
                  {msg.recommendations.map((anime, idx) => (
                    <div key={`${msg.id}-rec-${idx}`} className="bg-brand-dark rounded-lg p-3 shadow-inner">
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-shrink-0">
                          <img
                            src={anime.posterUrl || `https://via.placeholder.com/100x150.png?text=${encodeURIComponent(anime.title)}`}
                            alt={anime.title}
                            className="w-24 h-36 sm:w-32 sm:h-48 object-cover rounded-md shadow-md mx-auto sm:mx-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://via.placeholder.com/100x150.png?text=${encodeURIComponent(anime.title)}`;
                            }}
                          />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-md font-orbitron text-neon-cyan mb-1">{anime.title}</h3>
                          {anime.year && <p className="text-xs text-brand-text-secondary mb-1">{anime.year}</p>}
                          <p className="text-xs text-brand-text line-clamp-3 mb-2">{anime.description}</p>
                          {anime.reasoning && <p className="text-xs italic text-electric-blue/90 mt-1 mb-2">💡 {anime.reasoning}</p>}

                          {/* Enhanced tags based on AI mode */}
                          {anime.characterHighlights && (
                            <div className="mb-2">
                              <p className="text-xs text-sakura-pink font-semibold">Characters:</p>
                              <p className="text-xs text-brand-text-secondary">{anime.characterHighlights.join(", ")}</p>
                            </div>
                          )}
                          
                          {anime.plotTropes && (
                            <div className="mb-2">
                              <p className="text-xs text-sakura-pink font-semibold">Tropes:</p>
                              <p className="text-xs text-brand-text-secondary">{anime.plotTropes.join(", ")}</p>
                            </div>
                          )}
                          
                          {anime.artStyleTags && (
                            <div className="mb-2">
                              <p className="text-xs text-sakura-pink font-semibold">Art Style:</p>
                              <p className="text-xs text-brand-text-secondary">{anime.artStyleTags.join(", ")}</p>
                            </div>
                          )}
                          
                          {anime.surpriseFactors && (
                            <div className="mb-2">
                              <p className="text-xs text-sakura-pink font-semibold">Surprise Elements:</p>
                              <p className="text-xs text-brand-text-secondary">{anime.surpriseFactors.join(", ")}</p>
                            </div>
                          )}

                          {/* Standard tags */}
                          {anime.genres && anime.genres.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-1">
                              {anime.genres.slice(0, 3).map(genre => (
                                <span key={genre} className="text-xs bg-brand-surface px-1.5 py-0.5 rounded-full text-sakura-pink">
                                  {genre}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Action buttons */}
                          <div className="flex flex-wrap gap-2 mt-2">
                            <StyledButton
                              onClick={() => {/* Add to watchlist logic */}}
                              variant="primary_small"
                              className="text-xs"
                              disabled={!isAuthenticated}
                            >
                              Add to Watchlist
                            </StyledButton>
                            {anime.trailerUrl && (
                              <a href={anime.trailerUrl} target="_blank" rel="noopener noreferrer">
                                <StyledButton variant="secondary_small" className="text-xs">
                                  Trailer
                                </StyledButton>
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Feedback buttons */}
              {(msg.type === "ai" || msg.type === "analysis" || msg.type === "guide") && (
                <div className="mt-2 flex justify-end gap-1.5">
                  <button
                    onClick={() => {/* Handle feedback */}}
                    className={`p-1 rounded-md text-xs ${msg.feedback === "up" ? "bg-green-500 text-white" : "bg-brand-dark text-green-400 hover:bg-green-500 hover:text-white"}`}
                    disabled={!isAuthenticated || isLoading}
                  >
                    👍 Helpful
                  </button>
                  <button
                    onClick={() => {/* Handle feedback */}}
                    className={`p-1 rounded-md text-xs ${msg.feedback === "down" ? "bg-red-500 text-white" : "bg-brand-dark text-red-400 hover:bg-red-500 hover:text-white"}`}
                    disabled={!isAuthenticated || isLoading}
                  >
                    👎 Not helpful
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-xs p-3 rounded-lg bg-brand-surface text-brand-text shadow-neumorphic-light">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-neon-cyan"></div>
                <span className="text-sm">AniMuse is thinking...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input form */}
      <form onSubmit={handleSubmit} className="flex gap-2 items-center mt-auto">
        {aiMode !== "compare" && aiMode !== "hidden_gems" && (
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
              aiMode === "character" ? "Describe the character type you want..." :
              aiMode === "trope" ? "Describe the plot elements you're looking for..." :
              aiMode === "art_style" ? "Describe the visual style you want..." :
              aiMode === "franchise" ? "Enter franchise name..." :
              "Ask for anime recommendations..."
            }
            className="neumorphic-input flex-grow text-sm"
            disabled={isLoading || authIsLoading || !isAuthenticated}
          />
        )}
        
        <StyledButton 
          type="submit" 
          variant="primary" 
          disabled={
            isLoading || 
            authIsLoading || 
            !isAuthenticated || 
            (aiMode === "compare" ? (!animeA.trim() || !animeB.trim()) : 
             aiMode === "hidden_gems" ? false :
             !prompt.trim())
          }
        >
          {isLoading ? "..." : aiMode === "compare" ? "Compare" : "Send"}
        </StyledButton>
      </form>
      
      {!isAuthenticated && !authIsLoading && (
        <p className="text-xs text-yellow-400 mt-1 text-center">Please log in to chat with AniMuse.</p>
      )}
    </div>
  );
}