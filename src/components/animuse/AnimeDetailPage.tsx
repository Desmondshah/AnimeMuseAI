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
import { useMobileOptimizations } from "../../../convex/useMobileOptimizations";
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
  enrichmentStatus?: "pending" | "success" | "failed";
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
  const userProfile = useQuery(api.users.getMyUserProfile, isAuthenticated ? {} : "skip");
  const myCustomLists = useQuery(api.users.getMyCustomLists, isAuthenticated ? {} : "skip");
  const addToCustomListMutation = useMutation(api.users.addAnimeToCustomList);
  const removeFromCustomListMutation = useMutation(api.users.removeAnimeFromCustomList);

  const [isAddToCustomListModalOpen, setIsAddToCustomListModalOpen] = useState(false);

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
    <div className="ios-character-page min-h-screen bg-brand-background relative overflow-hidden" style={dynamicBackgroundStyle}>
      {/* Enhanced Background Elements with Dynamic Colors */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute top-20 left-10 w-80 h-80 rounded-full blur-3xl animate-pulse"
          style={{
            background: themePalette ? 
              `radial-gradient(circle, ${themePalette.primary}12, transparent)` : 
              'radial-gradient(circle, rgba(236, 176, 145, 0.12), transparent)'
          }}
        ></div>
        <div 
          className="absolute bottom-32 right-16 w-96 h-96 rounded-full blur-3xl animate-pulse"
          style={{
            background: themePalette ? 
              `radial-gradient(circle, ${themePalette.accent}10, transparent)` : 
              'radial-gradient(circle, rgba(255, 107, 53, 0.10), transparent)',
            animationDelay: '1000ms'
          }}
        ></div>
        <div 
          className="absolute top-1/2 right-1/4 w-64 h-64 rounded-full blur-3xl animate-pulse"
          style={{
            background: themePalette ? 
              `radial-gradient(circle, ${themePalette.secondary}08, transparent)` : 
              'radial-gradient(circle, rgba(74, 144, 226, 0.08), transparent)',
            animationDelay: '2000ms'
          }}
        ></div>
      </div>

      {/* Hero Section with Dynamic Theming */}
      <div className="character-hero relative">
        <div 
          ref={heroRef}
          className="character-hero-image fixed inset-0 w-full h-screen"
        >
          <img
            src={anime.posterUrl || placeholderPoster}
            alt={anime.title}
            className="w-full h-full object-cover"
            onLoad={(e) => handleImageLoad(e.target as HTMLImageElement)}
            onError={(e) => { (e.target as HTMLImageElement).src = placeholderPoster; }}
          />
        </div>
        
        {/* Enhanced overlay for immersive fade effect */}
        <div 
          className="character-hero-overlay absolute inset-0"
          style={heroOverlayStyle || { 
            background: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.2) 30%, rgba(0,0,0,0.6) 60%, rgba(0,0,0,0.9) 85%, rgba(0,0,0,1) 100%)' 
          }}
        />
        
        {/* Back button with dynamic theming */}
        <div className="absolute top-safe-top left-4 z-20 pt-4">
          <button
            onClick={onBack}
            className="bg-black/60 backdrop-blur-lg border border-white/20 rounded-2xl p-3 transition-all duration-300 hover:scale-105"
            style={themePalette ? {
              borderColor: `${themePalette.primary}30`,
              backgroundColor: `${themePalette.dark}40`
            } : {}}
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* Color extraction status indicator */}
        {isExtractingColors && (
          <div className="absolute top-safe-top right-4 z-20 pt-4">
            <div className="bg-black/60 backdrop-blur-lg border border-white/20 rounded-2xl px-4 py-2 flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span className="text-white/80 text-sm font-medium">Extracting theme...</span>
            </div>
          </div>
        )}

        {/* Hero content with enhanced dynamic styling */}
        <div className="character-hero-content absolute bottom-20 left-0 right-0 p-6 sm:p-8 md:p-12 z-10">
          <h1 className="character-name text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-heading text-white font-bold mb-4 drop-shadow-2xl">
            {anime.title}
          </h1>
          
          {/* Quick info badges with dynamic theming */}
          <div className="flex flex-wrap gap-3 mb-6">
            {anime.year && (
              <span 
                className="character-badge backdrop-blur-sm rounded-full px-4 py-2 text-white font-medium border"
                style={themePalette ? {
                  backgroundColor: `${themePalette.primary}30`,
                  borderColor: `${themePalette.primary}50`
                } : { backgroundColor: 'rgba(0,0,0,0.6)', borderColor: 'rgba(255,255,255,0.2)' }}
              >
                📅 {anime.year}
              </span>
            )}
            {anime.rating && (
              <span 
                className="character-badge backdrop-blur-sm rounded-full px-4 py-2 text-white font-medium border"
                style={themePalette ? {
                  backgroundColor: `${themePalette.accent}30`,
                  borderColor: `${themePalette.accent}50`
                } : { backgroundColor: 'rgba(0,0,0,0.6)', borderColor: 'rgba(255,255,255,0.2)' }}
              >
                ⭐ {(anime.rating / 2).toFixed(1)}/5
              </span>
            )}
            {anime.totalEpisodes && (
              <span 
                className="character-badge backdrop-blur-sm rounded-full px-4 py-2 text-white font-medium border"
                style={themePalette ? {
                  backgroundColor: `${themePalette.secondary}30`,
                  borderColor: `${themePalette.secondary}50`
                } : { backgroundColor: 'rgba(0,0,0,0.6)', borderColor: 'rgba(255,255,255,0.2)' }}
              >
                📺 {anime.totalEpisodes} episodes
              </span>
            )}
            {anime.airingStatus && anime.airingStatus !== "FINISHED" && (
              <span className="character-badge bg-green-500/80 backdrop-blur-sm rounded-full px-4 py-2 text-white font-medium border border-green-400/50">
                🔴 {anime.airingStatus === "RELEASING" ? "Airing" : anime.airingStatus}
              </span>
            )}
          </div>

          {/* Genre tags with dynamic theming */}
          {anime.genres && anime.genres.length > 0 && (
  <div className="flex flex-wrap gap-2 mb-6">
    {anime.genres.slice(0, 4).map((genre: string, idx: number) => (
      <span 
        key={idx} 
        className="character-badge text-white px-3 py-1 rounded-full backdrop-blur-sm font-medium border"
        style={themePalette ? {
          background: `linear-gradient(135deg, ${themePalette.primary}80, ${themePalette.accent}80)`,
          borderColor: `${themePalette.primary}60`
        } : {
          background: 'linear-gradient(135deg, rgba(236, 176, 145, 0.8), rgba(255, 107, 53, 0.8))',
          borderColor: 'rgba(236, 176, 145, 0.6)'
        }}
      >
        {genre}
      </span>
    ))}
    {anime.genres.length > 4 && (
      <span 
        className="character-badge backdrop-blur-sm rounded-full px-3 py-1 text-white font-medium border"
        style={themePalette ? {
          backgroundColor: `${themePalette.dark}60`,
          borderColor: `${themePalette.primary}30`
        } : { backgroundColor: 'rgba(0,0,0,0.6)', borderColor: 'rgba(255,255,255,0.2)' }}
      >
        +{anime.genres.length - 4} more
      </span>
    )}
  </div>
)}

          {/* Action buttons with enhanced dynamic styling */}
          <div className="flex gap-3 flex-wrap">
            {isAuthenticated ? (
              <>
                {watchlistEntry?.status === "Plan to Watch" ? (
                  <StyledButton 
                    onClick={() => handleWatchlistAction("Watching")} 
                    className="!text-white !font-semibold !px-6 !py-3 !rounded-2xl !border-0"
                    style={actionButtonStyle}
                  >
                    🎬 Start Watching
                  </StyledButton>
                ) : watchlistEntry?.status === "Watching" ? (
                  <StyledButton 
                    onClick={() => handleWatchlistAction("Completed")} 
                    className="!text-white !font-semibold !px-6 !py-3 !rounded-2xl !border-0"
                    style={{
                      background: 'linear-gradient(135deg, #10B981, #34D399)',
                      boxShadow: '0 8px 32px rgba(16, 185, 129, 0.3)'
                    }}
                  >
                    ✅ Mark Completed
                  </StyledButton>
                ) : watchlistEntry?.status === "Completed" ? (
                  <div 
                    className="backdrop-blur-lg border px-6 py-3 rounded-2xl"
                    style={themePalette ? {
                      backgroundColor: `${themePalette.primary}20`,
                      borderColor: `${themePalette.primary}40`
                    } : { backgroundColor: 'rgba(0,0,0,0.6)', borderColor: 'rgba(255,255,255,0.2)' }}
                  >
                    <span className="text-green-400 font-semibold flex items-center gap-2">
                      🏆 Completed
                    </span>
                  </div>
                ) : (
                  <StyledButton 
                    onClick={() => handleWatchlistAction("Plan to Watch")} 
                    variant="primary" 
                    className="!text-white !font-semibold !px-6 !py-3 !rounded-2xl !border-0"
                    style={actionButtonStyle}
                  >
                    📚 Add to Watchlist
                  </StyledButton>
                )}
              </>
            ) : (
              <div 
                className="backdrop-blur-lg border px-6 py-3 rounded-2xl"
                style={themePalette ? {
                  backgroundColor: `${themePalette.dark}40`,
                  borderColor: `${themePalette.primary}20`
                } : { backgroundColor: 'rgba(0,0,0,0.6)', borderColor: 'rgba(255,255,255,0.2)' }}
              >
                <span className="text-white/70 text-sm">Login to manage watchlist</span>
              </div>
            )}
            
            {/* Add to Custom List Button */}
            {isAuthenticated && (
              <StyledButton
                onClick={() => setIsAddToCustomListModalOpen(true)}
                variant="ghost"
                className="!backdrop-blur-lg !text-white/80 !px-4 !py-3 !rounded-2xl flex items-center gap-2 !border"
                style={themePalette ? {
                  backgroundColor: `${themePalette.primary}15`,
                  borderColor: `${themePalette.primary}30`
                } : { backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.2)' }}
              >
                <span className="text-lg">➕</span>
                <span className="font-medium">Custom Lists</span>
              </StyledButton>
            )}
            
            {/* Smart Refresh Button */}
            <StyledButton 
              onClick={() => handleSmartRefresh("manual", true)} 
              variant="ghost" 
              className="!backdrop-blur-lg !text-white/80 !px-4 !py-3 !rounded-2xl flex items-center gap-2 !border"
              style={themePalette ? {
                backgroundColor: `${themePalette.secondary}15`,
                borderColor: `${themePalette.secondary}30`
              } : { backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.2)' }}
              disabled={isAutoRefreshing}
            >
              <span className={`text-lg ${isAutoRefreshing ? "animate-spin" : ""}`}>🔄</span>
              <span className="font-medium">{isAutoRefreshing ? "Updating..." : "Refresh Data"}</span>
            </StyledButton>
          </div>

          {/* Scroll indicator with dynamic theming */}
          <div className="scroll-indicator absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
            <div 
              className="scroll-indicator-mouse w-6 h-10 border-2 rounded-full flex justify-center"
              style={themePalette ? {
                borderColor: `${themePalette.primary}50`
              } : { borderColor: 'rgba(255,255,255,0.5)' }}
            >
              <div 
                className="scroll-indicator-dot w-1 h-1 rounded-full mt-2 animate-pulse"
                style={themePalette ? {
                  backgroundColor: `${themePalette.accent}70`
                } : { backgroundColor: 'rgba(255,255,255,0.7)' }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Data Freshness Indicator with Dynamic Theming */}
      {refreshRecommendation && (
        <div className="relative z-10 px-6 pb-8 bg-gradient-to-b from-transparent via-black/30 to-black">
          <div 
            className="flex flex-wrap items-center justify-between gap-4 p-4 backdrop-blur-lg border rounded-2xl"
            style={sectionCardStyle}
          >
            <DataFreshnessIndicator
              freshnessScore={refreshRecommendation.freshnessScore}
              priority={refreshRecommendation.priority}
              lastFetched={refreshRecommendation.anime?.lastFetched}
              isRefreshing={isAutoRefreshing}
              onRefresh={() => handleSmartRefresh("manual")}
              themePalette={themePalette || undefined}
            />
            
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-white/70 text-sm">
                <input
                  type="checkbox"
                  checked={autoRefreshEnabled}
                  onChange={(e) => setAutoRefreshEnabled(e.target.checked)}
                  className="rounded border-white/30 bg-white/10 focus:ring-2"
                  style={themePalette ? {
                    accentColor: themePalette.primary
                  } : { accentColor: '#ECB091' }}
                />
                Auto-update
              </label>
              
              <StyledButton
                onClick={() => setShowRefreshDetails(!showRefreshDetails)}
                variant="ghost"
                className="!text-xs !py-1 !px-2 !text-white/70 !border"
                style={themePalette ? {
                  backgroundColor: `${themePalette.primary}10`,
                  borderColor: `${themePalette.primary}20`
                } : { backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.2)' }}
              >
                {showRefreshDetails ? "Hide Details" : "Details"}
              </StyledButton>
            </div>
          </div>

          {/* Refresh Details Panel with Dynamic Theming */}
          {showRefreshDetails && (
            <div 
              className="mt-4 p-4 backdrop-blur-lg border rounded-2xl"
              style={sectionCardStyle}
            >
              <h4 className="text-white font-medium mb-3">Data Status Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-white/60 mb-1">Freshness Score:</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-white/10 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full"
                        style={{
                          width: `${refreshRecommendation.freshnessScore}%`,
                          background: themePalette ? 
                            `linear-gradient(to right, ${themePalette.primary}, ${themePalette.accent})` :
                            'linear-gradient(to right, #EF4444, #F59E0B, #10B981)'
                        }}
                      ></div>
                    </div>
                    <span className="text-white">{refreshRecommendation.freshnessScore}/100</span>
                  </div>
                </div>
                <div>
                  <p className="text-white/60 mb-1">Reason:</p>
                  <p className="text-white">{refreshRecommendation.reason}</p>
                </div>
                <div>
                  <p className="text-white/60 mb-1">Recommended Action:</p>
                  <p className="text-white capitalize">{refreshRecommendation.recommendedAction}</p>
                </div>
                <div>
                  <p className="text-white/60 mb-1">Last Refresh Result:</p>
                  <p className="text-white">
                    {lastRefreshResult ? lastRefreshResult.message : "No recent refresh"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab Navigation with Dynamic Theming */}
      <IOSTabBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabs={tabs}
        themePalette={themePalette || undefined}
      />

      {/* Content Sections with Enhanced Dynamic Theming */}
      <div className="relative z-10 pb-24 min-h-screen bg-black">
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="ios-scroll-section px-6 py-8 space-y-8">
            {/* Synopsis */}
            <div 
              className="section-card backdrop-blur-lg border rounded-3xl p-6"
              style={sectionCardStyle}
            >
              <div className="section-card-header flex items-center gap-3 mb-6">
                <div 
                  className="section-card-icon p-2 rounded-full"
                  style={themePalette ? {
                    background: `linear-gradient(135deg, ${themePalette.primary}30, ${themePalette.accent}30)`
                  } : { background: 'linear-gradient(135deg, rgba(236, 176, 145, 0.3), rgba(255, 107, 53, 0.3))' }}
                >
                  📖
                </div>
                <h2 className="section-card-title text-2xl font-heading text-white font-bold">Synopsis</h2>
              </div>
              <p className="text-white/90 leading-relaxed selectable-text">
                {anime.description || "No synopsis available for this anime."}
              </p>
            </div>

            {/* Quick Stats with Dynamic Theming */}
            <div className="grid grid-cols-2 gap-4">
              <div 
                className="section-card backdrop-blur-lg border rounded-2xl p-4 text-center"
                style={sectionCardStyle}
              >
                <div className="text-2xl mb-2">📊</div>
                <div className="text-white/60 text-sm">Rating</div>
                <div className="text-white font-semibold">
                  {anime.rating ? `${(anime.rating / 2).toFixed(1)}/5` : "N/A"}
                </div>
              </div>
              <div 
                className="section-card backdrop-blur-lg border rounded-2xl p-4 text-center"
                style={sectionCardStyle}
              >
                <div className="text-2xl mb-2">📺</div>
                <div className="text-white/60 text-sm">Episodes</div>
                <div className="text-white font-semibold">
                  {anime.totalEpisodes || "N/A"}
                </div>
              </div>
              <div 
                className="section-card backdrop-blur-lg border rounded-2xl p-4 text-center"
                style={sectionCardStyle}
              >
                <div className="text-2xl mb-2">🎬</div>
                <div className="text-white/60 text-sm">Studio</div>
                <div className="text-white font-semibold text-xs">
                  {anime.studios?.[0] || "N/A"}
                </div>
              </div>
              <div 
                className="section-card backdrop-blur-lg border rounded-2xl p-4 text-center"
                style={sectionCardStyle}
              >
                <div className="text-2xl mb-2">📅</div>
                <div className="text-white/60 text-sm">Year</div>
                <div className="text-white font-semibold">
                  {anime.year || "N/A"}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Episodes Tab */}
{activeTab === "episodes" && (
  <EnhancedEpisodesTab
    episodes={episodes}
    themePalette={themePalette || undefined}
    onPreview={handleOpenPreview}
    anime={anime}
  />
)}

        {/* Characters Tab */}
        {activeTab === "characters" && (
  <div className="ios-scroll-section px-6 py-8">
    {charactersForDisplay && charactersForDisplay.length > 0 ? (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">
            👥 Characters ({charactersForDisplay.length})
          </h2>
          
          {/* Enhanced Status Indicator */}
          <div className="flex items-center gap-3">
            {/* Enrichment Status */}
            {isEnriching ? (
              <div 
                className="flex items-center gap-2 rounded-full px-3 py-1 border"
                style={themePalette ? {
                  backgroundColor: `${themePalette.secondary}20`,
                  borderColor: `${themePalette.secondary}30`
                } : { backgroundColor: 'rgba(59, 130, 246, 0.2)', borderColor: 'rgba(59, 130, 246, 0.3)' }}
              >
                <div 
                  className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin"
                  style={themePalette ? {
                    borderColor: themePalette.secondary
                  } : { borderColor: '#3B82F6' }}
                ></div>
                <span className="text-xs font-medium" style={{ color: themePalette?.secondary || '#60A5FA' }}>
                  Enhancing...
                </span>
              </div>
            ) : (
              <div 
                className="flex items-center gap-2 rounded-full px-3 py-1 border"
                style={themePalette ? {
                  backgroundColor: `${themePalette.primary}15`,
                  borderColor: `${themePalette.primary}30`
                } : { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.3)' }}
              >
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-xs font-medium text-green-400">
                  {(() => {
                    const enrichedCount = charactersForDisplay.filter(c => c.enrichmentStatus === "success").length;
                    const totalCount = charactersForDisplay.length;
                    return enrichedCount === totalCount ? 'Fully Enhanced' : `${enrichedCount}/${totalCount} Enhanced`;
                  })()}
                </span>
              </div>
            )}

            {/* Manual Refresh Button */}
            {!isEnriching && (
              <StyledButton
                onClick={enrichMissingCharacters}
                variant="ghost"
                className="!text-xs !py-1 !px-2 !border"
                style={themePalette ? {
                  backgroundColor: `${themePalette.accent}10`,
                  borderColor: `${themePalette.accent}20`,
                  color: themePalette.accent
                } : { 
                  backgroundColor: 'rgba(168, 85, 247, 0.1)', 
                  borderColor: 'rgba(168, 85, 247, 0.2)',
                  color: '#A855F7'
                }}
                title="Enhance more characters"
              >
                🤖 Enhance
              </StyledButton>
            )}
          </div>
        </div>
      
        <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
          {charactersForDisplay
            .filter(character => character && character.name) // Filter out invalid characters
            .map((character, index) => (
            <CharacterCard
              key={`character-${character.id || character.name || index}`}
              character={character}
              onClick={() => onCharacterClick(character, anime.title)}
              themePalette={themePalette || undefined}
            />
          ))}
        </div>
      </div>
    ) : (
      <div 
        className="section-card backdrop-blur-lg border rounded-3xl p-8 text-center"
        style={sectionCardStyle}
      >
        <div className="text-6xl mb-4 opacity-50">👥</div>
        <h3 className="text-xl text-white/70 mb-2">No Character Data</h3>
        <p className="text-white/50 text-sm">
          Character information is not yet available for this anime.
        </p>
      </div>
    )}
  </div>
)}

        {/* Reviews Tab with Enhanced Theming */}
        {activeTab === "reviews" && (
          <div className="ios-scroll-section px-6 py-8">
            <div 
              className="section-card backdrop-blur-lg border rounded-3xl p-6"
              style={sectionCardStyle}
            >
              <div className="section-card-header flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div 
                    className="section-card-icon p-2 rounded-full"
                    style={themePalette ? {
                      background: `linear-gradient(135deg, ${themePalette.secondary}30, ${themePalette.accent}30)`
                    } : { background: 'linear-gradient(135deg, rgba(236, 112, 199, 0.3), rgba(168, 85, 247, 0.3))' }}
                  >
                    ⭐
                  </div>
                  <h2 className="section-card-title text-2xl font-heading text-white font-bold">Reviews</h2>
                </div>
                {isAuthenticated && (
                  <StyledButton
                    onClick={() => setShowReviewForm(!showReviewForm)}
                    variant="primary"
                    className="!text-sm !px-4 !py-2 !rounded-xl !border-0"
                    style={themePalette ? {
                      background: themePalette.gradient,
                      boxShadow: `0 4px 15px ${themePalette.primary}30`
                    } : {}}
                  >
                    {showReviewForm ? "Cancel" : "Write Review"}
                  </StyledButton>
                )}
              </div>

              {/* Review Form */}
              {showReviewForm && isAuthenticated && (
                <div className="mb-8">
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
                <IOSLoadingSpinner message="Loading reviews..." themePalette={themePalette || undefined} />
              ) : reviewsForDisplay.length > 0 ? (
                <div className="space-y-6">
                  {reviewsForDisplay.map((review) => (
                    <div 
                      key={review._id} 
                      className="backdrop-blur-sm border rounded-2xl p-6"
                      style={themePalette ? {
                        backgroundColor: `${themePalette.dark}40`,
                        borderColor: `${themePalette.primary}10`
                      } : { backgroundColor: 'rgba(0,0,0,0.4)', borderColor: 'rgba(255,255,255,0.1)' }}
                    >
                      <ReviewCard
                        review={review}
                        currentUserId={currentUserId}
                        onEdit={(reviewToEdit) => {
                          if (reviewToEdit.userId === currentUserId) {
                            setEditingReview(reviewToEdit);
                            setShowReviewForm(true);
                          }
                        }}
                        onDelete={async (reviewId) => {
                          if (window.confirm("Are you sure you want to delete this review?")) {
                            try {
                              await deleteReviewInternalMutation({ reviewId });
                              toast.success("Review deleted successfully.");
                            } catch (error: any) {
                              toast.error("Failed to delete review.");
                            }
                          }
                        }}
                      />
                      
                      {/* Review Actions with Dynamic Theming */}
                      <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <StyledButton
                              onClick={() => handleVote(review._id, "up")}
                              variant="ghost"
                              className={`!text-xs !px-2 !py-1 !border ${
                                review.currentUserVote === "up" 
                                  ? "!text-brand-primary-action" 
                                  : "!text-white/70 hover:!text-brand-primary-action"
                              }`}
                              style={review.currentUserVote === "up" && themePalette ? {
                                backgroundColor: `${themePalette.primary}10`,
                                borderColor: `${themePalette.primary}30`,
                                color: themePalette.primary
                              } : { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}
                              disabled={!isAuthenticated || review.userId === currentUserId}
                            >
                              👍 {review.upvotes || 0}
                            </StyledButton>
                            <StyledButton
                              onClick={() => handleVote(review._id, "down")}
                              variant="ghost"
                              className={`!text-xs !px-2 !py-1 !border ${
                                review.currentUserVote === "down" 
                                  ? "!text-red-500" 
                                  : "!text-white/70 hover:!text-red-500"
                              }`}
                              style={review.currentUserVote === "down" ? {
                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                borderColor: 'rgba(239, 68, 68, 0.3)',
                                color: '#EF4444'
                              } : { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}
                              disabled={!isAuthenticated || review.userId === currentUserId}
                            >
                              👎 {review.downvotes || 0}
                            </StyledButton>
                          </div>

                          <StyledButton
                            onClick={() => handleToggleComments(review._id)}
                            variant="ghost"
                            className="!text-xs !px-2 !py-1 hover:!text-brand-primary-action !border"
                            style={themePalette ? {
                              backgroundColor: `${themePalette.accent}10`,
                              borderColor: `${themePalette.accent}20`,
                              color: themePalette.accent
                            } : { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', color: '#ECB091' }}
                          >
                            💬 {review.commentCount || 0} Comments
                          </StyledButton>
                        </div>
                      </div>

                      {/* Comments Section */}
                      {activeReviewIdForComments === review._id && (
                        <div className="mt-6 pt-6 border-t border-white/10">
                          {isAuthenticated && (
                            <div className="mb-6">
                              <textarea
                                value={newCommentText[review._id] || ""}
                                onChange={(e) => setNewCommentText(prev => ({ ...prev, [review._id]: e.target.value }))}
                                rows={3}
                                maxLength={1000}
                                placeholder="Add a comment..."
                                className="w-full backdrop-blur-sm border rounded-2xl p-4 text-white placeholder-white/60 focus:outline-none transition-all duration-300 resize-none mb-3 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                                style={themePalette ? {
                                  backgroundColor: `${themePalette.dark}40`,
                                  borderColor: `${themePalette.primary}20`
                                } : { 
                                  backgroundColor: 'rgba(0,0,0,0.4)', 
                                  borderColor: 'rgba(255,255,255,0.2)'
                                }}
                              />
                              <div className="flex justify-between items-center">
                                <p className="text-white/60 text-xs">
                                  {(newCommentText[review._id] || "").length}/1000
                                </p>
                                <StyledButton
                                  onClick={() => handleAddComment(review._id)}
                                  variant="primary"
                                  className="!text-xs !border-0"
                                  style={themePalette ? {
                                    background: themePalette.gradient,
                                    boxShadow: `0 4px 15px ${themePalette.primary}30`
                                  } : {}}
                                  disabled={isSubmittingComment || !(newCommentText[review._id] || "").trim()}
                                >
                                  {isSubmittingComment ? "Posting..." : "Post Comment"}
                                </StyledButton>
                              </div>
                            </div>
                          )}

                          {commentsIsLoading && (
                            <IOSLoadingSpinner message="Loading comments..." themePalette={themePalette || undefined} />
                          )}

                          {commentsDataForActiveReview && commentsDataForActiveReview.length > 0 ? (
                            <div className="space-y-4">
                              {commentsDataForActiveReview.map((comment) => (
                                <div 
                                  key={comment._id} 
                                  className="backdrop-blur-sm rounded-xl p-4 border"
                                  style={themePalette ? {
                                    backgroundColor: `${themePalette.dark}20`,
                                    borderColor: `${themePalette.primary}05`
                                  } : { backgroundColor: 'rgba(0,0,0,0.2)', borderColor: 'rgba(255,255,255,0.05)' }}
                                >
                                  <div className="flex items-start gap-3 mb-3">
                                    {comment.userAvatarUrl ? (
                                      <img 
                                        src={comment.userAvatarUrl} 
                                        alt={comment.userName} 
                                        className="w-8 h-8 rounded-full object-cover" 
                                      />
                                    ) : (
                                      <div 
                                        className="w-8 h-8 rounded-full text-brand-surface flex items-center justify-center text-xs font-semibold"
                                        style={themePalette ? {
                                          backgroundColor: themePalette.accent
                                        } : { backgroundColor: '#ECB091' }}
                                      >
                                        {comment.userName?.charAt(0).toUpperCase() || "U"}
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between">
                                        <h5 className="font-medium text-white text-sm">
                                          {comment.userName}
                                        </h5>
                                        <p className="text-white/60 text-xs">
                                          {formatDistanceToNow(new Date(comment._creationTime), { addSuffix: true })}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                  <p className="text-white/90 text-sm leading-relaxed whitespace-pre-wrap ml-11">
                                    {comment.commentText}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : !commentsIsLoading && (
                            <div className="text-center py-8">
                              <div className="text-4xl mb-2">💬</div>
                              <p className="text-white/60 text-sm">
                                No comments yet. {isAuthenticated ? "Be the first to comment!" : "Log in to comment."}
                              </p>
                            </div>
                          )}

                          {commentsPaginationStatus === "CanLoadMore" && (
                            <div className="text-center mt-6">
                              <StyledButton
                                onClick={() => commentsLoadMore(3)}
                                variant="ghost"
                                className="!text-xs !backdrop-blur-sm !border !text-white"
                                style={themePalette ? {
                                  backgroundColor: `${themePalette.primary}10`,
                                  borderColor: `${themePalette.primary}20`
                                } : { backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.2)' }}
                                disabled={commentsIsLoading}
                              >
                                {commentsIsLoading ? "Loading..." : "Load More Comments"}
                              </StyledButton>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {reviewsStatus === "CanLoadMore" && (
                    <div className="text-center mt-8">
                      <StyledButton
                        onClick={() => reviewsLoadMore(3)}
                        variant="secondary"
                        className="!backdrop-blur-sm !border !text-white"
                        style={themePalette ? {
                          backgroundColor: `${themePalette.dark}30`,
                          borderColor: `${themePalette.primary}20`
                        } : { backgroundColor: 'rgba(0,0,0,0.3)', borderColor: 'rgba(255,255,255,0.2)' }}
                        disabled={reviewsIsLoadingInitial}
                      >
                        {reviewsIsLoadingInitial ? "Loading..." : "Load More Reviews"}
                      </StyledButton>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-8xl mb-4">📝</div>
                  <h4 className="text-xl font-heading text-white mb-2">No Reviews Yet</h4>
                  <p className="text-white/70 mb-6">
                    {isAuthenticated 
                      ? "Be the first to share your thoughts about this anime!" 
                      : "Log in to write the first review!"
                    }
                  </p>
                  {isAuthenticated && (
                    <StyledButton
                      onClick={() => setShowReviewForm(true)}
                      variant="primary"
                      className="!border-0"
                      style={themePalette ? {
                        background: themePalette.gradient,
                        boxShadow: `0 8px 32px ${themePalette.primary}30`
                      } : {}}
                    >
                      Write the First Review
                    </StyledButton>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Similar Tab with Enhanced Theming */}
        {activeTab === "similar" && (
          <div className="ios-scroll-section px-6 py-8">
            <div 
              className="section-card backdrop-blur-lg border rounded-3xl p-6"
              style={sectionCardStyle}
            >
              <div className="section-card-header flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div 
                    className="section-card-icon p-2 rounded-full"
                    style={themePalette ? {
                      background: `linear-gradient(135deg, ${themePalette.secondary}30, ${themePalette.primary}30)`
                    } : { background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.3), rgba(59, 130, 246, 0.3))' }}
                  >
                    🔍
                  </div>
                  <h2 className="section-card-title text-2xl font-heading text-white font-bold">Similar Anime</h2>
                </div>
                <StyledButton
                  onClick={loadSimilarAnime}
                  variant="primary"
                  className="!text-sm !px-4 !py-2 !rounded-xl !border-0"
                  style={themePalette ? {
                    background: themePalette.gradient,
                    boxShadow: `0 4px 15px ${themePalette.primary}30`
                  } : {}}
                  disabled={loadingSimilar}
                >
                  {loadingSimilar ? "Finding..." : "Find Similar"}
                </StyledButton>
              </div>
              
              {loadingSimilar && <IOSLoadingSpinner message="Finding similar anime..." themePalette={themePalette || undefined} />}
              {similarAnimeError && <p className="text-red-400 text-center py-8">{similarAnimeError}</p>}
              
              {!loadingSimilar && !similarAnimeError && showSimilarAnime && similarAnime.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
                  {similarAnime.map((rec, idx) => (
                    <div 
                      key={`similar-${idx}-${rec.title || idx}`} 
                      className="group relative transform transition-all duration-500 hover:scale-105"
                      style={{ animationDelay: `${idx * 100}ms` }}
                    >
                      <div 
                        className="absolute -inset-2 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        style={themePalette ? {
                          background: `linear-gradient(135deg, ${themePalette.primary}30, ${themePalette.accent}30)`
                        } : { background: 'linear-gradient(135deg, rgba(236, 176, 145, 0.3), rgba(255, 107, 53, 0.3))' }}
                      ></div>
                      <div 
                        className="relative backdrop-blur-sm rounded-2xl overflow-hidden border group-hover:border-white/30 transition-all duration-300"
                        style={themePalette ? {
                          backgroundColor: `${themePalette.dark}20`,
                          borderColor: `${themePalette.primary}10`
                        } : { backgroundColor: 'rgba(0,0,0,0.2)', borderColor: 'rgba(255,255,255,0.1)' }}
                      >
                        <AnimeCard 
                          anime={rec} 
                          isRecommendation={true} 
                          onViewDetails={navigateToDetail}
                          className="w-full"
                        />
                        <div 
                          className="p-3"
                          style={themePalette ? {
                            background: `linear-gradient(to top, ${themePalette.dark}80, transparent)`
                          } : { background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}
                        >
                          <h4 className="text-sm font-medium text-white text-center truncate" title={rec.title}>
                            {rec.title || "Unknown Title"}
                          </h4>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {!loadingSimilar && !similarAnimeError && !showSimilarAnime && (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4 opacity-50">🎯</div>
                  <h3 className="text-xl text-white/70 mb-2">Discover Similar Anime</h3>
                  <p className="text-white/50 text-sm mb-6">
                    Find anime with similar themes, genres, and storytelling.
                  </p>
                  <StyledButton
                    onClick={loadSimilarAnime}
                    variant="primary"
                    className="!border-0"
                    style={themePalette ? {
                      background: themePalette.gradient,
                      boxShadow: `0 8px 32px ${themePalette.primary}30`
                    } : {}}
                    disabled={loadingSimilar}
                  >
                    🔍 Find Similar Anime
                  </StyledButton>
                </div>
              )}
              
              {!loadingSimilar && !similarAnimeError && showSimilarAnime && similarAnime.length === 0 && (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">🤔</div>
                  <p className="text-white/70">No similar anime found. Try refreshing or check back later!</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Watchlist Notes Section with Enhanced Theming */}
      {watchlistEntry && (
        <div className="relative z-10 px-6 pb-8">
          <div className="relative">
            <div 
              className="absolute inset-0 rounded-3xl blur-xl"
              style={themePalette ? {
                background: `linear-gradient(135deg, ${themePalette.accent}10, ${themePalette.secondary}10)`
              } : { background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(249, 115, 22, 0.1))' }}
            ></div>
            <div 
              className="relative backdrop-blur-lg border rounded-3xl p-6 sm:p-8"
              style={sectionCardStyle}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div 
                    className="p-2 rounded-full"
                    style={themePalette ? {
                      background: `linear-gradient(135deg, ${themePalette.accent}20, ${themePalette.secondary}20)`
                    } : { background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(249, 115, 22, 0.2))' }}
                  >
                    <span className="text-2xl">📝</span>
                  </div>
                  <h3 className="text-xl font-heading text-white font-bold">My Notes</h3>
                </div>
                <StyledButton
                  onClick={() => setShowNotesInput(!showNotesInput)}
                  variant="ghost"
                  className="!text-sm !backdrop-blur-sm !border !text-white"
                  style={themePalette ? {
                    backgroundColor: `${themePalette.primary}10`,
                    borderColor: `${themePalette.primary}20`
                  } : { backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.2)' }}
                >
                  {showNotesInput ? "Cancel" : watchlistEntry.notes ? "Edit Notes" : "Add Notes"}
                </StyledButton>
              </div>
              
              {showNotesInput ? (
                <div className="space-y-4">
                  <textarea
                    value={watchlistNotes}
                    onChange={(e) => setWatchlistNotes(e.target.value)}
                    rows={4}
                    maxLength={500}
                    placeholder="Your private thoughts about this anime..."
                    className="w-full backdrop-blur-sm border rounded-2xl p-4 text-white placeholder-white/60 focus:outline-none transition-all duration-300 resize-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                    style={themePalette ? {
                      backgroundColor: `${themePalette.dark}40`,
                      borderColor: `${themePalette.primary}20`
                    } : { 
                      backgroundColor: 'rgba(0,0,0,0.4)', 
                      borderColor: 'rgba(255,255,255,0.2)'
                    }}
                  />
                  <div className="flex justify-between items-center">
                    <p className="text-white/60 text-xs">
                      {watchlistNotes.length}/500 characters
                    </p>
                    <div className="flex gap-3">
                      <StyledButton
                        onClick={() => {
                          setWatchlistNotes(watchlistEntry.notes || "");
                          setShowNotesInput(false);
                        }}
                        variant="ghost"
                        className="!text-sm !backdrop-blur-sm !border !text-white"
                        style={themePalette ? {
                          backgroundColor: `${themePalette.primary}10`,
                          borderColor: `${themePalette.primary}20`
                        } : { backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.2)' }}
                        disabled={isSavingNotes}
                      >
                        Cancel
                      </StyledButton>
                      <StyledButton
                        onClick={handleSaveWatchlistNotes}
                        variant="primary"
                        className="!text-sm !border-0"
                        style={themePalette ? {
                          background: themePalette.gradient,
                          boxShadow: `0 4px 15px ${themePalette.primary}30`
                        } : {}}
                        disabled={isSavingNotes}
                      >
                        {isSavingNotes ? "Saving..." : "Save Notes"}
                      </StyledButton>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  {watchlistEntry.notes ? (
                    <div 
                      className="backdrop-blur-sm rounded-2xl p-4 border"
                      style={themePalette ? {
                        backgroundColor: `${themePalette.dark}40`,
                        borderColor: `${themePalette.primary}10`
                      } : { backgroundColor: 'rgba(0,0,0,0.4)', borderColor: 'rgba(255,255,255,0.1)' }}
                    >
                      <p className="text-white/90 leading-relaxed whitespace-pre-wrap">
                        {watchlistEntry.notes}
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-2">💭</div>
                      <p className="text-white/60 text-sm">
                        No notes yet. Click "Add Notes" to record your thoughts!
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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