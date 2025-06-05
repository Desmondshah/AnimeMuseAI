// convex/externalApis.ts - Enhanced with Specialized API Actions

"use node";
import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";
import { ActionCtx } from "./_generated/server";

// NEW: Specialized API Result Interfaces
interface PosterFetchResult {
  success: boolean;
  posterUrl?: string;
  source: string;
  message: string;
  quality?: "low" | "medium" | "high" | "ultra";
}

interface ExternalApiResult {
  success: boolean;
  message: string;
  details?: any;
  source?: string;
}

interface EpisodeFetchResult {
  success: boolean;
  episodes: any[];
  totalEpisodes?: number;
  source: string;
  message: string;
}

interface MetadataFetchResult {
  success: boolean;
  metadata: Partial<Doc<"anime">>;
  source: string;
  message: string;
}

interface CharacterFetchResult {
  success: boolean;
  characters: any[];
  source: string;
  message: string;
}

interface ExternalApiResult {
  success: boolean;
  message: string;
  details?: any;
  source?: string;
}

// NEW: Specialized Action - Fetch High-Quality Poster from TMDB
export const fetchPosterFromTMDB = internalAction({
  args: { 
    title: v.string(),
    year: v.optional(v.number())
  },
  handler: async (ctx: ActionCtx, args): Promise<PosterFetchResult> => {
    if (!process.env.TMDB_API_KEY) {
      return {
        success: false,
        posterUrl: undefined,
        source: "tmdb",
        message: "TMDB API key not configured"
      };
    }

    try {
      console.log(`[TMDB Poster] Searching for: "${args.title}"`);
      
      // Clean title for better search results
      const cleanTitle = args.title
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      // Search for the anime/movie on TMDB
      const searchUrl = `https://api.themoviedb.org/3/search/multi?api_key=${process.env.TMDB_API_KEY}&query=${encodeURIComponent(cleanTitle)}`;
      
      const searchResponse = await fetch(searchUrl);
      if (!searchResponse.ok) {
        throw new Error(`TMDB search failed: ${searchResponse.status}`);
      }

      const searchData = await searchResponse.json();
      
      if (!searchData.results || searchData.results.length === 0) {
        return {
          success: false,
          posterUrl: undefined,
          source: "tmdb",
          message: `No results found for "${args.title}"`
        };
      }

      // Find the best match (prioritize exact year match if provided)
      let bestMatch = searchData.results[0];
      if (args.year) {
        const yearMatch = searchData.results.find((result: any) => {
          const resultYear = result.first_air_date ? 
            new Date(result.first_air_date).getFullYear() : 
            result.release_date ? new Date(result.release_date).getFullYear() : null;
          return resultYear !== null && Math.abs(resultYear - args.year!) <= 1; // Allow 1 year difference
        });
        if (yearMatch) bestMatch = yearMatch;
      }

      if (!bestMatch.poster_path) {
        return {
          success: false,
          posterUrl: undefined,
          source: "tmdb",
          message: "Match found but no poster available"
        };
      }

      // Get high-quality poster URL
      const posterUrl = `https://image.tmdb.org/t/p/w780${bestMatch.poster_path}`;
      
      // Verify the poster URL is accessible
      const posterResponse = await fetch(posterUrl, { method: 'HEAD' });
      if (!posterResponse.ok) {
        return {
          success: false,
          posterUrl: undefined,
          source: "tmdb",
          message: "Poster URL not accessible"
        };
      }

      console.log(`[TMDB Poster] ✅ Found high-quality poster for: "${args.title}"`);
      
      return {
        success: true,
        posterUrl,
        source: "tmdb",
        message: `High-quality poster found`,
        quality: "high"
      };

    } catch (error: any) {
      console.error(`[TMDB Poster] Error for "${args.title}":`, error.message);
      return {
        success: false,
        posterUrl: undefined,
        source: "tmdb",
        message: `TMDB fetch error: ${error.message}`
      };
    }
  }
});

