import { describe, it, expect } from 'vitest';
import {
	normalizeTitle,
	isRomanizedJapanese,
	extractSeasonInfo,
	stringSimilarity,
	generateAnimeKey,
	areDuplicateAnime,
	calculateEntryQuality,
	selectPrimaryEntry,
	consolidateSeasons,
	deduplicateNewApiData,
} from './deduplicationUtils';

describe('deduplicationUtils', () => {
	it('normalizeTitle strips punctuation, case, and season markers', () => {
		const raw = 'Naruto: Shippuden (Season 2)!';
		const norm = normalizeTitle(raw);
		expect(norm).toBe('naruto shippuden');
	});

	it('isRomanizedJapanese detects romanized patterns', () => {
		expect(isRomanizedJapanese('Boku no Hero Academia')).toBe(true);
		expect(isRomanizedJapanese('My Hero Academia')).toBe(false);
	});

	it('extractSeasonInfo parses season numbers and labels', () => {
		const a = extractSeasonInfo('Attack on Titan Season 3');
		expect(a.baseTitle).toBe('attack on titan');
		expect(a.season).toBe(3);
		const b = extractSeasonInfo('Naruto Shippuden');
		expect(b.baseTitle).toBe('naruto');
		expect(b.label?.toLowerCase()).toContain('shippuden');
	});

		it('stringSimilarity gives 1 for equal, reasonable score for near matches', () => {
		expect(stringSimilarity('One Piece', 'One Piece')).toBe(1);
			expect(stringSimilarity('One Piece', 'One Peace')).toBeGreaterThan(0.7);
	});

	it('generateAnimeKey prefers external IDs', () => {
		expect(generateAnimeKey({ title: 'X', mal_id: 123 } as any)).toBe('mal:123');
		expect(generateAnimeKey({ title: 'X', anilist_id: 42 } as any)).toBe('al:42');
		expect(generateAnimeKey({ title: 'Naruto Shippuden' } as any)).toBe('t:naruto');
	});

	it('areDuplicateAnime matches by IDs and fuzzy titles', () => {
		const byIdA = { title: 'Foo', mal_id: 1 } as any;
		const byIdB = { title: 'Bar', mal_id: 1 } as any;
		expect(areDuplicateAnime(byIdA, byIdB)).toBe(true);
		const romaji = { title: 'Boku no Hero Academia', year: 2016 } as any;
		const english = { title: 'My Hero Academia', year: 2016 } as any;
		expect(areDuplicateAnime(romaji, english)).toBe(true);
	});

	it('selectPrimaryEntry prefers richer metadata and English titles', () => {
		const a = { title: 'Boku no Hero Academia', year: 2016 } as any;
		const b = { title: 'My Hero Academia', title_english: 'My Hero Academia', year: 2016, anilist_id: 10 } as any;
		const best = selectPrimaryEntry([a, b]);
		expect(best).toBe(b);
		expect(calculateEntryQuality(b)).toBeGreaterThan(calculateEntryQuality(a));
	});

	it('consolidateSeasons groups into a single consolidated entry', () => {
		const list = [
			{ title: 'Attack on Titan', year: 2013, episodes: 25 },
			{ title: 'Attack on Titan Season 2', year: 2017, episodes: 12 },
			{ title: 'Attack on Titan Season 3', year: 2018, episodes: 22 },
		] as any;
		const consolidated = consolidateSeasons(list);
		expect(consolidated).toHaveLength(1);
		expect(consolidated[0].consolidated).toBe(true);
		expect(consolidated[0].seasons?.length).toBe(3);
	});

	it('deduplicateNewApiData merges by external IDs and consolidates', () => {
		const list = [
			{ title: 'Naruto', mal_id: 20, year: 2002 },
			{ title: 'Naruto (TV)', mal_id: 20, year: 2002 },
			{ title: 'Naruto Shippuden', year: 2007 },
		] as any;
		const out = deduplicateNewApiData(list);
		// Two series: Naruto/NS consolidated into one
		expect(out).toHaveLength(1);
		expect(out[0].consolidated).toBe(true);
		expect(out[0].seasons?.length).toBeGreaterThanOrEqual(2);
	});
});
