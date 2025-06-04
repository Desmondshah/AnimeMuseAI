// Enhanced CharacterDetailPage.tsx with AI integration
import React, { useState, useEffect, memo } from "react";
import { Id, Doc } from "../../../../convex/_generated/dataModel";
import { useAction, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import StyledButton from "../shared/StyledButton";
import { formatDistanceToNow } from 'date-fns';

// Enhanced character interface (keeping your existing interface)
interface EnhancedCharacter {
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
  // AI enriched fields
  isAIEnriched?: boolean;
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

interface CharacterDetailPageProps {
  character: EnhancedCharacter;
  animeName: string;
  onBack: () => void;
}

const LoadingSpinnerComponent: React.FC<{ message?: string; className?: string }> = ({ 
  message = "Loading...", 
  className = "" 
}) => (
  <div className={`flex flex-col justify-center items-center py-16 ${className}`}>
    <div className="relative">
      <div className="w-20 h-20 border-4 border-transparent border-t-brand-primary-action border-r-brand-accent-gold rounded-full animate-spin"></div>
      <div className="absolute top-2 left-2 w-16 h-16 border-4 border-transparent border-b-brand-accent-peach border-l-white/50 rounded-full animate-spin animate-reverse"></div>
      <div className="absolute top-6 left-6 w-8 h-8 bg-gradient-to-r from-brand-primary-action to-brand-accent-gold rounded-full animate-pulse"></div>
    </div>
    {message && <p className="mt-4 text-lg text-white/80 font-medium animate-pulse">{message}</p>}
  </div>
);

const LoadingSpinner = memo(LoadingSpinnerComponent);

export default function CharacterDetailPage({ character: initialCharacter, animeName, onBack }: CharacterDetailPageProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'voice_actors' | 'development' | 'relationships'>('overview');
  const [character, setCharacter] = useState<EnhancedCharacter>(initialCharacter);
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichmentError, setEnrichmentError] = useState<string | null>(null);
  const [hasAttemptedEnrichment, setHasAttemptedEnrichment] = useState(false);
  const [relationshipData, setRelationshipData] = useState<any[]>([]);
  const [timelineData, setTimelineData] = useState<any[]>([]);
  const [isLoadingRelationships, setIsLoadingRelationships] = useState(false);
  const [isLoadingTimeline, setIsLoadingTimeline] = useState(false);

  // Convex mutations
  const enrichCharacterDetails = useAction(api.ai.fetchEnrichedCharacterDetails);
const analyzeRelationships = useAction(api.ai.analyzeCharacterRelationships);
const getTimeline = useAction(api.ai.getCharacterDevelopmentTimeline);

  // Auto-enrich character data on mount if not already enriched
  useEffect(() => {
    const shouldEnrich = !character.isAIEnriched && 
                        !hasAttemptedEnrichment && 
                        character.name && 
                        animeName;

    if (shouldEnrich) {
      handleEnrichCharacter('detailed');
    }
  }, [character.name, animeName]);

  const handleEnrichCharacter = async (level: 'basic' | 'detailed' | 'comprehensive' = 'detailed') => {
    if (isEnriching) return;
    
    setIsEnriching(true);
    setEnrichmentError(null);
    setHasAttemptedEnrichment(true);

    try {
      console.log(`[Character Page] Enriching ${character.name} with ${level} level`);
      
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
        enrichmentLevel: level,
        messageId: `character_enrich_${Date.now()}`,
      });

      if (result.error) {
        setEnrichmentError(result.error);
        console.error('[Character Page] Enrichment error:', result.error);
      } else {
        setCharacter(result.mergedCharacter);
        console.log('[Character Page] Character successfully enriched');
      }
    } catch (error: any) {
      setEnrichmentError(error.message || 'Failed to enrich character data');
      console.error('[Character Page] Enrichment failed:', error);
    } finally {
      setIsEnriching(false);
    }
  };

  const loadRelationshipAnalysis = async () => {
    if (isLoadingRelationships || relationshipData.length > 0) return;

    setIsLoadingRelationships(true);
    try {
      const result = await analyzeRelationships({
        characterName: character.name,
        animeName: animeName,
        messageId: `relationships_${Date.now()}`,
      });

      if (!result.error) {
        setRelationshipData(result.relationships);
      }
    } catch (error) {
      console.error('[Character Page] Relationship analysis failed:', error);
    } finally {
      setIsLoadingRelationships(false);
    }
  };

  const loadTimelineData = async () => {
    if (isLoadingTimeline || timelineData.length > 0) return;

    setIsLoadingTimeline(true);
    try {
      const result = await getTimeline({
        characterName: character.name,
        animeName: animeName,
        includeArcs: true,
        messageId: `timeline_${Date.now()}`,
      });

      if (!result.error) {
        setTimelineData(result.timeline);
      }
    } catch (error) {
      console.error('[Character Page] Timeline loading failed:', error);
    } finally {
      setIsLoadingTimeline(false);
    }
  };

  // Load additional data when switching to specific tabs
  useEffect(() => {
    if (activeTab === 'relationships') {
      loadRelationshipAnalysis();
    } else if (activeTab === 'development') {
      loadTimelineData();
    }
  }, [activeTab]);

  if (!character) {
    return (
      <div className="relative min-h-screen flex items-center justify-center px-4">
        <div className="bg-black/30 backdrop-blur-sm border border-red-500/30 rounded-3xl p-8 text-center max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-heading text-red-400 mb-4">Character Not Found</h2>
          <p className="mb-4 text-sm text-red-300">This character could not be loaded.</p>
          <StyledButton onClick={onBack} variant="primary">Back to Anime</StyledButton>
        </div>
      </div>
    );
  }

  const placeholderImage = `https://placehold.co/600x800/ECB091/321D0B/png?text=${encodeURIComponent(character.name.charAt(0))}&font=poppins`;

  // Format date of birth (keeping your existing function)
  const formatDateOfBirth = () => {
    if (!character.dateOfBirth) return null;
    const { year, month, day } = character.dateOfBirth;
    
    if (year && month && day) {
      try {
        const date = new Date(year, month - 1, day);
        return date.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      } catch {
        return `${year}/${month}/${day}`;
      }
    } else if (year && month) {
      return `${year}/${month}`;
    } else if (year) {
      return year.toString();
    }
    return null;
  };

  // Helper functions (keeping your existing ones)
  const getRoleColor = (role: string) => {
    switch (role) {
      case "MAIN": return "text-yellow-400 bg-yellow-500/20 border-yellow-500/30";
      case "SUPPORTING": return "text-blue-400 bg-blue-500/20 border-blue-500/30";
      case "BACKGROUND": return "text-gray-400 bg-gray-500/20 border-gray-500/30";
      default: return "text-white/60 bg-white/10 border-white/20";
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "MAIN": return "⭐";
      case "SUPPORTING": return "🎭";
      case "BACKGROUND": return "👤";
      default: return "❓";
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case "alive": return "text-green-400 bg-green-500/20 border-green-500/30";
      case "deceased": return "text-red-400 bg-red-500/20 border-red-500/30";
      case "unknown": return "text-gray-400 bg-gray-500/20 border-gray-500/30";
      default: return "text-white/60 bg-white/10 border-white/20";
    }
  };

  return (
    <div className="relative min-h-screen">
      {/* Floating Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-80 h-80 bg-gradient-to-br from-brand-primary-action/12 to-transparent rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-32 right-16 w-96 h-96 bg-gradient-to-tr from-brand-accent-gold/10 to-transparent rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 right-1/4 w-64 h-64 bg-gradient-to-l from-brand-accent-peach/8 to-transparent rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 px-4 sm:px-6 py-8 max-w-6xl mx-auto space-y-8">
        {/* Back Button & AI Enhancement Status */}
        <div className="flex justify-between items-center mb-6">
          <StyledButton 
            onClick={onBack} 
            variant="ghost" 
            className="!bg-white/10 !backdrop-blur-sm !border-white/20 hover:!bg-white/20 !text-white flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            Back to {animeName}
          </StyledButton>

          {/* AI Enhancement Controls */}
          <div className="flex items-center gap-3">
            {character.isAIEnriched && (
              <div className="flex items-center gap-2 bg-green-500/20 border border-green-500/30 rounded-full px-3 py-1">
                <span className="text-green-400 text-sm">🤖</span>
                <span className="text-green-300 text-xs font-medium">AI Enhanced</span>
              </div>
            )}
            
            {!isEnriching && !character.isAIEnriched && (
              <StyledButton
                onClick={() => handleEnrichCharacter('detailed')}
                variant="primary"
                className="text-xs px-3 py-1 !bg-brand-primary-action/80"
              >
                🤖 Enhance Details
              </StyledButton>
            )}

            {isEnriching && (
              <div className="flex items-center gap-2 bg-blue-500/20 border border-blue-500/30 rounded-full px-3 py-1">
                <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-blue-300 text-xs">Enriching...</span>
              </div>
            )}
          </div>
        </div>

        {/* Error Display */}
        {enrichmentError && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-2xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-red-400">⚠️</span>
              <span className="text-red-300 font-medium">Enhancement Failed</span>
            </div>
            <p className="text-red-200 text-sm">{enrichmentError}</p>
            <StyledButton
              onClick={() => handleEnrichCharacter('detailed')}
              variant="ghost"
              className="mt-2 text-xs !text-red-300 !border-red-500/30"
            >
              Retry Enhancement
            </StyledButton>
          </div>
        )}

        {/* Hero Section (keeping your existing hero section) */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-brand-primary-action/20 via-transparent to-brand-accent-gold/20 rounded-3xl blur-xl"></div>
          <div className="relative bg-black/40 backdrop-blur-sm border border-white/10 rounded-3xl overflow-hidden">
            {/* Hero Image with Overlay */}
            <div className="relative h-80 sm:h-96 md:h-[500px] overflow-hidden">
              <img 
                src={character.imageUrl || placeholderImage} 
                alt={character.name} 
                className="w-full h-full object-cover object-center"
                onError={(e) => { (e.target as HTMLImageElement).src = placeholderImage; }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent"></div>
              
              {/* Character Info Overlay - keeping your existing overlay content */}
              <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 md:p-12">
                <div className="max-w-4xl">
                  <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-heading text-white font-bold mb-4 drop-shadow-2xl">
                    {character.name}
                  </h1>
                  
                  {character.nativeName && (
                    <div className="inline-flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-4 py-2 mb-4">
                      <span className="text-lg">🈳</span>
                      <span className="text-white font-medium">{character.nativeName}</span>
                    </div>
                  )}
                  
                  {/* Quick Stats - keeping your existing badges */}
                  <div className="flex flex-wrap gap-3 mb-6">
                    <div className={`rounded-full px-4 py-2 flex items-center gap-2 backdrop-blur-sm border ${getRoleColor(character.role)}`}>
                      <span className="text-lg">{getRoleIcon(character.role)}</span>
                      <span className="font-medium">
                        {character.role === "MAIN" ? "Main Character" : 
                         character.role === "SUPPORTING" ? "Supporting" : "Background"}
                      </span>
                    </div>

                    {character.status && (
                      <div className={`rounded-full px-4 py-2 flex items-center gap-2 backdrop-blur-sm border ${getStatusColor(character.status)}`}>
                        <span className="text-lg">
                          {character.status.toLowerCase() === 'alive' ? '💚' : 
                           character.status.toLowerCase() === 'deceased' ? '💀' : '❓'}
                        </span>
                        <span className="font-medium">{character.status}</span>
                      </div>
                    )}

                    {character.gender && (
                      <div className="bg-black/60 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2">
                        <span className="text-lg">
                          {character.gender.toLowerCase() === 'male' ? '♂️' : 
                           character.gender.toLowerCase() === 'female' ? '♀️' : '⚧️'}
                        </span>
                        <span className="text-white font-medium">{character.gender}</span>
                      </div>
                    )}

                    {character.age && (
                      <div className="bg-black/60 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2">
                        <span className="text-lg">🎂</span>
                        <span className="text-white font-medium">{character.age}</span>
                      </div>
                    )}

                    {character.species && character.species !== 'Human' && (
                      <div className="bg-gradient-to-r from-purple-500/80 to-pink-500/80 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2">
                        <span className="text-lg">🧬</span>
                        <span className="text-white font-medium">{character.species}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Navigation Tabs */}
        <div className="flex justify-center">
          <div className="bg-black/30 backdrop-blur-sm border border-white/10 rounded-2xl p-2 flex gap-2 overflow-x-auto">
            {[
              { key: 'overview' as const, label: 'Overview', icon: '📋' },
              { key: 'details' as const, label: 'Details', icon: '📊' },
              { key: 'voice_actors' as const, label: 'Voice Actors', icon: '🎤' },
              { key: 'relationships' as const, label: 'Relationships', icon: '👥' },
              { key: 'development' as const, label: 'Development', icon: '📈' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-xl transition-all duration-300 flex items-center gap-2 whitespace-nowrap ${
                  activeTab === tab.key 
                    ? 'bg-brand-primary-action text-white shadow-lg' 
                    : 'bg-transparent text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <span>{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-8">
          {/* Overview Tab - Enhanced with AI data */}
          {activeTab === 'overview' && (
            <>
              {/* Character Description - Enhanced */}
              {(character.description || character.personalityAnalysis) && (
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-b from-purple-500/10 to-blue-500/10 rounded-3xl blur-xl"></div>
                  <div className="relative bg-black/30 backdrop-blur-sm border border-white/10 rounded-3xl p-6 sm:p-8">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-gradient-to-r from-brand-primary-action/20 to-brand-accent-gold/20 rounded-full">
                        <span className="text-2xl">📖</span>
                      </div>
                      <h2 className="text-2xl font-heading text-white font-bold">Character Profile</h2>
                      {character.isAIEnriched && (
                        <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded-full">AI Enhanced</span>
                      )}
                    </div>
                    
                    {character.description && (
                      <div className="mb-6">
                        <p className="text-base sm:text-lg text-white/90 leading-relaxed whitespace-pre-wrap">
                          {character.description}
                        </p>
                      </div>
                    )}

                    {character.personalityAnalysis && (
                      <div className="bg-black/40 rounded-2xl p-6 border border-white/10">
                        <h3 className="text-lg font-heading text-brand-accent-gold mb-3 flex items-center gap-2">
                          🧠 Personality Analysis
                        </h3>
                        <p className="text-white/90 leading-relaxed whitespace-pre-wrap">
                          {character.personalityAnalysis}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notable Quotes */}
              {character.notableQuotes && character.notableQuotes.length > 0 && (
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-3xl blur-xl"></div>
                  <div className="relative bg-black/30 backdrop-blur-sm border border-white/10 rounded-3xl p-6 sm:p-8">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-full">
                        <span className="text-2xl">💬</span>
                      </div>
                      <h3 className="text-2xl font-heading text-white font-bold">Notable Quotes</h3>
                    </div>
                    <div className="space-y-4">
                      {character.notableQuotes.map((quote, index) => (
                        <blockquote key={index} className="bg-black/40 backdrop-blur-sm rounded-2xl p-6 border-l-4 border-brand-accent-gold">
                          <p className="text-white/90 text-lg italic leading-relaxed">"{quote}"</p>
                        </blockquote>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Powers & Abilities - Enhanced */}
              {(character.powersAbilities?.length || character.detailedAbilities?.length) && (
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-3xl blur-xl"></div>
                  <div className="relative bg-black/30 backdrop-blur-sm border border-white/10 rounded-3xl p-6 sm:p-8">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-full">
                        <span className="text-2xl">⚡</span>
                      </div>
                      <h3 className="text-2xl font-heading text-white font-bold">Powers & Abilities</h3>
                    </div>
                    
                    {character.detailedAbilities?.length ? (
                      <div className="space-y-4">
                        {character.detailedAbilities.map((ability, index) => (
                          <div key={index} className="bg-black/40 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-lg font-heading text-brand-accent-gold">{ability.abilityName}</h4>
                              {ability.powerLevel && (
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                  ability.powerLevel === 'legendary' ? 'bg-purple-500/20 text-purple-300' :
                                  ability.powerLevel === 'strong' ? 'bg-red-500/20 text-red-300' :
                                  ability.powerLevel === 'moderate' ? 'bg-yellow-500/20 text-yellow-300' :
                                  'bg-gray-500/20 text-gray-300'
                                }`}>
                                  {ability.powerLevel}
                                </span>
                              )}
                            </div>
                            <p className="text-white/90 leading-relaxed">{ability.abilityDescription}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {character.powersAbilities?.map((power, index) => (
                          <div key={index} className="bg-black/40 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                            <p className="text-white/90 text-sm leading-relaxed">{power}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Trivia */}
              {character.trivia && character.trivia.length > 0 && (
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-pink-500/10 to-rose-500/10 rounded-3xl blur-xl"></div>
                  <div className="relative bg-black/30 backdrop-blur-sm border border-white/10 rounded-3xl p-6 sm:p-8">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-gradient-to-r from-pink-500/20 to-rose-500/20 rounded-full">
                        <span className="text-2xl">🎯</span>
                      </div>
                      <h3 className="text-2xl font-heading text-white font-bold">Trivia & Fun Facts</h3>
                    </div>
                    <div className="space-y-3">
                      {character.trivia.map((fact, index) => (
                        <div key={index} className="flex items-start gap-3 bg-black/40 rounded-xl p-4">
                          <span className="text-brand-accent-gold font-bold text-sm mt-1">#{index + 1}</span>
                          <p className="text-white/90 text-sm leading-relaxed flex-1">{fact}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Relationships Tab - New AI-powered tab */}
          {activeTab === 'relationships' && (
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-3xl blur-xl"></div>
              <div className="relative bg-black/30 backdrop-blur-sm border border-white/10 rounded-3xl p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-full">
                    <span className="text-2xl">👥</span>
                  </div>
                  <h3 className="text-2xl font-heading text-white font-bold">Character Relationships</h3>
                  <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full">AI Analyzed</span>
                </div>
                
                {isLoadingRelationships ? (
                  <LoadingSpinner message="Analyzing relationships..." />
                ) : relationshipData.length > 0 ? (
                  <div className="space-y-6">
                    {relationshipData.map((relationship, index) => (
                      <div key={index} className="bg-black/40 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-xl font-heading text-brand-accent-gold">{relationship.characterName}</h4>
                          <span className="px-3 py-1 bg-white/10 rounded-full text-xs text-white/70">
                            {relationship.relationshipType}
                          </span>
                        </div>
                        
                        <div className="space-y-4">
                          {relationship.emotionalDynamics && (
                            <div>
                              <h5 className="text-sm font-medium text-white/80 mb-2">Emotional Dynamics</h5>
                              <p className="text-white/90 text-sm leading-relaxed">{relationship.emotionalDynamics}</p>
                            </div>
                          )}
                          
                          {relationship.evolution && (
                            <div>
                              <h5 className="text-sm font-medium text-white/80 mb-2">Relationship Evolution</h5>
                              <p className="text-white/90 text-sm leading-relaxed">{relationship.evolution}</p>
                            </div>
                          )}
                          
                          {relationship.keyMoments && relationship.keyMoments.length > 0 && (
                            <div>
                              <h5 className="text-sm font-medium text-white/80 mb-2">Key Moments</h5>
                              <ul className="space-y-1">
                                {relationship.keyMoments.map((moment: string, idx: number) => (
  <li key={idx} className="text-white/80 text-sm flex items-start gap-2">
    <span className="text-brand-accent-gold">•</span>
    {moment}
  </li>
))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4 opacity-50">👥</div>
                    <h4 className="text-xl text-white/70 mb-2">No Relationship Analysis Available</h4>
                    <p className="text-white/50 text-sm max-w-md mx-auto mb-4">
                      Detailed relationship analysis is being processed. This may take a moment.
                    </p>
                    <StyledButton
                      onClick={loadRelationshipAnalysis}
                      variant="primary"
                      className="text-sm"
                    >
                      🤖 Analyze Relationships
                    </StyledButton>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Development Tab - New AI-powered tab */}
          {activeTab === 'development' && (
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-3xl blur-xl"></div>
              <div className="relative bg-black/30 backdrop-blur-sm border border-white/10 rounded-3xl p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-full">
                    <span className="text-2xl">📈</span>
                  </div>
                  <h3 className="text-2xl font-heading text-white font-bold">Character Development</h3>
                  <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded-full">AI Timeline</span>
                </div>
                
                {isLoadingTimeline ? (
                  <LoadingSpinner message="Building development timeline..." />
                ) : timelineData.length > 0 ? (
                  <div className="space-y-6">
                    {timelineData.map((phase, index) => (
                      <div key={index} className="relative">
                        {/* Timeline connector */}
                        {index < timelineData.length - 1 && (
                          <div className="absolute left-6 top-16 w-0.5 h-full bg-gradient-to-b from-brand-accent-gold to-transparent"></div>
                        )}
                        
                        <div className="flex items-start gap-4">
                          {/* Timeline dot */}
                          <div className="w-12 h-12 bg-gradient-to-r from-brand-primary-action to-brand-accent-gold rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                            {index + 1}
                          </div>
                          
                          {/* Phase content */}
                          <div className="flex-1 bg-black/40 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-lg font-heading text-brand-accent-gold">{phase.phase}</h4>
                              {phase.timeframe && (
                                <span className="text-xs bg-white/10 px-2 py-1 rounded-full text-white/70">
                                  {phase.timeframe}
                                </span>
                              )}
                            </div>
                            
                            {phase.keyDevelopments && (
                              <div className="mb-4">
                                <h5 className="text-sm font-medium text-white/80 mb-2">Key Developments</h5>
                                <ul className="space-y-1">
                                  {phase.keyDevelopments.map((dev: string, idx: number) => (
  <li key={idx} className="text-white/90 text-sm flex items-start gap-2">
    <span className="text-brand-accent-gold">▸</span>
    {dev}
  </li>
))}
                                </ul>
                              </div>
                            )}
                            
                            {phase.personalityShifts && (
                              <div className="mb-4">
                                <h5 className="text-sm font-medium text-white/80 mb-2">Personality Changes</h5>
                                <p className="text-white/90 text-sm leading-relaxed">{phase.personalityShifts}</p>
                              </div>
                            )}
                            
                            {phase.internalConflicts && (
                              <div>
                                <h5 className="text-sm font-medium text-white/80 mb-2">Internal Conflicts</h5>
                                <p className="text-white/90 text-sm leading-relaxed">{phase.internalConflicts}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4 opacity-50">📈</div>
                    <h4 className="text-xl text-white/70 mb-2">No Development Timeline Available</h4>
                    <p className="text-white/50 text-sm max-w-md mx-auto mb-4">
                      Character development timeline is being generated. This provides deep insights into character growth.
                    </p>
                    <StyledButton
                      onClick={loadTimelineData}
                      variant="primary"
                      className="text-sm"
                    >
                      🤖 Generate Timeline
                    </StyledButton>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Keep your existing Details and Voice Actors tabs here */}
          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-3xl blur-xl"></div>
              <div className="relative bg-black/30 backdrop-blur-sm border border-white/10 rounded-3xl p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-full">
                    <span className="text-2xl">📊</span>
                  </div>
                  <h3 className="text-2xl font-heading text-white font-bold">Character Details</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Personal Information */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-heading text-brand-accent-gold mb-3">Personal Information</h4>
                    
                    {formatDateOfBirth() && (
                      <div className="flex items-center gap-3 p-3 bg-black/40 rounded-xl">
                        <span className="text-xl">🎂</span>
                        <div>
                          <p className="text-white/60 text-xs uppercase tracking-wide">Date of Birth</p>
                          <p className="text-white font-medium">{formatDateOfBirth()}</p>
                        </div>
                      </div>
                    )}

                    {character.bloodType && (
                      <div className="flex items-center gap-3 p-3 bg-black/40 rounded-xl">
                        <span className="text-xl">🩸</span>
                        <div>
                          <p className="text-white/60 text-xs uppercase tracking-wide">Blood Type</p>
                          <p className="text-white font-medium">{character.bloodType}</p>
                        </div>
                      </div>
                    )}

                    {character.species && (
                      <div className="flex items-center gap-3 p-3 bg-black/40 rounded-xl">
                        <span className="text-xl">🧬</span>
                        <div>
                          <p className="text-white/60 text-xs uppercase tracking-wide">Species</p>
                          <p className="text-white font-medium">{character.species}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Physical Characteristics */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-heading text-brand-accent-gold mb-3">Physical Characteristics</h4>
                    
                    {character.height && (
                      <div className="flex items-center gap-3 p-3 bg-black/40 rounded-xl">
                        <span className="text-xl">📏</span>
                        <div>
                          <p className="text-white/60 text-xs uppercase tracking-wide">Height</p>
                          <p className="text-white font-medium">{character.height}</p>
                        </div>
                      </div>
                    )}

                    {character.weight && (
                      <div className="flex items-center gap-3 p-3 bg-black/40 rounded-xl">
                        <span className="text-xl">⚖️</span>
                        <div>
                          <p className="text-white/60 text-xs uppercase tracking-wide">Weight</p>
                          <p className="text-white font-medium">{character.weight}</p>
                        </div>
                      </div>
                    )}

                    {character.siteUrl && (
                      <div className="flex items-center gap-3 p-3 bg-black/40 rounded-xl">
                        <span className="text-xl">🔗</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-white/60 text-xs uppercase tracking-wide">AniList Page</p>
                          <a 
                            href={character.siteUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-brand-primary-action hover:text-brand-accent-gold transition-colors duration-300 text-sm truncate block"
                          >
                            View on AniList
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Voice Actors Tab */}
          {activeTab === 'voice_actors' && (
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-3xl blur-xl"></div>
              <div className="relative bg-black/30 backdrop-blur-sm border border-white/10 rounded-3xl p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-full">
                    <span className="text-2xl">🎤</span>
                  </div>
                  <h3 className="text-2xl font-heading text-white font-bold">Voice Actors</h3>
                </div>
                
                {character.voiceActors && character.voiceActors.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {character.voiceActors.map((va, index) => (
                      <div key={index} className="bg-black/40 backdrop-blur-sm rounded-2xl overflow-hidden border border-white/10 hover:border-white/30 transition-all duration-300">
                        <div className="aspect-[3/4] overflow-hidden">
                          {va.imageUrl ? (
                            <img
                              src={va.imageUrl}
                              alt={va.name}
                              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = `https://placehold.co/300x400/ECB091/321D0B/png?text=${encodeURIComponent(va.name.charAt(0))}&font=poppins`;
                              }}
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-brand-primary-action/20 to-brand-accent-gold/20 flex items-center justify-center">
                              <div className="text-4xl font-bold text-white/60">
                                {va.name.charAt(0).toUpperCase()}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="p-4">
                          <h4 className="text-white font-medium text-sm mb-1" title={va.name}>
                            {va.name}
                          </h4>
                          <p className="text-white/60 text-xs flex items-center gap-1">
                            <span className="text-sm">🌍</span>
                            {va.language}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4 opacity-50">🎤</div>
                    <h4 className="text-xl text-white/70 mb-2">No Voice Actor Information</h4>
                    <p className="text-white/50 text-sm max-w-md mx-auto">
                      Voice actor data is not available for this character.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Spacer */}
        <div className="h-24"></div>
      </div>
    </div>
  );
}