// NEW: Specialized Action - Fetch Streaming Episodes from Consumet
export const fetchStreamingEpisodesFromConsumet = internalAction({
  args: { 
    title: v.string(),
    totalEpisodes: v.optional(v.number())
  },
  handler: async (ctx: ActionCtx, args): Promise<EpisodeFetchResult> => {
    try {
      console.log(`[Consumet Episodes] Searching for: "${args.title}"`);
      
      // Clean title for API search
      const cleanTitle = args.title
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      // Search using Consumet API (using gogoanime provider as example)
      const searchUrl = `https://api.consumet.org/anime/gogoanime/${encodeURIComponent(cleanTitle)}`;
      
      const searchResponse = await fetch(searchUrl, {
        headers: { 'User-Agent': 'AniMuse-App/1.0' }
      });

      if (!searchResponse.ok) {
        if (searchResponse.status === 404) {
          return {
            success: false,
            episodes: [],
            source: "consumet",
            message: `No anime found on Consumet for "${args.title}"`
          };
        }
        throw new Error(`Consumet search failed: ${searchResponse.status}`);
      }

      const searchData = await searchResponse.json();
      
      if (!searchData.results || searchData.results.length === 0) {
        return {
          success: false,
          episodes: [],
          source: "consumet",
          message: `No episodes found for "${args.title}"`
        };
      }

      // Get the first/best match
      const animeResult = searchData.results[0];
      
      if (!animeResult.id) {
        return {
          success: false,
          episodes: [],
          source: "consumet",
          message: "Invalid anime result from Consumet"
        };
      }

      // Fetch episode info for this anime
      const episodeUrl = `https://api.consumet.org/anime/gogoanime/info/${animeResult.id}`;
      const episodeResponse = await fetch(episodeUrl, {
        headers: { 'User-Agent': 'AniMuse-App/1.0' }
      });

      if (!episodeResponse.ok) {
        throw new Error(`Consumet episode fetch failed: ${episodeResponse.status}`);
      }

      const episodeData = await episodeResponse.json();
      
      if (!episodeData.episodes || !Array.isArray(episodeData.episodes)) {
        return {
          success: false,
          episodes: [],
          source: "consumet",
          message: "No episode data returned"
        };
      }

      // Map episodes to our format
      const episodes = episodeData.episodes.map((ep: any) => ({
        title: ep.title || `Episode ${ep.number || ep.id}`,
        thumbnail: ep.image || undefined,
        url: ep.url || undefined,
        site: "gogoanime",
      })).slice(0, 100); // Limit to 100 episodes

      console.log(`[Consumet Episodes] ✅ Found ${episodes.length} episodes for: "${args.title}"`);

      return {
        success: true,
        episodes,
        totalEpisodes: episodeData.totalEpisodes || episodes.length,
        source: "consumet",
        message: `Found ${episodes.length} streaming episodes`
      };

    } catch (error: any) {
      console.error(`[Consumet Episodes] Error for "${args.title}":`, error.message);
      return {
        success: false,
        episodes: [],
        source: "consumet",
        message: `Consumet fetch error: ${error.message}`
      };
    }
  }
});

