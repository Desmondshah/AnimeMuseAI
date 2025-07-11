// src/components/animuse/AnimeDetailPage.tsx - Complete with Dynamic UI Theming and Episode Preview
import React, { useState, useEffect, useCallback, memo, useRef } from "react";
import { useQuery, useMutation, useAction, useConvexAuth, usePaginatedQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id, Doc } from "../../../convex/_generated/dataModel";
import StyledButton from "./shared/StyledButton";
import { toast } from "sonner";
import ReviewCard, { ReviewProps as ClientReviewProps } from "./onboarding/ReviewCard";
import ReviewForm from "./onboarding/ReviewForm";
import AnimeCard from "./AnimeCard";
import { AnimeRecommendation } from "../../../convex/types";
import { formatDistanceToNow } from 'date-fns';
import { useMobileOptimizations } from "../../hooks/useMobileOptimizations";
import { motion, AnimatePresence } from 'framer-motion';
import { EnhancedEpisodesTab } from "./EnhancedEpisodesTab";

// ============================================================================
// COLOR EXTRACTION UTILITIES
// ============================================================================

interface ExtractedColors {
  dominant: string;
  palette: string[];
  light: string;
  dark: string;
  accent: string;
  complementary: string;
}

interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  light: string;
  dark: string;
  gradient: string;
  gradientReverse: string;
}

/**
 * Convert RGB to HSL for better color manipulation
 */
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return [h * 360, s * 100, l * 100];
}

/**
 * Convert HSL back to RGB
 */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360;
  s /= 100;
  l /= 100;

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };

  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

/**
 * Get complementary color
 */
function getComplementaryColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  
  const [h, s, l] = rgbToHsl(r, g, b);
  const compH = (h + 180) % 360;
  const [compR, compG, compB] = hslToRgb(compH, s, l);
  
  return `#${compR.toString(16).padStart(2, '0')}${compG.toString(16).padStart(2, '0')}${compB.toString(16).padStart(2, '0')}`;
}

/**
 * Adjust color brightness
 */
function adjustBrightness(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  
  const [h, s, l] = rgbToHsl(r, g, b);
  const newL = Math.max(0, Math.min(100, l + factor));
  const [newR, newG, newB] = hslToRgb(h, s, newL);
  
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

/**
 * Extract dominant colors from an image using canvas sampling
 * Note: May fail for external images due to CORS restrictions
 */
const extractColorsFromImage = async (imageElement: HTMLImageElement): Promise<ExtractedColors> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      console.warn('🎨 Canvas context not available, using defaults');
      resolve({
        dominant: '#ECB091',
        palette: ['#ECB091', '#8B4513', '#D2691E'],
        light: '#F5E6D3',
        dark: '#654321',
        accent: '#FF6B35',
        complementary: '#4A90E2'
      });
      return;
    }

    // Sample the image at a smaller resolution for performance
    const sampleSize = 50;
    canvas.width = sampleSize;
    canvas.height = sampleSize;
    
    try {
      ctx.drawImage(imageElement, 0, 0, sampleSize, sampleSize);
      
      // Try to get image data - this may fail due to CORS
      let imageData;
      try {
        imageData = ctx.getImageData(0, 0, sampleSize, sampleSize);
      } catch (corsError) {
        console.warn('🎨 CORS restriction prevented color extraction, using image-based fallback');
        // Fallback: generate colors based on image source URL and filename
        const urlParts = imageElement.src.split('/').pop() || '';
        const filename = urlParts.split('.')[0] || '';
        
        // Create a more sophisticated hash from URL
        let urlHash = 0;
        for (let i = 0; i < filename.length; i++) {
          urlHash = ((urlHash << 5) - urlHash) + filename.charCodeAt(i);
          urlHash = urlHash & urlHash; // Convert to 32-bit integer
        }
        
        // Generate multiple hues for a richer palette
        const baseHue = Math.abs(urlHash) % 360;
        const saturation = 45 + (Math.abs(urlHash >> 8) % 40); // 45-85% saturation
        const lightness = 35 + (Math.abs(urlHash >> 16) % 20); // 35-55% lightness
        
        const [r, g, b] = hslToRgb(baseHue, saturation, lightness);
        const dominantHex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        
        // Generate a small palette with variations
        const palette = [
          dominantHex,
          adjustBrightness(dominantHex, -15),
          adjustBrightness(dominantHex, 15),
        ];
        
        console.log('🎨 Generated CORS fallback colors:', { dominant: dominantHex, source: 'url-hash' });
        
        resolve({
          dominant: dominantHex,
          palette: palette,
          light: adjustBrightness(dominantHex, 30),
          dark: adjustBrightness(dominantHex, -40),
          accent: adjustBrightness(dominantHex, 10),
          complementary: getComplementaryColor(dominantHex)
        });
        return;
      }
      
      const data = imageData.data;

      // Count color frequency
      const colorMap = new Map<string, number>();

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        // Skip transparent pixels
        if (a < 128) continue;

        // Group similar colors (reduce precision for clustering)
        const colorKey = `${Math.floor(r/32)*32}-${Math.floor(g/32)*32}-${Math.floor(b/32)*32}`;
        colorMap.set(colorKey, (colorMap.get(colorKey) || 0) + 1);
      }

      // Convert to array and sort by frequency
      const sortedColors = Array.from(colorMap.entries())
        .map(([color, count]) => {
          const [r, g, b] = color.split('-').map(Number);
          return { r, g, b, count };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 8); // Get top 8 colors

      if (sortedColors.length === 0) {
        resolve({
          dominant: '#ECB091',
          palette: ['#ECB091', '#8B4513', '#D2691E'],
          light: '#F5E6D3',
          dark: '#654321',
          accent: '#FF6B35',
          complementary: '#4A90E2'
        });
        return;
      }

      // Find the most vibrant and prominent color as dominant
      let dominantColor = sortedColors[0];
      let bestScore = 0;

      for (const color of sortedColors.slice(0, 5)) {
        const [h, s, l] = rgbToHsl(color.r, color.g, color.b);
        
        // Score based on saturation, lightness, and frequency
        // Prefer colors that are vibrant but not too dark or too light
        const saturationScore = s / 100;
        const lightnessScore = l > 20 && l < 80 ? 1 : 0.5; // Prefer mid-range lightness
        const frequencyScore = Math.min(color.count / sortedColors[0].count, 1);
        
        const totalScore = saturationScore * 0.4 + lightnessScore * 0.3 + frequencyScore * 0.3;
        
        if (totalScore > bestScore) {
          bestScore = totalScore;
          dominantColor = color;
        }
      }

      const dominant = `#${dominantColor.r.toString(16).padStart(2, '0')}${dominantColor.g.toString(16).padStart(2, '0')}${dominantColor.b.toString(16).padStart(2, '0')}`;

      // Create palette from top colors
      const palette = sortedColors.slice(0, 5).map(color => 
        `#${color.r.toString(16).padStart(2, '0')}${color.g.toString(16).padStart(2, '0')}${color.b.toString(16).padStart(2, '0')}`
      );

      // Generate variations
      const light = adjustBrightness(dominant, 30);
      const dark = adjustBrightness(dominant, -40);
      const accent = adjustBrightness(dominant, 15);
      const complementary = getComplementaryColor(dominant);

      resolve({
        dominant,
        palette,
        light,
        dark,
        accent,
        complementary
      });

    } catch (error) {
      console.warn('🎨 Color extraction failed, using defaults:', error);
      resolve({
        dominant: '#ECB091',
        palette: ['#ECB091', '#8B4513', '#D2691E'],
        light: '#F5E6D3',
        dark: '#654321',
        accent: '#FF6B35',
        complementary: '#4A90E2'
      });
    }
  });
};

/**
 * Generate a cohesive color palette from extracted colors
 * Keeps the original dominant color as primary for better fidelity
 */
const generateThemePalette = (extractedColors: ExtractedColors): ColorPalette => {
  const { dominant, palette, light, dark, complementary } = extractedColors;
  
  // Use the second most prominent color as accent if available, otherwise lighten dominant
  const accent = palette.length > 1 ? palette[1] : adjustBrightness(dominant, 10);
  
  // Use a harmonious color instead of pure complementary
  const [h, s, l] = rgbToHsl(
    parseInt(dominant.slice(1, 3), 16),
    parseInt(dominant.slice(3, 5), 16),
    parseInt(dominant.slice(5, 7), 16)
  );
  
  // Create a harmonious secondary color (analogous, not complementary)
  const harmoniousHue = (h + 60) % 360; // 60 degrees for analogous harmony
  const [secR, secG, secB] = hslToRgb(harmoniousHue, Math.max(30, s * 0.8), l);
  const harmonious = `#${secR.toString(16).padStart(2, '0')}${secG.toString(16).padStart(2, '0')}${secB.toString(16).padStart(2, '0')}`;
  
  return {
    primary: dominant,        // Keep the true dominant color
    secondary: harmonious,    // Use harmonious instead of complementary
    accent: accent,           // Use second color from palette or subtle variant
    light: light,
    dark: dark,
    gradient: `linear-gradient(135deg, ${dominant}, ${accent})`,
    gradientReverse: `linear-gradient(135deg, ${accent}, ${dominant})`
  };
};

// ============================================================================
// EXISTING INTERFACES AND COMPONENTS
// ============================================================================

interface BackendReviewProps extends Doc<"reviews"> {
  userName: string; userAvatarUrl?: string; upvotes: number; downvotes: number;
  currentUserVote: "up" | "down" | null; commentCount: number;
}

interface BackendCommentProps extends Doc<"reviewComments"> {
  userName: string; userAvatarUrl?: string;
  replies: (Doc<"reviewComments"> & { userName: string; userAvatarUrl?: string })[];
}

interface AnimeDetailPageProps {
  animeId: Id<"anime">; 
  onBack: () => void;
  navigateToDetail: (animeId: Id<"anime">) => void;
  onCharacterClick: (character: any, animeName: string) => void;
}

interface CustomListType {
  _id: Id<"customLists">;
  listName: string;
  description?: string;
  isPublic: boolean;
  animeIds: Id<"anime">[];
}

interface EnhancedCharacterType {
  id?: number;
  name: string;
  imageUrl?: string;
  role: string;
  description?: string;
  status?: string;
  gender?: string;
  age?: string;
  dateOfBirth?: {
    year?: number;
    month?: number;
    day?: number;
  };
  bloodType?: string;
  height?: string;
  weight?: string;
  species?: string;
  powersAbilities?: string[];
  weapons?: string[];
  nativeName?: string;
  siteUrl?: string;
  voiceActors?: {
    id?: number;
    name: string;
    language: string;
    imageUrl?: string;
  }[];
  relationships?: {
    relatedCharacterId?: number;
    relationType: string;
  }[];
  // FIXED: Added "skipped" to the union type to match the backend
  enrichmentStatus?: "pending" | "success" | "failed" | "skipped";
  personalityAnalysis?: string;
  keyRelationships?: Array<{
    relatedCharacterName: string;
    relationshipDescription: string;
    relationType: string;
  }>;
  detailedAbilities?: Array<{
    abilityName: string;
    abilityDescription: string;
    powerLevel?: string;
  }>;
  majorCharacterArcs?: string[];
  trivia?: string[];
  backstoryDetails?: string;
  characterDevelopment?: string;
  notableQuotes?: string[];
  symbolism?: string;
  fanReception?: string;
  culturalSignificance?: string;
  enrichmentTimestamp?: number;
}


