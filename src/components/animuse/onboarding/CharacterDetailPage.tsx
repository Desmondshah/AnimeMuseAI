// Brutalist Character Detail Page - Mobile-First iPhone Design
import React, { useState, useEffect } from "react";
import { Id, Doc } from "../../../../convex/_generated/dataModel";
import { useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
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

interface CharacterDetailPageProps {
  character: EnhancedCharacter;
  animeName: string;
  onBack: () => void;
}

// Brutalist Loading Component
const BrutalistLoader: React.FC<{ message?: string }> = ({ message = "LOADING..." }) => (
  <div className="bg-black border-4 border-white shadow-brutal-lg p-8 text-center">
    <div className="text-white font-black text-4xl mb-4 animate-pulse">⚡</div>
    <h3 className="text-white font-black uppercase text-lg">{message}</h3>
    <div className="mt-4 bg-white h-2 border-2 border-black">
      <div className="bg-brand-primary-action h-full animate-pulse"></div>
    </div>
  </div>
);

// Brutalist Tab Navigation - Mobile First
const BrutalistTabBar: React.FC<{
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabs: Array<{ key: string; label: string; icon: string }>;
}> = ({ activeTab, onTabChange, tabs }) => (
  <div className="bg-black border-b-4 border-white sticky top-0 z-50">
    <div className="overflow-x-auto scrollbar-hide">
      <div className="flex min-w-max p-4 gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`
              relative flex-shrink-0 px-4 py-3 border-4 border-black shadow-brutal font-black uppercase text-xs transition-all touch-target
              ${activeTab === tab.key
                ? 'bg-brand-primary-action text-black shadow-brutal-lg'
                : 'bg-white text-black hover:bg-gray-200 hover:shadow-brutal-lg'
              }
            `}
          >
            <div className="flex items-center gap-2">
            <span className="text-base">{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  </div>
);

// Brutalist Hero Section
const BrutalistHero: React.FC<{
  character: EnhancedCharacter;
  animeName: string;
  onBack: () => void;
  }> = ({ character, animeName, onBack }) => {
  const placeholderImage = `https://placehold.co/600x800/000000/FFFFFF/png?text=${encodeURIComponent(character.name.charAt(0))}&font=poppins`;

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "MAIN": return { color: "bg-brand-primary-action", text: "MAIN CHARACTER" };
      case "SUPPORTING": return { color: "bg-brand-secondary-blue", text: "SUPPORTING" };
      case "BACKGROUND": return { color: "bg-gray-600", text: "BACKGROUND" };
      default: return { color: "bg-black", text: role };
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status?.toLowerCase()) {
      case "alive": return { icon: "💚", text: "ALIVE", color: "bg-green-600" };
      case "deceased": return { icon: "🖤", text: "DECEASED", color: "bg-red-600" };
      case "unknown": return { icon: "❓", text: "UNKNOWN", color: "bg-gray-600" };
      default: return { icon: "❓", text: "UNKNOWN", color: "bg-gray-600" };
    }
  };

  const roleBadge = getRoleBadge(character.role);
  const statusBadge = getStatusBadge(character.status);

  return (
    <div className="relative bg-black border-b-4 border-white">
      {/* Back Button */}
      <div className="absolute top-4 left-4 z-20">
        <button
          onClick={onBack}
          className="bg-white border-4 border-black shadow-brutal hover:shadow-brutal-lg transition-all p-3 touch-target"
        >
          <div className="flex items-center gap-2">
            <span className="text-black font-black text-lg">←</span>
            <span className="text-black font-black uppercase text-xs hidden sm:inline">BACK</span>
          </div>
        </button>
      </div>

      {/* Character Image and Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 pt-20">
        {/* Character Image */}
        <div className="bg-white border-4 border-black shadow-brutal-lg overflow-hidden">
          <div className="aspect-[3/4] bg-gray-200 relative">
            <img 
              src={character.imageUrl || placeholderImage}
              alt={character.name}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).src = placeholderImage; }}
            />
            {/* Image Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
        </div>
      </div>

        {/* Character Info */}
        <div className="space-y-4">
          {/* Character Name */}
          <div className="bg-brand-primary-action border-4 border-black shadow-brutal-lg p-4 text-center">
            <h1 className="text-black font-black uppercase text-2xl break-words">
              {character.name}
            </h1>
            {character.nativeName && (
              <p className="text-black/70 font-bold text-sm mt-2">
                {character.nativeName}
              </p>
            )}
          </div>

          {/* Anime Source */}
          <div className="bg-black border-4 border-white shadow-brutal p-4 text-center">
            <div className="text-white font-black text-lg mb-1">📺</div>
            <h2 className="text-white font-black uppercase text-base">
              {animeName}
            </h2>
          </div>

          {/* Role and Status Badges */}
          <div className="grid grid-cols-2 gap-4">
            <div className={`${roleBadge.color} border-4 border-black shadow-brutal p-3 text-center`}>
              <div className="text-white font-black text-lg mb-1">👤</div>
              <div className="text-white font-black uppercase text-xs">
                {roleBadge.text}
              </div>
            </div>

            <div className={`${statusBadge.color} border-4 border-black shadow-brutal p-3 text-center`}>
              <div className="text-white font-black text-lg mb-1">{statusBadge.icon}</div>
              <div className="text-white font-black uppercase text-xs">
                {statusBadge.text}
              </div>
            </div>
          </div>

          {/* Basic Info Grid */}
          {(character.age || character.gender) && (
            <div className="grid grid-cols-2 gap-4">
              {character.age && (
                <div className="bg-white border-4 border-black shadow-brutal p-3 text-center">
                  <div className="text-black font-black text-lg mb-1">🎂</div>
                  <div className="text-black font-black uppercase text-xs">AGE</div>
                  <div className="text-black font-bold text-sm">{character.age}</div>
              </div>
            )}

              {character.gender && (
                <div className="bg-white border-4 border-black shadow-brutal p-3 text-center">
                  <div className="text-black font-black text-lg mb-1">⚧</div>
                  <div className="text-black font-black uppercase text-xs">GENDER</div>
                  <div className="text-black font-bold text-sm">{character.gender}</div>
                </div>
              )}
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

// Overview Section
const OverviewSection: React.FC<{ character: EnhancedCharacter }> = ({ character }) => (
  <div className="p-4 space-y-4">
    {/* Description */}
            {character.description && (
      <div className="bg-white border-4 border-black shadow-brutal-lg">
        <div className="bg-black border-b-4 border-white p-4">
          <h3 className="text-white font-black uppercase text-lg">📖 DESCRIPTION</h3>
              </div>
        <div className="p-4">
          <p className="text-black font-medium leading-relaxed">
            {character.description}
          </p>
        </div>
      </div>
    )}

    {/* Personality Analysis */}
    {character.personalityAnalysis && (
      <div className="bg-brand-secondary-blue border-4 border-black shadow-brutal-lg">
        <div className="bg-black border-b-4 border-white p-4">
          <h3 className="text-white font-black uppercase text-lg">🧠 PERSONALITY</h3>
          <div className="text-white/70 font-bold text-xs mt-1">AI ANALYSIS</div>
            </div>
        <div className="p-4">
          <p className="text-white font-medium leading-relaxed">
            {character.personalityAnalysis}
          </p>
        </div>
      </div>
    )}

    {/* Powers & Abilities */}
    {character.powersAbilities && character.powersAbilities.length > 0 && (
      <div className="bg-brand-accent-peach border-4 border-black shadow-brutal-lg">
        <div className="bg-black border-b-4 border-white p-4">
          <h3 className="text-white font-black uppercase text-lg">⚡ POWERS & ABILITIES</h3>
            </div>
        <div className="p-4 space-y-2">
          {character.powersAbilities.map((power, index) => (
            <div key={index} className="bg-black border-2 border-white shadow-brutal p-3">
              <span className="text-white font-bold">• {power}</span>
                </div>
              ))}
        </div>
      </div>
    )}

    {/* Notable Quotes */}
    {character.notableQuotes && character.notableQuotes.length > 0 && (
      <div className="bg-gray-800 border-4 border-white shadow-brutal-lg">
        <div className="bg-white border-b-4 border-black p-4">
          <h3 className="text-black font-black uppercase text-lg">💬 NOTABLE QUOTES</h3>
          </div>
        <div className="p-4 space-y-3">
          {character.notableQuotes.map((quote, index) => (
            <div key={index} className="bg-white border-4 border-black shadow-brutal p-4">
              <blockquote className="text-black font-medium italic leading-relaxed">
                "{quote}"
              </blockquote>
              </div>
            ))}
        </div>
      </div>
    )}
  </div>
);

// Main Component
export default function CharacterDetailPage({ character: initialCharacter, animeName, onBack }: CharacterDetailPageProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'voice_actors' | 'development' | 'relationships'>('overview');
  const [character, setCharacter] = useState<EnhancedCharacter>(initialCharacter);
  const [relationshipData, setRelationshipData] = useState<any[]>([]);
  const [timelineData, setTimelineData] = useState<any[]>([]);
  const [isLoadingRelationships, setIsLoadingRelationships] = useState(false);
  const [isLoadingTimeline, setIsLoadingTimeline] = useState(false);

  // Convex actions
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
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="bg-red-600 border-4 border-white shadow-brutal-lg p-8 text-center max-w-md w-full">
          <div className="text-white font-black text-4xl mb-4">⚠️</div>
          <h2 className="text-white font-black uppercase text-xl mb-4">CHARACTER NOT FOUND</h2>
          <p className="text-white/80 font-bold text-sm mb-4">
            This character could not be loaded.
          </p>
          <button
            onClick={onBack}
            className="bg-white border-4 border-black shadow-brutal hover:shadow-brutal-lg transition-all p-4 w-full touch-target"
          >
            <span className="text-black font-black uppercase">← BACK TO ANIME</span>
          </button>
          </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Hero Section */}
      <BrutalistHero
        character={character}
        animeName={animeName}
        onBack={onBack}
      />

      {/* Tab Navigation */}
      <BrutalistTabBar
        activeTab={activeTab}
        onTabChange={setActiveTab as any}
        tabs={tabs}
      />

      {/* Tab Content */}
      <div className="min-h-screen bg-black">
        {activeTab === 'overview' && <OverviewSection character={character} />}
        
        {activeTab === 'details' && (
          <div className="p-4 space-y-4">
            {/* Personal Information */}
            <div className="bg-white border-4 border-black shadow-brutal-lg">
              <div className="bg-black border-b-4 border-white p-4">
                <h3 className="text-white font-black uppercase text-lg">📊 CHARACTER DETAILS</h3>
                </div>
                
              <div className="p-4 space-y-3">
                  {character.dateOfBirth && (
                  <div className="bg-black border-4 border-white shadow-brutal p-4">
                    <div className="flex items-center gap-3">
                      <span className="text-white font-black text-xl">🎂</span>
                      <div>
                        <div className="text-white font-black uppercase text-xs">DATE OF BIRTH</div>
                        <div className="text-white font-bold text-sm">
                          {character.dateOfBirth.year && character.dateOfBirth.month && character.dateOfBirth.day
                            ? new Date(character.dateOfBirth.year, character.dateOfBirth.month - 1, character.dateOfBirth.day)
                                .toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                            : `${character.dateOfBirth.year || ''}/${character.dateOfBirth.month || ''}/${character.dateOfBirth.day || ''}`}
                        </div>
                      </div>
                      </div>
                    </div>
                  )}

                  {character.bloodType && (
                  <div className="bg-red-600 border-4 border-black shadow-brutal p-4">
                    <div className="flex items-center gap-3">
                      <span className="text-white font-black text-xl">🩸</span>
                      <div>
                        <div className="text-white font-black uppercase text-xs">BLOOD TYPE</div>
                        <div className="text-white font-bold text-sm">{character.bloodType}</div>
                      </div>
                      </div>
                    </div>
                  )}

                  {character.height && (
                  <div className="bg-brand-secondary-blue border-4 border-black shadow-brutal p-4">
                    <div className="flex items-center gap-3">
                      <span className="text-white font-black text-xl">📏</span>
                      <div>
                        <div className="text-white font-black uppercase text-xs">HEIGHT</div>
                        <div className="text-white font-bold text-sm">{character.height}</div>
                      </div>
                      </div>
                    </div>
                  )}

                  {character.species && (
                  <div className="bg-brand-accent-peach border-4 border-black shadow-brutal p-4">
                    <div className="flex items-center gap-3">
                      <span className="text-black font-black text-xl">🧬</span>
                      <div>
                        <div className="text-black font-black uppercase text-xs">SPECIES</div>
                        <div className="text-black font-bold text-sm">{character.species}</div>
                      </div>
                      </div>
                    </div>
                  )}

                  {character.siteUrl && (
                  <div className="bg-gray-800 border-4 border-white shadow-brutal p-4">
                    <div className="flex items-center gap-3">
                      <span className="text-white font-black text-xl">🔗</span>
                      <div className="flex-1">
                        <div className="text-white font-black uppercase text-xs">ANILIST PAGE</div>
                        <a 
                          href={character.siteUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-brand-primary-action hover:text-brand-accent-gold font-bold text-sm underline"
                        >
                          View on AniList
                        </a>
                      </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
          </div>
        )}

        {activeTab === 'voice_actors' && (
          <div className="p-4 space-y-4">
            <div className="bg-brand-secondary-blue border-4 border-black shadow-brutal-lg">
              <div className="bg-black border-b-4 border-white p-4">
                <h3 className="text-white font-black uppercase text-lg">🎤 VOICE ACTORS</h3>
                </div>
                
                {character.voiceActors && character.voiceActors.length > 0 ? (
                <div className="p-4 space-y-4">
                    {character.voiceActors.map((va, index) => (
                    <div key={index} className="bg-white border-4 border-black shadow-brutal-lg overflow-hidden">
                      <div className="grid grid-cols-3 gap-0">
                        {/* Voice Actor Image */}
                        <div className="aspect-square bg-gray-200 border-r-4 border-black">
                          {va.imageUrl ? (
                            <img
                              src={va.imageUrl}
                              alt={va.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = `https://placehold.co/200x200/000000/FFFFFF/png?text=${encodeURIComponent(va.name.charAt(0))}&font=poppins`;
                              }}
                            />
                          ) : (
                            <div className="w-full h-full bg-black flex items-center justify-center">
                              <span className="text-white font-black text-3xl">
                                {va.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {/* Voice Actor Info */}
                        <div className="col-span-2 p-4 space-y-2">
                          <h4 className="text-black font-black uppercase text-sm">
                            {va.name}
                          </h4>
                          <div className="bg-black border-2 border-white shadow-brutal p-2">
                            <div className="flex items-center gap-2">
                              <span className="text-white font-black text-sm">🌍</span>
                              <span className="text-white font-bold text-xs uppercase">
                            {va.language}
                              </span>
                            </div>
                          </div>
                        </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                <div className="p-8 text-center">
                  <div className="text-white font-black text-4xl mb-4">🎤</div>
                  <h4 className="text-white font-black uppercase text-lg mb-2">NO VOICE ACTOR DATA</h4>
                  <p className="text-white/70 font-bold text-sm">
                    Voice actor information is not available for this character.
                    </p>
                  </div>
                )}
              </div>
          </div>
        )}

        {activeTab === 'relationships' && (
          <div className="p-4 space-y-4">
            <div className="bg-brand-accent-peach border-4 border-black shadow-brutal-lg">
              <div className="bg-black border-b-4 border-white p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-black uppercase text-lg">👥 RELATIONSHIPS</h3>
                  <div className="bg-brand-primary-action border-2 border-white px-3 py-1">
                    <span className="text-black font-black text-xs">AI ANALYZED</span>
                  </div>
                </div>
                </div>
                
                {isLoadingRelationships ? (
                <div className="p-4">
                  <BrutalistLoader message="ANALYZING RELATIONSHIPS..." />
                </div>
                ) : relationshipData.length > 0 ? (
                <div className="p-4 space-y-4">
                    {relationshipData.map((relationship, index) => (
                    <div key={index} className="bg-white border-4 border-black shadow-brutal-lg">
                      <div className="bg-black border-b-4 border-white p-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-white font-black uppercase text-base">
                            {relationship.characterName}
                          </h4>
                          <div className="bg-brand-primary-action border-2 border-white px-2 py-1">
                            <span className="text-black font-black text-xs">
                            {relationship.relationshipType}
                          </span>
                          </div>
                        </div>
                        </div>
                        
                      <div className="p-4 space-y-3">
                          {relationship.emotionalDynamics && (
                            <div>
                            <h5 className="text-black font-black uppercase text-sm mb-2">
                              EMOTIONAL DYNAMICS
                            </h5>
                            <div className="bg-black border-2 border-white shadow-brutal p-3">
                              <p className="text-white font-medium text-sm leading-relaxed">
                                {relationship.emotionalDynamics}
                              </p>
                            </div>
                            </div>
                          )}
                          
                          {relationship.keyMoments && relationship.keyMoments.length > 0 && (
                            <div>
                            <h5 className="text-black font-black uppercase text-sm mb-2">
                              KEY MOMENTS
                            </h5>
                            <div className="space-y-2">
                                {relationship.keyMoments.map((moment: string, idx: number) => (
                                <div key={idx} className="bg-black border-2 border-white shadow-brutal p-3">
                                  <div className="flex items-start gap-3">
                                    <span className="text-brand-primary-action font-black text-sm">▶</span>
                                    <span className="text-white font-medium text-sm leading-relaxed">
                                      {moment}
                                    </span>
                                  </div>
                                </div>
                                ))}
                            </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                <div className="p-8 text-center">
                  <div className="text-black font-black text-4xl mb-4">👥</div>
                  <h4 className="text-black font-black uppercase text-lg mb-2">NO RELATIONSHIP ANALYSIS</h4>
                  <p className="text-black/70 font-bold text-sm mb-4">
                      Detailed relationship analysis is being processed.
                    </p>
                  <button
                      onClick={loadRelationshipAnalysis}
                    className="bg-black border-4 border-white shadow-brutal hover:shadow-brutal-lg transition-all p-4 w-full touch-target"
                  >
                    <span className="text-white font-black uppercase text-sm">
                      🤖 ANALYZE RELATIONSHIPS
                    </span>
                  </button>
                  </div>
                )}
              </div>
          </div>
        )}

        {activeTab === 'development' && (
          <div className="p-4 space-y-4">
            <div className="bg-brand-secondary-blue border-4 border-black shadow-brutal-lg">
              <div className="bg-black border-b-4 border-white p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-black uppercase text-lg">📈 CHARACTER GROWTH</h3>
                  <div className="bg-green-600 border-2 border-white px-3 py-1">
                    <span className="text-white font-black text-xs">AI TIMELINE</span>
                  </div>
                </div>
                </div>
                
                {isLoadingTimeline ? (
                <div className="p-4">
                  <BrutalistLoader message="BUILDING TIMELINE..." />
                </div>
                ) : timelineData.length > 0 ? (
                <div className="p-4 space-y-4">
                    {timelineData.map((phase, index) => (
                      <div key={index} className="relative">
                        {/* Timeline connector */}
                        {index < timelineData.length - 1 && (
                        <div className="absolute left-6 top-16 w-1 h-full bg-white"></div>
                        )}
                        
                        <div className="flex items-start gap-4">
                          {/* Timeline dot */}
                        <div className="bg-brand-primary-action border-4 border-black shadow-brutal w-12 h-12 flex items-center justify-center flex-shrink-0">
                          <span className="text-black font-black text-sm">{index + 1}</span>
                          </div>
                          
                          {/* Phase content */}
                        <div className="flex-1 bg-white border-4 border-black shadow-brutal-lg">
                          <div className="bg-black border-b-4 border-white p-4">
                            <div className="flex items-center justify-between">
                              <h4 className="text-white font-black uppercase text-base">
                                {phase.phase}
                              </h4>
                              {phase.timeframe && (
                                <div className="bg-brand-primary-action border-2 border-white px-2 py-1">
                                  <span className="text-black font-black text-xs">
                                  {phase.timeframe}
                                </span>
                                </div>
                              )}
                            </div>
                            </div>
                            
                            {phase.keyDevelopments && (
                            <div className="p-4">
                              <h5 className="text-black font-black uppercase text-sm mb-3">
                                KEY DEVELOPMENTS
                              </h5>
                              <div className="space-y-2">
                                  {phase.keyDevelopments.map((dev: string, idx: number) => (
                                  <div key={idx} className="bg-black border-2 border-white shadow-brutal p-3">
                                    <div className="flex items-start gap-3">
                                      <span className="text-brand-primary-action font-black text-sm">▶</span>
                                      <span className="text-white font-medium text-sm leading-relaxed">
                                        {dev}
                                      </span>
                                    </div>
                                  </div>
                                  ))}
                              </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                <div className="p-8 text-center">
                  <div className="text-white font-black text-4xl mb-4">📈</div>
                  <h4 className="text-white font-black uppercase text-lg mb-2">NO DEVELOPMENT TIMELINE</h4>
                  <p className="text-white/70 font-bold text-sm mb-4">
                      Character development timeline is being generated.
                    </p>
                  <button
                      onClick={loadTimelineData}
                    className="bg-white border-4 border-black shadow-brutal hover:shadow-brutal-lg transition-all p-4 w-full touch-target"
                  >
                    <span className="text-black font-black uppercase text-sm">
                      🤖 GENERATE TIMELINE
                    </span>
                  </button>
                  </div>
                )}
              </div>
          </div>
        )}
      </div>

      {/* Bottom Safe Area */}
      <div className="h-8 bg-black"></div>
    </div>
  );
}