// NEW: Specialized Action - Fetch Core Metadata from AniList
export const fetchCoreMetadataFromAniList = internalAction({
  args: { 
    title: v.string(),
    anilistId: v.optional(v.number())
  },
  handler: async (ctx: ActionCtx, args): Promise<MetadataFetchResult> => {
    const anilistQuery = `
      query ($search: String, $id: Int) {
        Media (search: $search, id: $id, type: ANIME, sort: SEARCH_MATCH) {
          id
          title { romaji english native }
          description (asHtml: false)
          startDate { year month day }
          endDate { year month day }
          season
          seasonYear
          episodes
          duration
          status
          genres
          synonyms
          averageScore
          meanScore
          popularity
          tags { id name description category rank }
          studios { edges { isMain node { id name isAnimationStudio } } }
          trailer { id site thumbnail }
          nextAiringEpisode { airingAt timeUntilAiring episode }
        }
      }
    `;

    const variables = args.anilistId ? { id: args.anilistId } : { search: args.title };

    try {
      console.log(`[AniList Metadata] Querying for: "${args.title}"`);
      
      const response = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ query: anilistQuery, variables })
      });

      if (!response.ok) {
        throw new Error(`AniList query failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.errors) {
        throw new Error(`AniList GraphQL errors: ${JSON.stringify(data.errors)}`);
      }

      if (!data?.data?.Media) {
        return {
          success: false,
          metadata: {},
          source: "anilist",
          message: `No metadata found for "${args.title}"`
        };
      }

      const media = data.data.Media;

      // Map the core metadata
      const metadata: Partial<Doc<"anime">> = {
        anilistId: media.id,
        description: media.description || undefined,
        year: media.startDate?.year || media.seasonYear || undefined,
        genres: media.genres?.length ? media.genres : undefined,
        rating: media.averageScore ? parseFloat((media.averageScore / 10).toFixed(1)) : undefined,
        totalEpisodes: media.episodes || undefined,
        episodeDuration: media.duration || undefined,
        airingStatus: media.status || undefined,
        trailerUrl: (media.trailer?.site === "youtube" && media.trailer?.id) ? 
          `https://www.youtube.com/watch?v=${media.trailer.id}` : undefined,
        nextAiringEpisode: media.nextAiringEpisode ? {
          airingAt: media.nextAiringEpisode.airingAt,
          episode: media.nextAiringEpisode.episode,
          timeUntilAiring: media.nextAiringEpisode.timeUntilAiring,
        } : undefined,
      };

      // Extract studios
      if (media.studios?.edges?.length) {
        const mainStudios = media.studios.edges
          .filter((e: any) => e.isMain)
          .map((e: any) => e.node.name)
          .filter(Boolean);
        if (mainStudios.length > 0) {
          metadata.studios = mainStudios;
        }
      }

      // Extract themes and emotional tags from tags
      if (media.tags?.length) {
        const themes = media.tags
          .filter((t: any) => t.category?.toLowerCase().includes('theme') || t.rank > 60)
          .map((t: any) => t.name)
          .filter(Boolean);
        
        const emotionalTags = media.tags
          .filter((t: any) => !t.category?.toLowerCase().includes('theme') && t.rank > 50)
          .map((t: any) => t.name)
          .filter(Boolean);

        if (themes.length > 0) metadata.themes = themes;
        if (emotionalTags.length > 0) metadata.emotionalTags = emotionalTags;
      }

      console.log(`[AniList Metadata] ✅ Found metadata for: "${args.title}" (ID: ${media.id})`);

      return {
        success: true,
        metadata,
        source: "anilist",
        message: `Core metadata fetched from AniList`
      };

    } catch (error: any) {
      console.error(`[AniList Metadata] Error for "${args.title}":`, error.message);
      return {
        success: false,
        metadata: {},
        source: "anilist",
        message: `AniList metadata error: ${error.message}`
      };
    }
  }
});

