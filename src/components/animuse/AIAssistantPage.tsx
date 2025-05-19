import React, { useState, FormEvent, useRef, useEffect } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import StyledButton from "./shared/StyledButton";
import AnimeCard from "./AnimeCard"; // We'll create this next
import { toast } from "sonner";

// Define a type for the AI's recommendation structure
export interface AnimeRecommendation {
  _id?: Id<"anime">; // Optional: if we decide to store and link them
  title: string;
  description: string;
  posterUrl: string;
  genres: string[];
  year?: number;
  rating?: number;
  emotionalTags?: string[];
  trailerUrl?: string;
}

interface ChatMessage {
  type: "user" | "ai" | "error";
  content: string;
  recommendations?: AnimeRecommendation[];
}

export default function AIAssistantPage() {
  const [prompt, setPrompt] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const getAnimeRecommendation = useAction(api.ai.getAnimeRecommendation);
  const userProfile = useQuery(api.users.getMyUserProfile);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    const newUserMessage: ChatMessage = { type: "user", content: prompt };
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

      const result = await getAnimeRecommendation({ prompt, userProfile: profileData });

      if (result.error) {
        setChatHistory((prev) => [...prev, { type: "error", content: `Error: ${result.error}` }]);
        toast.error("AniMuse had trouble with that request.");
      } else if (result.recommendations && result.recommendations.length > 0) {
        setChatHistory((prev) => [
          ...prev,
          { type: "ai", content: "Here are some recommendations for you:", recommendations: result.recommendations as AnimeRecommendation[] },
        ]);
        toast.success("AniMuse found some anime for you!");
      } else {
        setChatHistory((prev) => [...prev, { type: "ai", content: "I couldn't find any specific recommendations for that, but I'm always learning! Try another prompt?" }]);
        toast.info("AniMuse couldn't find a match this time.");
      }
    } catch (error) {
      console.error("Failed to get recommendation:", error);
      setChatHistory((prev) => [...prev, { type: "error", content: "Sorry, something went wrong on my end." }]);
      toast.error("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] max-w-2xl w-full mx-auto neumorphic-card p-4 sm:p-6">
      <h2 className="text-2xl font-orbitron text-sakura-pink mb-4 text-center">AniMuse AI Concierge</h2>
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto mb-4 space-y-4 p-2 bg-brand-dark shadow-neumorphic-light-inset rounded-lg">
        {chatHistory.map((msg, index) => (
          <div key={index} className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-lg p-3 rounded-xl ${
                msg.type === "user" ? "bg-electric-blue text-white shadow-neumorphic-light" : 
                msg.type === "ai" ? "bg-brand-surface text-brand-text shadow-neumorphic-light" :
                "bg-red-500 text-white shadow-neumorphic-light"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.type === "ai" && msg.recommendations && (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {msg.recommendations.map((anime, idx) => (
                    <AnimeCard key={idx} anime={anime} isRecommendation={true} />
                  ))}
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
          placeholder="e.g., 'Something emotional like Clannad'"
          className="neumorphic-input flex-grow"
          disabled={isLoading}
        />
        <StyledButton type="submit" variant="primary" disabled={isLoading || !prompt.trim()}>
          {isLoading ? "Thinking..." : "Send"}
        </StyledButton>
      </form>
       <p className="text-xs text-brand-text-secondary mt-2 text-center">
        AniMuse AI uses placeholder images and trailer links if specific ones are not found.
      </p>
    </div>
  );
}
