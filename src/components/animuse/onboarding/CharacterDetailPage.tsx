// src/components/animuse/CharacterDetailPage.tsx - New File
import React, { useState, memo } from "react";
import { Id, Doc } from "../../../../convex/_generated/dataModel";
import StyledButton from "../shared/StyledButton";
import { formatDistanceToNow } from 'date-fns';

// Enhanced character interface with all the new fields
interface EnhancedCharacter {
  id?: number;
  name: string;
  imageUrl?: string;
  role: string; // "MAIN", "SUPPORTING", "BACKGROUND"
  description?: string;
  status?: string; // "Alive", "Deceased", "Unknown"
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
}

interface CharacterDetailPageProps {
  character: EnhancedCharacter;
  animeName: string; // To show which anime this character is from
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

export default function CharacterDetailPage({ character, animeName, onBack }: CharacterDetailPageProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'voice_actors'>('overview');
  
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

  // Format date of birth
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
        {/* Back Button */}
        <div className="mb-6">
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
        </div>

        {/* Hero Section with Character Image and Basic Info */}
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
              
              {/* Character Info Overlay */}
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
                  
                  {/* Quick Stats */}
                  <div className="flex flex-wrap gap-3 mb-6">
                    {/* Role Badge */}
                    <div className={`rounded-full px-4 py-2 flex items-center gap-2 backdrop-blur-sm border ${getRoleColor(character.role)}`}>
                      <span className="text-lg">{getRoleIcon(character.role)}</span>
                      <span className="font-medium">
                        {character.role === "MAIN" ? "Main Character" : 
                         character.role === "SUPPORTING" ? "Supporting" : "Background"}
                      </span>
                    </div>

                    {/* Status Badge */}
                    {character.status && (
                      <div className={`rounded-full px-4 py-2 flex items-center gap-2 backdrop-blur-sm border ${getStatusColor(character.status)}`}>
                        <span className="text-lg">
                          {character.status.toLowerCase() === 'alive' ? '💚' : 
                           character.status.toLowerCase() === 'deceased' ? '💀' : '❓'}
                        </span>
                        <span className="font-medium">{character.status}</span>
                      </div>
                    )}

                    {/* Gender */}
                    {character.gender && (
                      <div className="bg-black/60 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2">
                        <span className="text-lg">
                          {character.gender.toLowerCase() === 'male' ? '♂️' : 
                           character.gender.toLowerCase() === 'female' ? '♀️' : '⚧️'}
                        </span>
                        <span className="text-white font-medium">{character.gender}</span>
                      </div>
                    )}

                    {/* Age */}
                    {character.age && (
                      <div className="bg-black/60 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2">
                        <span className="text-lg">🎂</span>
                        <span className="text-white font-medium">{character.age}</span>
                      </div>
                    )}

                    {/* Species */}
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

        {/* Navigation Tabs */}
        <div className="flex justify-center">
          <div className="bg-black/30 backdrop-blur-sm border border-white/10 rounded-2xl p-2 flex gap-2">
            {[
              { key: 'overview' as const, label: 'Overview', icon: '📋' },
              { key: 'details' as const, label: 'Details', icon: '📊' },
              { key: 'voice_actors' as const, label: 'Voice Actors', icon: '🎤' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-xl transition-all duration-300 flex items-center gap-2 ${
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
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <>
              {/* Character Description */}
              {character.description && (
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-b from-purple-500/10 to-blue-500/10 rounded-3xl blur-xl"></div>
                  <div className="relative bg-black/30 backdrop-blur-sm border border-white/10 rounded-3xl p-6 sm:p-8">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-gradient-to-r from-brand-primary-action/20 to-brand-accent-gold/20 rounded-full">
                        <span className="text-2xl">📖</span>
                      </div>
                      <h2 className="text-2xl font-heading text-white font-bold">Character Profile</h2>
                    </div>
                    <p className="text-base sm:text-lg text-white/90 leading-relaxed whitespace-pre-wrap">
                      {character.description}
                    </p>
                  </div>
                </div>
              )}

              {/* Powers & Abilities */}
              {character.powersAbilities && character.powersAbilities.length > 0 && (
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-3xl blur-xl"></div>
                  <div className="relative bg-black/30 backdrop-blur-sm border border-white/10 rounded-3xl p-6 sm:p-8">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-full">
                        <span className="text-2xl">⚡</span>
                      </div>
                      <h3 className="text-2xl font-heading text-white font-bold">Powers & Abilities</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {character.powersAbilities.map((power, index) => (
                        <div key={index} className="bg-black/40 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                          <p className="text-white/90 text-sm leading-relaxed">{power}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Weapons */}
              {character.weapons && character.weapons.length > 0 && (
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-pink-500/10 rounded-3xl blur-xl"></div>
                  <div className="relative bg-black/30 backdrop-blur-sm border border-white/10 rounded-3xl p-6 sm:p-8">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-gradient-to-r from-red-500/20 to-pink-500/20 rounded-full">
                        <span className="text-2xl">⚔️</span>
                      </div>
                      <h3 className="text-2xl font-heading text-white font-bold">Weapons & Equipment</h3>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {character.weapons.map((weapon, index) => (
                        <span 
                          key={index} 
                          className="bg-gradient-to-r from-red-500/20 to-pink-500/20 text-white px-4 py-2 rounded-full text-sm font-medium border border-red-500/30"
                        >
                          {weapon}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

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