// Smart refresh indicator component with dynamic theming
const DataFreshnessIndicator: React.FC<{ 
  freshnessScore: number; 
  priority: string; 
  lastFetched?: number; 
  isRefreshing?: boolean;
  onRefresh?: () => void;
  themePalette?: ColorPalette;
}> = ({ freshnessScore, priority, lastFetched, isRefreshing, onRefresh, themePalette }) => {
  const getStatusColor = () => {
    if (!themePalette) {
      if (priority === "critical") return "text-red-400 bg-red-500/20 border-red-500/30";
      if (priority === "high") return "text-orange-400 bg-orange-500/20 border-orange-500/30";
      if (priority === "medium") return "text-yellow-400 bg-yellow-500/20 border-yellow-500/30";
      if (priority === "low") return "text-blue-400 bg-blue-500/20 border-blue-500/30";
      return "text-green-400 bg-green-500/20 border-green-500/30";
    }

    // Use theme colors
    const baseStyle = `border-white/20`;
    if (priority === "critical") return `text-red-400 bg-red-500/20 ${baseStyle}`;
    if (priority === "high") return `text-orange-400 bg-orange-500/20 ${baseStyle}`;
    if (priority === "medium") return `text-yellow-400 bg-yellow-500/20 ${baseStyle}`;
    if (priority === "low") return `text-blue-400 bg-blue-500/20 ${baseStyle}`;
    return `text-green-400 bg-green-500/20 ${baseStyle}`;
  };

  const getStatusIcon = () => {
    if (isRefreshing) return "🔄";
    if (priority === "critical") return "⚠️";
    if (priority === "high") return "📊";
    if (priority === "medium") return "📈";
    if (priority === "low") return "📉";
    return "✅";
  };

  const getStatusText = () => {
    if (isRefreshing) return "Updating...";
    if (priority === "critical") return "Critical Update Needed";
    if (priority === "high") return "Update Recommended";
    if (priority === "medium") return "Consider Updating";
    if (priority === "low") return "Minor Updates Available";
    return "Data is Fresh";
  };

  const dynamicStyle = themePalette ? {
    backgroundColor: `${themePalette.primary}15`,
    borderColor: `${themePalette.primary}40`,
    color: themePalette.light
  } : {};

  return (
    <div 
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs border backdrop-blur-sm ${getStatusColor()}`}
      style={priority !== "critical" && priority !== "high" ? dynamicStyle : {}}
    >
      <span className={isRefreshing ? "animate-spin" : ""}>{getStatusIcon()}</span>
      <span className="font-medium">{getStatusText()}</span>
      {lastFetched && (
        <span className="opacity-75">
          • {formatDistanceToNow(new Date(lastFetched), { addSuffix: true })}
        </span>
      )}
      {onRefresh && priority !== "skip" && !isRefreshing && (
        <button
          onClick={onRefresh}
          className="ml-1 opacity-75 hover:opacity-100 transition-opacity"
          title="Refresh now"
        >
          🔄
        </button>
      )}
    </div>
  );
};

// iOS-style loading component with dynamic theming
const IOSLoadingSpinner: React.FC<{ message?: string; themePalette?: ColorPalette }> = memo(({ 
  message = "Loading...", 
  themePalette 
}) => {
  const primaryColor = themePalette?.primary || '#ECB091';
  const accentColor = themePalette?.accent || '#FF6B35';

  return (
    <div className="ios-loading-spinner flex flex-col justify-center items-center py-16">
      <div className="relative">
        <div 
          className="w-20 h-20 border-4 border-transparent rounded-full animate-spin"
          style={{
            borderTopColor: primaryColor,
            borderRightColor: accentColor
          }}
        ></div>
        <div 
          className="absolute top-2 left-2 w-16 h-16 border-4 border-transparent rounded-full animate-spin animate-reverse"
          style={{
            borderBottomColor: themePalette?.secondary || '#4A90E2',
            borderLeftColor: 'rgba(255, 255, 255, 0.5)'
          }}
        ></div>
        <div 
          className="absolute top-6 left-6 w-8 h-8 rounded-full animate-pulse"
          style={{
            background: themePalette?.gradient || `linear-gradient(to right, ${primaryColor}, ${accentColor})`
          }}
        ></div>
      </div>
      <p className="mt-4 text-lg text-white/80 font-medium animate-pulse">{message}</p>
    </div>
  );
});

// iOS-style tab bar component with dynamic theming
const IOSTabBar: React.FC<{
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabs: Array<{ id: string; label: string; icon: string }>;
  themePalette?: ColorPalette;
}> = ({ activeTab, onTabChange, tabs, themePalette }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const activeButtonStyle = themePalette ? {
    background: themePalette.gradient,
    boxShadow: `0 4px 15px ${themePalette.primary}30`
  } : {};

  return (
    <div className="ios-tab-bar sticky top-0 z-50 bg-black/40 backdrop-blur-lg border-b border-white/20">
      <div 
        ref={scrollRef}
        className="flex overflow-x-auto scrollbar-hide px-4 py-3 gap-2"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`ios-tab-button flex-shrink-0 px-4 py-2 rounded-2xl text-sm font-medium transition-all duration-300 ${
              activeTab === tab.id 
                ? 'text-white shadow-lg' 
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
            style={activeTab === tab.id ? activeButtonStyle : {}}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
};

// Enhanced character card component with dynamic theming
const CharacterCard: React.FC<{
  character: EnhancedCharacterType;
  onClick: () => void;
  themePalette?: ColorPalette;
}> = memo(({ character, onClick, themePalette }) => {
  // Safety check for character data
  if (!character || !character.name) {
    return null;
  }

  const cardStyle = themePalette ? {
    borderColor: `${themePalette.primary}30`
  } : {};

  const roleStyle = themePalette ? {
    backgroundColor: character.role === "MAIN" 
      ? `${themePalette.accent}80` 
      : character.role === "SUPPORTING"
      ? `${themePalette.secondary}80`
      : `${themePalette.dark}80`
  } : {};

  return (
    <div
      onClick={onClick}
      className="group relative w-full bg-black/60 backdrop-blur-lg border border-white/20 rounded-3xl overflow-hidden cursor-pointer transition-all duration-500 hover:scale-105"
      style={cardStyle}
    >
      {/* Character Image */}
      <div className="relative aspect-[3/4] overflow-hidden">
        {character.imageUrl ? (
          <img
            src={character.imageUrl}
            alt={character.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://placehold.co/300x400/ECB091/321D0B/png?text=${encodeURIComponent(character.name.charAt(0))}&font=poppins`;
            }}
          />
        ) : (
          <div 
            className="w-full h-full flex items-center justify-center"
            style={{
              background: themePalette?.gradient || 'linear-gradient(135deg, rgba(236, 176, 145, 0.3), rgba(255, 107, 53, 0.3))'
            }}
          >
            <span className="text-4xl font-bold text-white/60">
              {character.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Role badge */}
        <div className="absolute top-3 right-3">
          <span 
            className={`text-xs px-2 py-1 rounded-full font-medium backdrop-blur-sm border border-white/30`}
            style={roleStyle}
          >
            {character.role === "MAIN" && "⭐"}
            {character.role === "SUPPORTING" && "🎭"}
            {character.role === "BACKGROUND" && "👤"}
            <span className="ml-1 text-white">{character.role || "Unknown"}</span>
          </span>
        </div>

        {/* AI Enhancement badge */}
         {character.enrichmentStatus === "success" && (
          <div className="absolute top-3 left-3">
            <span 
              className="text-xs px-2 py-1 rounded-full font-medium backdrop-blur-sm border border-purple-400/50"
              style={{
                background: themePalette ? 
                  `linear-gradient(135deg, ${themePalette.secondary}90, ${themePalette.accent}90)` : 
                  'linear-gradient(135deg, rgba(139, 92, 246, 0.9), rgba(59, 130, 246, 0.9))'
              }}
            >
              🤖 <span className="ml-1 text-white">AI</span>
            </span>
          </div>
        )}

        {/* Hover content */}
        <div className="absolute bottom-0 left-0 right-0 p-4 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <h3 className="text-white font-semibold text-lg mb-2 line-clamp-2">
            {character.name}
          </h3>
          {character.description && (
            <p className="text-white/80 text-sm line-clamp-3 mb-3">
              {character.description}
            </p>
          )}
          <div className="flex items-center gap-2 text-xs text-white/70">
            {character.age && <span>Age: {character.age}</span>}
            {character.age && character.gender && <span>•</span>}
            {character.gender && <span>{character.gender}</span>}
          </div>
        </div>
      </div>
    </div>
  );
});

// Enhanced episode card component with dynamic theming and preview functionality
const CinematicEpisodeCard: React.FC<{
  episode: any;
  index: number;
  themePalette?: ColorPalette;
  onPreview?: (previewUrl: string) => void;
  onWatch?: (url: string) => void;
  isWatched?: boolean;
  watchProgress?: number;
  isFeatured?: boolean;
}> = ({ 
  episode, 
  index, 
  themePalette, 
  onPreview, 
  onWatch, 
  isWatched = false, 
  watchProgress = 0,
  isFeatured = false 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  
  const cardRef = useRef<HTMLDivElement>(null);

  const cardStyle = themePalette ? {
    borderColor: `${themePalette.primary}20`,
    background: `linear-gradient(135deg, 
      ${themePalette.dark}60 0%, 
      ${themePalette.primary}10 50%, 
      ${themePalette.dark}80 100%
    )`
  } : {};

  const handlePreviewClick = () => {
    if (episode.previewUrl && onPreview) {
      setPreviewError(false);
      onPreview(episode.previewUrl);
    }
  };

  const handleWatchClick = () => {
    if (episode.url && onWatch) {
      onWatch(episode.url);
    }
  };

  return (
    <motion.div
      ref={cardRef}
      layout
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -30, scale: 0.9 }}
      transition={{ 
        duration: 0.6, 
        delay: index * 0.1,
        type: "spring",
        stiffness: 100
      }}
      className={`
        group relative overflow-hidden rounded-3xl border backdrop-blur-xl
        transition-all duration-700 cursor-pointer
        ${isFeatured 
          ? 'col-span-2 row-span-2 min-h-[400px]' 
          : 'col-span-1 row-span-1 min-h-[280px]'
        }
        hover:scale-[1.02] hover:z-10
      `}
      style={cardStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ 
        boxShadow: themePalette ? 
          `0 25px 50px ${themePalette.primary}30` : 
          '0 25px 50px rgba(0,0,0,0.3)'
      }}
    >
      {/* Background Image with Parallax Effect */}
      <div className="absolute inset-0 overflow-hidden">
        {episode.thumbnail ? (
          <motion.img
            src={episode.thumbnail}
            alt={episode.title || `Episode ${index + 1}`}
            className="w-full h-full object-cover"
            style={{
              filter: isWatched ? 'grayscale(0.3) brightness(0.8)' : 'none'
            }}
            animate={{
              scale: isHovered ? 1.1 : 1,
              filter: isHovered ? 'brightness(0.7)' : 'brightness(1)'
            }}
            transition={{ duration: 0.7 }}
            onLoad={() => setImageLoaded(true)}
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://placehold.co/600x400/${
                themePalette?.primary?.replace('#', '') || 'ECB091'
              }/000000/png?text=Episode+${index + 1}&font=poppins`;
            }}
          />
        ) : (
          <div 
            className="w-full h-full flex items-center justify-center"
            style={{
              background: themePalette?.gradient || 
                'linear-gradient(135deg, rgba(236, 176, 145, 0.5), rgba(255, 107, 53, 0.5))'
            }}
          >
            <span className="text-6xl font-bold text-white/30">
              {index + 1}
            </span>
          </div>
        )}
        
        {/* Cinematic Overlay Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </div>

      {/* Watch Progress Indicator */}
      {watchProgress > 0 && (
        <motion.div 
          className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-400 to-green-600 z-20"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: watchProgress / 100 }}
          transition={{ duration: 1, delay: 0.5 }}
          style={{ transformOrigin: 'left' }}
        />
      )}

      {/* Status Badges */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-20">
        {isWatched && (
          <motion.div
            initial={{ scale: 0, rotate: 180 }}
            animate={{ scale: 1, rotate: 0 }}
            className="bg-green-500/90 backdrop-blur-sm rounded-full p-2 border border-green-400/50"
          >
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </motion.div>
        )}
        
        {episode.previewUrl && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-purple-500/90 backdrop-blur-sm rounded-full px-3 py-1 border border-purple-400/50"
          >
            <span className="text-white text-xs font-medium">Preview</span>
          </motion.div>
        )}

        {episode.site && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-black/60 backdrop-blur-sm rounded-full px-3 py-1 border border-white/20"
          >
            <span className="text-white text-xs font-medium">{episode.site}</span>
          </motion.div>
        )}
      </div>

      {/* Episode Number Badge */}
      <motion.div 
        className="absolute top-4 left-4 z-20"
        initial={{ scale: 0, rotate: -90 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.4, type: "spring" }}
      >
        <div 
          className="w-16 h-16 rounded-2xl backdrop-blur-xl border flex items-center justify-center"
          style={{
            background: themePalette ? 
              `linear-gradient(135deg, ${themePalette.primary}80, ${themePalette.accent}60)` :
              'linear-gradient(135deg, rgba(255, 107, 53, 0.8), rgba(176, 137, 104, 0.6))',
            borderColor: themePalette?.primary + '40' || 'rgba(255, 255, 255, 0.2)'
          }}
        >
          <span className="text-white font-bold text-lg">
            {index + 1}
          </span>
        </div>
      </motion.div>

      {/* Central Play Button - Only show on hover */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="absolute inset-0 flex items-center justify-center z-30"
          >
            <motion.button
              onClick={handleWatchClick}
              className="w-20 h-20 bg-white/20 backdrop-blur-xl rounded-full border border-white/30 flex items-center justify-center group/play"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              style={{
                background: themePalette ? 
                  `linear-gradient(135deg, ${themePalette.primary}40, ${themePalette.accent}60)` :
                  'linear-gradient(135deg, rgba(255, 107, 53, 0.4), rgba(176, 137, 104, 0.6))'
              }}
            >
              <svg 
                className="w-8 h-8 text-white ml-1 group-hover/play:scale-110 transition-transform" 
                fill="currentColor" 
                viewBox="0 0 24 24"
              >
                <path d="M8 5v14l11-7z"/>
              </svg>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Episode Information Overlay */}
      <motion.div 
        className="absolute bottom-0 left-0 right-0 p-6 z-20"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <div className="backdrop-blur-xl bg-black/30 rounded-2xl p-4 border border-white/10">
          <h3 className="text-white font-bold text-lg mb-2 line-clamp-2">
            {episode.title || `Episode ${index + 1}`}
          </h3>
          
          {/* Episode Metadata */}
          <div className="flex items-center gap-4 text-white/70 text-sm mb-4">
            {episode.duration && (
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                {episode.duration}
              </div>
            )}
            
            {episode.airDate && (
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
                {episode.airDate}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <motion.div 
            className="flex gap-3"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {episode.previewUrl && (
              <motion.button
                onClick={handlePreviewClick}
                className="flex-1 bg-white/10 backdrop-blur-sm rounded-xl py-3 px-4 border border-white/20 text-white font-medium transition-all duration-300"
                whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.15)' }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                  Preview
                </span>
              </motion.button>
            )}
            
            {episode.url && (
              <motion.button
                onClick={handleWatchClick}
                className="episode-action-button flex-1 backdrop-blur-sm rounded-xl py-3 px-4 border text-white font-medium transition-all duration-300 hover:brightness-110"
                style={{
                  background: themePalette?.gradient || 
                    'linear-gradient(135deg, #FF6B35, #E55A2B)',
                  borderColor: themePalette?.primary + '60' || 'rgba(255, 107, 53, 0.6)'
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8 5v10l8-5-8-5z"/>
                  </svg>
                  Watch Now
                </span>
              </motion.button>
            )}
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Episodes Timeline Component
const EpisodesTimeline: React.FC<{
  episodes: any[];
  currentEpisode?: number;
  onEpisodeSelect: (index: number) => void;
  themePalette?: ColorPalette;
}> = ({ episodes, currentEpisode = 0, onEpisodeSelect, themePalette }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current && currentEpisode !== undefined) {
      const episodeElement = scrollRef.current.children[currentEpisode] as HTMLElement;
      if (episodeElement) {
        episodeElement.scrollIntoView({ behavior: 'smooth', inline: 'center' });
      }
    }
  }, [currentEpisode]);

  return (
    <div className="relative mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-bold text-lg">Episode Timeline</h3>
        <div className="text-white/60 text-sm">
          {episodes.length} Episodes
        </div>
      </div>
      
      <div 
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide"
        style={{ scrollbarWidth: 'none' }}
      >
        {episodes.map((episode, index) => (
          <motion.button
            key={index}
            onClick={() => onEpisodeSelect(index)}
            className={`
              flex-shrink-0 w-20 h-12 rounded-xl border backdrop-blur-sm transition-all duration-300
              ${currentEpisode === index 
                ? 'border-2' 
                : 'border border-white/20 hover:border-white/40'
              }
            `}
            style={{
              background: currentEpisode === index 
                ? themePalette?.gradient || 'linear-gradient(135deg, #FF6B35, #E55A2B)'
                : 'rgba(255, 255, 255, 0.05)',
              borderColor: currentEpisode === index 
                ? themePalette?.primary || '#FF6B35'
                : undefined
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="flex flex-col items-center justify-center h-full">
              <span className="text-white text-xs font-medium">EP</span>
              <span className="text-white text-sm font-bold">{index + 1}</span>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

// Episodes Filter and Sort Component
const EpisodesControls: React.FC<{
  episodes: any[];
  onFilterChange: (filter: string) => void;
  onSortChange: (sort: string) => void;
  onViewModeChange: (mode: 'grid' | 'list') => void;
  viewMode: 'grid' | 'list';
  themePalette?: ColorPalette;
}> = ({ episodes, onFilterChange, onSortChange, onViewModeChange, viewMode, themePalette }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div 
      className="mb-8 backdrop-blur-xl rounded-2xl p-6 border"
      style={{
        background: themePalette ? 
          `linear-gradient(135deg, ${themePalette.dark}40, ${themePalette.primary}10)` :
          'rgba(0, 0, 0, 0.4)',
        borderColor: themePalette?.primary + '20' || 'rgba(255, 255, 255, 0.2)'
      }}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-bold text-xl">Episodes Collection</h3>
        <motion.button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-white/70 hover:text-white transition-colors"
          whileHover={{ scale: 1.05 }}
        >
          <svg 
            className={`w-6 h-6 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
            fill="currentColor" 
            viewBox="0 0 20 20"
          >
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </motion.button>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search episodes..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    onFilterChange(e.target.value);
                  }}
                  className="w-full bg-white/10 backdrop-blur-sm rounded-xl py-3 px-4 pl-12 text-white placeholder-white/60 border border-white/20 focus:border-white/50 focus:outline-none transition-all"
                />
                <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/60" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>

              {/* Sort */}
              <select
                onChange={(e) => onSortChange(e.target.value)}
                className="w-full bg-white/10 backdrop-blur-sm rounded-xl py-3 px-4 text-white border border-white/20 focus:border-white/50 focus:outline-none appearance-none cursor-pointer"
              >
                <option value="default" className="bg-gray-800">Default Order</option>
                <option value="title" className="bg-gray-800">By Title</option>
                <option value="duration" className="bg-gray-800">By Duration</option>
                <option value="date" className="bg-gray-800">By Air Date</option>
              </select>

              {/* View Mode */}
              <div className="flex rounded-xl overflow-hidden border border-white/20">
                <button
                  onClick={() => onViewModeChange('grid')}
                  className={`flex-1 py-3 px-4 transition-all ${
                    viewMode === 'grid' 
                      ? 'bg-white/20 text-white' 
                      : 'bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                >
                  <svg className="w-5 h-5 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => onViewModeChange('list')}
                  className={`flex-1 py-3 px-4 transition-all ${
                    viewMode === 'list' 
                      ? 'bg-white/20 text-white' 
                      : 'bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                >
                  <svg className="w-5 h-5 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6 text-white/60 text-sm">
              <div>Total Episodes: {episodes.length}</div>
              <div>With Previews: {episodes.filter(ep => ep.previewUrl).length}</div>
              <div>Available to Watch: {episodes.filter(ep => ep.url).length}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Episode Preview Modal Component
const EnhancedEpisodePreviewModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  previewUrl: string | null;
  themePalette?: ColorPalette;
}> = ({ isOpen, onClose, previewUrl, themePalette }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [videoError, setVideoError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Reset error state when modal opens
  useEffect(() => {
    if (isOpen) {
      setVideoError(false);
      setIsLoading(true);
    }
  }, [isOpen, previewUrl]);

  // Close modal on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  if (!isOpen || !previewUrl) return null;

  const modalStyle = themePalette ? {
    backgroundColor: themePalette.dark,
    borderColor: `${themePalette.primary}40`
  } : {
    backgroundColor: '#1A1A1A',
    borderColor: 'rgba(255,255,255,0.2)'
  };

  const closeButtonStyle = themePalette ? {
    backgroundColor: `${themePalette.primary}20`,
    borderColor: `${themePalette.primary}40`,
    color: themePalette.primary
  } : {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderColor: 'rgba(255,255,255,0.3)',
    color: '#ffffff'
  };

  // Convert YouTube watch URLs to embed URLs for better embedding
  const getEmbedUrl = (url: string) => {
    if (url.includes('youtube.com/watch?v=')) {
      const videoId = url.split('v=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
    }
    if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1]?.split('?')[0];
      return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
    }
    return url;
  };

  const embedUrl = getEmbedUrl(previewUrl);
  const isYouTube = previewUrl.includes('youtube.com') || previewUrl.includes('youtu.be');

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
      onClick={handleBackdropClick}
    >
      <div 
        ref={modalRef}
        className="relative w-full max-w-4xl mx-auto rounded-2xl border overflow-hidden shadow-2xl"
        style={modalStyle}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div>
            <h3 className="text-lg font-heading text-white">Episode Preview</h3>
            <p className="text-sm text-white/60 truncate">{previewUrl}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full border transition-all duration-200 hover:scale-105"
            style={closeButtonStyle}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Video Player */}
        <div className="aspect-video bg-black relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-white/80">Loading preview...</p>
              </div>
            </div>
          )}

          {videoError ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black">
              <div className="text-center p-8">
                <div className="text-6xl mb-4">❌</div>
                <h4 className="text-xl text-white mb-2">Preview Unavailable</h4>
                <p className="text-white/70 mb-4">This preview video could not be loaded.</p>
                <div className="space-y-2">
                  <a 
                    href={previewUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Open in New Tab
                  </a>
                  <button
                    onClick={() => {
                      setVideoError(false);
                      setIsLoading(true);
                    }}
                    className="block mx-auto text-white/70 hover:text-white underline text-sm"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          ) : isYouTube ? (
            <iframe
              src={embedUrl}
              title="Episode Preview"
              className="w-full h-full"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setVideoError(true);
                setIsLoading(false);
              }}
            />
          ) : (
            <video
              src={previewUrl}
              controls
              autoPlay
              className="w-full h-full"
              onLoadedData={() => setIsLoading(false)}
              onError={() => {
                setVideoError(true);
                setIsLoading(false);
              }}
            >
              <p className="text-white text-center p-8">
                Your browser doesn't support video playback.
              </p>
            </video>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-white/10 flex justify-between items-center">
          <a 
            href={previewUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-white/70 hover:text-white underline"
          >
            Open in new tab
          </a>
          <StyledButton
            onClick={onClose}
            variant="secondary"
            className="!text-sm"
            style={themePalette ? {
              backgroundColor: `${themePalette.secondary}20`,
              borderColor: `${themePalette.secondary}40`,
              color: themePalette.secondary
            } : {}}
          >
            Close Preview
          </StyledButton>
        </div>
      </div>
    </div>
  );
};

