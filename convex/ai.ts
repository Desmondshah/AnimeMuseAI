"use node";
import OpenAI from "openai";
import { action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";

const openai = new OpenAI({
  baseURL: process.env.CONVEX_OPENAI_BASE_URL,
  apiKey: process.env.CONVEX_OPENAI_API_KEY,
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
    // Construct a more detailed prompt for the AI
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
Return ONLY the JSON array. Do not include any other text before or after the JSON.
If you cannot find suitable anime, return an empty array [].
Limit to 3-5 recommendations.
For posterUrl, if you don't have a real one, use "https://via.placeholder.com/200x300.png?text=[ANIME_TITLE]". Replace [ANIME_TITLE] with the actual anime title, URL encoded.
For trailerUrl, if you don't have a real one, use "https://www.youtube.com/results?search_query=[ANIME_TITLE]+trailer". Replace [ANIME_TITLE] with the actual anime title, URL encoded.
Example of a single anime object:
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
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini", // or "gpt-4.1-nano"
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

      // The AI should return a string that is a JSON array.
      // Sometimes the model wraps the array in a top-level object like {"recommendations": [...] }
      // We need to parse it carefully.
      let parsedRecommendations = [];
      try {
        const jsonResponse = JSON.parse(content);
        if (Array.isArray(jsonResponse)) {
            parsedRecommendations = jsonResponse;
        } else if (jsonResponse && typeof jsonResponse === 'object' && Array.isArray(jsonResponse.recommendations)) {
            parsedRecommendations = jsonResponse.recommendations;
        } else {
            console.error("AI response is not a JSON array or expected object:", content);
            return { recommendations: [], error: "AI response format error. Expected an array or {recommendations: []}." };
        }
      } catch (e) {
        console.error("Failed to parse AI response:", e, content);
        return { recommendations: [], error: "Failed to parse AI response." };
      }
      
      // Optional: Save these AI generated anime to our database if they don't exist
      // This makes them searchable and available for others later.
      // For simplicity, we'll skip this step for now but it's a good enhancement.
      // const animeIds = [];
      // for (const anime of parsedRecommendations) {
      //   const existing = await ctx.runQuery(internal.anime.getAnimeByTitleInternal, { title: anime.title });
      //   if (existing) {
      //     animeIds.push(existing._id);
      //   } else {
      //     // Ensure all required fields are present or have defaults
      //     const newId = await ctx.runMutation(internal.anime.addAnimeInternal, {
      //       title: anime.title,
      //       description: anime.description || "No description available.",
      //       posterUrl: anime.posterUrl || \`https://via.placeholder.com/200x300.png?text=\${encodeURIComponent(anime.title)}\`,
      //       genres: anime.genres || [],
      //       year: anime.year,
      //       rating: anime.rating,
      //       emotionalTags: anime.emotionalTags || [],
      //       trailerUrl: anime.trailerUrl || \`https://www.youtube.com/results?search_query=\${encodeURIComponent(anime.title)}+trailer\`
      //     });
      //     animeIds.push(newId);
      //   }
      // }
      // For now, just return the AI's direct output
      return { recommendations: parsedRecommendations, error: null };

    } catch (error) {
      console.error("Error calling OpenAI:", error);
      return { recommendations: [], error: "Failed to get recommendations from AI." };
    }
  },
});
