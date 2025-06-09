// Enhanced iOS-optimized CharacterDetailPage.tsx
import React, { useState, useEffect, memo, useRef } from "react";
import { Id, Doc } from "../../../../convex/_generated/dataModel";
import { useAction, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import StyledButton from "../shared/StyledButton";
import { formatDistanceToNow } from 'date-fns';

// Enhanced character interface
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

// Enhanced Loading Component with iOS-style design
const IOSLoadingSpinner: React.FC<{ message?: string }> = ({ message = "Loading..." }) => (
  <div className="flex flex-col items-center justify-center py-20 px-6">
    <div className="relative mb-6">
      {/* Outer ring */}
      <div className="w-16 h-16 border-[3px] border-white/20 rounded-full"></div>
      {/* Animated ring */}
      <div className="absolute inset-0 w-16 h-16 border-[3px] border-transparent border-t-brand-primary-action rounded-full animate-spin"></div>
      {/* Inner glow */}
      <div className="absolute inset-2 w-12 h-12 bg-brand-primary-action/20 rounded-full blur-sm"></div>
    </div>
    <p className="text-white/80 font-medium text-center max-w-xs leading-relaxed">
      {message}
    </p>
  </div>
);

// iOS-style Section Card Component
const SectionCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  gradient?: string;
}> = ({ children, className = "", gradient = "from-white/5 to-white/10" }) => (
  <div className={`relative group ${className}`}>
    {/* Background blur */}
    <div className="absolute inset-0 bg-black/30 backdrop-blur-xl rounded-3xl"></div>
    
    {/* Gradient overlay */}
    <div className={`absolute inset-0 bg-gradient-to-br ${gradient} rounded-3xl opacity-60`}></div>
    
    {/* Border glow */}
    <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/20 via-transparent to-white/10 p-[1px]">
      <div className="w-full h-full bg-black/20 rounded-3xl"></div>
    </div>
    
    {/* Content */}
    <div className="relative z-10 p-6">
      {children}
    </div>
  </div>
);

// iOS-style Tab Navigation
const IOSTabBar: React.FC<{
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabs: Array<{ key: string; label: string; icon: string }>;
}> = ({ activeTab, onTabChange, tabs }) => (
  <div className="sticky top-0 z-50 bg-black/40 backdrop-blur-2xl border-b border-white/10">
    <div className="flex overflow-x-auto scrollbar-hide px-4 py-3">
      <div className="flex gap-2 min-w-max">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`relative flex items-center gap-2 px-4 py-2.5 rounded-2xl font-medium text-sm transition-all duration-300 whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-brand-primary-action text-white shadow-lg shadow-brand-primary-action/30'
                : 'bg-white/10 text-white/70 hover:text-white hover:bg-white/20'
            }`}
          >
            <span className="text-base">{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
            {activeTab === tab.key && (
              <div className="absolute inset-0 bg-gradient-to-r from-brand-primary-action to-brand-accent-gold rounded-2xl -z-10"></div>
            )}
          </button>
        ))}
      </div>
    </div>
  </div>
);

