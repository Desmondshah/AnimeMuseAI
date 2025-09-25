import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

const SECTION_LABELS: Record<string,string> = {
	popular_now: 'Popular Now',
	top_rated: 'Top Rated',
	bingeworthy: 'Bingeworthy',
	retro_classics: 'Retro Classics',
};

const AdminHomeSectionsManager: React.FC = () => {
	const [activeSection, setActiveSection] = useState<string>('popular_now');
	const DISPLAY_LIMIT = 8; // homepage shows exactly 8 items per section
	// Base sections now only provide ids
	const sections = useQuery(api.homeSections.getHomeSections, {});
	// Fetch detailed lightweight summaries for current section
	const sectionSummaries = useQuery(api.homeSections.getSectionSummaries, sections && sections[activeSection] ? { sectionKey: activeSection } : "skip");
	const updateOrdering = useMutation(api.homeSections.updateHomeSectionOrdering);
	const [localOrder, setLocalOrder] = useState<string[]>([]);
	const [status, setStatus] = useState<string>('');

	// Load initial order when section changes
	useEffect(() => {
		if (sections && sections[activeSection]) {
			const ids = (sections[activeSection].animeIds || sections[activeSection].anime || []); // backwards compatibility
			setLocalOrder(ids as string[]);
		}
	}, [sections, activeSection]);

	const swap = (indexA: number, indexB: number) => {
		setLocalOrder(prev => {
			const arr = [...prev];
			if (indexA < 0 || indexB < 0 || indexA >= arr.length || indexB >= arr.length) return arr;
			const tmp = arr[indexA];
			arr[indexA] = arr[indexB];
			arr[indexB] = tmp;
			return arr;
		});
	};

	const save = async () => {
		try {
			await updateOrdering({ sectionKey: activeSection, animeIds: localOrder as any });
			setStatus('Saved');
			setTimeout(()=> setStatus(''), 2000);
		} catch (e:any) {
			setStatus(e.message || 'Error');
		}
	};

	const currentAnime = sectionSummaries ? (sectionSummaries.anime || []) : [];
	// Map order to anime objects preserving order using summaries
	const orderedAnimeFull = localOrder.map(id => currentAnime.find((a: any) => a._id === id)).filter(Boolean);
	const orderedAnime = orderedAnimeFull.slice(0, DISPLAY_LIMIT);

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap gap-2">
				{Object.keys(SECTION_LABELS).map(key => (
					<button
						key={key}
						onClick={() => setActiveSection(key)}
						className={`px-4 py-2 border-4 font-black uppercase tracking-wide text-sm ${
							activeSection === key ? 'bg-white text-black border-black' : 'bg-black text-white border-white'
						}`}
					>{SECTION_LABELS[key]}</button>
				))}
			</div>

			<div className="bg-black border-4 border-white p-4">
			<h2 className="text-2xl font-black uppercase tracking-wider mb-1">{SECTION_LABELS[activeSection]} Order</h2>
			<div className="text-xs font-bold uppercase mb-4 text-white/70">Showing the exact {orderedAnime.length} items users see (limit {DISPLAY_LIMIT})</div>
				{(!sections || (sections && !sectionSummaries)) && <div>Loading…</div>}
				{sections && sectionSummaries && orderedAnime.length === 0 && <div className="text-white font-bold">No anime loaded.</div>}
				<ul className="space-y-2">
					{orderedAnime.map((anime: any, idx: number) => (
						<li key={anime._id} className="flex items-center gap-4 bg-white text-black p-3 border-4 border-black">
							<span className="font-black w-8 text-center">{idx + 1}</span>
							  {anime.posterUrl && <img src={anime.posterUrl} alt={anime.title} className="w-10 h-14 object-cover border-2 border-black" />}
							  <span className="flex-1 font-bold truncate">{anime.title}</span>
							<div className="flex gap-2">
								<button onClick={() => swap(idx, idx - 1)} disabled={idx === 0} className={`px-2 py-1 border-2 font-black ${idx===0?'opacity-40':'bg-black text-white'} }`}>↑</button>
								<button onClick={() => swap(idx, idx + 1)} disabled={idx === orderedAnime.length - 1} className={`px-2 py-1 border-2 font-black ${idx===orderedAnime.length-1?'opacity-40':'bg-black text-white'} }`}>↓</button>
							</div>
						</li>
					))}
				</ul>
				<div className="mt-4 flex items-center gap-4">
					<button onClick={save} className="bg-white text-black border-4 border-black px-6 py-2 font-black uppercase tracking-wide">Save Order</button>
					{status && <span className="font-bold uppercase text-white">{status}</span>}
				</div>
				<p className="text-xs text-white/70 mt-2 font-bold uppercase">Drag & drop not yet implemented. Use arrows to reorder. For You section excluded (personalized).</p>
			</div>
		</div>
	);
};

export default AdminHomeSectionsManager;
