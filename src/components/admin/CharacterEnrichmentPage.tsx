// Character Enrichment AI Admin Page
import React, { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import StyledButton from "../animuse/shared/StyledButton";
import { useMobileOptimizations } from "../../hooks/useMobileOptimizations";
import { toast } from "sonner";

interface EnrichmentStats {
  totalCharacters: number;
  enrichedCharacters: number;
  pendingCharacters: number;
  failedCharacters: number;
  skippedCharacters: number;
  enrichmentPercentage: number;
}

interface AnimeEnrichmentData {
  _id: Id<"anime">;
  title: string;
  titleEnglish?: string;
  characters?: Array<{
    name: string;
    enrichmentStatus?: "pending" | "success" | "failed" | "skipped";
    enrichmentAttempts?: number;
    lastAttemptTimestamp?: number;
    lastErrorMessage?: string;
    enrichmentTimestamp?: number;
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
  }>;
  enrichmentStats?: EnrichmentStats;
}

interface BatchJobStatus {
  isRunning: boolean;
  progress: {
    totalAnime: number;
    processedAnime: number;
    totalCharacters: number;
    processedCharacters: number;
    succeededCharacters: number;
    failedCharacters: number;
    skippedCharacters: number;
  };
  startTime?: number;
  currentAnime?: string;
}

const CharacterEnrichmentPage: React.FC = () => {
  const { isMobile, iPad } = useMobileOptimizations();
  const shouldUseMobileLayout = isMobile;
  const shouldUseTabletLayout = iPad.isIPad;
  
  // State management
  const [selectedView, setSelectedView] = useState<"overview" | "anime-list" | "batch-jobs">("overview");
  const [selectedAnimeId, setSelectedAnimeId] = useState<Id<"anime"> | null>(null);
  const [batchJobStatus, setBatchJobStatus] = useState<BatchJobStatus>({
    isRunning: false,
    progress: {
      totalAnime: 0,
      processedAnime: 0,
      totalCharacters: 0,
      processedCharacters: 0,
      succeededCharacters: 0,
      failedCharacters: 0,
      skippedCharacters: 0,
    }
  });
  const [enrichmentFilters, setEnrichmentFilters] = useState({
    showPending: true,
    showSuccess: true,
    showFailed: true,
    showSkipped: false,
  });

  // Queries
  const animeWithCharacters = useQuery(api.anime.getAllAnimeWithCharacters, {
    limit: 50,
    includeEnrichmentStats: true,
  }) as AnimeEnrichmentData[] | undefined;

  // Cache statistics state
  const [showCacheStats, setShowCacheStats] = useState(false);
  const [cacheStats, setCacheStats] = useState<any>(null);

  // Actions
  const enrichSingleAnime = useAction(api.characterEnrichment.enrichAnimeCharacters);
  const batchEnrichCharacters = useAction(api.characterEnrichment.batchEnrichAnimeCharacters);
  const getCacheStats = useAction(api.characterEnrichment.getCacheStatistics);
  const clearExpiredCache = useAction(api.characterEnrichment.clearExpiredCache);
  const invalidateCharacterCache = useAction(api.characterEnrichment.invalidateCharacterCache);

  // Load cache stats on component mount and periodically
  useEffect(() => {
    const loadCacheStats = async () => {
      try {
        const stats = await getCacheStats({});
        setCacheStats(stats);
      } catch (error) {
        console.error("Failed to load cache stats:", error);
      }
    };

    loadCacheStats();
    const interval = setInterval(loadCacheStats, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [getCacheStats]);

  // Calculate overall stats
  const overallStats = useMemo<EnrichmentStats>(() => {
    if (!animeWithCharacters) {
      return {
        totalCharacters: 0,
        enrichedCharacters: 0,
        pendingCharacters: 0,
        failedCharacters: 0,
        skippedCharacters: 0,
        enrichmentPercentage: 0,
      };
    }

    const stats = animeWithCharacters.reduce((acc, anime: AnimeEnrichmentData) => {
      if (!anime.characters) return acc;
      
      anime.characters.forEach((char: any) => {
        acc.totalCharacters++;
        switch (char.enrichmentStatus) {
          case "success":
            acc.enrichedCharacters++;
            break;
          case "pending":
            acc.pendingCharacters++;
            break;
          case "failed":
            acc.failedCharacters++;
            break;
          case "skipped":
            acc.skippedCharacters++;
            break;
        }
      });
      
      return acc;
    }, {
      totalCharacters: 0,
      enrichedCharacters: 0,
      pendingCharacters: 0,
      failedCharacters: 0,
      skippedCharacters: 0,
    });

    const enrichmentPercentage = stats.totalCharacters > 0 
      ? (stats.enrichedCharacters / stats.totalCharacters) * 100 
      : 0;

    return {
      ...stats,
      enrichmentPercentage,
    };
  }, [animeWithCharacters]);

  // Handle single anime enrichment
  const handleEnrichAnime = async (animeId: Id<"anime">, maxCharacters: number = 5) => {
    try {
      await enrichSingleAnime({
        animeId,
        maxCharacters,
        includeRetries: true,
      });
      // Refresh will happen automatically due to Convex reactivity
    } catch (error) {
      console.error("Failed to enrich anime:", error);
    }
  };

  // Handle batch enrichment
  const handleBatchEnrichment = async (animeBatchSize: number = 3, charactersPerAnime: number = 5) => {
    setBatchJobStatus(prev => ({
      ...prev,
      isRunning: true,
      startTime: Date.now(),
    }));

    try {
      const result = await batchEnrichCharacters({
        animeBatchSize,
        charactersPerAnime,
        includeRetries: true,
      });

      setBatchJobStatus(prev => ({
        ...prev,
        isRunning: false,
        progress: {
          ...prev.progress,
          totalCharacters: result.totalProcessed,
          processedCharacters: result.totalProcessed,
          succeededCharacters: result.totalSucceeded,
          failedCharacters: result.totalFailed,
          skippedCharacters: result.totalSkipped,
        }
      }));
    } catch (error) {
      console.error("Batch enrichment failed:", error);
      setBatchJobStatus(prev => ({
        ...prev,
        isRunning: false,
      }));
    }
  };

  // Handle cache cleanup
  const handleClearExpiredCache = async () => {
    try {
      const result = await clearExpiredCache({});
      toast.success(`🗑️ Cleared ${result.deletedCount} expired cache entries`);
    } catch (error) {
      console.error("Failed to clear cache:", error);
      toast.error("Failed to clear expired cache entries");
    }
  };

  // Format cache size
  const formatCacheSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    if (mb > 1) return `${mb.toFixed(2)} MB`;
    const kb = bytes / 1024;
    if (kb > 1) return `${kb.toFixed(2)} KB`;
    return `${bytes} bytes`;
  };

  // Responsive grid classes
  const getGridClasses = () => {
    if (shouldUseMobileLayout) {
      return {
        stats: 'grid-cols-2',
        actions: 'grid-cols-1',
        spacing: 'gap-4',
        padding: 'p-4'
      };
    }
    
    if (shouldUseTabletLayout) {
      return {
        stats: 'grid-cols-2 lg:grid-cols-4',
        actions: 'grid-cols-2',
        spacing: 'gap-6',
        padding: 'p-6'
      };
    }
    
    return {
      stats: 'grid-cols-4',
      actions: 'grid-cols-3',
      spacing: 'gap-8',
      padding: 'p-8'
    };
  };

  const gridClasses = getGridClasses();

  // Render overview stats
  const renderOverview = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className={`bg-black border-4 border-white ${gridClasses.padding}`}>
        <h1 className={`font-black text-white uppercase tracking-wider mb-4 ${
          shouldUseMobileLayout ? 'text-2xl' : 'text-4xl'
        }`}>
          CHARACTER ENRICHMENT AI
        </h1>
        <p className={`text-white font-bold uppercase tracking-wide mb-4 ${
          shouldUseMobileLayout ? 'text-sm' : 'text-base'
        }`}>
          AI-POWERED CHARACTER DATA ENHANCEMENT SYSTEM
        </p>
        <div className={`bg-yellow-500 text-black border-2 border-black ${
          shouldUseMobileLayout ? 'p-3' : 'p-4'
        }`}>
          <p className={`font-bold uppercase ${shouldUseMobileLayout ? 'text-xs' : 'text-sm'}`}>
            🤖 SYSTEM INFO: This AI enrichment system analyzes character data and adds detailed information including personality analysis, relationships, abilities, character arcs, trivia, and cultural significance using advanced AI models.
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className={`grid ${gridClasses.stats} ${gridClasses.spacing}`}>
        {[
          { 
            label: 'TOTAL CHARACTERS', 
            value: overallStats.totalCharacters.toLocaleString(), 
            change: `${overallStats.enrichmentPercentage.toFixed(1)}% ENRICHED`, 
            icon: '👥',
            color: 'bg-blue-500'
          },
          { 
            label: 'ENRICHED', 
            value: overallStats.enrichedCharacters.toLocaleString(), 
            change: 'SUCCESS', 
            icon: '✅',
            color: 'bg-green-500'
          },
          { 
            label: 'PENDING', 
            value: overallStats.pendingCharacters.toLocaleString(), 
            change: 'IN QUEUE', 
            icon: '⏳',
            color: 'bg-yellow-500'
          },
          { 
            label: 'FAILED', 
            value: overallStats.failedCharacters.toLocaleString(), 
            change: 'RETRY NEEDED', 
            icon: '❌',
            color: 'bg-red-500'
          },
        ].map((stat, index) => (
          <div key={index} className={`bg-black border-4 border-white ${gridClasses.padding}`}>
            <div className="flex items-center justify-between mb-4">
              <div className={`${
                shouldUseMobileLayout ? 'text-2xl' : 
                shouldUseTabletLayout ? 'text-3xl' : 
                'text-4xl'
              }`}>{stat.icon}</div>
              <div className={`${stat.color} text-black font-black uppercase ${
                shouldUseMobileLayout ? 'px-2 py-1 text-xs' : 'px-3 py-1 text-sm'
              }`}>
                {stat.change}
              </div>
            </div>
            <div className={`font-black text-white mb-2 ${
              shouldUseMobileLayout ? 'text-xl' : 
              shouldUseTabletLayout ? 'text-2xl' : 
              'text-4xl'
            }`}>{stat.value}</div>
            <div className={`text-white font-bold uppercase tracking-wide ${
              shouldUseMobileLayout ? 'text-xs' : 'text-sm'
            }`}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Action Cards */}
      <div className={`grid ${gridClasses.actions} ${gridClasses.spacing}`}>
        <div
          onClick={() => setSelectedView("anime-list")}
          className={`group cursor-pointer border-4 border-white bg-black hover:bg-white hover:text-black transition-all duration-200 ${gridClasses.padding}`}
        >
          <div className={`mb-6 ${
            shouldUseMobileLayout ? 'text-4xl' : 
            shouldUseTabletLayout ? 'text-5xl' : 
            'text-6xl'
          }`}>
            🎬
          </div>
          <h3 className={`font-black text-white group-hover:text-black mb-4 uppercase tracking-wider ${
            shouldUseMobileLayout ? 'text-lg' : 
            shouldUseTabletLayout ? 'text-xl' : 
            'text-3xl'
          }`}>
            ANIME LIST
          </h3>
          <p className={`text-white group-hover:text-black font-bold uppercase tracking-wide mb-6 ${
            shouldUseMobileLayout ? 'text-sm' : 'text-base'
          }`}>
            MANAGE INDIVIDUAL ANIME
          </p>
        </div>

        <div
          onClick={() => setSelectedView("batch-jobs")}
          className={`group cursor-pointer border-4 border-white bg-black hover:bg-white hover:text-black transition-all duration-200 ${gridClasses.padding}`}
        >
          <div className={`mb-6 ${
            shouldUseMobileLayout ? 'text-4xl' : 
            shouldUseTabletLayout ? 'text-5xl' : 
            'text-6xl'
          }`}>
            ⚡
          </div>
          <h3 className={`font-black text-white group-hover:text-black mb-4 uppercase tracking-wider ${
            shouldUseMobileLayout ? 'text-lg' : 
            shouldUseTabletLayout ? 'text-xl' : 
            'text-3xl'
          }`}>
            BATCH JOBS
          </h3>
          <p className={`text-white group-hover:text-black font-bold uppercase tracking-wide mb-6 ${
            shouldUseMobileLayout ? 'text-sm' : 'text-base'
          }`}>
            BULK ENRICHMENT OPERATIONS
          </p>
        </div>

        <div className={`border-4 border-white bg-black ${gridClasses.padding}`}>
          <div className={`mb-6 ${
            shouldUseMobileLayout ? 'text-4xl' : 
            shouldUseTabletLayout ? 'text-5xl' : 
            'text-6xl'
          }`}>
            📊
          </div>
          <h3 className={`font-black text-white mb-4 uppercase tracking-wider ${
            shouldUseMobileLayout ? 'text-lg' : 
            shouldUseTabletLayout ? 'text-xl' : 
            'text-3xl'
          }`}>
            PROGRESS
          </h3>
          <div className="bg-white h-4 mb-4">
            <div 
              className="bg-green-500 h-full transition-all duration-500"
              style={{ width: `${overallStats.enrichmentPercentage}%` }}
            />
          </div>
          <p className={`text-white font-bold uppercase tracking-wide ${
            shouldUseMobileLayout ? 'text-sm' : 'text-base'
          }`}>
            {overallStats.enrichmentPercentage.toFixed(1)}% COMPLETE
          </p>
        </div>
      </div>

      {/* Cache Statistics Card */}
      {cacheStats && (
        <div className={`bg-gray-900 border-4 border-white ${gridClasses.padding}`}>
          <div className="flex items-center justify-between mb-4">
            <div className={`${
              shouldUseMobileLayout ? 'text-2xl' : 
              shouldUseTabletLayout ? 'text-3xl' : 
              'text-4xl'
            }`}>🗄️</div>
            <button
              onClick={() => setShowCacheStats(!showCacheStats)}
              className="bg-blue-500 text-white font-black uppercase px-2 py-1 text-xs border-2 border-blue-700"
            >
              {showCacheStats ? 'HIDE' : 'SHOW'}
            </button>
          </div>
          <div className={`font-black text-white mb-2 ${
            shouldUseMobileLayout ? 'text-xl' : 
            shouldUseTabletLayout ? 'text-2xl' : 
            'text-4xl'
          }`}>{cacheStats.totalEntries}</div>
          <div className={`text-white font-bold uppercase tracking-wide mb-4 ${
            shouldUseMobileLayout ? 'text-xs' : 'text-sm'
          }`}>AI CACHE ENTRIES</div>
          
          {showCacheStats && (
            <div className="space-y-2 text-white text-xs">
              <div>📊 Enrichment: {cacheStats.characterEnrichment}</div>
              <div>🤝 Relationships: {cacheStats.characterRelationships}</div>
              <div>📈 Timeline: {cacheStats.characterTimeline}</div>
              <div>💾 Size: {formatCacheSize(cacheStats.totalSize)}</div>
              <div>⚠️ Expired: {cacheStats.expiredEntries}</div>
              
              <button
                onClick={handleClearExpiredCache}
                className="w-full bg-red-600 text-white font-black uppercase px-2 py-1 text-xs border-2 border-red-800 mt-2"
              >
                CLEAR EXPIRED
              </button>
            </div>
          )}
        </div>
      )}

      {/* Real-time Enrichment Status */}
      <div className={`bg-purple-900 border-4 border-white ${gridClasses.padding}`}>
        <div className="flex items-center justify-between mb-4">
          <div className={`${
            shouldUseMobileLayout ? 'text-2xl' : 
            shouldUseTabletLayout ? 'text-3xl' : 
            'text-4xl'
          }`}>⚡</div>
          <div className="bg-purple-500 text-white font-black uppercase px-2 py-1 text-xs">
            REAL-TIME
          </div>
        </div>
        <div className={`font-black text-white mb-2 ${
          shouldUseMobileLayout ? 'text-xl' : 
          shouldUseTabletLayout ? 'text-2xl' : 
          'text-4xl'
        }`}>LIVE</div>
        <div className={`text-white font-bold uppercase tracking-wide mb-4 ${
          shouldUseMobileLayout ? 'text-xs' : 'text-sm'
        }`}>AI ENRICHMENT</div>
        
        <div className="space-y-2 text-white text-xs">
          <div>🔄 Real-time character processing</div>
          <div>💰 Automatic token savings via cache</div>
          <div>⚡ Instant results when cached</div>
          <div>🧠 Advanced AI analysis included</div>
          
          <div className="bg-yellow-600 text-black p-2 mt-2 border-2 border-yellow-800">
            <div className="font-black text-xs">💡 SMART CACHING</div>
            <div className="text-xs">Results cached for 7 days to reduce AI token usage!</div>
          </div>
        </div>
      </div>
    </div>
  );

  // Render anime list view
  const renderAnimeList = () => (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className={`bg-black border-4 border-white ${gridClasses.padding}`}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className={`font-black text-white uppercase tracking-wider mb-2 ${
              shouldUseMobileLayout ? 'text-xl' : 'text-3xl'
            }`}>
              ANIME ENRICHMENT STATUS
            </h2>
            <p className={`text-white font-bold uppercase tracking-wide ${
              shouldUseMobileLayout ? 'text-sm' : 'text-base'
            }`}>
              {animeWithCharacters?.length || 0} ANIME WITH CHARACTERS
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {Object.entries(enrichmentFilters).map(([key, value]) => (
              <button
                key={key}
                onClick={() => setEnrichmentFilters(prev => ({ ...prev, [key]: !value }))}
                className={`px-3 py-1 border-2 font-black uppercase text-sm transition-colors ${
                  value 
                    ? 'bg-white text-black border-white' 
                    : 'bg-black text-white border-white hover:bg-gray-800'
                }`}
              >
                {key.replace('show', '').toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Anime grid */}
      <div className={`grid ${shouldUseMobileLayout ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'} ${gridClasses.spacing}`}>
        {animeWithCharacters?.map((anime: AnimeEnrichmentData) => {
          if (!anime.characters) return null;
          
          const enrichmentStats = anime.characters.reduce((acc: {
            total: number;
            success: number;
            pending: number;
            failed: number;
            skipped: number;
          }, char: any) => {
            acc.total++;
            switch (char.enrichmentStatus) {
              case "success": acc.success++; break;
              case "pending": acc.pending++; break;
              case "failed": acc.failed++; break;
              case "skipped": acc.skipped++; break;
              default: acc.pending++; break;
            }
            return acc;
          }, { total: 0, success: 0, pending: 0, failed: 0, skipped: 0 });

          const enrichmentPercentage = enrichmentStats.total > 0 
            ? (enrichmentStats.success / enrichmentStats.total) * 100 
            : 0;

          return (
            <div key={anime._id} className={`bg-black border-4 border-white ${gridClasses.padding}`}>
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
                <div className="flex-1">
                  <h3 className={`font-black text-white mb-2 uppercase tracking-wider ${
                    shouldUseMobileLayout ? 'text-lg' : 'text-xl'
                  }`}>
                    {anime.title}
                  </h3>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="bg-blue-500 text-black px-2 py-1 text-xs font-black uppercase">
                      {enrichmentStats.total} CHARS
                    </span>
                    <span className="bg-green-500 text-black px-2 py-1 text-xs font-black uppercase">
                      {enrichmentStats.success} DONE
                    </span>
                    <span className="bg-yellow-500 text-black px-2 py-1 text-xs font-black uppercase">
                      {enrichmentStats.pending} PENDING
                    </span>
                    {enrichmentStats.failed > 0 && (
                      <span className="bg-red-500 text-black px-2 py-1 text-xs font-black uppercase">
                        {enrichmentStats.failed} FAILED
                      </span>
                    )}
                  </div>
                  
                  {/* Progress bar */}
                  <div className="bg-white h-2 mb-4">
                    <div 
                      className="bg-green-500 h-full transition-all duration-500"
                      style={{ width: `${enrichmentPercentage}%` }}
                    />
                  </div>
                  <p className="text-white text-sm font-bold">
                    {enrichmentPercentage.toFixed(1)}% ENRICHED
                  </p>
                </div>
                
                <div className="flex flex-col gap-2">
                  <StyledButton
                    onClick={() => handleEnrichAnime(anime._id, 5)}
                    className="px-4 py-2 text-sm font-black uppercase"
                    disabled={batchJobStatus.isRunning}
                  >
                    ENRICH 5
                  </StyledButton>
                  <StyledButton
                    onClick={() => handleEnrichAnime(anime._id, 10)}
                    className="px-4 py-2 text-sm font-black uppercase"
                    disabled={batchJobStatus.isRunning}
                  >
                    ENRICH 10
                  </StyledButton>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // Render batch jobs view
  const renderBatchJobs = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className={`bg-black border-4 border-white ${gridClasses.padding}`}>
        <h2 className={`font-black text-white uppercase tracking-wider mb-2 ${
          shouldUseMobileLayout ? 'text-xl' : 'text-3xl'
        }`}>
          BATCH ENRICHMENT OPERATIONS
        </h2>
        <p className={`text-white font-bold uppercase tracking-wide ${
          shouldUseMobileLayout ? 'text-sm' : 'text-base'
        }`}>
          BULK AI PROCESSING FOR MULTIPLE ANIME
        </p>
      </div>

      {/* Job Status */}
      {batchJobStatus.isRunning && (
        <div className={`bg-yellow-500 border-4 border-black text-black ${gridClasses.padding}`}>
          <h3 className="font-black text-2xl mb-4 uppercase">
            🚀 BATCH JOB RUNNING
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <div className="text-sm font-bold uppercase">PROCESSED</div>
              <div className="text-xl font-black">
                {batchJobStatus.progress.processedCharacters}/{batchJobStatus.progress.totalCharacters}
              </div>
            </div>
            <div>
              <div className="text-sm font-bold uppercase">SUCCESS</div>
              <div className="text-xl font-black text-green-700">
                {batchJobStatus.progress.succeededCharacters}
              </div>
            </div>
            <div>
              <div className="text-sm font-bold uppercase">FAILED</div>
              <div className="text-xl font-black text-red-700">
                {batchJobStatus.progress.failedCharacters}
              </div>
            </div>
            <div>
              <div className="text-sm font-bold uppercase">RUNTIME</div>
              <div className="text-xl font-black">
                {batchJobStatus.startTime 
                  ? Math.floor((Date.now() - batchJobStatus.startTime) / 1000)
                  : 0}s
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Batch Actions */}
      <div className={`grid ${shouldUseMobileLayout ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3'} ${gridClasses.spacing}`}>
        <div className={`bg-black border-4 border-white ${gridClasses.padding}`}>
          <h3 className="font-black text-white text-xl mb-4 uppercase">QUICK BATCH</h3>
          <p className="text-white mb-6 text-sm">Process 3 anime, 5 characters each</p>
          <StyledButton
            onClick={() => handleBatchEnrichment(3, 5)}
            disabled={batchJobStatus.isRunning}
            className="w-full"
          >
            START QUICK BATCH
          </StyledButton>
        </div>

        <div className={`bg-black border-4 border-white ${gridClasses.padding}`}>
          <h3 className="font-black text-white text-xl mb-4 uppercase">STANDARD BATCH</h3>
          <p className="text-white mb-6 text-sm">Process 5 anime, 10 characters each</p>
          <StyledButton
            onClick={() => handleBatchEnrichment(5, 10)}
            disabled={batchJobStatus.isRunning}
            className="w-full"
          >
            START STANDARD BATCH
          </StyledButton>
        </div>

        <div className={`bg-black border-4 border-white ${gridClasses.padding}`}>
          <h3 className="font-black text-white text-xl mb-4 uppercase">HEAVY BATCH</h3>
          <p className="text-white mb-6 text-sm">Process 10 anime, 15 characters each</p>
          <StyledButton
            onClick={() => handleBatchEnrichment(10, 15)}
            disabled={batchJobStatus.isRunning}
            className="w-full"
          >
            START HEAVY BATCH
          </StyledButton>
        </div>
      </div>
    </div>
  );

  // Navigation
  const renderNavigation = () => (
    <div className={`bg-white border-4 border-black ${gridClasses.padding} mb-6`}>
      <div className="flex flex-wrap gap-2">
        {[
          { key: "overview", label: "OVERVIEW", icon: "📊" },
          { key: "anime-list", label: "ANIME LIST", icon: "🎬" },
          { key: "batch-jobs", label: "BATCH JOBS", icon: "⚡" },
        ].map((nav) => (
          <button
            key={nav.key}
            onClick={() => setSelectedView(nav.key as any)}
            className={`flex items-center gap-2 px-4 py-2 border-2 font-black uppercase text-sm transition-colors ${
              selectedView === nav.key
                ? 'bg-black text-white border-black'
                : 'bg-white text-black border-black hover:bg-gray-100'
            }`}
          >
            <span>{nav.icon}</span>
            <span className={shouldUseMobileLayout ? 'hidden sm:inline' : ''}>{nav.label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="w-full">
      {renderNavigation()}
      
      {selectedView === "overview" && renderOverview()}
      {selectedView === "anime-list" && renderAnimeList()}
      {selectedView === "batch-jobs" && renderBatchJobs()}
    </div>
  );
};

export default CharacterEnrichmentPage;