// Enhanced Hero Section
const CharacterHero: React.FC<{
  character: EnhancedCharacter;
  animeName: string;
  onBack: () => void;
  isEnriching: boolean;
  onEnrich: () => void;
}> = ({ character, animeName, onBack, isEnriching, onEnrich }) => {
  const placeholderImage = `https://placehold.co/600x800/ECB091/321D0B/png?text=${encodeURIComponent(character.name.charAt(0))}&font=poppins`;

  const getRoleColor = (role: string) => {
    switch (role) {
      case "MAIN": return "from-yellow-400 to-amber-500";
      case "SUPPORTING": return "from-blue-400 to-cyan-500";
      case "BACKGROUND": return "from-gray-400 to-slate-500";
      default: return "from-white/60 to-white/40";
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status?.toLowerCase()) {
      case "alive": return "💚";
      case "deceased": return "🖤";
      case "unknown": return "❓";
      default: return "❓";
    }
  };

  return (
    <div className="relative h-screen max-h-[800px] overflow-hidden">
      {/* Background Image with Parallax Effect */}
      <div className="absolute inset-0">
        <img 
          src={character.imageUrl || placeholderImage}
          alt={character.name}
          className="w-full h-full object-cover object-center scale-110"
          style={{ transform: 'scale(1.1)' }}
          onError={(e) => { (e.target as HTMLImageElement).src = placeholderImage; }}
        />
        {/* Multi-layer gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/30"></div>
      </div>

      {/* Navigation Header */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 pt-12">
        <button
          onClick={onBack}
          className="flex items-center gap-2 bg-black/40 backdrop-blur-xl rounded-2xl px-4 py-3 border border-white/20 hover:bg-black/60 transition-all duration-300"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-white font-medium text-sm">{animeName}</span>
        </button>

        {/* AI Enhancement Status */}
        <div className="flex items-center gap-2">
          {character.isAIEnriched ? (
            <div className="flex items-center gap-2 bg-green-500/20 backdrop-blur-xl rounded-2xl px-3 py-2 border border-green-500/30">
              <span className="text-green-400">🤖</span>
              <span className="text-green-300 text-xs font-medium">Enhanced</span>
            </div>
          ) : (
            <button
              onClick={onEnrich}
              disabled={isEnriching}
              className="flex items-center gap-2 bg-brand-primary-action/80 backdrop-blur-xl rounded-2xl px-3 py-2 border border-brand-primary-action hover:bg-brand-primary-action transition-all duration-300 disabled:opacity-50"
            >
              {isEnriching ? (
                <>
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-white text-xs">Enhancing...</span>
                </>
              ) : (
                <>
                  <span className="text-white">🤖</span>
                  <span className="text-white text-xs font-medium">Enhance</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Character Information Overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-6 pb-8">
        <div className="space-y-4">
          {/* Character Name */}
          <div className="space-y-2">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-heading font-bold text-white drop-shadow-2xl leading-tight">
              {character.name}
            </h1>
            {character.nativeName && (
              <div className="inline-flex items-center gap-2 bg-black/50 backdrop-blur-xl rounded-xl px-3 py-2">
                <span className="text-lg">🈳</span>
                <span className="text-white/90 font-medium text-sm">{character.nativeName}</span>
              </div>
            )}
          </div>

          {/* Character Stats Pills */}
          <div className="flex flex-wrap gap-2">
            {/* Role Badge */}
            <div className={`bg-gradient-to-r ${getRoleColor(character.role)} rounded-xl px-3 py-1.5 backdrop-blur-xl`}>
              <span className="text-white font-semibold text-xs uppercase tracking-wide">
                {character.role === "MAIN" ? "Main Character" : 
                 character.role === "SUPPORTING" ? "Supporting" : "Background"}
              </span>
            </div>

            {/* Status Badge */}
            {character.status && (
              <div className="bg-black/50 backdrop-blur-xl rounded-xl px-3 py-1.5 border border-white/20">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{getStatusIcon(character.status)}</span>
                  <span className="text-white/90 font-medium text-xs">{character.status}</span>
                </div>
              </div>
            )}

            {/* Gender Badge */}
            {character.gender && (
              <div className="bg-black/50 backdrop-blur-xl rounded-xl px-3 py-1.5 border border-white/20">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">
                    {character.gender.toLowerCase() === 'male' ? '♂️' : 
                     character.gender.toLowerCase() === 'female' ? '♀️' : '⚧️'}
                  </span>
                  <span className="text-white/90 font-medium text-xs">{character.gender}</span>
                </div>
              </div>
            )}

            {/* Age Badge */}
            {character.age && (
              <div className="bg-black/50 backdrop-blur-xl rounded-xl px-3 py-1.5 border border-white/20">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">🎂</span>
                  <span className="text-white/90 font-medium text-xs">{character.age}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
        <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-white/60 rounded-full mt-2 animate-bounce"></div>
        </div>
      </div>
    </div>
  );
};

// Enhanced Content Sections
const OverviewSection: React.FC<{ character: EnhancedCharacter }> = ({ character }) => (
  <div className="space-y-6 px-4 pb-8">
    {/* Personality Analysis */}
    {(character.description || character.personalityAnalysis) && (
      <SectionCard gradient="from-purple-500/10 to-blue-500/10">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-xl flex items-center justify-center">
              <span className="text-xl">📖</span>
            </div>
            <h3 className="text-xl font-heading font-bold text-white">Character Profile</h3>
            {character.isAIEnriched && (
              <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full">AI Enhanced</span>
            )}
          </div>
          
          <div className="space-y-4">
            {character.description && (
              <p className="text-white/90 leading-relaxed">{character.description}</p>
            )}
            
            {character.personalityAnalysis && (
              <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                <h4 className="text-brand-accent-gold font-semibold mb-2 flex items-center gap-2">
                  🧠 Personality Analysis
                </h4>
                <p className="text-white/90 leading-relaxed text-sm">{character.personalityAnalysis}</p>
              </div>
            )}
          </div>
        </div>
      </SectionCard>
    )}

    {/* Notable Quotes */}
    {character.notableQuotes && character.notableQuotes.length > 0 && (
      <SectionCard gradient="from-indigo-500/10 to-purple-500/10">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-xl flex items-center justify-center">
              <span className="text-xl">💬</span>
            </div>
            <h3 className="text-xl font-heading font-bold text-white">Notable Quotes</h3>
          </div>
          
          <div className="space-y-3">
            {character.notableQuotes.map((quote, index) => (
              <div key={index} className="bg-black/30 backdrop-blur-sm rounded-2xl p-4 border-l-4 border-brand-accent-gold">
                <p className="text-white/90 italic leading-relaxed">"{quote}"</p>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>
    )}

    {/* Powers & Abilities */}
    {(character.powersAbilities?.length || character.detailedAbilities?.length) && (
      <SectionCard gradient="from-amber-500/10 to-orange-500/10">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-xl flex items-center justify-center">
              <span className="text-xl">⚡</span>
            </div>
            <h3 className="text-xl font-heading font-bold text-white">Powers & Abilities</h3>
          </div>
          
          {character.detailedAbilities?.length ? (
            <div className="space-y-3">
              {character.detailedAbilities.map((ability, index) => (
                <div key={index} className="bg-black/30 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-brand-accent-gold">{ability.abilityName}</h4>
                    {ability.powerLevel && (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        ability.powerLevel === 'legendary' ? 'bg-purple-500/20 text-purple-300' :
                        ability.powerLevel === 'strong' ? 'bg-red-500/20 text-red-300' :
                        ability.powerLevel === 'moderate' ? 'bg-yellow-500/20 text-yellow-300' :
                        'bg-gray-500/20 text-gray-300'
                      }`}>
                        {ability.powerLevel}
                      </span>
                    )}
                  </div>
                  <p className="text-white/90 text-sm leading-relaxed">{ability.abilityDescription}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {character.powersAbilities?.map((power, index) => (
                <div key={index} className="bg-black/30 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                  <p className="text-white/90 text-sm">{power}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </SectionCard>
    )}

    {/* Trivia */}
    {character.trivia && character.trivia.length > 0 && (
      <SectionCard gradient="from-pink-500/10 to-rose-500/10">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-pink-500/20 to-rose-500/20 rounded-xl flex items-center justify-center">
              <span className="text-xl">🎯</span>
            </div>
            <h3 className="text-xl font-heading font-bold text-white">Fun Facts</h3>
          </div>
          
          <div className="space-y-2">
            {character.trivia.map((fact, index) => (
              <div key={index} className="flex items-start gap-3 bg-black/30 rounded-xl p-3">
                <span className="text-brand-accent-gold font-bold text-sm mt-0.5">#{index + 1}</span>
                <p className="text-white/90 text-sm leading-relaxed flex-1">{fact}</p>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>
    )}
  </div>
);

// Main Component
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

  // Convex actions
  const enrichCharacterDetails = useAction(api.ai.fetchEnrichedCharacterDetails);
  const analyzeRelationships = useAction(api.ai.analyzeCharacterRelationships);
  const getTimeline = useAction(api.ai.getCharacterDevelopmentTimeline);

  // Tab configuration
  const tabs = [
    { key: 'overview' as const, label: 'Overview', icon: '📋' },
    { key: 'details' as const, label: 'Details', icon: '📊' },
    { key: 'voice_actors' as const, label: 'Voices', icon: '🎤' },
    { key: 'relationships' as const, label: 'Relations', icon: '👥' },
    { key: 'development' as const, label: 'Growth', icon: '📈' },
  ];

  // Auto-enrich character data on mount
  useEffect(() => {
    const shouldEnrich = !character.isAIEnriched && 
                        !hasAttemptedEnrichment && 
                        character.name && 
                        animeName;

    if (shouldEnrich) {
      handleEnrichCharacter();
    }
  }, [character.name, animeName]);

  const handleEnrichCharacter = async () => {
    if (isEnriching) return;
    
    setIsEnriching(true);
    setEnrichmentError(null);
    setHasAttemptedEnrichment(true);

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
        enrichmentLevel: 'detailed',
        messageId: `character_enrich_${Date.now()}`,
      });

      if (result.error) {
        setEnrichmentError(result.error);
      } else {
        setCharacter(result.mergedCharacter);
      }
    } catch (error: any) {
      setEnrichmentError(error.message || 'Failed to enrich character data');
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
      console.error('Relationship analysis failed:', error);
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
      console.error('Timeline loading failed:', error);
    } finally {
      setIsLoadingTimeline(false);
    }
  };

  // Load additional data when switching tabs
  useEffect(() => {
    if (activeTab === 'relationships') {
      loadRelationshipAnalysis();
    } else if (activeTab === 'development') {
      loadTimelineData();
    }
  }, [activeTab]);

  if (!character) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-primary-action/20 to-brand-accent-gold/20">
        <SectionCard className="max-w-md mx-4">
          <div className="text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-heading text-red-400 mb-4">Character Not Found</h2>
            <p className="mb-4 text-sm text-red-300">This character could not be loaded.</p>
            <StyledButton onClick={onBack} variant="primary">Back to Anime</StyledButton>
          </div>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Hero Section */}
      <CharacterHero
        character={character}
        animeName={animeName}
        onBack={onBack}
        isEnriching={isEnriching}
        onEnrich={handleEnrichCharacter}
      />

      {/* Error Display */}
      {enrichmentError && (
        <div className="px-4 pt-4">
          <SectionCard gradient="from-red-500/10 to-red-600/10">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-red-400">⚠️</span>
              <span className="text-red-300 font-medium">Enhancement Failed</span>
            </div>
            <p className="text-red-200 text-sm mb-3">{enrichmentError}</p>
            <StyledButton
              onClick={handleEnrichCharacter}
              variant="ghost"
              className="text-xs !text-red-300 !border-red-500/30"
            >
              Retry Enhancement
            </StyledButton>
          </SectionCard>
        </div>
      )}

      {/* Tab Navigation */}
      <IOSTabBar
        activeTab={activeTab}
        onTabChange={setActiveTab as any}
        tabs={tabs}
      />

      {/* Tab Content */}
      <div className="min-h-screen">
        {activeTab === 'overview' && <OverviewSection character={character} />}
        
        {activeTab === 'details' && (
          <div className="px-4 pt-6 pb-8 space-y-6">
            {/* Personal Information */}
            <SectionCard gradient="from-emerald-500/10 to-teal-500/10">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-xl flex items-center justify-center">
                    <span className="text-xl">📊</span>
                  </div>
                  <h3 className="text-xl font-heading font-bold text-white">Character Details</h3>
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                  {character.dateOfBirth && (
                    <div className="flex items-center gap-3 p-3 bg-black/30 rounded-xl">
                      <span className="text-xl">🎂</span>
                      <div className="flex-1">
                        <p className="text-white/60 text-xs uppercase tracking-wide">Date of Birth</p>
                        <p className="text-white font-medium">
                          {character.dateOfBirth.year && character.dateOfBirth.month && character.dateOfBirth.day
                            ? new Date(character.dateOfBirth.year, character.dateOfBirth.month - 1, character.dateOfBirth.day)
                                .toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                            : `${character.dateOfBirth.year || ''}/${character.dateOfBirth.month || ''}/${character.dateOfBirth.day || ''}`}
                        </p>
                      </div>
                    </div>
                  )}

                  {character.bloodType && (
                    <div className="flex items-center gap-3 p-3 bg-black/30 rounded-xl">
                      <span className="text-xl">🩸</span>
                      <div className="flex-1">
                        <p className="text-white/60 text-xs uppercase tracking-wide">Blood Type</p>
                        <p className="text-white font-medium">{character.bloodType}</p>
                      </div>
                    </div>
                  )}

                  {character.height && (
                    <div className="flex items-center gap-3 p-3 bg-black/30 rounded-xl">
                      <span className="text-xl">📏</span>
                      <div className="flex-1">
                        <p className="text-white/60 text-xs uppercase tracking-wide">Height</p>
                        <p className="text-white font-medium">{character.height}</p>
                      </div>
                    </div>
                  )}

                  {character.species && (
                    <div className="flex items-center gap-3 p-3 bg-black/30 rounded-xl">
                      <span className="text-xl">🧬</span>
                      <div className="flex-1">
                        <p className="text-white/60 text-xs uppercase tracking-wide">Species</p>
                        <p className="text-white font-medium">{character.species}</p>
                      </div>
                    </div>
                  )}

                  {character.siteUrl && (
                    <div className="flex items-center gap-3 p-3 bg-black/30 rounded-xl">
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
            </SectionCard>
          </div>
        )}

        {activeTab === 'voice_actors' && (
          <div className="px-4 pt-6 pb-8 space-y-6">
            <SectionCard gradient="from-cyan-500/10 to-blue-500/10">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-xl flex items-center justify-center">
                    <span className="text-xl">🎤</span>
                  </div>
                  <h3 className="text-xl font-heading font-bold text-white">Voice Actors</h3>
                </div>
                
                {character.voiceActors && character.voiceActors.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4">
                    {character.voiceActors.map((va, index) => (
                      <div key={index} className="bg-black/30 backdrop-blur-sm rounded-2xl overflow-hidden border border-white/10">
                        <div className="aspect-[3/4] overflow-hidden">
                          {va.imageUrl ? (
                            <img
                              src={va.imageUrl}
                              alt={va.name}
                              className="w-full h-full object-cover"
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
                        
                        <div className="p-4 space-y-1">
                          <h4 className="text-white font-medium text-sm" title={va.name}>
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
            </SectionCard>
          </div>
        )}

        {activeTab === 'relationships' && (
          <div className="px-4 pt-6 pb-8 space-y-6">
            <SectionCard gradient="from-rose-500/10 to-pink-500/10">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-rose-500/20 to-pink-500/20 rounded-xl flex items-center justify-center">
                    <span className="text-xl">👥</span>
                  </div>
                  <h3 className="text-xl font-heading font-bold text-white">Relationships</h3>
                  <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full">AI Analyzed</span>
                </div>
                
                {isLoadingRelationships ? (
                  <IOSLoadingSpinner message="Analyzing relationships..." />
                ) : relationshipData.length > 0 ? (
                  <div className="space-y-4">
                    {relationshipData.map((relationship, index) => (
                      <div key={index} className="bg-black/30 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-lg font-semibold text-brand-accent-gold">{relationship.characterName}</h4>
                          <span className="px-2 py-1 bg-white/10 rounded-full text-xs text-white/70">
                            {relationship.relationshipType}
                          </span>
                        </div>
                        
                        <div className="space-y-3 text-sm">
                          {relationship.emotionalDynamics && (
                            <div>
                              <h5 className="font-medium text-white/80 mb-1">Emotional Dynamics</h5>
                              <p className="text-white/90 leading-relaxed">{relationship.emotionalDynamics}</p>
                            </div>
                          )}
                          
                          {relationship.keyMoments && relationship.keyMoments.length > 0 && (
                            <div>
                              <h5 className="font-medium text-white/80 mb-1">Key Moments</h5>
                              <ul className="space-y-1">
                                {relationship.keyMoments.map((moment: string, idx: number) => (
                                  <li key={idx} className="text-white/80 flex items-start gap-2">
                                    <span className="text-brand-accent-gold text-xs mt-1">•</span>
                                    <span className="leading-relaxed">{moment}</span>
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
                    <h4 className="text-xl text-white/70 mb-2">No Relationship Analysis</h4>
                    <p className="text-white/50 text-sm max-w-md mx-auto mb-4">
                      Detailed relationship analysis is being processed.
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
            </SectionCard>
          </div>
        )}

        {activeTab === 'development' && (
          <div className="px-4 pt-6 pb-8 space-y-6">
            <SectionCard gradient="from-emerald-500/10 to-green-500/10">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-emerald-500/20 to-green-500/20 rounded-xl flex items-center justify-center">
                    <span className="text-xl">📈</span>
                  </div>
                  <h3 className="text-xl font-heading font-bold text-white">Character Growth</h3>
                  <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded-full">AI Timeline</span>
                </div>
                
                {isLoadingTimeline ? (
                  <IOSLoadingSpinner message="Building development timeline..." />
                ) : timelineData.length > 0 ? (
                  <div className="space-y-4">
                    {timelineData.map((phase, index) => (
                      <div key={index} className="relative">
                        {/* Timeline connector */}
                        {index < timelineData.length - 1 && (
                          <div className="absolute left-6 top-14 w-0.5 h-full bg-gradient-to-b from-brand-accent-gold to-transparent"></div>
                        )}
                        
                        <div className="flex items-start gap-4">
                          {/* Timeline dot */}
                          <div className="w-12 h-12 bg-gradient-to-r from-brand-primary-action to-brand-accent-gold rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                            {index + 1}
                          </div>
                          
                          {/* Phase content */}
                          <div className="flex-1 bg-black/30 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-semibold text-brand-accent-gold">{phase.phase}</h4>
                              {phase.timeframe && (
                                <span className="text-xs bg-white/10 px-2 py-1 rounded-full text-white/70">
                                  {phase.timeframe}
                                </span>
                              )}
                            </div>
                            
                            {phase.keyDevelopments && (
                              <div className="space-y-2 text-sm">
                                <h5 className="font-medium text-white/80">Key Developments</h5>
                                <ul className="space-y-1">
                                  {phase.keyDevelopments.map((dev: string, idx: number) => (
                                    <li key={idx} className="text-white/90 flex items-start gap-2">
                                      <span className="text-brand-accent-gold text-xs mt-1">▸</span>
                                      <span className="leading-relaxed">{dev}</span>
                                    </li>
                                  ))}
                                </ul>
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
                    <h4 className="text-xl text-white/70 mb-2">No Development Timeline</h4>
                    <p className="text-white/50 text-sm max-w-md mx-auto mb-4">
                      Character development timeline is being generated.
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
            </SectionCard>
          </div>
        )}
      </div>

      {/* Bottom Safe Area */}
      <div className="h-8 bg-gradient-to-t from-black/20 to-transparent"></div>
    </div>
  );
}