// Preview Management Panel Component
const PreviewManagementPanel: React.FC<{
  animeId: Id<"anime">;
  animeTitle: string;
  themePalette?: ColorPalette;
}> = ({ animeId, animeTitle, themePalette }) => {
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichmentResult, setEnrichmentResult] = useState<any>(null);
  
  const triggerPreviewEnrichmentMutation = useMutation(api.anime.triggerPreviewEnrichment);
  const episodePreviewStatus = useQuery(api.anime.getEpisodePreviewStatus, { animeId });

  const handleEnrichPreviews = async () => {
    setIsEnriching(true);
    setEnrichmentResult(null);
    
    try {
      const result = await triggerPreviewEnrichmentMutation({ animeId });
      setEnrichmentResult(result);
      toast.success("Preview enrichment started! Check back in a few minutes.");
    } catch (error: any) {
      console.error("Preview enrichment error:", error);
      toast.error(`Failed to start preview enrichment: ${error.message}`);
      setEnrichmentResult({ success: false, error: error.message });
    } finally {
      setIsEnriching(false);
    }
  };

  const panelStyle = themePalette ? {
    backgroundColor: `${themePalette.dark}40`,
    borderColor: `${themePalette.primary}20`
  } : {
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderColor: 'rgba(255,255,255,0.2)'
  };

  const buttonStyle = themePalette ? {
    background: `linear-gradient(135deg, ${themePalette.secondary}, ${themePalette.accent})`,
    boxShadow: `0 4px 15px ${themePalette.secondary}30`
  } : {
    background: 'linear-gradient(135deg, #8B5CF6, #A855F7)',
    boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)'
  };

  return (
    <div 
      className="backdrop-blur-lg border rounded-2xl p-4 mb-6"
      style={panelStyle}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-white font-medium text-sm mb-1">Preview Status</h3>
          {episodePreviewStatus && (
            <p className="text-white/60 text-xs">
              {episodePreviewStatus.episodesWithPreviews} of {episodePreviewStatus.totalEpisodes} episodes have previews 
              ({episodePreviewStatus.previewPercentage}%)
            </p>
          )}
        </div>
        <StyledButton
          onClick={handleEnrichPreviews}
          variant="primary"
          className="!text-xs !py-2 !px-4 !border-0"
          style={buttonStyle}
          disabled={isEnriching}
        >
          {isEnriching ? (
            <>
              <span className="mr-2 animate-spin">🔄</span>
              Enriching...
            </>
          ) : (
            <>
              <span className="mr-2">🎬</span>
              Find Previews
            </>
          )}
        </StyledButton>
      </div>

      {episodePreviewStatus && episodePreviewStatus.totalEpisodes > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-white/60 text-xs">Progress:</span>
            <div className="flex-1 bg-white/10 rounded-full h-2">
              <div 
                className="h-2 rounded-full transition-all duration-500"
                style={{
                  width: `${episodePreviewStatus.previewPercentage}%`,
                  background: themePalette ? 
                    `linear-gradient(to right, ${themePalette.primary}, ${themePalette.accent})` :
                    'linear-gradient(to right, #10B981, #34D399)'
                }}
              ></div>
            </div>
            <span className="text-white text-xs">{episodePreviewStatus.previewPercentage}%</span>
          </div>
        </div>
      )}

      {enrichmentResult && (
        <div className={`text-xs p-3 rounded-lg ${
          enrichmentResult.success 
            ? 'bg-green-500/20 border border-green-500/30 text-green-400' 
            : 'bg-red-500/20 border border-red-500/30 text-red-400'
        }`}>
          {enrichmentResult.success ? '✅' : '❌'} {enrichmentResult.message || enrichmentResult.error}
        </div>
      )}
    </div>
  );
};

// Custom hook for enriched characters
const useEnrichedCharacters = (
  characters: EnhancedCharacterType[],
  animeName: string,
  animeId?: Id<"anime">
) => {
  const [enrichedCharacters, setEnrichedCharacters] = useState<EnhancedCharacterType[]>(characters);
  const [isEnriching, setIsEnriching] = useState(false);
  const [hasTriggeredEnrichment, setHasTriggeredEnrichment] = useState(false);
  const enrichCharacterDetails = useAction(api.ai.fetchEnrichedCharacterDetails);

  // Load cached characters on mount or when anime changes
  useEffect(() => {
    if (!animeId) return;
    
    const stored = localStorage.getItem(`anime_${animeId}_characters`);
    if (stored) {
      try { 
        const parsedData = JSON.parse(stored);
        if (Array.isArray(parsedData) && parsedData.length > 0) {
          setEnrichedCharacters(parsedData);
          // Reset enrichment state when loading from cache
          setHasTriggeredEnrichment(true);
          setIsEnriching(false);
          return;
        }
      } catch { 
        console.warn('Failed to parse cached characters'); 
      }
    }
    
    // If no cache, use the provided characters
    setEnrichedCharacters(characters);
    setHasTriggeredEnrichment(false);
    setIsEnriching(false);
  }, [animeId]);

  // Update enriched characters when base characters change
  useEffect(() => {
    if (characters.length > 0 && !hasTriggeredEnrichment) {
      setEnrichedCharacters(characters);
    }
  }, [characters, hasTriggeredEnrichment]);

  // Persist characters to cache
  useEffect(() => {
    if (animeId && enrichedCharacters.length > 0) {
      localStorage.setItem(`anime_${animeId}_characters`, JSON.stringify(enrichedCharacters));
    }
  }, [animeId, enrichedCharacters]);

  const enrichMissingCharacters = useCallback(async () => {
    if (isEnriching || hasTriggeredEnrichment) return;
    
    setIsEnriching(true);
    setHasTriggeredEnrichment(true);

    // Enrich up to five characters that haven't been enhanced yet
    const charactersToEnrich = characters
      .filter(char => char && char.name && char.enrichmentStatus !== "success")
      .slice(0, 5);
    
    if (charactersToEnrich.length === 0) {
      console.log('No characters to enrich');
      setIsEnriching(false);
      return;
    }

    console.log(`Starting enrichment for ${charactersToEnrich.length} characters`);
    
    try {
      const enrichmentPromises = charactersToEnrich.map(async (character) => {
        try {
          const result = await enrichCharacterDetails({
            characterName: character.name,
            animeName: animeName,
            existingData: {
              description: character.description,
              role: character.role,
              gender: character.gender,
              age: character.age,
              species: character.species,
              powersAbilities: character.powersAbilities,
              voiceActors: character.voiceActors,
            },
            enrichmentLevel: 'basic' as const,
            messageId: `batch_enrich_${character.name}_${Date.now()}`,
          });
          
          if (result.error) {
            console.warn(`Failed to enrich character ${character.name}:`, result.error);
            return character;
          }
          
          return {
            ...character,
            ...result.mergedCharacter,
            enrichmentStatus: "success",
            enrichmentTimestamp: Date.now()
          };
        } catch (error) {
          console.error(`Error enriching character ${character.name}:`, error);
          return character;
        }
      });
      
      const enrichedResults = await Promise.allSettled(enrichmentPromises);

      const enriched = enrichedResults.map((res, idx) =>
        res.status === 'fulfilled' ? res.value : charactersToEnrich[idx]
      );

      // Merge enriched characters with unchanged ones
      const allEnriched = characters.map(char => {
        const match = enriched.find(e => e.name === char.name);
        return match || char;
      });
      
      console.log(`Enrichment complete. Enhanced ${enriched.filter(c => c.enrichmentStatus === "success").length} characters`);
      setEnrichedCharacters(allEnriched);
      
    } catch (error) {
      console.error('Batch enrichment failed:', error);
    } finally {
      setIsEnriching(false);
    }
  }, [characters, animeName, enrichCharacterDetails, isEnriching, hasTriggeredEnrichment]);

  // Automatically enrich characters when they first load
  useEffect(() => {
    if (
      animeId && 
      characters.length > 0 && 
      !isEnriching && 
      !hasTriggeredEnrichment
    ) {
      // Check if we have unenriched characters
      const hasUnenrichedCharacters = characters.some(
        c => c && c.name && c.enrichmentStatus !== "success"
      );
      
      if (hasUnenrichedCharacters) {
        console.log('Auto-triggering character enrichment');
        enrichMissingCharacters();
      } else {
        // All characters are already enriched
        setHasTriggeredEnrichment(true);
        setIsEnriching(false);
      }
    }
  }, [animeId, characters.length]);

  // Force stop enriching if all characters are enriched
  useEffect(() => {
    if (
      enrichedCharacters.length > 0 &&
      enrichedCharacters.every((c) => c.enrichmentStatus === "success" || !c.name) &&
      isEnriching
    ) {
      console.log('All characters enriched, stopping enrichment indicator');
      setIsEnriching(false);
    }
  }, [enrichedCharacters, isEnriching]);

  // Debug logging
  useEffect(() => {
    if (enrichedCharacters.length > 0) {
      const enrichedCount = enrichedCharacters.filter(c => c.enrichmentStatus === "success").length;
      console.log(`Characters status: ${enrichedCount}/${enrichedCharacters.length} enriched, isEnriching: ${isEnriching}, hasTriggered: ${hasTriggeredEnrichment}`);
    }
  }, [enrichedCharacters, isEnriching, hasTriggeredEnrichment]);
  
  return { 
    enrichedCharacters, 
    isEnriching, 
    enrichMissingCharacters,
    hasTriggeredEnrichment 
  };
};

