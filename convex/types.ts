// src/components/animuse/shared/types.ts
import { Id } from "../convex/_generated/dataModel";

export interface AnimeRecommendation {
  _id?: Id<"anime">;
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
  // Enhanced fields from new AI actions
  characterHighlights?: string[];
  plotTropes?: string[];
  artStyleTags?: string[];
  surpriseFactors?: string[];
  similarityScore?: number;
  hiddenGemRating?: number;
  personalizationScore?: number;
  moodTags?: string[];
  roleSpecificInsight?: string;
  refinementExplanation?: string;
  narrativeComplexity?: number;
  animationQuality?: number;
}