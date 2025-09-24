import type { Doc, Id } from "./_generated/dataModel";

// Lightweight types used by utilities (mirrors user request)
export type MinimalAnime = {
  _id?: Id<"anime">;
  title: string;
  title_english?: string;
  title_romaji?: string;
  alternateTitles?: string[];
  episodes?: number;
  totalEpisodes?: number;
  year?: number;
  mal_id?: number; // external payload
  myAnimeListId?: number; // in DB
  anilist_id?: number; // external payload
  anilistId?: number; // in DB
  type?: string; // TV/Movie/OVA
  genres?: string[];
  consolidated?: boolean;
  seasons?: Array<{ season?: number; label?: string; episodes?: number; year?: number; anilistId?: number; myAnimeListId?: number }>;
};

// Normalize title for comparisons
export function normalizeTitle(raw?: string): string {
  if (!raw) return "";
  return raw
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u3000]/g, " ") // Japanese full-width space
    .replace(/[^\p{L}\p{N}\s]/gu, " ") // keep letters/numbers/spaces
    .replace(/\b(tv|ova|ona|movie|special)\b/g, " ")
    .replace(/season\s*\d+|s\d+|part\s*\d+|cour\s*\d+|final season/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Detect romanized Japanese characteristics
const romanizedParticles = ["no", "wa", "ga", "wo", "ni", "de", "to", "kara", "made", "ya", "mo", "sa", "yo", "desu", "sama", "kun", "chan"]; 
const romanizedPatterns = [/\b(boku|ore|watashi|kimi|anata)\b/i, /-kun\b/i, /-chan\b/i, /-sama\b/i, /shoujo|shonen|senpai|kouhai/i];

export function isRomanizedJapanese(title?: string): boolean {
  if (!title) return false;
  const t = title.toLowerCase();
  const tokens = t.split(/\s+/);
  const particleHits = tokens.filter(tok => romanizedParticles.includes(tok)).length;
  const patternHit = romanizedPatterns.some(r => r.test(t));
  // Avoid over-broad vowel ratio heuristic; rely on particles/suffix patterns only
  return particleHits >= 1 || patternHit;
}

// Extract season number/label from a title
export function extractSeasonInfo(title: string): { baseTitle: string; season?: number; label?: string } {
  const original = title;
  let season: number | undefined;
  let label: string | undefined;
  // Common patterns: Season 2, S2, Part 3, Final Season, Shippuden
  const patterns: Array<[RegExp, (m: RegExpMatchArray) => void]> = [
    [/season\s*(\d+)/i, (m) => { season = parseInt(m[1], 10); }],
    [/\bS(\d+)\b/i, (m) => { season = parseInt(m[1], 10); }],
    [/part\s*(\d+)/i, (m) => { season = parseInt(m[1], 10); label = `Part ${m[1]}`; }],
    [/final\s*season/i, () => { label = "Final Season"; }],
    [/shippuden/i, () => { label = "Shippuden"; season = season ?? 2; }],
  ];
  let cleaned = original;
  for (const [regex, apply] of patterns) {
    const m = cleaned.match(regex);
    if (m) {
      apply(m as any);
      cleaned = cleaned.replace(regex, " ");
    }
  }
  const baseTitle = normalizeTitle(cleaned);
  return { baseTitle, season, label };
}

// Fuzzy similarity using normalized Levenshtein (lightweight implementation)
export function stringSimilarity(a: string, b: string): number {
  const s1 = normalizeTitle(a);
  const s2 = normalizeTitle(b);
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1;
  const d: number[][] = Array.from({ length: s1.length + 1 }, (_, i) => Array(s2.length + 1).fill(0));
  for (let i = 0; i <= s1.length; i++) d[i][0] = i;
  for (let j = 0; j <= s2.length; j++) d[0][j] = j;
  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + cost
      );
    }
  }
  const dist = d[s1.length][s2.length];
  const maxLen = Math.max(s1.length, s2.length);
  return 1 - dist / maxLen;
}

// Tokenize core content for Jaccard-style comparison
function coreTokens(s: string): string[] {
  const stop = new Set([
    "the","a","an","of","and","or","my","your","our","his","her","their","on","in","no","wa","ga","wo","ni","de","to","kara","made","ya","mo","sa","yo","season","part","final","shippuden"
  ]);
  return normalizeTitle(s)
    .split(/\s+/)
    .filter(t => t && !stop.has(t) && !/^s\d+$/i.test(t) && !/^\d+$/.test(t));
}

