// src/components/animuse/shared/types.ts
import { Id } from "../convex/_generated/dataModel";

export interface AnimeRecommendation {
  title: string;
  description: string;
  posterUrl: string;
  genres?: string[];
  year?: number;
  rating?: number;
  reasoning: string;
  emotionalTags?: string[];
  studios?: string[];
  themes?: string[];
  characterHighlights?: string[];
  plotTropes?: string[];
  artStyleTags?: string[];
  surpriseFactors?: string[];
  similarityScore?: number;
  moodMatchScore: number; // FIXED: Added required property
  trailerUrl?: string;
  targetEmotionalImpact?: string;
  moodReasoningDetailed?: string;
  // Additional optional fields for enhanced mood board
  moodCombination?: string[];
  moodAnalysis?: any;
  isEnhancedMoodRecommendation?: boolean;
  recommendationMode?: 'simple' | 'advanced';
  _id?: string; // For database navigation
  foundInDatabase?: boolean;
}