// NEW: Specialized Action - Fetch Character List from AniList
export const fetchCharacterListFromAniList = internalAction({
  args: { 
    title: v.string(),
    anilistId: v.optional(v.number())
  },
  handler: async (ctx: ActionCtx, args): Promise<CharacterFetchResult> => {
    const anilistQuery = `
      query ($search: String, $id: Int) {
        Media (search: $search, id: $id, type: ANIME, sort: SEARCH_MATCH) {
          id
          title { romaji english native }
          characters(sort: [ROLE, RELEVANCE, ID], page: 1, perPage: 25) {
            edges {
              role
              voiceActors {
                id
                name {
                  first
                  middle
                  last
                  full
                  native
                  userPreferred
                }
                image { large }
                languageV2
              }
              node {
                id
                name {
                  first
                  middle
                  last
                  full
                  native
                  userPreferred
                  alternative
                  alternativeSpoiler
                }
                image { large }
                description(asHtml: false)
                age
                gender
                bloodType
                dateOfBirth {
                  year
                  month
                  day
                }
                favourites
                siteUrl
              }
            }
          }
        }
      }
    `;

    const variables = args.anilistId ? { id: args.anilistId } : { search: args.title };

    try {
      console.log(`[AniList Characters] Querying for: "${args.title}"`);
      
      const response = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ query: anilistQuery, variables })
      });

      if (!response.ok) {
        throw new Error(`AniList query failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.errors) {
        throw new Error(`AniList GraphQL errors: ${JSON.stringify(data.errors)}`);
      }

      if (!data?.data?.Media?.characters?.edges) {
        return {
          success: false,
          characters: [],
          source: "anilist",
          message: `No characters found for "${args.title}"`
        };
      }

      const charactersEdges = data.data.Media.characters.edges;

      // Use the existing character mapping function
      const characters = mapCharacterData(charactersEdges);

      console.log(`[AniList Characters] ✅ Found ${characters.length} characters for: "${args.title}"`);

      return {
        success: true,
        characters,
        source: "anilist",
        message: `Found ${characters.length} characters`
      };

    } catch (error: any) {
      console.error(`[AniList Characters] Error for "${args.title}":`, error.message);
      return {
        success: false,
        characters: [],
        source: "anilist",
        message: `AniList character error: ${error.message}`
      };
    }
  }
});

// NEW: Best-of-Breed Poster Fetching with Multiple Sources
export const fetchBestQualityPoster = internalAction({
  args: { 
    title: v.string(),
    year: v.optional(v.number())
  },
  handler: async (ctx: ActionCtx, args): Promise<PosterFetchResult> => {
    console.log(`[Best Poster] Starting multi-source poster search for: "${args.title}"`);
    
    const sources: Promise<PosterFetchResult>[] = [];

    // Try TMDB first (highest quality)
    sources.push(
      ctx.runAction(internal.externalApis.fetchPosterFromTMDB, {
        title: args.title,
        year: args.year
      })
    );

    // Try AniList as backup
    sources.push(
      (async () => {
        const metadataResult = await ctx.runAction(internal.externalApis.fetchCoreMetadataFromAniList, {
          title: args.title
        });
        
        if (metadataResult.success && metadataResult.metadata.anilistId) {
          // Get poster from AniList using the existing function
          const anilistData = await fetchFromAnilist(args.title, metadataResult.metadata.anilistId);
          if (anilistData?.coverImage) {
            const posterUrl = selectBestImageUrl(anilistData.coverImage);
            if (posterUrl) {
              return {
                success: true,
                posterUrl,
                source: "anilist",
                message: "High-quality poster from AniList",
                quality: "medium" as const
              };
            }
          }
        }
        
        return {
          success: false,
          posterUrl: undefined,
          source: "anilist",
          message: "No poster found on AniList"
        };
      })()
    );

    try {
      // Use Promise.allSettled for resilience
      const results = await Promise.allSettled(sources);
      
      // Find the best successful result
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value.success) {
          console.log(`[Best Poster] ✅ Found poster from ${result.value.source} for: "${args.title}"`);
          return result.value;
        }
      }

      // If no sources succeeded, return the first error
      const firstError = results.find(r => r.status === 'fulfilled')?.value || {
        success: false,
        posterUrl: undefined,
        source: "multiple",
        message: "All poster sources failed"
      };

      return firstError as PosterFetchResult;

    } catch (error: any) {
      console.error(`[Best Poster] Error for "${args.title}":`, error.message);
      return {
        success: false,
        posterUrl: undefined,
        source: "multiple",
        message: `Multi-source poster fetch error: ${error.message}`
      };
    }
  }
});

// NEW: Public Actions for Manual Testing
export const callFetchPosterFromTMDB = action({
  args: { title: v.string(), year: v.optional(v.number()) },
  handler: async (ctx: ActionCtx, args): Promise<PosterFetchResult> => {
    return await ctx.runAction(internal.externalApis.fetchPosterFromTMDB, args);
  }
});

export const callFetchStreamingEpisodesFromConsumet = action({
  args: { title: v.string(), totalEpisodes: v.optional(v.number()) },
  handler: async (ctx: ActionCtx, args): Promise<EpisodeFetchResult> => {
    return await ctx.runAction(internal.externalApis.fetchStreamingEpisodesFromConsumet, args);
  }
});

export const callFetchCoreMetadataFromAniList = action({
  args: { title: v.string(), anilistId: v.optional(v.number()) },
  handler: async (ctx: ActionCtx, args): Promise<MetadataFetchResult> => {
    return await ctx.runAction(internal.externalApis.fetchCoreMetadataFromAniList, args);
  }
});

export const callFetchCharacterListFromAniList = action({
  args: { title: v.string(), anilistId: v.optional(v.number()) },
  handler: async (ctx: ActionCtx, args): Promise<CharacterFetchResult> => {
    return await ctx.runAction(internal.externalApis.fetchCharacterListFromAniList, args);
  }
});

export const callFetchBestQualityPoster = action({
  args: { title: v.string(), year: v.optional(v.number()) },
  handler: async (ctx: ActionCtx, args): Promise<PosterFetchResult> => {
    return await ctx.runAction(internal.externalApis.fetchBestQualityPoster, args);
  }
});

// Helper functions (keeping existing ones and adding new ones)
const getString = (obj: any, path: string, defaultValue?: string): string | undefined => {
    const value = path.split('.').reduce((o, p) => (o && o[p] !== undefined && o[p] !== null) ? o[p] : undefined, obj);
    if (value === undefined || value === null) return defaultValue;
    return String(value);
};

const selectBestImageUrl = (images: any): string | undefined => {
    if (!images) return undefined;
    
    // AniList image priority: extraLarge > large > medium
    if (images.extraLarge) return images.extraLarge;
    if (images.large) return images.large;
    if (images.medium) return images.medium;
    
    return undefined;
};

const fetchFromAnilist = async (title: string, existingAnilistId?: number): Promise<any | null> => {
    // This is a simplified version of the existing function for poster fetching
    const anilistQuery = `
      query ($search: String, $id: Int) {
        Media (search: $search, id: $id, type: ANIME, sort: SEARCH_MATCH) {
          id
          title { romaji english native }
          coverImage { 
            extraLarge 
            large 
            medium 
          }
        }
      }
    `;
    
    const variables = existingAnilistId ? { id: existingAnilistId } : { search: title };
    
    try {
        const response = await fetch('https://graphql.anilist.co', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ query: anilistQuery, variables })
        });
        
        if (!response.ok) return null;
        
        const data = await response.json();
        return data?.data?.Media;
    } catch (error) {
        return null;
    }
};

const mapCharacterData = (charactersEdges: any[]): any[] => {
  if (!Array.isArray(charactersEdges)) return [];
  
  return charactersEdges
    .filter(edge => edge && edge.node && edge.node.name && edge.node.name.full)
    .map(edge => {
      const character = edge.node;
      const voiceActors = edge.voiceActors || [];
      
      // Extract additional info from description
      const description = character.description || "";
      const powersAbilities = extractPowersFromDescription(description);
      const weapons = extractWeaponsFromDescription(description);
      const species = extractSpeciesFromDescription(description);
      
      return {
        id: character.id || undefined,
        name: character.name.full || character.name.userPreferred,
        imageUrl: character.image?.large || undefined,
        role: edge.role || "BACKGROUND",
        
        // Enhanced details
        description: description || undefined,
        status: extractStatusFromDescription(description),
        gender: character.gender || undefined,
        age: character.age || undefined,
        
        dateOfBirth: character.dateOfBirth ? {
          year: character.dateOfBirth.year || undefined,
          month: character.dateOfBirth.month || undefined,
          day: character.dateOfBirth.day || undefined,
        } : undefined,
        
        bloodType: character.bloodType || undefined,
        height: extractHeightFromDescription(description),
        weight: extractWeightFromDescription(description),
        species: species || "Human",
        
        powersAbilities: powersAbilities.length > 0 ? powersAbilities : undefined,
        weapons: weapons.length > 0 ? weapons : undefined,
        
        nativeName: character.name.native || undefined,
        siteUrl: character.siteUrl || undefined,
        
        voiceActors: voiceActors.map((va: any) => ({
          id: va.id || undefined,
          name: va.name?.full || va.name?.userPreferred || "Unknown",
          language: va.languageV2 || "Unknown",
          imageUrl: va.image?.large || undefined,
        })).filter((va: any) => va.name !== "Unknown"),
        
        relationships: undefined, // Would need separate API calls
      };
    })
    .slice(0, 25); // Limit to prevent overwhelming storage
};

// Helper functions for character data extraction
const extractPowersFromDescription = (description: string): string[] => {
  const powerKeywords = ['power', 'ability', 'magic', 'skill', 'technique', 'jutsu', 'quirk'];
  const powers: string[] = [];
  
  powerKeywords.forEach(keyword => {
    const regex = new RegExp(`(${keyword}[^.!?]*[.!?])`, 'gi');
    const matches = description.match(regex);
    if (matches) {
      powers.push(...matches.map(match => match.trim()));
    }
  });
  
  return [...new Set(powers)].slice(0, 5);
};

const extractWeaponsFromDescription = (description: string): string[] => {
  const weaponKeywords = ['sword', 'blade', 'gun', 'weapon', 'staff', 'bow', 'arrow', 'katana'];
  const weapons: string[] = [];
  
  weaponKeywords.forEach(keyword => {
    if (description.toLowerCase().includes(keyword)) {
      weapons.push(keyword);
    }
  });
  
  return [...new Set(weapons)];
};

const extractSpeciesFromDescription = (description: string): string | undefined => {
  const speciesKeywords = ['demon', 'angel', 'elf', 'dwarf', 'vampire', 'werewolf', 'dragon', 'robot', 'android'];
  
  for (const species of speciesKeywords) {
    if (description.toLowerCase().includes(species)) {
      return species.charAt(0).toUpperCase() + species.slice(1);
    }
  }
  
  return undefined;
};

const extractStatusFromDescription = (description: string): string | undefined => {
  if (description.toLowerCase().includes('dead') || description.toLowerCase().includes('died')) {
    return "Deceased";
  }
  if (description.toLowerCase().includes('alive')) {
    return "Alive";
  }
  return undefined;
};

const extractHeightFromDescription = (description: string): string | undefined => {
  const heightRegex = /(\d+(?:\.\d+)?)\s*(?:cm|centimeters?|meters?|m|feet?|ft|'|inches?|in|")/gi;
  const match = description.match(heightRegex);
  return match ? match[0] : undefined;
};

const extractWeightFromDescription = (description: string): string | undefined => {
  const weightRegex = /(\d+(?:\.\d+)?)\s*(?:kg|kilograms?|lbs?|pounds?)/gi;
  const match = description.match(weightRegex);
  return match ? match[0] : undefined;
};

export const triggerFetchExternalAnimeDetails = internalAction({
  args: {
    animeIdInOurDB: v.id("anime"),
    titleToSearch: v.string()
  },
  handler: async (ctx, args): Promise<{ success: boolean; message: string }> => {
    try {
      console.log(`[External API] Triggering comprehensive data fetch for: ${args.titleToSearch}`);
      
      // Get the anime first to check what we already have
      const anime = await ctx.runQuery(internal.anime.getAnimeByIdInternal, { 
        animeId: args.animeIdInOurDB 
      });
      
      if (!anime) {
        return { success: false, message: "Anime not found in database" };
      }

      // Fetch metadata from AniList
      const metadataResult = await ctx.runAction(internal.externalApis.fetchCoreMetadataFromAniList, {
        title: args.titleToSearch,
        anilistId: anime.anilistId
      });

      // Fetch poster if needed
      const posterResult = await ctx.runAction(internal.externalApis.fetchBestQualityPoster, {
        title: args.titleToSearch,
        year: anime.year
      });

      // Fetch streaming episodes
      const episodeResult = await ctx.runAction(internal.externalApis.fetchStreamingEpisodesFromConsumet, {
        title: args.titleToSearch,
        totalEpisodes: anime.totalEpisodes
      });

      // Fetch character data
      const charactersResult = await ctx.runAction(internal.externalApis.fetchCharacterListFromAniList, {
        title: args.titleToSearch,
        anilistId: anime.anilistId
      });

      // Prepare updates
      let updates: any = {};
      let dataChanged = false;

      if (metadataResult.success) {
        updates = { ...updates, ...metadataResult.metadata };
        dataChanged = true;
      }

      if (posterResult.success && posterResult.posterUrl) {
        updates.posterUrl = posterResult.posterUrl;
        dataChanged = true;
      }

      if (episodeResult.success && episodeResult.episodes.length > 0) {
        updates.streamingEpisodes = episodeResult.episodes;
        updates.totalEpisodes = episodeResult.totalEpisodes;
        dataChanged = true;
      }

      if (charactersResult.success && charactersResult.characters.length > 0) {
        updates.characters = charactersResult.characters;
        dataChanged = true;
      }

      // Apply updates if we have any
      if (dataChanged && Object.keys(updates).length > 0) {
        await ctx.runMutation(internal.anime.updateAnimeWithExternalData, {
          animeId: args.animeIdInOurDB,
          updates,
          sourceApi: "comprehensive"
        });
      }

      const message = dataChanged 
        ? `Successfully updated ${Object.keys(updates).length} fields`
        : "No new data found";

      return { success: true, message };

    } catch (error: any) {
      console.error(`[External API] Error in triggerFetchExternalAnimeDetails:`, error);
      return { success: false, message: error.message || "Unknown error" };
    }
  }
});

// Missing function: enhanceExistingAnimePostersBetter
export const enhanceExistingAnimePostersBetter = internalAction({
  args: {
    maxToProcess: v.optional(v.number()),
    prioritizeNew: v.optional(v.boolean())
  },
  handler: async (ctx, args): Promise<{ processed: number; enhanced: number; errors: number }> => {
    const maxToProcess = args.maxToProcess || 20;
    const prioritizeNew = args.prioritizeNew || false;
    
    console.log(`[Poster Enhancement] Starting batch poster enhancement (max: ${maxToProcess})`);
    
    try {
      // Get all anime from database
      const allAnime = await ctx.runQuery(internal.anime.getAllAnimeInternal, {});
      
      // Filter anime that need better posters
      const animeMissingPosters = allAnime
        .filter(anime => {
          const needsBetterPoster = !anime.posterUrl || 
                                  anime.posterUrl.includes('placehold.co') ||
                                  anime.posterUrl.includes('placeholder');
          
          if (prioritizeNew && anime.lastFetchedFromExternal) {
            const daysSinceLastFetch = (Date.now() - anime.lastFetchedFromExternal.timestamp) / (24 * 60 * 60 * 1000);
            return needsBetterPoster && daysSinceLastFetch > 7;
          }
          
          return needsBetterPoster;
        })
        .slice(0, maxToProcess);

      let processed = 0;
      let enhanced = 0;
      let errors = 0;

      // Process in batches of 3 to avoid overwhelming APIs
      const batchSize = 3;
      
      for (let i = 0; i < animeMissingPosters.length; i += batchSize) {
        const batch = animeMissingPosters.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (anime) => {
          try {
            processed++;
            
            const posterResult = await ctx.runAction(internal.externalApis.fetchBestQualityPoster, {
              title: anime.title,
              year: anime.year
            });

            if (posterResult.success && posterResult.posterUrl) {
              await ctx.runMutation(internal.anime.updateAnimeWithExternalData, {
                animeId: anime._id,
                updates: { posterUrl: posterResult.posterUrl },
                sourceApi: posterResult.source
              });
              enhanced++;
              console.log(`[Poster Enhancement] ✅ Enhanced poster for: ${anime.title}`);
            }
          } catch (error: any) {
            errors++;
            console.error(`[Poster Enhancement] ❌ Error for ${anime.title}:`, error.message);
          }
        });

        await Promise.all(batchPromises);

        // Rate limiting between batches
        if (i + batchSize < animeMissingPosters.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      console.log(`[Poster Enhancement] Complete! Processed: ${processed}, Enhanced: ${enhanced}, Errors: ${errors}`);
      return { processed, enhanced, errors };

    } catch (error: any) {
      console.error(`[Poster Enhancement] Batch error:`, error);
      return { processed: 0, enhanced: 0, errors: 1 };
    }
  }
});

// Missing function: batchUpdateEpisodeDataForAllAnime
export const batchUpdateEpisodeDataForAllAnime = internalAction({
  args: {
    batchSize: v.optional(v.number()),
    maxAnimeToProcess: v.optional(v.number())
  },
  handler: async (ctx, args): Promise<{ processed: number; updated: number; errors: number }> => {
    const batchSize = args.batchSize || 5;
    const maxAnimeToProcess = args.maxAnimeToProcess || 30;
    
    console.log(`[Episode Data Batch] Starting batch episode update (max: ${maxAnimeToProcess}, batch: ${batchSize})`);
    
    try {
      // Get all anime from database
      const allAnime = await ctx.runQuery(internal.anime.getAllAnimeInternal, {});
      
      // Filter anime that need episode data
      const animeMissingEpisodes = allAnime
        .filter(anime => {
          const hasNoEpisodes = !anime.streamingEpisodes || anime.streamingEpisodes.length === 0;
          const isFinished = anime.airingStatus === "FINISHED" || !anime.airingStatus;
          const isReleasing = anime.airingStatus === "RELEASING";
          
          // Prioritize finished anime without episodes, or releasing anime
          return hasNoEpisodes && (isFinished || isReleasing);
        })
        .sort((a, b) => {
          // Prioritize releasing anime, then by popularity (rating)
          if (a.airingStatus === "RELEASING" && b.airingStatus !== "RELEASING") return -1;
          if (b.airingStatus === "RELEASING" && a.airingStatus !== "RELEASING") return 1;
          return (b.rating || 0) - (a.rating || 0);
        })
        .slice(0, maxAnimeToProcess);

      let processed = 0;
      let updated = 0;
      let errors = 0;

      // Process in specified batch sizes
      for (let i = 0; i < animeMissingEpisodes.length; i += batchSize) {
        const batch = animeMissingEpisodes.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (anime) => {
          try {
            processed++;
            
            const episodeResult = await ctx.runAction(internal.externalApis.fetchStreamingEpisodesFromConsumet, {
              title: anime.title,
              totalEpisodes: anime.totalEpisodes
            });

            if (episodeResult.success && episodeResult.episodes.length > 0) {
              await ctx.runMutation(internal.anime.updateAnimeWithExternalData, {
                animeId: anime._id,
                updates: { 
                  streamingEpisodes: episodeResult.episodes,
                  totalEpisodes: episodeResult.totalEpisodes
                },
                sourceApi: episodeResult.source
              });
              updated++;
              console.log(`[Episode Data Batch] ✅ Updated episodes for: ${anime.title} (${episodeResult.episodes.length} episodes)`);
            } else {
              console.log(`[Episode Data Batch] ⚠️ No episodes found for: ${anime.title}`);
            }
          } catch (error: any) {
            errors++;
            console.error(`[Episode Data Batch] ❌ Error for ${anime.title}:`, error.message);
          }
        });

        await Promise.all(batchPromises);

        // Rate limiting between batches
        if (i + batchSize < animeMissingEpisodes.length) {
          console.log(`[Episode Data Batch] Waiting 3 seconds before next batch...`);
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }

      console.log(`[Episode Data Batch] Complete! Processed: ${processed}, Updated: ${updated}, Errors: ${errors}`);
      return { processed, updated, errors };

    } catch (error: any) {
      console.error(`[Episode Data Batch] Batch error:`, error);
      return { processed: 0, updated: 0, errors: 1 };
    }
  }
});