// Generate consistent matching key
export function generateAnimeKey(anime: MinimalAnime): string {
  // Prefer external IDs when present
  const mal = anime.myAnimeListId ?? anime.mal_id;
  const al = anime.anilistId ?? anime.anilist_id;
  if (mal) return `mal:${mal}`;
  if (al) return `al:${al}`;
  const { baseTitle } = extractSeasonInfo(anime.title_english || anime.title || anime.title_romaji || "");
  return `t:${baseTitle}`;
}

// Decide duplicates with multi-signal logic
export function areDuplicateAnime(a: MinimalAnime, b: MinimalAnime): boolean {
  // 1) External IDs
  const malMatch = (a.myAnimeListId ?? a.mal_id) && (a.myAnimeListId ?? a.mal_id) === (b.myAnimeListId ?? b.mal_id);
  const alMatch = (a.anilistId ?? a.anilist_id) && (a.anilistId ?? a.anilist_id) === (b.anilistId ?? b.anilist_id);
  if (malMatch || alMatch) return true;

  // 2) Title similarity with romanization awareness
  const aTitles = [a.title, a.title_english, a.title_romaji, ...(a.alternateTitles || [])].filter(Boolean) as string[];
  const bTitles = [b.title, b.title_english, b.title_romaji, ...(b.alternateTitles || [])].filter(Boolean) as string[];
  for (const at of aTitles) {
    for (const bt of bTitles) {
      const sim = stringSimilarity(at, bt);
      if (sim >= 0.92) return true;
      // Allow slightly lower threshold when one looks romanized
  if (sim >= 0.86 && (isRomanizedJapanese(at) || isRomanizedJapanese(bt))) return true;

  // Token Jaccard fallback to bridge romaji vs localized (e.g., Boku no vs My)
  const ta = new Set(coreTokens(at));
  const tb = new Set(coreTokens(bt));
  const union = new Set([...ta, ...tb]);
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  const jaccard = union.size ? inter / union.size : 0;
  if (jaccard >= 0.6 && (ta.size >= 2 || tb.size >= 2)) return true;
    }
  }

  // 3) Metadata agreement: episodes/year/type
  const epA = a.totalEpisodes ?? a.episodes;
  const epB = b.totalEpisodes ?? b.episodes;
  const episodesClose = typeof epA === 'number' && typeof epB === 'number' && Math.abs(epA - epB) <= 1;
  const yearClose = typeof a.year === 'number' && typeof b.year === 'number' && Math.abs(a.year - b.year) <= 1;
  if ((episodesClose && yearClose) || (episodesClose && (a.type && a.type === b.type))) {
    // Require some title similarity as well
  const sim = stringSimilarity(a.title, b.title);
  if (sim >= 0.8) return true;
  }

  return false;
}

// Preference scoring to select primary entry
export function calculateEntryQuality(anime: MinimalAnime): number {
  let score = 0;
  // Prefer official English title present
  if (anime.title_english && !isRomanizedJapanese(anime.title_english)) score += 30;
  // Prefer more metadata
  if (anime.totalEpisodes || anime.episodes) score += 10;
  if (anime.year) score += 5;
  if (anime.genres?.length) score += 5;
  if (anime.anilistId || anime.myAnimeListId) score += 20;
  // Penalize long romanized titles
  if (isRomanizedJapanese(anime.title) && (!anime.title_english || anime.title_english.length > anime.title.length)) score -= 5;
  // Prefer shortest clean romanized title if no English
  if (!anime.title_english && isRomanizedJapanese(anime.title)) score += Math.max(0, 10 - (anime.title.length / 10));
  return score;
}

export function selectPrimaryEntry(group: MinimalAnime[]): MinimalAnime {
  return group
    .slice()
    .sort((a, b) => calculateEntryQuality(b) - calculateEntryQuality(a))
    [0];
}