type ReviewSortOption = "newest" | "oldest" | "highest_rating" | "lowest_rating" | "most_helpful";

export default function AnimeDetailPage({ 
  animeId, 
  onBack, 
  navigateToDetail, 
  onCharacterClick
}: AnimeDetailPageProps) {
  const anime = useQuery(api.anime.getAnimeById, animeId ? { animeId } : "skip");
  const watchlistEntry = useQuery(api.anime.getWatchlistItem, animeId ? { animeId } : "skip");
  const upsertToWatchlistMutation = useMutation(api.anime.upsertToWatchlist);
  
  const { isLoading: authIsLoading, isAuthenticated } = useConvexAuth();
  const loggedInUser = useQuery(api.auth.loggedInUser, isAuthenticated ? {} : "skip");
  const currentUserId = isAuthenticated && loggedInUser ? loggedInUser._id : null;
  const isAdmin = isAuthenticated && loggedInUser?.isAdmin;
  
  // Mobile optimizations
  const mobileOpts = useMobileOptimizations();
  
  // ============================================================================
  // DYNAMIC THEMING STATE
  // ============================================================================
  const [extractedColors, setExtractedColors] = useState<ExtractedColors | null>(null);
  const [themePalette, setThemePalette] = useState<ColorPalette | null>(null);
  const [isExtractingColors, setIsExtractingColors] = useState(false);
  
  // ============================================================================
  // EPISODE PREVIEW STATE MANAGEMENT
  // ============================================================================
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [currentPreviewUrl, setCurrentPreviewUrl] = useState<string | null>(null);

  // Add these state variables to your component:
const [previewStatus, setPreviewStatus] = useState<any>(null);
const [isEnrichingPreviews, setIsEnrichingPreviews] = useState(false);
const [showPreviewDebug, setShowPreviewDebug] = useState(false);

// Add these queries and mutations to your component:
const triggerPreviewEnrichmentMutation = useMutation(api.anime.triggerPreviewEnrichment);
const episodePreviewStatus = useQuery(api.anime.getEpisodePreviewStatus, animeId ? { animeId } : "skip");

// ADD THIS HANDLER TOO:
  const handleTriggerPreviews = useCallback(async () => {
    if (!anime) return;
    
    try {
      const result = await triggerPreviewEnrichmentMutation({ animeId: anime._id });
      toast.success("Preview enrichment started! Refresh the page in 10-15 seconds to see results.");
      console.log("Preview enrichment result:", result);
    } catch (error: any) {
      console.error("Preview enrichment error:", error);
      toast.error(`Failed to start preview enrichment: ${error.message}`);
    }
  }, [anime, triggerPreviewEnrichmentMutation]);
  
  // ============================================================================
  // EXISTING STATE MANAGEMENT
  // ============================================================================
  
  // Smart auto-refresh
  const smartAutoRefreshAction = useAction(api.autoRefresh.callSmartAutoRefreshAnime);
  const getRefreshRecommendationAction = useAction(api.autoRefresh.getRefreshRecommendation);
  const [refreshRecommendation, setRefreshRecommendation] = useState<any>(null);
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);
  const [lastRefreshResult, setLastRefreshResult] = useState<any>(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [showRefreshDetails, setShowRefreshDetails] = useState(false);
  // Track which anime has already triggered an automatic refresh
  const lastAutoRefreshedAnimeId = useRef<string | null>(null);

  // Character management
  const {
    enrichedCharacters,
    isEnriching,
    enrichMissingCharacters
  } = useEnrichedCharacters(anime?.characters || [], anime?.title || '', animeId);

  // Cached episodes and characters
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [charactersForDisplay, setCharactersForDisplay] = useState<EnhancedCharacterType[]>([]);

  // Load cached data on mount
  useEffect(() => {
    if (!animeId) return;
    const epStored = localStorage.getItem(`anime_${animeId}_episodes`);
    if (epStored) {
      try { setEpisodes(JSON.parse(epStored)); } catch { /* ignore */ }
    }
    const charStored = localStorage.getItem(`anime_${animeId}_characters`);
    if (charStored) {
      try { setCharactersForDisplay(JSON.parse(charStored)); } catch { /* ignore */ }
    }
  }, [animeId]);

  // Sync episodes from query
  useEffect(() => {
    if (animeId && anime?.streamingEpisodes) {
      setEpisodes(anime.streamingEpisodes);
      localStorage.setItem(
        `anime_${animeId}_episodes`,
        JSON.stringify(anime.streamingEpisodes)
      );
    }
  }, [animeId, anime?.streamingEpisodes]);

  // Sync characters from enrichment hook
  useEffect(() => {
    if (animeId && enrichedCharacters.length > 0) {
      setCharactersForDisplay(enrichedCharacters);
      localStorage.setItem(
        `anime_${animeId}_characters`,
        JSON.stringify(enrichedCharacters)
      );
    } else if (animeId && anime?.characters) {
      setCharactersForDisplay(anime.characters);
      localStorage.setItem(
        `anime_${animeId}_characters`,
        JSON.stringify(anime.characters)
      );
    }
  }, [animeId, enrichedCharacters, anime?.characters]);

  // State management
  const [activeTab, setActiveTab] = useState("overview");
  const [heroImageLoaded, setHeroImageLoaded] = useState(false);
  const [reviewSortOption, setReviewSortOption] = useState<ReviewSortOption>("newest");
  const [watchlistNotes, setWatchlistNotes] = useState(watchlistEntry?.notes || "");
  const [showNotesInput, setShowNotesInput] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  
  // Reviews and comments
  const { results: reviewsFromBackend, status: reviewsStatus, loadMore: reviewsLoadMore, isLoading: reviewsIsLoadingInitial } = usePaginatedQuery(
    api.reviews.getReviewsForAnime, animeId ? { animeId, sortOption: reviewSortOption } : "skip", { initialNumItems: 3 }
  );
  const reviewsForDisplay: ClientReviewProps[] = (reviewsFromBackend || []).map(r => ({ ...r }));
  
  const userReviewDoc = useQuery(api.reviews.getUserReviewForAnime, animeId && currentUserId ? { animeId } : "skip");
  const addReviewMutation = useMutation(api.reviews.addReview);
  const editReviewMutation = useMutation(api.reviews.editReview);
  const deleteReviewInternalMutation = useMutation(api.reviews.deleteReview);
  const voteOnReviewMutation = useMutation(api.reviews.voteOnReview);
  const addReviewCommentMutation = useMutation(api.reviews.addReviewComment);
  
  const [activeReviewIdForComments, setActiveReviewIdForComments] = useState<Id<"reviews"> | null>(null);
  const { results: commentsDataForActiveReview, status: commentsPaginationStatus, loadMore: commentsLoadMore, isLoading: commentsIsLoading } = usePaginatedQuery(
    api.reviews.getReviewComments,
    activeReviewIdForComments ? { reviewId: activeReviewIdForComments } : "skip",
    { initialNumItems: 3 }
  );
  
  const [newCommentText, setNewCommentText] = useState<{[key: string]: string}>({});
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [editingReview, setEditingReview] = useState<ClientReviewProps | null>(null);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Similar anime
  const [similarAnime, setSimilarAnime] = useState<AnimeRecommendation[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [similarAnimeError, setSimilarAnimeError] = useState<string | null>(null);
  const [showSimilarAnime, setShowSimilarAnime] = useState(false);
  const getSimilarAnimeAction = useAction(api.ai.getSimilarAnimeRecommendationsFixed);
  const addAnimeFromRecommendation = useMutation(api.anime.addAnimeFromRecommendationPublic);
  const userProfile = useQuery(api.users.getMyUserProfile, isAuthenticated ? {} : "skip");
  const myCustomLists = useQuery(api.users.getMyCustomLists, isAuthenticated ? {} : "skip");
  const addToCustomListMutation = useMutation(api.users.addAnimeToCustomList);
  const removeFromCustomListMutation = useMutation(api.users.removeAnimeFromCustomList);

  const [isAddToCustomListModalOpen, setIsAddToCustomListModalOpen] = useState(false);
  const [charactersToShow, setCharactersToShow] = useState(8);
  const [selectedEpisodeIndex, setSelectedEpisodeIndex] = useState(0);
  const [episodesToShow, setEpisodesToShow] = useState(20);
  const [reviewsToShow, setReviewsToShow] = useState(10);
  const [deletingReviewId, setDeletingReviewId] = useState<Id<"reviews"> | null>(null);

  const handleLoadMoreCharacters = () => {
    setCharactersToShow(prev => prev + 8);
  };

  const handleLoadMoreEpisodes = () => {
    setEpisodesToShow(prev => prev + 20);
  };

  const handleLoadMoreReviews = () => {
    setReviewsToShow(prev => prev + 10);
  };

  const handleDeleteReview = async (reviewId: Id<"reviews">) => {
    if (!confirm("Are you sure you want to delete this review? This action cannot be undone.")) {
      return;
    }
    
    setDeletingReviewId(reviewId);
    try {
      await deleteReviewInternalMutation({ reviewId });
      // The UI will automatically update due to the reactive query
    } catch (error) {
      console.error("Failed to delete review:", error);
      alert("Failed to delete review. Please try again.");
    } finally {
      setDeletingReviewId(null);
    }
  };

  const handleEpisodeSelect = (index: number) => {
    setSelectedEpisodeIndex(index);
    
    // Scroll to the episode card in the grid
    setTimeout(() => {
      const episodeElement = document.getElementById(`episode-card-${index}`);
      if (episodeElement) {
        episodeElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'nearest'
        });
        
        // Add a brief highlight effect
        episodeElement.classList.add('ring-4', 'ring-brand-accent-peach', 'ring-opacity-75');
        setTimeout(() => {
          episodeElement.classList.remove('ring-4', 'ring-brand-accent-peach', 'ring-opacity-75');
        }, 2000);
      }
    }, 100); // Small delay to ensure DOM is updated
  };



  const toggleAnimeInCustomList = useCallback(async (listId: Id<"customLists">, inList: boolean) => {
    if (!anime) return;
    try {
      if (inList) {
        await removeFromCustomListMutation({ listId, animeId: anime._id });
        toast.success("Removed from list.");
      } else {
        await addToCustomListMutation({ listId, animeId: anime._id });
        toast.success("Added to list.");
      }
    } catch (error: any) {
      toast.error("Failed to update list.");
    }
  }, [anime, addToCustomListMutation, removeFromCustomListMutation]);

  // Refs for smooth scrolling and parallax
  const heroRef = useRef<HTMLDivElement>(null);
  const scrollY = useRef(0);

  // Define tabs for navigation
  const tabs = [
    { id: "overview", label: "Overview", icon: "📖" },
    { id: "episodes", label: "Episodes", icon: "📺" },
    { id: "characters", label: "Characters", icon: "👥" },
    { id: "ost", label: "OST", icon: "🎵" },
    { id: "reviews", label: "Reviews", icon: "⭐" },
    { id: "similar", label: "Similar", icon: "🔍" },
  ];

  // ============================================================================
  // EPISODE PREVIEW HANDLERS
  // ============================================================================
  
  const handleOpenPreview = useCallback((previewUrl: string) => {
    setCurrentPreviewUrl(previewUrl);
    setIsPreviewOpen(true);
  }, []);

  const handleClosePreview = useCallback(() => {
    setIsPreviewOpen(false);
    setCurrentPreviewUrl(null);
  }, []);

  // ============================================================================
  // COLOR EXTRACTION HANDLERS
  // ============================================================================
  
  const handleImageLoad = useCallback(async (imageElement: HTMLImageElement) => {
    setHeroImageLoaded(true);
    
    if (isExtractingColors) return; // Prevent multiple extractions
    
    setIsExtractingColors(true);
    console.log('🎨 Starting color extraction from poster...');
    
    try {
      const colors = await extractColorsFromImage(imageElement);
      const palette = generateThemePalette(colors);
      
      setExtractedColors(colors);
      setThemePalette(palette);
      
      console.log('🎨 Color extraction complete:', {
        dominant: colors.dominant,
        originalPalette: colors.palette,
        generatedTheme: palette,
        source: 'canvas-analysis'
      });
      
      // Apply CSS custom properties for global theming
      const root = document.documentElement;
      root.style.setProperty('--theme-primary', palette.primary);
      root.style.setProperty('--theme-secondary', palette.secondary);
      root.style.setProperty('--theme-accent', palette.accent);
      root.style.setProperty('--theme-light', palette.light);
      root.style.setProperty('--theme-dark', palette.dark);
      root.style.setProperty('--theme-gradient', palette.gradient);
      
      // Set focus ring colors for proper focus styling
      root.style.setProperty('--theme-focus-ring', `${palette.primary}50`);
      root.style.setProperty('--theme-focus-border', palette.primary);
      
    } catch (error) {
      console.warn('🎨 Color extraction failed, using defaults:', error);
      // Still set up default theme even if extraction fails
      const defaultPalette = generateThemePalette({
        dominant: '#ECB091',
        palette: ['#ECB091', '#8B4513', '#D2691E'],
        light: '#F5E6D3',
        dark: '#654321',
        accent: '#FF6B35',
        complementary: '#4A90E2'
      });
      setThemePalette(defaultPalette);
    } finally {
      setIsExtractingColors(false);
    }
  }, [isExtractingColors]);

  // Clear theme when anime changes
  useEffect(() => {
    if (animeId) {
      setExtractedColors(null);
      setThemePalette(null);
      setIsExtractingColors(false);
      
      // Reset CSS variables
      const root = document.documentElement;
      root.style.removeProperty('--theme-primary');
      root.style.removeProperty('--theme-secondary');
      root.style.removeProperty('--theme-accent');
      root.style.removeProperty('--theme-light');
      root.style.removeProperty('--theme-dark');
      root.style.removeProperty('--theme-gradient');
      root.style.removeProperty('--theme-focus-ring');
      root.style.removeProperty('--theme-focus-border');
    }
  }, [animeId]);

  // ============================================================================
  // EXISTING EFFECT HOOKS
  // ============================================================================

  // Load refresh recommendation when anime loads
  useEffect(() => {
    if (anime && animeId) {
      getRefreshRecommendationAction({ animeId })
        .then(setRefreshRecommendation)
        .catch(console.error);
    }
  }, [anime, animeId, getRefreshRecommendationAction]);

  // Auto-refresh on page visit. The ref ensures each anime triggers at most once.
  useEffect(() => {
    if (
      anime &&
      animeId &&
      autoRefreshEnabled &&
      refreshRecommendation &&
      lastAutoRefreshedAnimeId.current !== animeId
    ) {
      const shouldAutoRefresh =
        refreshRecommendation.priority === "critical" ||
        refreshRecommendation.priority === "high" ||
        refreshRecommendation.freshnessScore < 50;

      if (shouldAutoRefresh && !isAutoRefreshing) {
        lastAutoRefreshedAnimeId.current = animeId;
        console.log(
          `[Auto-Refresh] Triggering auto-refresh for ${anime.title} (${refreshRecommendation.priority} priority)`
        );
        handleSmartRefresh("user_visit");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anime?._id, autoRefreshEnabled, refreshRecommendation]);

  // Sync watchlist notes
  useEffect(() => { 
    setWatchlistNotes(watchlistEntry?.notes || ""); 
  }, [watchlistEntry]);

  // Scroll handler for parallax effects
  useEffect(() => {
    const handleScroll = () => {
      if (mobileOpts.shouldReduceAnimations) return;
      
      const y = window.scrollY;
      requestAnimationFrame(() => {
        scrollY.current = y;
        if (heroRef.current) {
          const parallaxSpeed = 0.5;
          heroRef.current.style.transform = `translateY(${y * parallaxSpeed}px)`;
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [mobileOpts.shouldReduceAnimations]);

  // ============================================================================
  // EXISTING CALLBACK HANDLERS
  // ============================================================================

  // Smart refresh handler
  const handleSmartRefresh = useCallback(async (triggerType: "user_visit" | "manual" | "background" = "manual", forceRefresh = false) => {
    if (!anime || isAutoRefreshing) return;

    setIsAutoRefreshing(true);
    const toastId = `smart-refresh-${anime._id}`;
    
    if (triggerType === "manual") {
      toast.loading("Intelligently updating anime data...", { id: toastId });
    }

    try {
      const result = await smartAutoRefreshAction({
        animeId: anime._id,
        triggerType,
        forceRefresh
      });

      setLastRefreshResult(result);

      // Update recommendation after refresh
      const updatedRecommendation = await getRefreshRecommendationAction({ animeId: anime._id });
      setRefreshRecommendation(updatedRecommendation);

      if (triggerType === "manual") {
        if (result.refreshed) {
          if (result.dataChanged) {
            toast.success(
              `✨ Updated! ${result.message}`, 
              { id: toastId, duration: 4000 }
            );
          } else {
            toast.info(
              `✅ Refreshed - no new data found`, 
              { id: toastId }
            );
          }
        } else {
          toast.info(
            `ℹ️ ${result.message}`, 
            { id: toastId }
          );
        }
      } else if (triggerType === "user_visit" && result.refreshed && result.dataChanged) {
        toast.success(
          `📡 Fresh data loaded for ${anime.title}`, 
          { duration: 3000 }
        );
      }

    } catch (error: any) {
      console.error("Smart refresh error:", error);
      if (triggerType === "manual") {
        toast.error(`Failed to refresh: ${error.message}`, { id: toastId });
      }
    } finally {
      setIsAutoRefreshing(false);
    }
  }, [anime, isAutoRefreshing, smartAutoRefreshAction, getRefreshRecommendationAction]);

  // Handle watchlist actions
  const handleWatchlistAction = useCallback(async (status: "Watching" | "Completed" | "Plan to Watch" | "Dropped") => {
    if (!isAuthenticated || !anime) {
      toast.error("Please log in to manage your watchlist.");
      return;
    }

    try {
      await upsertToWatchlistMutation({
        animeId: anime._id,
        status: status,
        notes: watchlistNotes || watchlistEntry?.notes || "",
        progress: watchlistEntry?.progress || 0,
        userRating: watchlistEntry?.userRating || undefined,
      });

      const actionMessages: Record<string, string> = {
        "Plan to Watch": "Added to Plan to Watch! 📚",
        "Watching": "Marked as Currently Watching! 🎬",
        "Completed": "Marked as Completed! ✅",
        "Dropped": "Moved to Dropped list. 📂",
      };

      toast.success(actionMessages[status] || `Status updated to ${status}!`);
    } catch (error: any) {
      toast.error("Failed to update watchlist status.");
    }
  }, [isAuthenticated, anime, upsertToWatchlistMutation, watchlistEntry, watchlistNotes]);

  // Save watchlist notes
  const handleSaveWatchlistNotes = useCallback(async () => {
    if (!isAuthenticated || !anime || !watchlistEntry) {
      toast.error("Please add this anime to your watchlist first.");
      return;
    }

    if (watchlistNotes === (watchlistEntry.notes || "")) {
      toast.info("No changes to save.");
      setShowNotesInput(false);
      return;
    }

    setIsSavingNotes(true);
    const toastId = `save-notes-${anime._id}`;
    toast.loading("Saving your notes...", { id: toastId });

    try {
      await upsertToWatchlistMutation({
        animeId: anime._id,
        status: watchlistEntry.status as "Watching" | "Completed" | "Plan to Watch" | "Dropped",
        notes: watchlistNotes.trim(),
        progress: watchlistEntry.progress || 0,
        userRating: watchlistEntry.userRating || undefined,
      });

      toast.success("Notes saved successfully!", { id: toastId });
      setShowNotesInput(false);

    } catch (error: any) {
      console.error("Save notes error:", error);
      toast.error("Failed to save notes.", { id: toastId });
    } finally {
      setIsSavingNotes(false);
    }
  }, [isAuthenticated, anime, watchlistEntry, watchlistNotes, upsertToWatchlistMutation]);

  // Handle review submission
  const handleReviewSubmit = useCallback(async (data: { 
    animeId: Id<"anime">; 
    rating: number; 
    reviewText?: string; 
    isSpoiler?: boolean; 
    reviewId?: Id<"reviews">
  }) => {
    if (!isAuthenticated || !anime) {
      toast.error("Please log in to submit a review.");
      return;
    }

    if (data.rating < 1 || data.rating > 5) {
      toast.error("Please provide a valid rating (1-5 stars).");
      return;
    }

    const isEditing = !!data.reviewId;
    setIsSubmittingReview(true);
    
    const toastId = `review-submit-${anime._id}`;
    toast.loading(isEditing ? "Updating your review..." : "Submitting your review...", { id: toastId });

    try {
      if (isEditing && data.reviewId) {
        await editReviewMutation({
          reviewId: data.reviewId,
          rating: data.rating,
          reviewText: data.reviewText?.trim() || "",
          isSpoiler: data.isSpoiler || false,
        });
        
        toast.success("Review updated successfully!", { id: toastId });
        setEditingReview(null);
      } else {
        await addReviewMutation({
          animeId: data.animeId,
          rating: data.rating,
          reviewText: data.reviewText?.trim() || "",
          isSpoiler: data.isSpoiler || false,
        });
        
        toast.success("Review submitted successfully!", { id: toastId });
      }

      setShowReviewForm(false);

    } catch (error: any) {
      console.error("Review submit error:", error);
      toast.error("Failed to submit review.", { id: toastId });
    } finally {
      setIsSubmittingReview(false);
    }
  }, [isAuthenticated, anime, addReviewMutation, editReviewMutation]);

  // Load similar anime
  const loadSimilarAnime = useCallback(async () => {
    if (!anime) return;
    setLoadingSimilar(true);
    setSimilarAnimeError(null);
    setSimilarAnime([]);
    
    try {
      const profileForAI = userProfile ? {
        name: userProfile.name, moods: userProfile.moods, genres: userProfile.genres,
        favoriteAnimes: userProfile.favoriteAnimes, experienceLevel: userProfile.experienceLevel,
        dislikedGenres: userProfile.dislikedGenres, dislikedTags: userProfile.dislikedTags,
        characterArchetypes: userProfile.characterArchetypes, tropes: userProfile.tropes,
        artStyles: userProfile.artStyles, narrativePacing: userProfile.narrativePacing
      } : undefined;
      
      const result = await getSimilarAnimeAction({
        animeId: anime._id,
        userProfile: profileForAI,
        count: 6,
        messageId: `similar-${anime._id}-${Date.now()}`
      });
      
      if (result.error) {
        setSimilarAnimeError(result.error);
        toast.error(`Could not find similar anime: ${result.error.substring(0, 60)}`);
      } else {
        const validRecommendations = (result.recommendations || []).filter((rec: any) => rec && rec.title);
        setSimilarAnime(validRecommendations as AnimeRecommendation[]);
      }
      setShowSimilarAnime(true);
    } catch (e: any) {
      setSimilarAnimeError("Failed to load similar anime.");
      toast.error("An error occurred while finding similar anime.");
    } finally {
      setLoadingSimilar(false);
    }
  }, [anime, userProfile, getSimilarAnimeAction]);

  // Handle voting on reviews
  const handleVote = async (reviewId: Id<"reviews">, voteType: "up" | "down") => {
    if (!isAuthenticated || !currentUserId) {
      toast.error("Please log in to vote on reviews.");
      return;
    }

    try {
      await voteOnReviewMutation({ reviewId, voteType });
    } catch (error: any) {
      console.error("Vote error:", error);
      toast.error("Failed to record your vote.");
    }
  };

  // Toggle comments section for a review
  const handleToggleComments = (reviewId: Id<"reviews">) => {
    if (activeReviewIdForComments === reviewId) {
      setActiveReviewIdForComments(null);
    } else {
      setActiveReviewIdForComments(reviewId);
    }
  };

  // Add a comment to a review
  const handleAddComment = async (reviewId: Id<"reviews">) => {
    if (!isAuthenticated || !currentUserId) {
      toast.error("Please log in to comment.");
      return;
    }

    const commentText = newCommentText[reviewId] || "";
    
    if (!commentText.trim()) {
      toast.error("Please enter a comment.");
      return;
    }

    if (commentText.length > 1000) {
      toast.error("Comment is too long (max 1000 characters).");
      return;
    }

    setIsSubmittingComment(true);
    try {
      await addReviewCommentMutation({
        reviewId,
        commentText: commentText.trim(),
      });

      setNewCommentText(prev => ({ ...prev, [reviewId]: "" }));
      toast.success("Comment added!");
    } catch (error: any) {
      console.error("Add comment error:", error);
      toast.error("Failed to add comment.");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // ============================================================================
  // LOADING STATES AND ERROR HANDLING
  // ============================================================================

  // Loading states
  if (animeId && anime === undefined && !authIsLoading) {
    return <IOSLoadingSpinner message="Loading anime details..." themePalette={themePalette || undefined} />;
  }
  
  if (authIsLoading && anime === undefined) {
    return <IOSLoadingSpinner message="Checking authentication..." themePalette={themePalette || undefined} />;
  }
  
  if (!anime) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-black/60 backdrop-blur-lg border border-white/20 rounded-3xl p-8 text-center max-w-md sm:max-w-lg md:max-w-xl mx-auto">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-red-400 mb-4">Anime Not Found</h2>
          <p className="mb-6 text-sm text-red-300">
            This anime could not be loaded or doesn't exist.
          </p>
          <StyledButton onClick={onBack} variant="primary">
            Back to Collection
          </StyledButton>
        </div>
      </div>
    );
  }

  const placeholderPoster = `https://placehold.co/600x900/ECB091/321D0B/png?text=${encodeURIComponent(anime.title.substring(0, 10))}&font=poppins`;

  // ============================================================================
  // DYNAMIC STYLING HELPERS
  // ============================================================================

  const dynamicBackgroundStyle = themePalette ? {
    background: `
      radial-gradient(ellipse at top left, ${themePalette.primary}15, transparent 50%),
      radial-gradient(ellipse at bottom right, ${themePalette.accent}10, transparent 50%),
      radial-gradient(ellipse at center, ${themePalette.secondary}08, transparent 70%),
      #0A0A0A
    `
  } : {};

  const heroOverlayStyle = themePalette ? {
    background: `linear-gradient(to bottom, 
      transparent 0%, 
      ${themePalette.dark}20 30%, 
      ${themePalette.dark}60 60%, 
      ${themePalette.dark}90 85%, 
      #000000 100%
    )`
  } : {};

  const actionButtonStyle = themePalette ? {
    background: themePalette.gradient,
    boxShadow: `0 8px 32px ${themePalette.primary}30`
  } : {};

  const sectionCardStyle = themePalette ? {
    borderColor: `${themePalette.primary}20`,
    background: `linear-gradient(135deg, 
      rgba(0,0,0,0.6) 0%, 
      ${themePalette.dark}20 50%, 
      rgba(0,0,0,0.8) 100%
    )`
  } : {};

  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
            {/* SIMPLE BRUTALIST BACKGROUND */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Simple Grid Overlay */}
        <div className="absolute inset-0 opacity-5"
          style={{
               backgroundImage: `
                 linear-gradient(90deg, #FFFFFF 1px, transparent 1px),
                 linear-gradient(0deg, #FFFFFF 1px, transparent 1px)
               `,
               backgroundSize: '60px 60px'
          }}
        ></div>
      </div>

      {/* MINIMALIST POSTER HERO SECTION */}
      <div className="relative z-10">
        {/* Brutalist Back Button */}
        <div className="absolute top-safe-top left-4 z-50 pt-4">
          <button
            onClick={onBack}
            className="w-12 h-12 bg-white border-4 border-black shadow-brutal flex items-center justify-center transition-all duration-300 hover:shadow-brutal-lg touch-target"
          >
            <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* BRUTALIST POSTER DISPLAY */}
        <div className="relative min-h-screen flex items-center justify-center px-6 py-20">
          {/* Poster Container - Brutalist Design */}
          <div className="relative max-w-sm mx-auto">
            {/* Brutalist Poster Frame */}
            <div className="relative bg-black border-4 border-white shadow-brutal p-3">
              <div className="relative aspect-[2/3] overflow-hidden bg-black border-2 border-white">
          <img
            src={anime.posterUrl || placeholderPoster}
            alt={anime.title}
                  className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
            onLoad={(e) => handleImageLoad(e.target as HTMLImageElement)}
            onError={(e) => { (e.target as HTMLImageElement).src = placeholderPoster; }}
          />
                
                {/* Enhanced Gradient Overlay for Text Readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
                
                {/* TOP SECTION - Status & Rating */}
                <div className="absolute top-4 left-4 right-4 flex items-start justify-between">
                  {/* Minimalist Status Badge */}
                  {anime.airingStatus && anime.airingStatus !== "FINISHED" && (
                    <div className="bg-green-500/90 backdrop-blur-sm rounded-full px-3 py-1 border border-green-400/50">
                      <span className="text-white text-xs font-bold uppercase tracking-wide">
                        {anime.airingStatus === "RELEASING" ? "AIRING" : anime.airingStatus}
                      </span>
        </div>
                  )}
                  
                  {/* Rating Badge */}
                  {anime.rating && (
                    <div className="bg-black/70 backdrop-blur-sm rounded-full px-3 py-1 border border-white/20">
                      <div className="flex items-center gap-1">
                        <span className="text-yellow-400 text-sm">⭐</span>
                        <span className="text-white text-sm font-bold">
                          {(anime.rating / 2).toFixed(1)}
                        </span>
            </div>
          </div>
        )}
                </div>

                {/* MIDDLE SECTION - Year & Episodes */}
                <div className="absolute top-1/2 left-4 right-4 transform -translate-y-1/2">
                  <div className="flex gap-2">
            {anime.year && (
                      <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/20">
                        <div className="text-white/60 text-xs font-medium uppercase tracking-wide">Year</div>
                        <div className="text-white text-sm font-bold">{anime.year}</div>
                      </div>
            )}
            {anime.totalEpisodes && (
                      <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/20">
                        <div className="text-white/60 text-xs font-medium uppercase tracking-wide">Episodes</div>
                        <div className="text-white text-sm font-bold">{anime.totalEpisodes}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* BOTTOM SECTION - Title, Genres, Studio */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  {/* Studio */}
                  {anime.studios?.[0] && (
                    <div className="mb-3">
                      <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/20 inline-block">
                        <div className="text-white/60 text-xs font-medium uppercase tracking-wide mb-1">Studio</div>
                        <div className="text-white text-sm font-bold truncate max-w-[200px]">
                          {anime.studios[0]}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Title */}
                  <div className="mb-4">
                    <h1 className="text-white text-xl sm:text-2xl font-bold leading-tight drop-shadow-lg">
                      {anime.title}
                    </h1>
          </div>

                  {/* Genres */}
          {anime.genres && anime.genres.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {anime.genres.slice(0, 3).map((genre: string, idx: number) => (
      <span 
        key={idx} 
                          className="bg-brand-primary-action/80 backdrop-blur-sm rounded-full px-3 py-1 border border-brand-primary-action/50"
                        >
                          <span className="text-black text-xs font-bold uppercase tracking-wide">
        {genre}
                          </span>
      </span>
    ))}
                      {anime.genres.length > 3 && (
                        <span className="bg-white/10 backdrop-blur-sm rounded-full px-3 py-1 border border-white/20">
                          <span className="text-white text-xs font-bold">
                            +{anime.genres.length - 3}
                          </span>
      </span>
    )}
  </div>
)}
                </div>
              </div>
            </div>

            {/* ACTION BUTTONS SECTION */}
            <div className="mt-8 text-center">

                {/* Brutal Action Buttons */}
                <div className="space-y-4">
            {isAuthenticated ? (
              <>
                {watchlistEntry?.status === "Plan to Watch" ? (
                        <button 
                    onClick={() => handleWatchlistAction("Watching")} 
                          className="w-full bg-brand-primary-action border-4 border-black shadow-brutal hover:shadow-brutal-lg transition-all p-4 touch-target"
                  >
                          <span className="text-black font-black uppercase text-lg">🎬 START WATCHING</span>
                        </button>
                ) : watchlistEntry?.status === "Watching" ? (
                        <button 
                    onClick={() => handleWatchlistAction("Completed")} 
                          className="w-full bg-green-500 border-4 border-black shadow-brutal hover:shadow-brutal-lg transition-all p-4 touch-target"
                        >
                          <span className="text-black font-black uppercase text-lg">✅ MARK COMPLETED</span>
                        </button>
                ) : watchlistEntry?.status === "Completed" ? (
                        <div className="w-full bg-green-500 border-4 border-black shadow-brutal p-4">
                          <span className="text-black font-black uppercase text-lg">🏆 COMPLETED</span>
                  </div>
                ) : (
                        <button 
                    onClick={() => handleWatchlistAction("Plan to Watch")} 
                          className="w-full bg-brand-accent-peach border-4 border-black shadow-brutal hover:shadow-brutal-lg transition-all p-4 touch-target"
                  >
                          <span className="text-black font-black uppercase text-lg">📚 ADD TO WATCHLIST</span>
                        </button>
                )}
              </>
            ) : (
                    <div className="w-full bg-gray-600 border-4 border-black shadow-brutal p-4">
                      <span className="text-white font-black uppercase text-sm">LOGIN TO MANAGE WATCHLIST</span>
              </div>
            )}
            
                  {/* Secondary Actions */}
                  <div className="grid grid-cols-2 gap-4">
            {isAuthenticated && (
                      <button
                onClick={() => setIsAddToCustomListModalOpen(true)}
                        className="bg-white border-4 border-black shadow-brutal hover:shadow-brutal-lg transition-all p-3 touch-target"
                      >
                        <span className="text-black font-black uppercase text-sm">➕ LISTS</span>
                      </button>
                    )}
                    
                    <button 
              onClick={() => handleSmartRefresh("manual", true)} 
                      className="bg-brand-secondary-blue border-4 border-black shadow-brutal hover:shadow-brutal-lg transition-all p-3 touch-target"
              disabled={isAutoRefreshing}
            >
                      <span className="text-white font-black uppercase text-sm">
                        {isAutoRefreshing ? "UPDATING..." : "🔄 REFRESH"}
                      </span>
                    </button>
          </div>
                </div>
            </div>
          </div>
        </div>
      </div>

      {/* MINIMALIST TAB NAVIGATION */}
      <div className="relative z-20 bg-black/80 backdrop-blur-xl border-t-4 border-white">
        <div className="flex overflow-x-auto scrollbar-hide px-4 py-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex-shrink-0 px-6 py-3 mx-1 font-black uppercase text-sm transition-all duration-300 touch-target
                ${activeTab === tab.id 
                  ? 'bg-brand-primary-action text-black border-4 border-black shadow-brutal' 
                  : 'text-white/70 hover:text-white hover:bg-white/10 border-2 border-transparent'
                }
              `}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
            </div>
          </div>

      {/* BRUTAL CONTENT SECTIONS */}
      <div className="relative z-10 bg-black">
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="p-6">
            {/* Synopsis - Brutal Card */}
            <div className="bg-white border-4 border-black shadow-brutal-lg p-6">
              <div className="bg-black border-4 border-white shadow-brutal p-4 mb-4">
                <h2 className="text-white font-black uppercase text-xl">📖 SYNOPSIS</h2>
                    </div>
              <p className="text-black leading-relaxed font-medium">
                {anime.description || "No synopsis available for this anime."}
              </p>
              </div>
        </div>
      )}

        {/* Episodes Tab - Swipeable Brutalist Design */}
        {activeTab === "episodes" && (
          <div className="p-4 space-y-4">
            {episodes && episodes.length > 0 ? (
              <div className="space-y-4">
                {/* Swipeable Episode Number Tabs */}
                <SwipeableEpisodeTabs
                  episodes={episodes}
                  selectedIndex={selectedEpisodeIndex}
                  onEpisodeSelect={handleEpisodeSelect}
        themePalette={themePalette || undefined}
      />

                {/* Episode Grid - 2 Columns for iPhone */}
                <div className="bg-black border-4 border-white shadow-brutal-lg p-4">
                  <div className="bg-brand-primary-action border-4 border-black shadow-brutal p-3 mb-4">
                    <h3 className="text-black font-black uppercase text-base">📺 ALL EPISODES</h3>
            </div>

                  <div className="grid grid-cols-2 gap-3">
                    {episodes.slice(0, episodesToShow).map((episode, index) => (
                      <div 
                        key={index}
                        id={`episode-card-${index}`}
                        onClick={() => handleEpisodeSelect(index)}
                        className={`
                          bg-white border-4 shadow-brutal overflow-hidden transition-all cursor-pointer touch-target
                          ${index === selectedEpisodeIndex 
                            ? 'border-brand-accent-peach shadow-brutal-lg scale-105' 
                            : 'border-black hover:shadow-brutal-lg hover:border-gray-700'
                          }
                        `}
                      >
                        {/* Episode Image Section */}
                        <div className="relative aspect-video bg-gray-200 border-b-4 border-black">
                          {episode.thumbnail ? (
                            <img
                              src={episode.thumbnail}
                              alt={episode.title || `Episode ${index + 1}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = `https://placehold.co/400x225/ECB091/321D0B/png?text=EP+${index + 1}&font=poppins`;
                              }}
                            />
                          ) : (
                            <div className="w-full h-full bg-brand-accent-peach flex items-center justify-center">
                              <div className="text-center">
                                <div className="text-black font-black text-4xl mb-2">📺</div>
                                <div className="text-black font-black text-xl">EP {index + 1}</div>
                </div>
              </div>
                          )}

                          {/* Episode Number Badge */}
                          <div className="absolute top-3 left-3">
                            <div className={`
                              border-2 border-white px-3 py-1
                              ${index === selectedEpisodeIndex ? 'bg-brand-accent-peach' : 'bg-black'}
                            `}>
                              <span className={`
                                font-black text-sm
                                ${index === selectedEpisodeIndex ? 'text-black' : 'text-white'}
                              `}>
                                #{index + 1}
                              </span>
                </div>
              </div>

                          {/* Duration Badge */}
                          {episode.duration && (
                            <div className="absolute top-3 right-3">
                              <div className="bg-brand-primary-action border-2 border-black px-2 py-1">
                                <span className="text-black font-black text-xs">{episode.duration}</span>
                </div>
              </div>
                          )}
                          
                          {/* Air Date Badge */}
                          {episode.airDate && (
                            <div className="absolute bottom-3 left-3">
                              <div className="bg-white/90 border-2 border-black px-2 py-1">
                                <span className="text-black font-black text-xs">{episode.airDate}</span>
            </div>
          </div>
        )}
      </div>

                        {/* Episode Info Section - Compact for 2-column */}
                        <div className="p-3">
                          {/* Title */}
                          <h3 className="text-black font-black text-sm uppercase leading-tight mb-2 line-clamp-2">
                            {episode.title || `EP ${index + 1}`}
                          </h3>
                          
                          {/* Description - More compact */}
                          {episode.description && (
                            <p className="text-black/70 font-bold text-xs leading-snug mb-3 line-clamp-2">
                              {episode.description}
                            </p>
                          )}
                          
                          {/* Metadata Row - Compact */}
                          <div className="flex items-center gap-2 mb-3 flex-wrap">
                            {episode.site && (
                              <div className="bg-gray-200 border-2 border-black px-2 py-1">
                                <span className="text-black font-black text-xs uppercase">{episode.site}</span>
          </div>
                            )}
                            {episode.quality && (
                              <div className="bg-green-200 border-2 border-black px-1 py-1">
                                <span className="text-black font-black text-xs uppercase">{episode.quality}</span>
                              </div>
                            )}
        </div>

                          {/* Action Buttons - Stacked for narrow columns */}
                          <div className="space-y-2">
                            {episode.previewUrl && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenPreview(episode.previewUrl);
                                }}
                                className="w-full bg-brand-secondary-blue border-3 border-black shadow-brutal hover:shadow-brutal-lg transition-all p-2 touch-target"
                              >
                                <div className="flex items-center justify-center gap-1">
                                  <span className="text-white font-black text-lg">👁️</span>
                                  <span className="text-white font-black text-xs uppercase">PREVIEW</span>
        </div>
                              </button>
                            )}

                            {episode.url && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(episode.url, '_blank');
                                }}
                                className="w-full bg-brand-accent-peach border-3 border-black shadow-brutal hover:shadow-brutal-lg transition-all p-2 touch-target"
                              >
                                <div className="flex items-center justify-center gap-1">
                                  <span className="text-black font-black text-lg">▶️</span>
                                  <span className="text-black font-black text-xs uppercase">WATCH</span>
            </div>
                              </button>
                            )}
                            
                            {/* If no action buttons, show placeholder */}
                            {!episode.previewUrl && !episode.url && (
                              <div className="w-full bg-gray-400 border-3 border-black p-2 text-center">
                                <span className="text-black font-black text-xs uppercase">NO LINKS</span>
          </div>
                            )}
        </div>
              </div>
                      </div>
                  ))}
                </div>
                
                  {/* Load More Episodes Button */}
                  {episodes.length > episodesToShow && (
                    <div className="bg-brand-primary-action border-4 border-black shadow-brutal p-4 text-center mt-4">
                      <div className="text-black font-black text-xl mb-2">📺</div>
                      <h3 className="text-black font-black uppercase text-base mb-2">MORE EPISODES</h3>
                      <p className="text-black/80 font-bold text-xs mb-3">
                        + {episodes.length - episodesToShow} Additional Episodes Available
                      </p>
              <button 
                        onClick={handleLoadMoreEpisodes}
                        className="bg-black border-2 border-white shadow-brutal px-6 py-3 hover:shadow-brutal-lg transition-all touch-target"
                      >
                        <span className="text-white font-black uppercase text-sm">LOAD MORE EPISODES</span>
              </button>
                </div>
                  )}
              </div>
            </div>
            ) : (
              <div className="bg-gray-600 border-4 border-black shadow-brutal p-8 text-center">
                <div className="text-white font-black text-6xl mb-4">📺</div>
                <h3 className="text-white font-black uppercase text-xl mb-3">NO EPISODES FOUND</h3>
                <p className="text-white/80 font-bold text-sm mb-4">
                  Episode information is not available for this anime
                </p>
                <button 
                  onClick={() => handleSmartRefresh("manual", true)}
                  className="bg-brand-primary-action border-4 border-black shadow-brutal hover:shadow-brutal-lg transition-all p-3 touch-target"
                  disabled={isAutoRefreshing}
                >
                  <span className="text-black font-black uppercase text-sm">
                    {isAutoRefreshing ? "REFRESHING..." : "🔄 REFRESH DATA"}
                  </span>
                </button>
          </div>
            )}
        </div>
        )}

        {/* Characters Tab */}
        {activeTab === "characters" && (
          <div className="p-4 space-y-4">
            <div className="bg-black border-4 border-white shadow-brutal-lg p-4">
              <div className="bg-brand-primary-action border-4 border-black shadow-brutal p-3 mb-4">
                <h2 className="text-black font-black uppercase text-base">👥 CHARACTERS</h2>
          </div>

              {charactersForDisplay && charactersForDisplay.length > 0 ? (
          <div className="space-y-4">
                  {/* Characters Grid - 2 Columns for iPhone */}
                  <div className="grid grid-cols-2 gap-3">
                    {charactersForDisplay.slice(0, charactersToShow).map((character, index) => (
                      <div 
                        key={`character-${character.id || character.name || index}`}
                        onClick={() => onCharacterClick(character, anime.title)}
                        className="bg-white border-4 border-black shadow-brutal hover:shadow-brutal-lg transition-all cursor-pointer touch-target"
                      >
                        <div className="aspect-[3/4] bg-gray-200 border-b-3 border-black relative overflow-hidden">
                          {character.imageUrl ? (
                            <img
                              src={character.imageUrl}
                              alt={character.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = `https://placehold.co/300x400/ECB091/321D0B/png?text=${encodeURIComponent(character.name.charAt(0))}&font=poppins`;
                              }}
                            />
                          ) : (
                            <div className="w-full h-full bg-brand-accent-peach flex items-center justify-center">
                              <span className="text-black font-black text-2xl">
                                {character.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                          )}
                          
                          {/* Role Badge - Compact */}
                          {character.role && (
                            <div className="absolute top-1 right-1">
                              <div className={`
                                px-1 py-0.5 border-2 border-black text-xs font-black uppercase
                                ${character.role === "MAIN" ? "bg-brand-primary-action text-black" : 
                                  character.role === "SUPPORTING" ? "bg-brand-secondary-blue text-white" : 
                                  "bg-gray-600 text-white"}
                              `}>
                                {character.role === "MAIN" && "⭐"}
                                {character.role === "SUPPORTING" && "🎭"}
                                {character.role === "BACKGROUND" && "👤"}
                                {character.role.slice(0, 4)}
                </div>
                </div>
                          )}
          </div>

                        <div className="p-2">
                          <h3 className="text-black font-black text-xs uppercase truncate">
                            {character.name}
                          </h3>
                          {character.description && (
                            <p className="text-black/70 text-xs font-bold mt-1 line-clamp-2">
                              {character.description}
                            </p>
                          )}
            </div>
          </div>
          ))}
                </div>
                
                  {/* Load More Characters - Spans 2 columns */}
                  {charactersForDisplay.length > charactersToShow && (
                    <div className="bg-brand-primary-action border-4 border-black shadow-brutal p-4 text-center">
                      <div className="text-black font-black text-xl mb-2">👥</div>
                      <h3 className="text-black font-black uppercase text-base mb-2">MORE CHARACTERS</h3>
                      <p className="text-black/80 font-bold text-xs mb-3">
                        + {charactersForDisplay.length - charactersToShow} Additional Characters Available
                      </p>
                      <button 
                        onClick={handleLoadMoreCharacters}
                        className="bg-black border-2 border-white shadow-brutal px-4 py-2 hover:shadow-brutal-lg transition-all touch-target"
                      >
                        <span className="text-white font-black uppercase text-xs">LOAD MORE</span>
                      </button>
                    </div>
                  )}
                  </div>
              ) : (
                <div className="bg-gray-600 border-4 border-black shadow-brutal p-6 text-center">
                  <div className="text-white font-black text-3xl mb-3">👥</div>
                  <h3 className="text-white font-black uppercase text-base mb-2">NO CHARACTER DATA</h3>
                  <p className="text-white/80 font-bold text-xs">Character information not available</p>
                </div>
              )}
          </div>
      </div>
        )}

        {/* OST Tab */}
        {activeTab === "ost" && (
          <div className="p-6 space-y-6">
            <div className="bg-black border-4 border-white shadow-brutal-lg p-6">
              <div className="bg-brand-primary-action border-4 border-black shadow-brutal p-4 mb-6">
                <h2 className="text-black font-black uppercase text-xl">🎵 SOUNDTRACK</h2>
        </div>

              {/* Brutal Music Categories */}
              <div className="space-y-4">
                {/* Opening Themes */}
                <div className="bg-brand-accent-peach border-4 border-black shadow-brutal p-4">
                  <div className="bg-black border-2 border-white p-3 mb-3">
                    <h3 className="text-white font-black uppercase text-lg">🎭 OPENING THEMES</h3>
                  </div>
                  <div className="space-y-2">
                    {[
                      { title: 'Opening 1: "Resonance"', artist: 'TM Revolution', duration: '1:30' },
                      { title: 'Opening 2: "Chain of Souls"', artist: 'Faylan', duration: '1:28' }
            ].map((track, index) => (
                      <div key={index} className="bg-white border-2 border-black shadow-brutal p-3 flex justify-between items-center">
                        <div>
                          <h4 className="text-black font-black text-sm">{track.title}</h4>
                          <p className="text-black/70 font-bold text-xs">{track.artist}</p>
              </div>
                        <div className="text-black font-black text-xs">{track.duration}</div>
              </div>
          ))}
        </div>
          </div>

                {/* Ending Themes */}
                <div className="bg-brand-secondary-blue border-4 border-black shadow-brutal p-4">
                  <div className="bg-black border-2 border-white p-3 mb-3">
                    <h3 className="text-white font-black uppercase text-lg">🎼 ENDING THEMES</h3>
              </div>
                  <div className="space-y-2">
                    {[
                      { title: 'Ending 1: "Style"', artist: 'Kana Nishino', duration: '1:25' },
                      { title: 'Ending 2: "Strength"', artist: 'Abingdon Boys School', duration: '1:32' }
            ].map((track, index) => (
                      <div key={index} className="bg-white border-2 border-black shadow-brutal p-3 flex justify-between items-center">
              <div>
                          <h4 className="text-black font-black text-sm">{track.title}</h4>
                          <p className="text-black/70 font-bold text-xs">{track.artist}</p>
              </div>
                        <div className="text-black font-black text-xs">{track.duration}</div>
            </div>
                  ))}
                </div>
              </div>

      {/* Streaming Platforms */}
                <div className="bg-white border-4 border-black shadow-brutal p-4">
                  <div className="bg-brand-primary-action border-2 border-black p-3 mb-3">
                    <h3 className="text-black font-black uppercase text-lg">🎵 STREAMING PLATFORMS</h3>
          </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { name: 'Spotify', tracks: '24 tracks', color: 'bg-green-500' },
                      { name: 'Apple Music', tracks: '24 tracks', color: 'bg-red-500' },
                      { name: 'YouTube Music', tracks: '28 tracks', color: 'bg-red-600' },
                      { name: 'SoundCloud', tracks: '15 tracks', color: 'bg-orange-500' }
          ].map((platform, index) => (
                      <div key={platform.name} className={`${platform.color} border-2 border-black shadow-brutal p-3 text-center cursor-pointer hover:shadow-brutal-lg transition-all touch-target`}>
                        <h4 className="text-white font-black text-sm">{platform.name}</h4>
                        <p className="text-white/80 font-bold text-xs">{platform.tracks}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
    </div>
  </div>
)}

        {/* Reviews Tab - Brutalist Mobile Design */}
        {activeTab === "reviews" && (
          <div className="p-4">
            {/* Header Section */}
            <div className="bg-black border-4 border-white shadow-brutal-lg mb-4">
              <div className="bg-brand-primary-action border-b-4 border-black p-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-black font-black uppercase text-xl">⭐ REVIEWS</h2>
                  {reviewsForDisplay && reviewsForDisplay.length > 0 && (
                    <div className="bg-black border-2 border-white px-3 py-1">
                      <span className="text-white font-black text-sm">{reviewsForDisplay.length} REVIEWS</span>
              </div>
            )}
          </div>
        </div>
      
                {isAuthenticated && (
                <div className="p-4 bg-gray-900">
                  <button
                    onClick={() => setShowReviewForm(!showReviewForm)}
                    className="w-full bg-brand-accent-peach border-4 border-black shadow-brutal hover:shadow-brutal-lg transition-all p-4 touch-target"
                  >
                    <span className="text-black font-black uppercase text-sm">
                      {showReviewForm ? "✖ CANCEL REVIEW" : "✍ WRITE REVIEW"}
                    </span>
                  </button>
                </div>
                )}
              </div>

              {/* Review Form */}
              {showReviewForm && isAuthenticated && (
              <div className="bg-white border-4 border-black shadow-brutal-lg p-4 mb-4">
                <div className="bg-black border-4 border-white shadow-brutal p-3 mb-4 text-center">
                  <h3 className="text-white font-black uppercase text-lg">📝 WRITE YOUR REVIEW</h3>
                </div>
                  <ReviewForm
                    animeId={anime._id}
                    existingReview={editingReview}
                    onSubmit={handleReviewSubmit}
                    onCancel={() => {
                      setShowReviewForm(false);
                      setEditingReview(null);
                    }}
                    isLoading={isSubmittingReview}
                  />
                </div>
              )}

              {/* Reviews List */}
              {reviewsIsLoadingInitial && reviewsForDisplay.length === 0 ? (
              <div className="bg-gray-800 border-4 border-white shadow-brutal-lg p-8 text-center">
                <div className="text-white font-black text-4xl mb-4 animate-pulse">⭐</div>
                <h3 className="text-white font-black uppercase text-lg">LOADING REVIEWS...</h3>
              </div>
              ) : reviewsForDisplay.length > 0 ? (
              <div className="space-y-4">
                {/* Reviews Grid - Brutalist Cards */}
                {reviewsForDisplay.slice(0, reviewsToShow).map((review) => (
                    <div 
                      key={review._id} 
                    className="bg-white border-4 border-black shadow-brutal-lg overflow-hidden"
                  >
                    {/* Review Header */}
                    <div className="bg-black border-b-4 border-white p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {/* User Avatar */}
                          <div className="bg-brand-primary-action border-2 border-white w-12 h-12 flex items-center justify-center">
                            <span className="text-black font-black text-lg">
                              {review.userName?.charAt(0).toUpperCase() || "U"}
                            </span>
                          </div>
                          {/* User Info */}
                          <div>
                            <h4 className="text-white font-black text-sm uppercase">{review.userName}</h4>
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <span key={i} className={`text-lg ${i < review.rating ? 'text-yellow-400' : 'text-gray-600'}`}>
                                  ★
                                </span>
                              ))}
                              <span className="text-white font-black text-xs ml-2">
                                {review.rating}/5
                              </span>
                        </div>
                      </div>
                              </div>
                        
                        {/* Actions & Time */}
                        <div className="flex items-center gap-2">
                          <div className="text-white/70 font-bold text-xs">
                            {formatDistanceToNow(new Date(review._creationTime), { addSuffix: true })}
                                      </div>
                          {/* Delete Button - Only show for own reviews or admins */}
                          {(review.userId === currentUserId || isAdmin) && (
                            <button
                              onClick={() => handleDeleteReview(review._id)}
                              disabled={deletingReviewId === review._id}
                              className="bg-red-600 border-2 border-white shadow-brutal hover:shadow-brutal-lg transition-all p-2 touch-target"
                            >
                              <span className="text-white font-black text-xs">
                                {deletingReviewId === review._id ? "⏳" : "🗑"}
                              </span>
                            </button>
                          )}
                                      </div>
                                    </div>
                                  </div>
                    
                    {/* Review Content */}
                    {review.reviewText && (
                      <div className="p-4 bg-white border-b-4 border-black">
                        <p className="text-black font-medium leading-relaxed text-sm">
                          {review.reviewText}
                              </p>
                            </div>
                          )}

                    {/* Review Actions */}
                    <div className="bg-gray-100 p-4">
                      <div className="grid grid-cols-3 gap-2">
                        {/* Upvote */}
                        <button
                          onClick={() => handleVote(review._id, "up")}
                          className={`
                            p-3 border-4 border-black shadow-brutal text-xs font-black uppercase touch-target transition-all
                            ${review.currentUserVote === "up" 
                              ? "bg-green-500 text-white shadow-brutal-lg" 
                              : "bg-white text-black hover:bg-green-200 hover:shadow-brutal-lg"
                            }
                          `}
                          disabled={!isAuthenticated || review.userId === currentUserId}
                        >
                          <div className="text-lg mb-1">👍</div>
                          <div>{review.upvotes || 0}</div>
                        </button>
                        
                        {/* Downvote */}
                        <button
                          onClick={() => handleVote(review._id, "down")}
                          className={`
                            p-3 border-4 border-black shadow-brutal text-xs font-black uppercase touch-target transition-all
                            ${review.currentUserVote === "down" 
                              ? "bg-red-500 text-white shadow-brutal-lg" 
                              : "bg-white text-black hover:bg-red-200 hover:shadow-brutal-lg"
                            }
                          `}
                          disabled={!isAuthenticated || review.userId === currentUserId}
                        >
                          <div className="text-lg mb-1">👎</div>
                          <div>{review.downvotes || 0}</div>
                        </button>
                        
                        {/* Comments */}
                        <button
                          onClick={() => handleToggleComments(review._id)}
                          className="bg-brand-secondary-blue border-4 border-black shadow-brutal hover:shadow-brutal-lg transition-all p-3 text-xs font-black uppercase text-white touch-target"
                        >
                          <div className="text-lg mb-1">💬</div>
                          <div>{review.commentCount || 0}</div>
                        </button>
                            </div>
                        </div>
                    </div>
                  ))}

                {/* Load More Reviews Button */}
                {reviewsForDisplay.length > reviewsToShow && (
                  <div className="bg-brand-primary-action border-4 border-black shadow-brutal-lg p-4 text-center mt-4">
                    <div className="text-black font-black text-xl mb-2">⭐</div>
                    <h3 className="text-black font-black uppercase text-base mb-2">MORE REVIEWS</h3>
                    <p className="text-black/80 font-bold text-xs mb-3">
                      + {reviewsForDisplay.length - reviewsToShow} Additional Reviews Available
                    </p>
                    <button 
                      onClick={handleLoadMoreReviews}
                      className="bg-black border-4 border-white shadow-brutal hover:shadow-brutal-lg transition-all p-4 w-full touch-target"
                    >
                      <span className="text-white font-black uppercase text-sm">
                        📖 LOAD MORE REVIEWS
                      </span>
                    </button>
                    </div>
                  )}
                </div>
              ) : (
              <div className="bg-gray-800 border-4 border-white shadow-brutal-lg p-8 text-center">
                <div className="text-white font-black text-4xl mb-4">📝</div>
                <h3 className="text-white font-black uppercase text-lg mb-2">NO REVIEWS YET</h3>
                <p className="text-white/80 font-bold text-sm mb-4">
                    {isAuthenticated 
                    ? "Be the first to share your thoughts!" 
                      : "Log in to write the first review!"
                    }
                  </p>
                  {isAuthenticated && (
                  <button
                      onClick={() => setShowReviewForm(true)}
                    className="bg-brand-primary-action border-4 border-black shadow-brutal hover:shadow-brutal-lg transition-all p-4 touch-target"
                  >
                    <span className="text-black font-black uppercase">✍ WRITE FIRST REVIEW</span>
                  </button>
                  )}
                </div>
              )}
          </div>
        )}

        {/* Similar Tab */}
        {activeTab === "similar" && (
          <div className="p-6 space-y-6">
            <div className="bg-black border-4 border-white shadow-brutal-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="bg-brand-primary-action border-4 border-black shadow-brutal p-4">
                  <h2 className="text-black font-black uppercase text-xl">🔍 SIMILAR ANIME</h2>
                  </div>
                <button
                  onClick={loadSimilarAnime}
                  className="bg-brand-accent-peach border-4 border-black shadow-brutal hover:shadow-brutal-lg transition-all p-3 touch-target"
                  disabled={loadingSimilar}
                >
                  <span className="text-black font-black uppercase text-sm">
                    {loadingSimilar ? "FINDING..." : "FIND SIMILAR"}
                  </span>
                </button>
              </div>
              
              {loadingSimilar && (
                <div className="bg-gray-600 border-4 border-black shadow-brutal p-8 text-center">
                  <div className="text-white font-black text-4xl mb-4 animate-pulse">🔍</div>
                  <h3 className="text-white font-black uppercase text-lg">FINDING SIMILAR ANIME...</h3>
                </div>
              )}
              
              {similarAnimeError && (
                <div className="bg-red-500 border-4 border-black shadow-brutal p-6 text-center">
                  <div className="text-white font-black text-4xl mb-4">❌</div>
                  <p className="text-white font-bold">{similarAnimeError}</p>
                </div>
              )}
              
              {!loadingSimilar && !similarAnimeError && showSimilarAnime && similarAnime.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  {similarAnime.slice(0, 6).map((rec, idx) => (
                    <div 
                      key={`similar-${idx}-${rec.title || idx}`} 
                      onClick={async () => {
                        if (rec._id) {
                          // Navigate to the anime detail page using the ID (convert string back to Id)
                          navigateToDetail(rec._id as Id<"anime">);
                        } else {
                          // Add anime to database first, then navigate
                          try {
                            toast.loading("Adding anime to database...", { id: `add-${idx}` });
                            
                            const result = await addAnimeFromRecommendation({
                              title: rec.title || "Unknown Title",
                              description: rec.description || "No description available.",
                              posterUrl: rec.posterUrl || "",
                              genres: rec.genres || [],
                              year: rec.year,
                              rating: rec.rating,
                              emotionalTags: rec.emotionalTags || [],
                              trailerUrl: rec.trailerUrl,
                              studios: rec.studios || [],
                              themes: rec.themes || [],
                              anilistId: rec.anilistId,
                              reasoning: rec.reasoning,
                              moodMatchScore: rec.moodMatchScore,
                            });

                            if (result.isNewlyAdded) {
                              toast.success(`Added "${rec.title}" to database!`, { id: `add-${idx}` });
                            } else {
                              toast.success(`Found "${rec.title}" in database!`, { id: `add-${idx}` });
                            }

                            // Navigate to the newly added/found anime
                            navigateToDetail(result.animeId);
                          } catch (error: any) {
                            console.error("Failed to add anime:", error);
                            toast.error(`Failed to add "${rec.title}": ${error.message}`, { id: `add-${idx}` });
                          }
                        }
                      }}
                      className="bg-white border-4 border-black shadow-brutal hover:shadow-brutal-lg transition-all cursor-pointer touch-target"
                    >
                      <div className="aspect-[3/4] bg-gray-200 border-b-4 border-black relative overflow-hidden">
                        {rec.posterUrl ? (
                          <img
                            src={rec.posterUrl}
                            alt={rec.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://placehold.co/300x400/ECB091/321D0B/png?text=${encodeURIComponent(rec.title?.substring(0, 10) || 'Anime')}&font=poppins`;
                            }}
                          />
                        ) : (
                          <div className="w-full h-full bg-brand-accent-peach flex items-center justify-center">
                            <span className="text-black font-black text-2xl">
                              {rec.title?.charAt(0).toUpperCase() || "A"}
                            </span>
                        </div>
                        )}
                      </div>
                      
                      <div className="p-3">
                        <h3 className="text-black font-black text-sm uppercase truncate">
                          {rec.title || "Unknown Title"}
                        </h3>
                        {rec.year && (
                          <p className="text-black/70 font-bold text-xs">{rec.year}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {!loadingSimilar && !similarAnimeError && !showSimilarAnime && (
                <div className="bg-gray-600 border-4 border-black shadow-brutal p-8 text-center">
                  <div className="text-white font-black text-4xl mb-4">🎯</div>
                  <h3 className="text-white font-black uppercase text-lg mb-2">DISCOVER SIMILAR ANIME</h3>
                  <p className="text-white/80 font-bold text-sm mb-4">
                    Find anime with similar themes and storytelling
                  </p>
                  <button
                    onClick={loadSimilarAnime}
                    className="bg-brand-primary-action border-4 border-black shadow-brutal hover:shadow-brutal-lg transition-all p-3 touch-target"
                  >
                    <span className="text-black font-black uppercase">🔍 FIND SIMILAR</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Episode Preview Modal */}
      <EnhancedEpisodePreviewModal
  isOpen={isPreviewOpen}
  onClose={handleClosePreview}
  previewUrl={currentPreviewUrl}
  themePalette={themePalette || undefined}
/>

      {/* Custom List Modal */}
      {isAddToCustomListModalOpen && myCustomLists && anime && (
        <AddToCustomListModal
          isOpen={isAddToCustomListModalOpen}
          onClose={() => setIsAddToCustomListModalOpen(false)}
          lists={myCustomLists}
          animeId={anime._id}
          onToggle={toggleAnimeInCustomList}
          themePalette={themePalette || undefined}
        />
      )}


    </div>
  );
}

const SwipeableEpisodeTabs: React.FC<{
  episodes: any[];
  selectedIndex: number;
  onEpisodeSelect: (index: number) => void;
  themePalette?: ColorPalette;
}> = ({ episodes, selectedIndex, onEpisodeSelect, themePalette }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to selected episode
  useEffect(() => {
    if (scrollContainerRef.current && selectedIndex >= 0) {
      const container = scrollContainerRef.current;
      const tabWidth = 60; // Width of each tab
      const containerWidth = container.clientWidth;
      const scrollPosition = (selectedIndex * tabWidth) - (containerWidth / 2) + (tabWidth / 2);
      
      container.scrollTo({
        left: Math.max(0, scrollPosition),
        behavior: 'smooth'
      });
    }
  }, [selectedIndex]);

  if (!episodes || episodes.length === 0) return null;

  return (
    <div className="bg-black border-4 border-white shadow-brutal-lg">
      <div className="bg-brand-primary-action border-b-4 border-black p-3">
        <div className="flex items-center justify-between">
          <h3 className="text-black font-black uppercase text-sm">📺 EPISODE SELECT</h3>
          <div className="bg-black border-2 border-white px-2 py-1">
            <span className="text-white font-black text-xs">{selectedIndex + 1}/{episodes.length}</span>
          </div>
        </div>
      </div>
      
      {/* Swipeable Episode Number Tabs */}
      <div 
        ref={scrollContainerRef}
        className="flex overflow-x-auto scrollbar-hide p-3 gap-2"
        style={{ 
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {episodes.map((episode, index) => (
          <button
            key={index}
            onClick={() => onEpisodeSelect(index)}
            className={`
              flex-shrink-0 w-14 h-14 border-3 border-black shadow-brutal transition-all duration-200 touch-target
              ${index === selectedIndex 
                ? 'bg-brand-accent-peach scale-110 shadow-brutal-lg' 
                : 'bg-white hover:bg-gray-100 hover:shadow-brutal-lg'
              }
            `}
            style={{ scrollSnapAlign: 'center' }}
          >
            <div className="w-full h-full flex flex-col items-center justify-center">
              <span className={`
                font-black text-xs leading-none
                ${index === selectedIndex ? 'text-black' : 'text-black/80'}
              `}>
                EP
              </span>
              <span className={`
                font-black text-lg leading-none
                ${index === selectedIndex ? 'text-black' : 'text-black/80'}
              `}>
                {index + 1}
              </span>
            </div>
          </button>
        ))}
      </div>
      

    </div>
  );
};

const AddToCustomListModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  lists: CustomListType[];
  animeId: Id<"anime">;
  onToggle: (listId: Id<"customLists">, inList: boolean) => void;
  themePalette?: ColorPalette;
}> = ({ isOpen, onClose, lists, animeId, onToggle, themePalette }) => {
  if (!isOpen) return null;
  
  const modalStyle = themePalette ? {
    backgroundColor: themePalette.dark,
    borderColor: `${themePalette.primary}40`
  } : {};

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div 
        className="text-white p-5 rounded-xl shadow-xl w-full max-w-md sm:max-w-lg md:max-w-xl space-y-4 border"
        style={modalStyle || { backgroundColor: '#1A1A1A', borderColor: 'rgba(255,255,255,0.2)' }}
      >
        <h3 className="text-lg font-heading">Manage Custom Lists</h3>
        {lists.length === 0 ? (
          <p className="text-sm text-center">No custom lists available.</p>
        ) : (
          <ul className="space-y-2">
            {lists.map(list => {
              const inList = list.animeIds.includes(animeId);
              return (
                <li key={list._id} className="flex items-center justify-between">
                  <span>{list.listName}</span>
                  <StyledButton
                    variant="secondary_small"
                    onClick={() => onToggle(list._id, inList)}
                    style={themePalette && inList ? {
                      backgroundColor: `${themePalette.primary}20`,
                      borderColor: `${themePalette.primary}40`,
                      color: themePalette.primary
                    } : {}}
                  >
                    {inList ? "Remove" : "Add"}
                  </StyledButton>
                </li>
              );
            })}
          </ul>
        )}
        <div className="text-right pt-2">
          <StyledButton 
            variant="secondary_small" 
            onClick={onClose}
            style={themePalette ? {
              backgroundColor: `${themePalette.secondary}20`,
              borderColor: `${themePalette.secondary}40`,
              color: themePalette.secondary
            } : {}}
          >
            Close
          </StyledButton>
        </div>
      </div>
    </div>
  );
};