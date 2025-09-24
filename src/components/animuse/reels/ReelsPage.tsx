// src/components/animuse/reels/ReelsPage.tsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id, Doc } from "../../../../convex/_generated/dataModel";
import { motion, AnimatePresence } from "framer-motion";
import ReelsUploader from "./ReelsUploader";

interface ReelsPageProps {
  onBack?: () => void;
}

const useSafeUrls = () => {
  const getSignedUrl = useAction(api.reels.getSignedUrl);
  const cache = useRef<Map<string, string>>(new Map());
  const getUrl = useCallback(async (storageId: Id<"_storage">) => {
    const key = storageId as unknown as string;
    if (cache.current.has(key)) return cache.current.get(key)!;
    const url = await getSignedUrl({ storageId });
    cache.current.set(key, url);
    return url;
  }, [getSignedUrl]);
  return { getUrl };
};

const ReelItem: React.FC<{ reel: Doc<"reels">; onViewed: (id: Id<"reels">) => void }>
= ({ reel, onViewed }) => {
  const { getUrl } = useSafeUrls();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const url = await getUrl(reel.storageId);
      if (active) setMediaUrl(url);
    })();
    return () => { active = false; };
  }, [reel.storageId, getUrl]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const onPlay = () => onViewed(reel._id);
    el.addEventListener('play', onPlay);
    return () => el.removeEventListener('play', onPlay);
  }, [onViewed, reel._id]);

  return (
    <div className="w-full h-full flex items-center justify-center bg-black">
      {reel.mediaType === 'video' ? (
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          src={mediaUrl ?? undefined}
          controls={false}
          playsInline
          loop
          autoPlay
          muted
        />
      ) : (
        <img className="w-full h-full object-cover" src={mediaUrl ?? ''} alt={reel.caption ?? 'Reel'} />
      )}
      {reel.caption && (
        <div className="absolute bottom-20 left-4 right-4 text-white text-sm bg-black/40 p-2 border-2 border-white">
          {reel.caption}
        </div>
      )}
    </div>
  );
};

const ReelsPage: React.FC<ReelsPageProps> = ({ onBack }) => {
  const [cursor, setCursor] = useState<number | null>(null);
  const [items, setItems] = useState<Doc<"reels">[]>([]);
  const getFeed = useQuery(api.reels.getFeed, cursor === null ? {} : { cursor });
  const addView = useMutation(api.reels.addView);
  const [showUploader, setShowUploader] = useState(false);

  useEffect(() => {
    if (!getFeed) return; // still loading
    if (!getFeed.items) return;
    if (cursor === null) {
      setItems(getFeed.items);
    } else {
      // append
      setItems(prev => [...prev, ...getFeed.items]);
    }
    setCursor(getFeed.nextCursor);
  }, [getFeed?.items?.length]);

  const onViewed = useCallback((id: Id<'reels'>) => {
    addView({ reelId: id }).catch(() => {});
  }, [addView]);

  return (
    <div className="relative w-full h-[calc(100vh-80px)] overflow-hidden">
      {/* Header */}
      <div className="absolute top-3 left-3 z-10">
        <button onClick={onBack} className="bg-white text-black border-2 border-black px-3 py-1 font-black shadow-[2px_2px_0px_#000]">Back</button>
      </div>

  {/* Vertical feed */}
      <div className="w-full h-full snap-y snap-mandatory overflow-y-scroll no-scrollbar">
        {items.map((reel) => (
          <section key={reel._id} className="w-full h-full snap-start relative">
            <ReelItem reel={reel} onViewed={onViewed} />
          </section>
        ))}

        {getFeed && getFeed.nextCursor && (
          <div className="w-full h-24 flex items-center justify-center text-white">Loading more...</div>
        )}
      </div>

      {/* Upload button */}
      <button
        onClick={() => setShowUploader(true)}
        className="fixed right-5 z-[60] bg-brand-primary-action text-white border-4 border-black rounded-full w-14 h-14 font-black shadow-[4px_4px_0_#000]"
        style={{
          // Keep comfortably above the bottom nav and iOS home indicator
          bottom: 'max(6rem, calc(env(safe-area-inset-bottom) + 4.5rem))',
        }}
      >
        +
      </button>

      <AnimatePresence>
        {showUploader && (
          <motion.div className="fixed inset-0 z-[70] bg-black/70 flex items-end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div className="w-full bg-white text-black border-t-4 border-black p-4"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
            >
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-black">New Reel</h3>
                <button onClick={() => setShowUploader(false)} className="border-2 border-black px-2 py-1 font-black">Close</button>
              </div>
              <ReelsUploader />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ReelsPage;
