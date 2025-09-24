// src/components/animuse/AnimeNewsPage.tsx
import React from "react";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import NewsArticleModal from "./NewsArticleModal";

interface NewsItem {
  id: string;
  title: string;
  link: string;
  source: string;
  publishedAt?: number;
  description?: string;
  imageUrl?: string;
}

const AnimeNewsPage: React.FC<{ onBack: () => void } > = ({ onBack }) => {
  const fetchAnimeNews = useAction(api.externalApis.fetchAnimeNews);
  const [news, setNews] = React.useState<NewsItem[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [active, setActive] = React.useState<NewsItem | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetchAnimeNews({});
        if (!cancelled) setNews((res as any).news || []);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load news.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [fetchAnimeNews]);

  return (
    <div className="min-h-screen bg-black text-white px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black uppercase tracking-tight">Anime News</h1>
        <button onClick={onBack} className="px-3 py-2 bg-white text-black border-2 border-black font-mono text-xs font-black uppercase">Back</button>
      </div>

      {loading && (
        <div className="bg-black text-white border-4 border-white p-4 font-mono text-sm">LOADING NEWS…</div>
      )}
      {error && (
        <div className="bg-red-600 text-white border-4 border-white p-4 font-mono text-sm">{error}</div>
      )}

      {news && news.length > 0 && (
        <div className="space-y-4">
          {news.map((item) => (
            <button key={item.id} onClick={() => setActive(item)} className="block w-full text-left">
              <div className="bg-white text-black border-4 border-black shadow-[6px_6px_0px_0px_#FF6B35] overflow-hidden">
                <div className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="bg-black text-white px-2 py-1 text-[10px] font-black uppercase">{item.source}</span>
                    {item.publishedAt && (
                      <span className="text-[10px] font-mono opacity-70">{new Date(item.publishedAt).toLocaleDateString()}</span>
                    )}
                  </div>
                  <h3 className="font-black text-sm uppercase leading-tight mb-1">{item.title}</h3>
                  {item.description && (
                    <p className="text-xs text-gray-800">{item.description}</p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
      {active ? <NewsArticleModal item={active} onClose={() => setActive(null)} /> : null}

      {news && news.length === 0 && !loading && !error && (
        <div className="bg-white text-black border-4 border-black p-4 font-mono text-sm">No news available right now.</div>
      )}
    </div>
  );
};

export default AnimeNewsPage;
