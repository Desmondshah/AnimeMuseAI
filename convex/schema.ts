import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  userProfiles: defineTable({
    userId: v.id("users"), // Links to the _id of the users table from authTables
    name: v.optional(v.string()),
    moods: v.optional(v.array(v.string())),
    genres: v.optional(v.array(v.string())),
    favoriteAnimes: v.optional(v.array(v.string())),
    experienceLevel: v.optional(v.string()), // e.g., "Newbie", "Casual", "Otaku"
    onboardingCompleted: v.boolean(),
    avatarUrl: v.optional(v.string()),
  }).index("by_userId", ["userId"]),

  anime: defineTable({
    title: v.string(),
    description: v.string(),
    posterUrl: v.string(), // URL to the poster image
    genres: v.array(v.string()),
    year: v.optional(v.number()),
    rating: v.optional(v.number()), // e.g., 8.5
    emotionalTags: v.optional(v.array(v.string())), // e.g., "Heartwarming", "Tragic"
    trailerUrl: v.optional(v.string()), // URL to a trailer video
    // Potential future fields: episodes, status (airing/finished), studio
  })
  .index("by_title", ["title"])
  .searchIndex("search_title", { searchField: "title" })
  .searchIndex("search_description", { searchField: "description" })
  .searchIndex("search_genres", { searchField: "genres", filterFields: ["title"] }),


  watchlist: defineTable({
    userId: v.id("users"),
    animeId: v.id("anime"),
    status: v.string(), // e.g., "Watching", "Completed", "Dropped", "Plan to Watch"
    progress: v.optional(v.number()), // e.g., episodes watched
    userRating: v.optional(v.number()), // User's rating for the anime
  })
  .index("by_user_anime", ["userId", "animeId"])
  .index("by_userId", ["userId"]),

  // Example for storing AI chat messages if needed later
  // aiChatMessages: defineTable({
  //   userId: v.id("users"),
  //   prompt: v.string(),
  //   response: v.string(), // Could be JSON string of recommended anime
  //   timestamp: v.number(),
  // }).index("by_user", ["userId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
