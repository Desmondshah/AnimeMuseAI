// File: convex/ai.ts
"use node";
import OpenAI from "openai";
import { action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api"; // internal might be used later

// Initialize OpenAI client to use the proxy via CONVEX_OPENAI_BASE_URL
// This will be used by all actions in this file.
const openai = new OpenAI({
  baseURL: process.env.CONVEX_OPENAI_BASE_URL, // Your proxy URL
  apiKey: process.env.CONVEX_OPENAI_API_KEY,   // This key is for the proxy to use
});

// Optional: Test function to verify the proxy connection to OpenAI
export const testOpenAIProxyConnection = action({
  args: {},
  handler: async (_ctx) => {
    if (!process.env.CONVEX_OPENAI_API_KEY) {
      return { success: false, error: "API key not found in environment variables for proxy." };
    }
    if (!process.env.CONVEX_OPENAI_BASE_URL) {
      return { success: false, error: "CONVEX_OPENAI_BASE_URL not configured." };
    }

    try {
      console.log(`Testing OpenAI connection via proxy: ${process.env.CONVEX_OPENAI_BASE_URL}`);
      // This call will go through your Convex HTTP proxy
      const result = await openai.chat.completions.create({
        model: "gpt-3.5-turbo", // Or "gpt-4o-mini"
        messages: [
          { role: "user", content: "Say hello from the proxy test" }
        ],
        max_tokens: 10
      });

      return {
        success: true,
        message: result.choices[0].message.content,
        modelUsed: result.model // The actual model that responded
      };
    } catch (err) {
      const error = err as any; // OpenAI errors can have more details
      console.error("OpenAI proxy test failed:", error);
      return {
        success: false,
        error: "OpenAI proxy connection test failed",
        details: {
          message: error.message || "Unknown error",
          status: error.status,       // HTTP status code if available
          type: error.type,         // OpenAI error type
          code: error.code,         // OpenAI error code
          rawError: error.toString(), // Raw error string
        }
      };
    }
  }
});


export const getAnimeRecommendation = action({
  args: {
    prompt: v.string(),
    userProfile: v.optional(v.object({ // Pass relevant parts of user profile
        moods: v.optional(v.array(v.string())),
        genres: v.optional(v.array(v.string())),
        favoriteAnimes: v.optional(v.array(v.string())),
        experienceLevel: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    if (!process.env.CONVEX_OPENAI_API_KEY) {
      return { recommendations: [], error: "OpenAI API key is not configured for the proxy." };
    }
    if (!process.env.CONVEX_OPENAI_BASE_URL) {
      return { recommendations: [], error: "CONVEX_OPENAI_BASE_URL not configured." };
    }

    let systemPrompt = `You are AniMuse, an AI anime concierge.
Your goal is to recommend anime based on the user's request.
Provide recommendations as a JSON array of objects. Each object should represent an anime and include:
- title (string, e.g., "Attack on Titan")
- description (string, a brief 2-3 sentence summary)
- posterUrl (string, a placeholder like "https://via.placeholder.com/200x300.png?text=Anime+Poster" if unknown, otherwise a real URL if you know one)
- genres (array of strings, e.g., ["Action", "Dark Fantasy", "Drama"])
- year (number, e.g., 2013)
- rating (number, e.g., 9.1, if known)
- emotionalTags (array of strings, e.g., ["High Stakes", "Tragic", "Intense"])
- trailerUrl (string, a placeholder like "https://www.youtube.com/watch?v=example" if unknown)

Consider the user's profile if provided:`;

    if (args.userProfile) {
        if (args.userProfile.moods && args.userProfile.moods.length > 0) {
            systemPrompt += `\n- Current Moods: ${args.userProfile.moods.join(", ")}`;
        }
        if (args.userProfile.genres && args.userProfile.genres.length > 0) {
            systemPrompt += `\n- Preferred Genres: ${args.userProfile.genres.join(", ")}`;
        }
        if (args.userProfile.favoriteAnimes && args.userProfile.favoriteAnimes.length > 0) {
            systemPrompt += `\n- Favorite Animes: ${args.userProfile.favoriteAnimes.join(", ")} (try to recommend something similar or different based on the prompt)`;
        }
        if (args.userProfile.experienceLevel) {
            systemPrompt += `\n- Experience Level: ${args.userProfile.experienceLevel}`;
        }
    }
    systemPrompt += `\nUser's request: "${args.prompt}"
Return ONLY the JSON array of objects. Do not include any other text, markdown, or explanations before or after the JSON.
If you cannot find suitable anime, return an empty array [].
Limit to 3-5 recommendations.
For posterUrl, if you don't have a real one, use "https://via.placeholder.com/200x300.png?text=[ANIME_TITLE]". Replace [ANIME_TITLE] with the actual anime title, URL encoded.
For trailerUrl, if you don't have a real one, use "https://www.youtube.com/results?search_query=[ANIME_TITLE]+trailer".
Example of a single anime object in the array:
{
  "title": "Kimi no Na wa.",
  "description": "Two teenagers share a profound, magical connection upon discovering they are swapping bodies. Things manage to become even more complicated when the boy and girl decide to meet in person.",
  "posterUrl": "https://via.placeholder.com/200x300.png?text=Kimi+no+Na+wa.",
  "genres": ["Romance", "Supernatural", "Drama"],
  "year": 2016,
  "rating": 8.9,
  "emotionalTags": ["Heartfelt", "Bittersweet", "Beautiful Animation"],
  "trailerUrl": "https://www.youtube.com/results?search_query=Kimi+no+Na+wa.+trailer"
}
`;

    try {
      console.log(`Calling OpenAI via proxy: ${process.env.CONVEX_OPENAI_BASE_URL}/chat/completions for prompt: ${args.prompt}`);
      // This call will go through your Convex HTTP proxy
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Or your preferred model
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: args.prompt }
        ],
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0].message.content;
      if (!content) {
        console.error("No content received from AI via proxy.");
        return { recommendations: [], error: "No content from AI." };
      }

      let parsedRecommendations = [];
      try {
        const jsonResponse = JSON.parse(content);
        // Check if the response itself is the array (as requested from gpt-4o-mini with json_object)
        // or if it's nested under a "recommendations" key (less likely with strict prompting)
        if (Array.isArray(jsonResponse)) {
            parsedRecommendations = jsonResponse;
        } else if (jsonResponse && typeof jsonResponse === 'object' && Array.isArray(jsonResponse.recommendations)) {
             // Handle if model wraps output in { "recommendations": [...] } despite instructions
            parsedRecommendations = jsonResponse.recommendations;
        }
        else {
            console.error("AI response via proxy is not a JSON array or expected object:", content);
            // Attempt to extract array if it's a string containing JSON array like "{ \"recommendations\": [] }"
             if (typeof jsonResponse === 'object' && jsonResponse !== null) {
                // Look for any key that might contain the array
                const potentialArrayKey = Object.keys(jsonResponse).find(key => Array.isArray((jsonResponse as any)[key]));
                if (potentialArrayKey) {
                    parsedRecommendations = (jsonResponse as any)[potentialArrayKey];
                } else {
                     return { recommendations: [], error: "AI response format error. Expected an array or {recommendations: []}." };
                }
            } else {
                 return { recommendations: [], error: "AI response format error. Expected an array or {recommendations: []}." };
            }
        }
      } catch (e) {
        const parseError = e as Error;
        console.error("Failed to parse AI response from proxy:", parseError.message, "\nContent:", content);
        return { recommendations: [], error: `Failed to parse AI response: ${parseError.message}` };
      }

      return { recommendations: parsedRecommendations, error: null };

    } catch (error) {
      const err = error as any; // OpenAI errors can have more details
      console.error("Error calling OpenAI via proxy:", err);
      // Provide more detailed error if available from the SDK (which talks to your proxy)
      return {
        recommendations: [],
        error: `Failed to get recommendations from AI via proxy: ${err.message || "Unknown error"}`,
        details: { // Include details from the error object if they exist
            status: err.status,
            type: err.type,
            code: err.code,
            rawError: err.toString(),
        }
      };
    }
  },
});