// Choose preferred display title based on project rules
export function pickPreferredTitle(anime: MinimalAnime): string {
  // 1) Official English title
  if (anime.title_english && !isRomanizedJapanese(anime.title_english)) return anime.title_english;
  // 2) English-looking title not romanized
  const candidates = [anime.title, anime.title_romaji, ...(anime.alternateTitles || [])].filter(Boolean) as string[];
  const englishish = candidates.filter(t => /[a-z]/i.test(t) && !isRomanizedJapanese(t));
  if (englishish.length) {
    // prefer shorter
    englishish.sort((a, b) => a.length - b.length);
    return englishish[0];
  }
  // 3) Shortest clean romanized title
  const romanized = candidates.filter(t => isRomanizedJapanese(t));
  if (romanized.length) {
    romanized.sort((a, b) => normalizeTitle(a).length - normalizeTitle(b).length);
    return romanized[0];
  }
  // 4) Fallback to title
  return anime.title;
}

// Season consolidation
export function consolidateSeasons(animeArray: MinimalAnime[]): MinimalAnime[] {
  // Group by base title key
  const groups = new Map<string, MinimalAnime[]>();
  for (const a of animeArray) {
    const { baseTitle } = extractSeasonInfo(a.title_english || a.title);
    const key = `series:${baseTitle}`;
    const arr = groups.get(key) || [];
    arr.push(a);
    groups.set(key, arr);
  }

  const result: MinimalAnime[] = [];
  for (const [key, list] of groups.entries()) {
    if (list.length === 1) {
      result.push({ ...list[0], consolidated: list[0].consolidated ?? false, seasons: list[0].seasons });
      continue;
    }
    // Sort by year then season
    const sorted = list.slice().sort((a, b) => (a.year || 0) - (b.year || 0));
    const primary = selectPrimaryEntry(sorted);
    const seasons: MinimalAnime["seasons"] = [];
    for (const item of sorted) {
      const { season, label } = extractSeasonInfo(item.title);
      seasons.push({
        season,
        label,
        episodes: item.totalEpisodes ?? item.episodes,
        year: item.year,
        anilistId: item.anilistId ?? item.anilist_id,
        myAnimeListId: item.myAnimeListId ?? item.mal_id,
      });
    }
    result.push({
      ...primary,
      consolidated: true,
      seasons: seasons.sort((a, b) => (a.season ?? 99) - (b.season ?? 99)),
    });
  }
  return result;
}

// Deduplicate array of new API data
export function deduplicateNewApiData(newAnimeArray: MinimalAnime[]): MinimalAnime[] {
  const seen = new Map<string, MinimalAnime>();
  for (const a of newAnimeArray) {
    const key = generateAnimeKey(a);
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, a);
    } else {
      // Merge simple metadata preference
      const better = calculateEntryQuality(a) >= calculateEntryQuality(existing) ? a : existing;
      const other = better === a ? existing : a;
      // Merge alt titles
      const alt = new Set<string>([...(better.alternateTitles || []), ...(other.alternateTitles || [])]);
      if (other.title && other.title !== better.title) alt.add(other.title);
      if (other.title_english) alt.add(other.title_english);
      if (other.title_romaji) alt.add(other.title_romaji);
      better.alternateTitles = Array.from(alt);
      seen.set(key, better);
    }
  }
  // Also run season consolidation per series key
  return consolidateSeasons(Array.from(seen.values()));
}

// Find duplicate groups within existing DB list
export function findAllDuplicateGroups(existing: MinimalAnime[]): MinimalAnime[][] {
  const groups: MinimalAnime[][] = [];
  const visited = new Set<number>();
  for (let i = 0; i < existing.length; i++) {
    if (visited.has(i)) continue;
    const a = existing[i];
    const group = [a];
    for (let j = i + 1; j < existing.length; j++) {
      if (visited.has(j)) continue;
      const b = existing[j];
      if (areDuplicateAnime(a, b)) {
        group.push(b);
        visited.add(j);
      }
    }
    visited.add(i);
    if (group.length > 1) groups.push(group);
  }
  return groups;
}

// Export Convex args validators for action inputs, if needed elsewhere
export default {
  normalizeTitle,
  isRomanizedJapanese,
  extractSeasonInfo,
  stringSimilarity,
  generateAnimeKey,
  areDuplicateAnime,
  calculateEntryQuality,
  selectPrimaryEntry,
  pickPreferredTitle,
  consolidateSeasons,
  deduplicateNewApiData,
  findAllDuplicateGroups,
};
