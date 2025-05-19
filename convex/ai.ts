"use node";
import { action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";

// Test function to verify OpenAI connection
export const testOpenAIConnection = action({
  args: {},
  handler: async (ctx) => {
    // Dynamically import OpenAI
    const { default: OpenAI } = await import("openai");
    
    if (!process.env.CONVEX_OPENAI_API_KEY) {
      return { success: false, error: "API key not found in environment variables" };
    }
    
    try {
      // Create OpenAI client
      const openai = new OpenAI({
        apiKey: process.env.CONVEX_OPENAI_API_KEY,
      });
      
      // Simple test using a basic model
      const result = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "user", content: "Say hello" }
        ],
        max_tokens: 10
      });
      
      return { 
        success: true, 
        message: result.choices[0].message.content,
        model: "gpt-3.5-turbo"
      };
    } catch (err) {
      // Properly handle unknown error type
      const error = err as any;
      console.error("OpenAI test failed:", error);
      
      return { 
        success: false, 
        error: "OpenAI connection test failed",
        details: {
          message: error.message || "Unknown error",
          status: error.status,
          type: error.type,
          code: error.code
        }
      };
    }
  }
});

// Fixed anime recommendation function
export const getAnimeRecommendation = action({
  args: {
    prompt: v.string(),
    userProfile: v.optional(v.object({
        moods: v.optional(v.array(v.string())),
        genres: v.optional(v.array(v.string())),
        favoriteAnimes: v.optional(v.array(v.string())),
        experienceLevel: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    // Dynamically import OpenAI
    const { default: OpenAI } = await import("openai");

    if (!process.env.CONVEX_OPENAI_API_KEY) {
      return { 
        recommendations: [], 
        error: "OpenAI API key is not configured." 
      };
    }

    // OpenAI initialization with just the API key
    const openai = new OpenAI({
      apiKey: process.env.CONVEX_OPENAI_API_KEY,
    });

    // Create system prompt
    let systemPrompt = `You are AniMuse, an AI anime concierge.
Your goal is to recommend anime based on the user's request.
Provide recommendations as a JSON array of objects. Each object should represent an anime and include:
- title (string, e.g., "Attack on Titan")
- description (string, a brief 2-3 sentence summary)
- posterUrl (string, a placeholder like "https://via.placeholder.com/200x300.png?text=Anime+Poster")
- genres (array of strings, e.g., ["Action", "Dark Fantasy", "Drama"])
- year (number, e.g., 2013)
- rating (number, e.g., 9.1, if known)
- emotionalTags (array of strings, e.g., ["High Stakes", "Tragic", "Intense"])
- trailerUrl (string, a placeholder like "https://www.youtube.com/watch?v=example")

Consider the user's profile if provided:`;

    if (args.userProfile) {
        if (args.userProfile.moods && args.userProfile.moods.length > 0) {
            systemPrompt += `\n- Current Moods: ${args.userProfile.moods.join(", ")}`;
        }
        if (args.userProfile.genres && args.userProfile.genres.length > 0) {
            systemPrompt += `\n- Preferred Genres: ${args.userProfile.genres.join(", ")}`;
        }
        if (args.userProfile.favoriteAnimes && args.userProfile.favoriteAnimes.length > 0) {
            systemPrompt += `\n- Favorite Animes: ${args.userProfile.favoriteAnimes.join(", ")}`;
        }
        if (args.userProfile.experienceLevel) {
            systemPrompt += `\n- Experience Level: ${args.userProfile.experienceLevel}`;
        }
    }
    
    systemPrompt += `\nUser's request: "${args.prompt}"
Return ONLY the JSON array. Do not include any other text before or after the JSON.
Limit to 3-5 recommendations.
For posterUrl, if you don't have a real one, use "https://via.placeholder.com/200x300.png?text=[ANIME_TITLE]". Replace [ANIME_TITLE] with the actual anime title, URL encoded.
For trailerUrl, if you don't have a real one, use "https://www.youtube.com/results?search_query=[ANIME_TITLE]+trailer".`;

    try {
      console.log("Calling OpenAI API...");
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo", // Using a standard model
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: args.prompt }
        ],
        response_format: { type: "json_object" }, // Request JSON output
      });

      const content = completion.choices[0].message.content;
      if (!content) {
        return { recommendations: [], error: "No content from AI." };
      }

      let parsedRecommendations = [];
      try {
        const jsonResponse = JSON.parse(content);
        if (Array.isArray(jsonResponse)) {
            parsedRecommendations = jsonResponse;
        } else if (jsonResponse && typeof jsonResponse === 'object' && Array.isArray(jsonResponse.recommendations)) {
            parsedRecommendations = jsonResponse.recommendations;
        } else {
            console.error("AI response is not expected format:", content);
            return { recommendations: [], error: "AI response format error." };
        }
      } catch (err) {
        const parseError = err as Error;
        console.error("Failed to parse AI response:", parseError, content);
        return { recommendations: [], error: "Failed to parse AI response." };
      }
      
      return { recommendations: parsedRecommendations, error: null };

    } catch (err) {
      // Properly handle unknown error type
      const error = err as any;
      console.error("Error calling OpenAI:", error);
      
      return { 
        recommendations: [], 
        error: `Failed to get recommendations: ${error.message || "Unknown error"}`
      };
    }
  },
});