// src/components/animuse/NewsArticleModal.tsx
import React, { useEffect, useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";

export type NewsItem = {
  id: string;
  title: string;
  link: string;
  source: string;
  publishedAt?: number;
  description?: string;
  imageUrl?: string;
};

type Props = { item: NewsItem; onClose: () => void };

export default function NewsArticleModal({ item, onClose }: Props) {
  const fetchMeta = useAction(api.externalApis.fetchArticleMetadata);
  const [meta, setMeta] = useState<{ title?: string; description?: string; imageUrl?: string; siteName?: string }>();
  const [loading, setLoading] = useState(false);
  const startYRef = React.useRef<number | null>(null);

  useEffect(() => {
    // Body scroll lock
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    let active = true;
    // Fetch meta only if we lack description or image
    if (!item.description || !item.imageUrl) {
      setLoading(true);
      fetchMeta({ url: item.link })
        .then((res: any) => { if (active && res?.success) setMeta(res); })
        .finally(() => active && setLoading(false));
    }
    return () => { active = false; };
  }, [item.link]);

  const displayTitle = item.title || meta?.title || "Article";
  const displayDesc = item.description || meta?.description || "";
  const displayImage = item.imageUrl || meta?.imageUrl;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onTouchStart={(e) => { startYRef.current = e.touches?.[0]?.clientY ?? null; }}
      onTouchMove={(e) => {
        if (startYRef.current != null) {
          const dy = e.touches[0].clientY - startYRef.current;
          if (dy > 100) { // swipe down threshold
            startYRef.current = null;
            onClose();
          }
        }
      }}
      onTouchEnd={() => { startYRef.current = null; }}
    >
      <div className="w-full sm:max-w-2xl sm:rounded-2xl bg-white text-black p-4 sm:p-6 shadow-2xl border-4 border-black">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-mono">
            {item.source}
            {item.publishedAt ? ` • ${new Date(item.publishedAt).toLocaleString()}` : ""}
          </div>
          <button onClick={onClose} className="px-2 py-1 border-2 border-black bg-white text-black text-xs font-bold uppercase">Close</button>
        </div>
        <h2 className="text-lg sm:text-xl font-black uppercase mb-2">{displayTitle}</h2>
        {displayImage ? (
          <img
            src={displayImage}
            alt=""
            className="w-full h-48 sm:h-64 object-cover border-4 border-black mb-3"
            loading="lazy"
          />
        ) : null}
        {loading ? <div className="text-xs font-mono mb-2">Loading preview…</div> : null}
        {displayDesc ? (
          <p className="text-sm whitespace-pre-wrap">{displayDesc}</p>
        ) : (
          <p className="text-sm opacity-70">Preview unavailable. Use the source link below.</p>
        )}
        <div className="mt-4 flex gap-2">
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 border-2 border-white bg-black text-white text-xs font-black uppercase"
          >
            Read on Source
          </a>
          <button
            onClick={onClose}
            className="px-3 py-2 border-2 border-black bg-white text-black text-xs font-black uppercase"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
