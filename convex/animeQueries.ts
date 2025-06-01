// Additional function to add to convex/anime.ts or create in convex/animeQueries.ts

import { query } from "./_generated/server";
import { v } from "convex/values";

// Query to find anime by title (public version for frontend use)
export const getAnimeByTitle = query({
  args: { title: v.string() },
  handler: async (ctx, args) => {
    // First try exact match
    const exactMatch = await ctx.db
      .query("anime")
      .filter((q) => q.eq(q.field("title"), args.title))
      .first();
    
    if (exactMatch) {
      return exactMatch;
    }
    
    // If no exact match, try case-insensitive search
    const allAnime = await ctx.db.query("anime").collect();
    const caseInsensitiveMatch = allAnime.find(
      anime => anime.title.toLowerCase() === args.title.toLowerCase()
    );
    
    if (caseInsensitiveMatch) {
      return caseInsensitiveMatch;
    }
    
    // If still no match, try partial match
    const partialMatch = allAnime.find(
      anime => anime.title.toLowerCase().includes(args.title.toLowerCase()) ||
               args.title.toLowerCase().includes(anime.title.toLowerCase())
    );
    
    return partialMatch || null;
  },
});

// Query to search anime by title (returns multiple matches)
export const searchAnimeByTitle = query({
  args: { 
    title: v.string(),
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 5;
    const searchTerm = args.title.toLowerCase();
    
    const allAnime = await ctx.db.query("anime").collect();
    
    // Score matches based on relevance
    const scoredMatches = allAnime
      .map(anime => {
        const titleLower = anime.title.toLowerCase();
        let score = 0;
        
        // Exact match gets highest score
        if (titleLower === searchTerm) {
          score = 100;
        }
        // Starts with search term
        else if (titleLower.startsWith(searchTerm)) {
          score = 80;
        }
        // Contains search term
        else if (titleLower.includes(searchTerm)) {
          score = 60;
        }
        // Search term contains anime title (for shorter titles)
        else if (searchTerm.includes(titleLower)) {
          score = 40;
        }
        // No match
        else {
          return null;
        }
        
        return { anime, score };
      })
      .filter(Boolean)
      .sort((a, b) => b!.score - a!.score)
      .slice(0, limit)
      .map(match => match!.anime);
    
    return scoredMatches;
  },
});