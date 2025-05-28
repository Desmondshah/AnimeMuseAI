// src/components/animuse/AIAssistantPage.tsx
import React, { useState, FormEvent, useRef, useEffect } from "react";
import { useAction, useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import StyledButton from "./shared/StyledButton";
import { toast } from "sonner";

export interface AnimeRecommendation {
  _id?: Id<"anime">; // Optional: if we decide to store and link them
  title: string;
  description: string;
  reasoning?: string; 
  posterUrl: string;
  genres: string[];
  year?: number;
  rating?: number;
  emotionalTags?: string[];
  trailerUrl?: string;
  studios?: string[]; 
  themes?: string[]; 
}

interface ChatMessage {
  id: string;
  type: "user" | "ai" | "error";
  content: string;
  recommendations?: AnimeRecommendation[];
  feedback?: "up" | "down" | null;
  // PHASE 1: Store raw AI response for feedback context
  rawAiResponse?: any[]; 
  rawAiText?: string; 
}

export default function AIAssistantPage() {
  const [prompt, setPrompt] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const getAnimeRecommendationAction = useAction(api.ai.getAnimeRecommendation);
  const userProfile = useQuery(api.users.getMyUserProfile);
  const upsertToWatchlist = useMutation(api.anime.upsertToWatchlist);
  const addAnimeByUser = useMutation(api.anime.addAnimeByUser);
  
  const storeAiFeedback = useMutation(api.ai.storeAiFeedback);
  const { isAuthenticated, isLoading: authIsLoading } = useConvexAuth();
  // convexUser can be used to check if the user object is loaded, not directly for userId in storeAiFeedback
  const convexUser = useQuery(api.auth.loggedInUser); 


  const chatContainerRef = useRef<HTMLDivElement>(null);

  const examplePrompts = [
    "Suggest me something to watch tonight",
    "What's similar to Your Name?",
    "Which anime has a badass female lead?",
    "I want something that'll make me cry"
  ];

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const generateMessageId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const handleSubmit = async (e: FormEvent | string) => {
    if (e instanceof Object && typeof e.preventDefault === 'function') e.preventDefault();

    const currentPromptText = typeof e === 'string' ? e : prompt;
    if (!currentPromptText.trim()) return;

    const userMessageId = generateMessageId();
    const newUserMessage: ChatMessage = { id: userMessageId, type: "user", content: currentPromptText };
    setChatHistory((prev) => [...prev, newUserMessage]);
    setIsLoading(true);
    setPrompt("");

    const aiMessageId = generateMessageId(); 

    try {
      const profileDataForAI = userProfile ? {
        name: userProfile.name,
        moods: userProfile.moods,
        genres: userProfile.genres,
        favoriteAnimes: userProfile.favoriteAnimes,
        experienceLevel: userProfile.experienceLevel,
        dislikedGenres: userProfile.dislikedGenres,
        dislikedTags: userProfile.dislikedTags,
      } : undefined;

      // Ensure the AI action result type matches what's expected
      const result: { recommendations: AnimeRecommendation[]; error?: string | null; details?: any } = 
        await getAnimeRecommendationAction({
          prompt: currentPromptText,
          userProfile: profileDataForAI,
          messageId: aiMessageId, 
        });

      let aiResponseMessage: ChatMessage;

      if (result.error) {
        aiResponseMessage = {
          id: aiMessageId,
          type: "error",
          content: `Error: ${result.error}`,
          rawAiText: result.error, 
          feedback: null,
        };
        toast.error("AniMuse had trouble with that request.");
      } else if (result.recommendations && result.recommendations.length > 0) {
        aiResponseMessage = {
          id: aiMessageId,
          type: "ai",
          content: "Here are some recommendations for you:",
          recommendations: result.recommendations as AnimeRecommendation[],
          rawAiResponse: result.recommendations, 
          feedback: null,
        };
        toast.success("AniMuse found some anime for you!");
      } else {
        const noRecContent = "I couldn't find any specific recommendations for that, but I'm always learning! Try another prompt?";
        aiResponseMessage = {
          id: aiMessageId,
          type: "ai",
          content: noRecContent,
          rawAiText: noRecContent, 
          feedback: null,
        };
        toast.info("AniMuse couldn't find a match this time.");
      }
      setChatHistory((prev) => [...prev, aiResponseMessage]);

    } catch (error) {
      console.error("Failed to get recommendation:", error);
      const errorContent = "Sorry, something went wrong on my end.";
      const errorResponseMessage: ChatMessage = {
        id: aiMessageId,
        type: "error",
        content: errorContent,
        rawAiText: errorContent, 
        feedback: null,
      };
      setChatHistory((prev) => [...prev, errorResponseMessage]);
      toast.error("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeedback = async (messageId: string, feedbackType: "up" | "down") => {
    if (!isAuthenticated) { 
        toast.error("Please log in to provide feedback.");
        return;
    }

    const messageIndex = chatHistory.findIndex(msg => msg.id === messageId);
    if (messageIndex === -1 || chatHistory[messageIndex].type !== 'ai') return; // Only for AI messages

    const messageToUpdate = chatHistory[messageIndex];
    
    setChatHistory(prev =>
      prev.map(msg =>
        msg.id === messageId ? { ...msg, feedback: feedbackType } : msg
      )
    );

    toast.success(feedbackType === "up"
      ? "Thanks for the positive feedback!"
      : "Thanks! Your feedback helps AniMuse improve.");
    
    try {
        // Find the user prompt that led to this AI response.
        // This assumes user prompt is immediately before the AI response.
        let userActualPrompt = "N/A (Could not determine user prompt)";
        if (messageIndex > 0 && chatHistory[messageIndex - 1].type === 'user') {
            userActualPrompt = chatHistory[messageIndex - 1].content;
        }

        await storeAiFeedback({
            prompt: userActualPrompt, 
            aiAction: "getAnimeRecommendation", // This is specific to this page's AI action
            aiResponseRecommendations: messageToUpdate.rawAiResponse,
            aiResponseText: messageToUpdate.rawAiText,
            feedbackType: feedbackType,
            messageId: messageId, 
        });
    } catch (error) {
        console.error("Failed to store AI feedback:", error);
        toast.error("Could not save your feedback at this time.");
        setChatHistory(prev =>
            prev.map(msg =>
              msg.id === messageId ? { ...msg, feedback: messageToUpdate.feedback } : msg 
            )
          );
    }
  };

  const handleAddToWatchlistAndDB = async (animeRec: AnimeRecommendation) => {
    if (!isAuthenticated) {
        toast.error("Please log in to add to watchlist.");
        return;
    }
    try {
      const toastIdAddDb = `add-db-${animeRec.title}`;
      toast.loading(`Adding ${animeRec.title} to database...`, { id: toastIdAddDb });

      const newAnimeId = await addAnimeByUser({
        title: animeRec.title,
        description: animeRec.description || "No description available.",
        posterUrl: animeRec.posterUrl || `https://via.placeholder.com/200x300.png?text=${encodeURIComponent(animeRec.title)}`,
        genres: animeRec.genres || [],
        year: animeRec.year,
        rating: animeRec.rating,
        emotionalTags: animeRec.emotionalTags || [],
        trailerUrl: animeRec.trailerUrl || `https://www.youtube.com/results?search_query=${encodeURIComponent(animeRec.title)}+trailer`,
        studios: animeRec.studios || [], 
        themes: animeRec.themes || [],   
      });

      if (!newAnimeId) {
        throw new Error("Failed to get ID for new anime.");
      }
      toast.success(`${animeRec.title} added to database!`, { id: toastIdAddDb });

      const toastIdAddWl = `add-watchlist-${newAnimeId}`;
      toast.loading(`Adding ${animeRec.title} to watchlist...`, { id: toastIdAddWl });
      await upsertToWatchlist({
        animeId: newAnimeId,
        status: "Plan to Watch" // Default status when adding from AI
      });
      toast.success(`${animeRec.title} added to your watchlist!`, { id: toastIdAddWl });

    } catch (error: any) {
      console.error("Error adding recommended anime to DB/watchlist:", error);
      toast.error(error.data?.message || error.message || `Failed to add ${animeRec.title}.`);
    }
  };


  return (
    <div className="flex flex-col h-[calc(100vh-200px)] max-w-2xl w-full mx-auto neumorphic-card p-4 sm:p-6">
      <h2 className="text-2xl font-orbitron text-sakura-pink mb-4 text-center">AniMuse AI Concierge</h2>

      {chatHistory.length === 0 && !isLoading && (
        <div className="mb-4 p-4 bg-brand-dark rounded-lg shadow-neumorphic-light-inset">
          <h3 className="text-lg font-orbitron text-neon-cyan mb-2">Try asking me:</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {examplePrompts.map((exPrompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSubmit(exPrompt)}
                className="text-left p-2 bg-brand-surface text-brand-text rounded hover:bg-electric-blue hover:text-white transition-colors text-sm"
              >
                "{exPrompt}"
              </button>
            ))}
          </div>
        </div>
      )}

      <div ref={chatContainerRef} className="flex-1 overflow-y-auto mb-4 space-y-4 p-2 bg-brand-dark shadow-neumorphic-light-inset rounded-lg">
        {chatHistory.map((msg) => (
          <div key={msg.id} className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-lg p-3 rounded-xl shadow-md ${
                msg.type === "user" ? "bg-electric-blue text-white shadow-neumorphic-light" :
                msg.type === "ai" ? "bg-brand-surface text-brand-text shadow-neumorphic-light" :
                "bg-red-600 text-white shadow-neumorphic-light" 
              }`}
            >
              <p className="whitespace-pre-wrap text-sm">{msg.content}</p>

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
                          {anime.reasoning && <p className="text-xs italic text-electric-blue/90 mt-1 mb-2">Why it's for you: {anime.reasoning}</p>}

                          {anime.genres && anime.genres.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-1">
                              {anime.genres.slice(0, 3).map(genre => (
                                <span key={genre} className="text-xs bg-brand-surface px-1.5 py-0.5 rounded-full text-sakura-pink">
                                  {genre}
                                </span>
                              ))}
                            </div>
                          )}
                           {anime.themes && anime.themes.length > 0 && (
                            <p className="text-xs text-brand-text-secondary mt-1">Themes: {anime.themes.join(", ")}</p>
                           )}
                           {anime.studios && anime.studios.length > 0 && (
                             <p className="text-xs text-brand-text-secondary mt-1">Studios: {anime.studios.join(", ")}</p>
                           )}
                          {anime.emotionalTags && anime.emotionalTags.length > 0 && (
                            <p className="text-xs text-brand-text-secondary mt-1">Tags: {anime.emotionalTags.join(", ")}</p>
                          )}

                          <div className="flex flex-wrap gap-2 mt-2">
                            <StyledButton
                              onClick={() => handleAddToWatchlistAndDB(anime)}
                              variant="primary_small"
                              className="text-xs"
                              disabled={!isAuthenticated}
                            >
                              Add to DB & Watchlist
                            </StyledButton>

                            {anime.trailerUrl && (
                              <a href={anime.trailerUrl} target="_blank" rel="noopener noreferrer">
                                <StyledButton variant="secondary_small" className="text-xs">
                                  Watch Trailer
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

              {msg.type === "ai" && msg.feedback !== undefined && ( 
                <div className="mt-2 flex justify-end gap-1.5">
                  <button
                    onClick={() => handleFeedback(msg.id, "up")}
                    className={`p-1 rounded-md text-xs ${msg.feedback === "up" ? "bg-green-500 text-white" : "bg-brand-dark text-green-400 hover:bg-green-500 hover:text-white"}`}
                    aria-label="Thumbs up"
                    disabled={!isAuthenticated || isLoading} 
                  >
                    👍 Helpful
                  </button>
                  <button
                    onClick={() => handleFeedback(msg.id, "down")}
                    className={`p-1 rounded-md text-xs ${msg.feedback === "down" ? "bg-red-500 text-white" : "bg-brand-dark text-red-400 hover:bg-red-500 hover:text-white"}`}
                    aria-label="Thumbs down"
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

      <form onSubmit={handleSubmit} className="flex gap-2 items-center mt-auto">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask for anime recommendations..."
          className="neumorphic-input flex-grow text-sm"
          disabled={isLoading || authIsLoading || !isAuthenticated}
        />
        <StyledButton type="submit" variant="primary" disabled={isLoading || authIsLoading || !isAuthenticated || !prompt.trim()}>
          {isLoading ? "..." : "Send"}
        </StyledButton>
      </form>
      {!isAuthenticated && !authIsLoading && (
          <p className="text-xs text-yellow-400 mt-1 text-center">Please log in to chat with AniMuse.</p>
      )}

      <p className="text-xs text-brand-text-secondary mt-2 text-center">
        AniMuse uses AI to recommend anime. Responses may take a moment.
      </p>
    </div>
  );
}