// src/components/animuse/AnimeNewsSection.tsx
import React from "react";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";

interface NewsItem {
  id: string;
  title: string;
  link: string;
  source: string;
  publishedAt?: number;
  description?: string;
  imageUrl?: string;
}

const AnimeNewsSection: React.FC = () => {
  const fetchAnimeNews = useAction(api.externalApis.fetchAnimeNews);
  const [news, setNews] = React.useState<NewsItem[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState<boolean>(false);

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetchAnimeNews({});
        if (!cancelled) {
          // res may be { success, news }
          setNews((res as any).news || []);
        }
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
    <section className="mt-8">
      <div className="relative bg-white text-black p-4 border-4 border-black shadow-[4px_4px_0px_0px_#000] mb-4 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_40%,rgba(0,0,0,0.06)_50%,transparent_60%)]"></div>
        <h2 className="relative z-10 text-xl font-black uppercase tracking-tight">Anime News</h2>
      </div>

      {loading && (
        <div className="bg-black text-white border-4 border-white p-4 font-mono text-sm">LOADING NEWS…</div>
      )}
      {error && (
        <div className="bg-red-600 text-white border-4 border-white p-4 font-mono text-sm">{error}</div>
      )}

      {news && news.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {news.map((item) => (
            <a key={item.id} href={item.link} target="_blank" rel="noopener noreferrer" className="block">
              <div className="relative bg-white border-4 border-black shadow-[6px_6px_0px_0px_#FF6B35] overflow-hidden group">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.title} className="w-full h-40 object-cover border-b-4 border-black group-hover:scale-105 transition-transform duration-200" />
                ) : (
                  <div className="w-full h-40 bg-gradient-to-br from-brand-primary-action to-red-600 border-b-4 border-black flex items-center justify-center">
                    <span className="text-4xl">📰</span>
                  </div>
                )}
                <div className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="bg-black text-white px-2 py-1 text-[10px] font-black uppercase">{item.source}</span>
                    {item.publishedAt && (
                      <span className="text-[10px] font-mono opacity-70">{new Date(item.publishedAt).toLocaleDateString()}</span>
                    )}
                  </div>
                  <h3 className="font-black text-sm uppercase leading-tight line-clamp-2">{item.title}</h3>
                  {item.description && (
                    <p className="mt-1 text-xs text-gray-700 line-clamp-2">{item.description}</p>
                  )}
                </div>
              </div>
            </a>
          ))}
        </div>
      )}

      {news && news.length === 0 && !loading && !error && (
        <div className="bg-white text-black border-4 border-black p-4 font-mono text-sm">No news available right now.</div>
      )}
    </section>
  );
};

export default AnimeNewsSection;
