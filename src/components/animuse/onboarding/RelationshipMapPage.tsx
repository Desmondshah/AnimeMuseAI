import React, { useEffect, useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import ForceGraph2D, { NodeObject, LinkObject } from "react-force-graph-2d";

interface GraphNode extends NodeObject {
  id: string;
  name: string;
  genres: string[];
}

interface GraphLink extends LinkObject {
  source: string;
  target: string;
}

export default function RelationshipMapPage() {
  const fetchTrending = useAction(api.externalApis.fetchTrendingAnime);
  const [data, setData] = useState<{ nodes: GraphNode[]; links: GraphLink[] }>({
    nodes: [],
    links: [],
  });

  useEffect(() => {
    const load = async () => {
      try {
        const result = await fetchTrending({ limit: 12 });
        if (result.error) throw new Error(result.error);
        const animes = result.animes || [];
        const nodes: GraphNode[] = animes.map((a, idx) => ({
          id: String(idx),
          name: a.title,
          genres: a.genres || [],
        }));
        const links: GraphLink[] = [];
        for (let i = 0; i < animes.length; i++) {
          for (let j = i + 1; j < animes.length; j++) {
            const aGenres = animes[i].genres || [];
            const bGenres = animes[j].genres || [];
            const shared = aGenres.some(g => bGenres.includes(g));
            if (shared) links.push({ source: String(i), target: String(j) });
          }
        }
        setData({ nodes, links });
      } catch (err) {
        console.error("Failed to load relationship map", err);
      }
    };
    load();
  }, [fetchTrending]);

  return (
    <div className="p-4">
      <h2 className="text-xl font-heading text-white mb-4">Anime Universe Map</h2>
      <div className="h-[70vh] border border-white/20 rounded-lg">
        <ForceGraph2D
          graphData={data}
          nodeLabel="name"
          nodeAutoColorBy="id"
        />
      </div>
    </div>
  );
}