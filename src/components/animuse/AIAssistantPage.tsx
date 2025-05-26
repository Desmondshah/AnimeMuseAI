import React, { useState, FormEvent, useRef, useEffect } from "react";
import { useAction, useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import StyledButton from "./shared/StyledButton";
// AnimeCard is now used on other pages, so we don't import it here for the AI rec display
import { toast } from "sonner";

// Define a type for the AI's recommendation structure
export interface AnimeRecommendation {
  _id?: Id<"anime">; // Optional: if we decide to store and link them
  title: string;
  description: string;
  reasoning?: string; // Added for Phase 1
  posterUrl: string;
  genres: string[];
  year?: number;
  rating?: number;
  emotionalTags?: string[];
  trailerUrl?: string;
  studios?: string[]; // Added for Phase 1
  themes?: string[]; // Added for Phase 1
}

interface ChatMessage {
  id: string;
  type: "user" | "ai" | "error";
  content: string;
  recommendations?: AnimeRecommendation[];
  feedback?: "up" | "down" | null;
}

export default function AIAssistantPage() {
  const [prompt, setPrompt] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const getAnimeRecommendation = useAction(api.ai.getAnimeRecommendation);
  const userProfile = useQuery(api.users.getMyUserProfile);
  const upsertToWatchlist = useMutation(api.anime.upsertToWatchlist);
  const addAnimeByUser = useMutation(api.anime.addAnimeByUser);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Example prompts for the user to try
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

  // Generate unique message ID
  const generateMessageId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const handleSubmit = async (e: FormEvent | string) => {
    if (e instanceof Object) e.preventDefault();

    // Extract prompt text from either event or string
    const promptText = typeof e === 'string' ? e : prompt;

    if (!promptText.trim()) return;

    const messageId = generateMessageId();
    const newUserMessage: ChatMessage = { id: messageId, type: "user", content: promptText };
    setChatHistory((prev) => [...prev, newUserMessage]);
    setIsLoading(true);
    setPrompt("");

    try {
      const profileData = userProfile ? {
        moods: userProfile.moods,
        genres: userProfile.genres,
        favoriteAnimes: userProfile.favoriteAnimes,
        experienceLevel: userProfile.experienceLevel,
      } : undefined;

      const result = await getAnimeRecommendation({ prompt: promptText, userProfile: profileData });

      if (result.error) {
        setChatHistory((prev) => [...prev, { id: generateMessageId(), type: "error", content: `Error: ${result.error}` }]);
        toast.error("AniMuse had trouble with that request.");
      } else if (result.recommendations && result.recommendations.length > 0) {
        setChatHistory((prev) => [
          ...prev,
          {
            id: generateMessageId(),
            type: "ai",
            content: "Here are some recommendations for you:",
            recommendations: result.recommendations as AnimeRecommendation[],
            feedback: null
          },
        ]);
        toast.success("AniMuse found some anime for you!");
      } else {
        setChatHistory((prev) => [...prev, {
          id: generateMessageId(),
          type: "ai",
          content: "I couldn't find any specific recommendations for that, but I'm always learning! Try another prompt?",
          feedback: null
        }]);
        toast.info("AniMuse couldn't find a match this time.");
      }
    } catch (error) {
      console.error("Failed to get recommendation:", error);
      setChatHistory((prev) => [...prev, { id: generateMessageId(), type: "error", content: "Sorry, something went wrong on my end." }]);
      toast.error("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeedback = (messageId: string, feedback: "up" | "down") => {
    setChatHistory(prev =>
      prev.map(msg =>
        msg.id === messageId ? { ...msg, feedback } : msg
      )
    );

    toast.success(feedback === "up"
      ? "Thanks for the positive feedback!"
      : "Thanks for your feedback. I'll try to do better next time.");

    // In a real app, you might want to store this feedback in your database
    // to improve recommendations over time
  };

  const handleAddToWatchlistAndDB = async (animeRec: AnimeRecommendation) => {
    // This function now primarily focuses on adding the recommended anime to the DB
    // and then adding it to the watchlist. AnimeCard handles its own watchlist interactions
    // once an anime is in the DB.
    try {
      toast.loading(`Adding ${animeRec.title} to database...`, { id: `add-db-${animeRec.title}` });

      const newAnimeId = await addAnimeByUser({
        title: animeRec.title,
        description: animeRec.description || "No description available.",
        posterUrl: animeRec.posterUrl || `https://via.placeholder.com/200x300.png?text=${encodeURIComponent(animeRec.title)}`,
        genres: animeRec.genres || [],
        year: animeRec.year,
        rating: animeRec.rating,
        emotionalTags: animeRec.emotionalTags || [],
        trailerUrl: animeRec.trailerUrl || `https://www.youtube.com/results?search_query=${encodeURIComponent(animeRec.title)}+trailer`,
        studios: animeRec.studios || [], // Added for Phase 1
        themes: animeRec.themes || [],   // Added for Phase 1
      });

      if (!newAnimeId) {
        throw new Error("Failed to get ID for new anime.");
      }
      toast.success(`${animeRec.title} added to database!`, { id: `add-db-${animeRec.title}` });

      toast.loading(`Adding ${animeRec.title} to watchlist...`, { id: `add-watchlist-${newAnimeId}` });
      await upsertToWatchlist({
        animeId: newAnimeId,
        status: "Plan to Watch"
      });
      toast.success(`${animeRec.title} added to your watchlist!`, { id: `add-watchlist-${newAnimeId}` });

    } catch (error) {
      console.error("Error adding recommended anime to DB/watchlist:", error);
      toast.error(`Failed to add ${animeRec.title}.`, { id: `add-db-${animeRec.title}` });
    }
  };


  return (
    <div className="flex flex-col h-[calc(100vh-200px)] max-w-2xl w-full mx-auto neumorphic-card p-4 sm:p-6">
      <h2 className="text-2xl font-orbitron text-sakura-pink mb-4 text-center">AniMuse AI Concierge</h2>

      {chatHistory.length === 0 && (
        <div className="mb-4 p-4 bg-brand-dark rounded-lg shadow-neumorphic-light-inset">
          <h3 className="text-lg font-orbitron text-neon-cyan mb-2">Try asking me:</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {examplePrompts.map((exPrompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSubmit(exPrompt)}
                className="text-left p-2 bg-brand-surface text-brand-text rounded hover:bg-electric-blue hover:text-white transition-colors"
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
              className={`max-w-lg p-3 rounded-xl ${
                msg.type === "user" ? "bg-electric-blue text-white shadow-neumorphic-light" :
                msg.type === "ai" ? "bg-brand-surface text-brand-text shadow-neumorphic-light" :
                "bg-red-500 text-white shadow-neumorphic-light"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>

              {msg.type === "ai" && msg.recommendations && (
                <div className="mt-3 grid grid-cols-1 gap-3">
                  {msg.recommendations.map((anime, idx) => (
                    <div key={idx} className="bg-brand-dark rounded-lg p-3 shadow-neumorphic-light">
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-shrink-0">
                          <img
                            src={anime.posterUrl || `https://via.placeholder.com/200x300.png?text=${encodeURIComponent(anime.title)}`}
                            alt={anime.title}
                            className="w-full sm:w-32 h-48 object-cover rounded-md shadow-md"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://via.placeholder.com/200x300.png?text=${encodeURIComponent(anime.title)}`;
                            }}
                          />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-orbitron text-neon-cyan mb-1">{anime.title}</h3>
                          {anime.year && <p className="text-xs text-brand-text-secondary mb-1">{anime.year}</p>}
                          <p className="text-sm text-brand-text line-clamp-3 mb-2">{anime.description}</p>
                          {anime.reasoning && <p className="text-xs italic text-electric-blue/90 mt-1 mb-2">Why it's for you: {anime.reasoning}</p>} {/* Display Reasoning */}

                          {anime.genres && anime.genres.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {anime.genres.slice(0, 3).map(genre => (
                                <span key={genre} className="text-xs bg-brand-surface px-2 py-0.5 rounded-full text-sakura-pink">
                                  {genre}
                                </span>
                              ))}
                              {anime.genres.length > 3 && (
                                <span className="text-xs bg-brand-surface px-2 py-0.5 rounded-full text-sakura-pink">
                                  +{anime.genres.length - 3} more
                                </span>
                              )}
                            </div>
                          )}
                           {anime.themes && anime.themes.length > 0 && (
                            <div className="mb-2">
                                <p className="text-xs text-brand-text-secondary">Themes: {anime.themes.join(", ")}</p>
                            </div>
                           )}
                           {anime.studios && anime.studios.length > 0 && (
                            <div className="mb-2">
                                <p className="text-xs text-brand-text-secondary">Studios: {anime.studios.join(", ")}</p>
                            </div>
                           )}

                          {anime.emotionalTags && anime.emotionalTags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {anime.emotionalTags.map(tag => (
                                <span key={tag} className="text-xs bg-brand-surface px-2 py-0.5 rounded-full text-electric-blue">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="flex flex-wrap gap-2 mt-3">
                            <StyledButton
                              onClick={() => handleAddToWatchlistAndDB(anime)}
                              variant="primary_small"
                            >
                              Add to DB & Watchlist
                            </StyledButton>

                            {anime.trailerUrl && (
                              <a href={anime.trailerUrl} target="_blank" rel="noopener noreferrer">
                                <StyledButton variant="secondary_small">
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
                <div className="mt-3 flex justify-end gap-2">
                  <button
                    onClick={() => handleFeedback(msg.id, "up")}
                    className={`p-1 rounded ${msg.feedback === "up" ? "bg-green-500 text-white" : "bg-brand-dark text-green-500 hover:bg-green-500 hover:text-white"}`}
                    aria-label="Thumbs up"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M8.864.046C7.908-.193 7.02.53 6.956 1.466c-.072 1.051-.23 2.016-.428 2.59-.125.36-.479 1.013-1.04 1.639-.557.623-1.282 1.178-2.131 1.41C2.685 7.288 2 7.87 2 8.72v4.001c0 .845.682 1.464 1.448 1.545 1.07.114 1.564.415 2.068.723l.048.03c.272.165.578.348.97.484.397.136.861.217 1.466.217h3.5c.937 0 1.599-.477 1.934-1.064a1.86 1.86 0 0 0 .254-.912c0-.152-.023-.312-.077-.464.201-.263.38-.578.488-.901.11-.33.172-.762.004-1.149.069-.13.12-.269.159-.403.077-.27.113-.568.113-.857 0-.288-.036-.585-.113-.856a2.144 2.144 0 0 0-.138-.362 1.9 1.9 0 0 0 .234-1.734c-.206-.592-.682-1.1-1.2-1.272-.847-.282-1.803-.276-2.516-.211a9.84 9.84 0 0 0-.443.05 9.365 9.365 0 0 0-.062-4.509A1.38 1.38 0 0 0 9.125.111L8.864.046zM11.5 14.721H8c-.51 0-.863-.069-1.14-.164-.281-.097-.506-.228-.776-.393l-.04-.024c-.555-.339-1.198-.731-2.49-.868-.333-.036-.554-.29-.554-.55V8.72c0-.254.226-.543.62-.65 1.095-.3 1.977-.996 2.614-1.708.635-.71 1.064-1.475 1.238-1.978.243-.7.407-1.768.482-2.85.025-.362.36-.594.667-.518l.262.066c.16.04.258.143.288.255a8.34 8.34 0 0 1-.145 4.725.5.5 0 0 0 .595.644l.003-.001.014-.003.058-.014a8.908 8.908 0 0 1 1.036-.157c.663-.06 1.457-.054 2.11.164.175.058.45.3.57.65.107.308.087.67-.266 1.022l-.353.353.353.354c.043.043.105.141.154.315.048.167.075.37.075.581 0 .212-.027.414-.075.582-.05.174-.111.272-.154.315l-.353.353.353.354c.047.047.109.177.005.488a2.224 2.224 0 0 1-.505.805l-.353.353.353.354c.006.005.041.05.041.17a.866.866 0 0 1-.121.416c-.165.288-.503.56-1.066.56z"/>
                    </svg>
                  </button>
                  <button
                    onClick={() => handleFeedback(msg.id, "down")}
                    className={`p-1 rounded ${msg.feedback === "down" ? "bg-red-500 text-white" : "bg-brand-dark text-red-500 hover:bg-red-500 hover:text-white"}`}
                    aria-label="Thumbs down"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M8.864 15.674c-.956.24-1.843-.484-1.908-1.42-.072-1.05-.23-2.015-.428-2.59-.125-.36-.479-1.012-1.04-1.638-.557-.624-1.282-1.179-2.131-1.41C2.685 8.432 2 7.85 2 7V3c0-.845.682-1.464 1.448-1.546 1.07-.113 1.564-.415 2.068-.723l.048-.029c.272-.166.578-.349.97-.484C6.931.08 7.395 0 8 0h3.5c.937 0 1.599.478 1.934 1.064.164.287.254.607.254.913 0 .152-.023.312-.077.464.201.262.38.577.488.9.11.33.172.762.004 1.15.069.13.12.268.159.403.077.27.113.567.113.856 0 .289-.036.586-.113.856-.035.12-.08.244-.138.363.394.571.418 1.2.234 1.733-.206.592-.682 1.1-1.2 1.272-.847.283-1.803.276-2.516.211a9.877 9.877 0 0 1-.443-.05 9.364 9.364 0 0 1-.062 4.51c-.138.508-.55.848-1.012.964l-.261.065zM11.5 1H8c-.51 0-.863.068-1.14.163-.281.097-.506.229-.776.393l-.04.025c-.555.338-1.198.73-2.49.866-.333.035-.554.29-.554.55v4c0 .255.226.543.62.65 1.095.3 1.977.997 2.614 1.709.635.71 1.064 1.475 1.238 1.977.243.7.407 1.768.482 2.85.025.362.36.595.667.518l.262-.065c.16-.04.258-.144.288-.255a8.34 8.34 0 0 0-.145-4.726.5.5 0 0 1 .595-.643h.003l.014.004.058.013a8.912 8.912 0 0 0 1.036.157c.663.06 1.457.054 2.11-.163.175-.059.45-.301.57-.651.107-.308.087-.67-.266-1.021l-.354-.354.353-.354c.043-.042.105-.14.154-.315.048-.167.075-.37.075-.581 0-.211-.027-.414-.075-.581-.05-.174-.111-.273-.154-.315l-.353-.354.353-.354c.047-.047.109-.176.005-.488a2.224 2.224 0 0 0-.505-.804l-.353-.354.353-.354c.006-.005.041-.05.041-.17a.866.866 0 0 0-.121-.415C12.4 1.272 12.063 1 11.5 1z"/>
                    </svg>
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
                <span>AniMuse is thinking...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 items-center">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask for anime recommendations..."
          className="neumorphic-input flex-grow"
          disabled={isLoading}
        />
        <StyledButton type="submit" variant="primary" disabled={isLoading || !prompt.trim()}>
          {isLoading ? "Thinking..." : "Send"}
        </StyledButton>
      </form>

      <p className="text-xs text-brand-text-secondary mt-2 text-center">
        AniMuse uses AI to recommend anime based on your preferences and query.
      </p>
    </div>
  );
}