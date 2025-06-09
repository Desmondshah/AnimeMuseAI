// Additional function to add to convex/anime.ts or create in convex/animeQueries.ts

import { query } from "./_generated/server";
import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";

// TESTABLE HANDLER FUNCTIONS
export async function getAnimeByTitleHandler(ctx: any, args: { title: string }): Promise<Doc<"anime"> | null> {
  // First try exact match
  const exactMatch = await ctx.db
    .query("anime")
    .filter((q: any) => q.eq(q.field("title"), args.title))
    .first();
  
  if (exactMatch) {
    return exactMatch;
  }
  
  // If no exact match, search using the search index without collecting all documents
  const searchTerm = args.title.toLowerCase();
  let cursor: string | null = null;
  let partialMatch: Doc<"anime"> | null = null;

  while (true) {
    const { page, isDone, continueCursor } = await ctx.db
      .query("anime")
      .withSearchIndex("search_title", (q: any) => q.search("title", args.title))
      .paginate({ cursor, numItems: 50 });

    for (const anime of page) {
      const titleLower = anime.title.toLowerCase();
      if (titleLower === searchTerm) {
        return anime;
      }
      if (
        !partialMatch &&
        (titleLower.includes(searchTerm) || searchTerm.includes(titleLower))
      ) {
        partialMatch = anime;
      }
    }

    if (isDone) break;
    cursor = continueCursor;
  }

  return partialMatch;
}

export async function searchAnimeByTitleHandler(ctx: any, args: { title: string; limit?: number }): Promise<Doc<"anime">[]> {
  const limit = args.limit || 5;
  const searchTerm = args.title.toLowerCase();
  
  const scoredMatches: { anime: Doc<"anime">; score: number }[] = [];
  let cursor: string | null = null;

  while (scoredMatches.length < limit) {
    const { page, isDone, continueCursor } = await ctx.db
      .query("anime")
      .withSearchIndex("search_title", (q: any) => q.search("title", args.title))
      .paginate({ cursor, numItems: 50 });

    for (const anime of page) {
      const titleLower = anime.title.toLowerCase();
      let score = 0;

      if (titleLower === searchTerm) {
        score = 100;
      } else if (titleLower.startsWith(searchTerm)) {
        score = 80;
      } else if (titleLower.includes(searchTerm)) {
        score = 60;
      } else if (searchTerm.includes(titleLower)) {
        score = 40;
      } else {
        continue;
      }

      scoredMatches.push({ anime, score });
    }

    if (isDone) break;
    cursor = continueCursor;
  }

  scoredMatches.sort((a, b) => b.score - a.score);
  return scoredMatches.slice(0, limit).map(m => m.anime);
}

// CONVEX QUERIES USING THE HANDLERS
export const getAnimeByTitle = query({
  args: { title: v.string() },
  handler: getAnimeByTitleHandler,
});

export const searchAnimeByTitle = query({
  args: { 
    title: v.string(),
    limit: v.optional(v.number())
  },
  handler: searchAnimeByTitleHandler,
});