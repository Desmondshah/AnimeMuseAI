// src/components/animuse/onboarding/ProfilePage.tsx - Instagram-style Profile with posts
import React, { useEffect, useMemo, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Doc } from "../../../../convex/_generated/dataModel";

interface ProfilePageProps {
  onBack?: () => void;
  onOpenSettings: () => void;
}

export default function ProfilePage({ onBack, onOpenSettings }: ProfilePageProps) {
  const userProfile = useQuery(api.users.getMyUserProfile);
  const userReels = useQuery(api.reels.getUserReels, 
    userProfile ? { userId: userProfile.userId } : "skip"
  );

  // Fetch signed URLs for reel media (prefer thumbnail, fallback to media)
  const getSignedUrl = useAction(api.reels.getSignedUrl);
  const [mediaUrls, setMediaUrls] = useState<Record<string, string | null>>({});
  const deleteReel = useMutation(api.reels.deleteReel);
  const [deletingIds, setDeletingIds] = useState<Record<string, boolean>>({});

  // Post detail modal state
  const [selectedReel, setSelectedReel] = useState<Doc<"reels"> | null>(null);
  const [detailUrl, setDetailUrl] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Load full media for modal when a reel is selected
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!selectedReel) {
        setDetailUrl(null);
        return;
      }
      try {
        const url = await getSignedUrl({ storageId: selectedReel.storageId });
        if (!cancelled) setDetailUrl(url ?? null);
      } catch {
        if (!cancelled) setDetailUrl(null);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [selectedReel, getSignedUrl]);

  const reelsNeedingUrls = useMemo(() => {
    return (userReels ?? []).filter((r: Doc<"reels">) => mediaUrls[r._id] === undefined);
  }, [userReels, mediaUrls]);

  useEffect(() => {
    let cancelled = false;
    async function loadUrls() {
      if (!reelsNeedingUrls.length) return;
      const entries = await Promise.all(
        reelsNeedingUrls.map(async (r: Doc<"reels">) => {
          const storageId = r.thumbnailStorageId ?? r.storageId;
          try {
            const url = await getSignedUrl({ storageId });
            return [r._id, url as string | null] as const;
          } catch {
            return [r._id, null] as const;
          }
        })
      );
      if (!cancelled) {
        setMediaUrls(prev => {
          const next = { ...prev };
          for (const [id, url] of entries) next[id] = url;
          return next;
        });
      }
    }
    loadUrls();
    return () => { cancelled = true; };
  }, [reelsNeedingUrls, getSignedUrl]);

  if (userProfile === undefined) {
    return (
      <div className="w-full h-[calc(100vh-var(--vh,1vh)*0+0px)] grid place-items-center bg-black">
        <div className="relative bg-white border-4 border-black p-8 shadow-[8px_8px_0px_0px_#FF6B35]">
          <div className="text-2xl font-black uppercase animate-pulse">LOADING PROFILE...</div>
          <div className="mt-2 h-2 bg-gradient-to-r from-black to-brand-primary-action"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[calc(100vh-80px)] overflow-y-auto bg-black"
      style={{
        paddingTop: 'max(12px, env(safe-area-inset-top))',
        paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
      }}
    >
      {/* BRUTALIST BACKGROUND CHAOS */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-0 left-0 w-40 h-40 bg-gradient-to-br from-brand-primary-action to-red-600 transform rotate-45 -translate-x-20 -translate-y-20 opacity-80"></div>
        <div className="absolute top-20 right-0 w-32 h-64 bg-gradient-to-l from-white to-gray-200 transform -translate-y-16 translate-x-16 opacity-90"></div>
        <div className="absolute bottom-1/3 left-8 w-24 h-24 bg-gradient-to-tr from-brand-accent-gold to-yellow-400 opacity-85 transform rotate-12"></div>
        <div className="absolute bottom-0 right-0 w-48 h-48 bg-gradient-to-tl from-purple-500 to-pink-500 transform rotate-12 translate-x-24 translate-y-24 opacity-75"></div>
        <div className="absolute top-1/2 left-1/4 w-12 h-80 bg-gradient-to-b from-white to-blue-200 transform rotate-12 opacity-60"></div>
        {/* FLOATING GEOMETRIC ELEMENTS */}
        <div className="absolute top-1/3 right-1/4 w-16 h-16 bg-gradient-to-br from-green-400 to-teal-400 rounded-full opacity-70 animate-pulse"></div>
        <div className="absolute bottom-1/4 left-1/2 w-28 h-28 bg-gradient-to-tr from-blue-500 to-cyan-500 transform rotate-45 opacity-60"></div>
      </div>

      {/* BRUTALIST GRID OVERLAY */}
      <div className="fixed inset-0 pointer-events-none opacity-10 z-5">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_49%,#fff_50%,#fff_51%,transparent_52%),linear-gradient(180deg,transparent_49%,#fff_50%,#fff_51%,transparent_52%)] bg-[length:40px_40px]"></div>
      </div>

      {/* BRUTALIST HEADER (minimal: gear icon only) */}
      <div className="sticky top-0 z-20 bg-black border-b-8 border-white px-4 py-3 shadow-[0_8px_0px_0px_#FF6B35]">
        <button
          aria-label="Open settings"
          onClick={onOpenSettings}
          className="bg-transparent border-0 p-0 m-0 text-white"
          title="Settings"
          style={{ position: 'absolute', right: '0.75rem', top: '0.5rem' }}
        >
          <span className="text-2xl leading-none select-none">⚙️</span>
        </button>
      </div>

      <div className="relative z-10 p-4 space-y-6">
        {/* BRUTALIST PROFILE HERO */}
        <div className="relative bg-white border-8 border-black p-6 shadow-[12px_12px_0px_0px_#FF6B35] overflow-hidden">
          {/* ARTISTIC BACKGROUND PATTERN */}
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-yellow-100/30 to-orange-100/20"></div>
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-brand-primary-action/10 to-transparent transform rotate-45"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-purple-500/10 to-transparent"></div>
          
          <div className="relative z-10 flex items-center gap-6">
            {/* CIRCULAR PROFILE PICTURE (perfect circle) */}
            <div className="relative">
              <div className="w-24 h-24 rounded-full border-8 border-black overflow-hidden shadow-[6px_6px_0px_0px_#000] bg-white">
                {userProfile?.avatarUrl ? (
                  <img
                    src={userProfile.avatarUrl}
                    alt={userProfile?.name ?? "User avatar"}
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                ) : (
                  <div className="w-full h-full grid place-items-center bg-gradient-to-br from-brand-primary-action to-red-600">
                    <span className="text-4xl font-black text-white">
                      {(userProfile?.name?.[0] || 'U').toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-brand-accent-gold border-4 border-black rounded-full"></div>
            </div>
            
            <div className="flex-1">
              <h2 className="text-3xl font-black uppercase text-black mb-2 tracking-tight">
                {userProfile?.name || 'ANONYMOUS USER'}
              </h2>
              
              {/* POSTS COUNT */}
              <div className="flex items-center gap-4 mb-2">
                <div className="text-center">
                  <div className="text-2xl font-black text-black">{userReels?.length || 0}</div>
                  <div className="text-xs font-black uppercase text-gray-600">POSTS</div>
                </div>
              </div>
              
              {/* STATUS INDICATORS */}
              <div className="flex gap-2">
                <div className="bg-green-500 border-2 border-black px-2 py-1 text-xs font-black uppercase text-black">ONLINE</div>
                <div className="bg-brand-accent-gold border-2 border-black px-2 py-1 text-xs font-black uppercase text-black">VERIFIED</div>
              </div>
            </div>
          </div>
        </div>

        {/* USER POSTS GRID - INSTAGRAM STYLE */}
        <div className="relative bg-black border-8 border-white p-4 shadow-[8px_8px_0px_0px_#FF6B35]">
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-2xl font-black uppercase text-white tracking-tight">POSTS</h3>
            <div className="flex-1 h-1 bg-gradient-to-r from-brand-primary-action to-transparent"></div>
            <div className="w-4 h-4 bg-brand-accent-gold border-2 border-white"></div>
          </div>
          
          {userReels === undefined ? (
            <div className="grid grid-cols-3 gap-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="aspect-square bg-white/20 border-2 border-white/30 animate-pulse"></div>
              ))}
            </div>
          ) : userReels && userReels.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {userReels.map((reel: Doc<"reels">, index: number) => (
                <div
                  key={reel._id}
                  className="aspect-square bg-gradient-to-br from-purple-500 to-pink-500 border-4 border-white relative overflow-hidden shadow-[4px_4px_0px_0px_#000] cursor-pointer group"
                  onClick={() => {
                    setSelectedReel(reel);
                    setMenuOpen(false);
                  }}
                >
                  {/* Actual posted media thumbnail */}
                  {(() => {
                    const url = mediaUrls[reel._id];
                    // If we have a thumbnail or image URL, render as img. If video with no thumb, render lightweight video.
                    if (url) {
                      if (reel.mediaType === 'image' || reel.thumbnailStorageId) {
                        return (
                          <img
                            src={url}
                            alt={reel.caption ?? 'Post'}
                            className="absolute inset-0 w-full h-full object-cover"
                            draggable={false}
                          />
                        );
                      }
                      // Video without thumbnail: show muted looping preview
                      return (
                        <video
                          src={url}
                          muted
                          playsInline
                          loop
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      );
                    }
                    // Loading/fallback shimmer
                    return (
                      <div className="absolute inset-0 bg-white/20 animate-pulse" />
                    );
                  })()}
                  
                  {/* HOVER OVERLAY */
                  }
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                    <div className="text-white text-center">
                      <div className="text-lg">👁️ {reel.viewsCount || 0}</div>
                      <div className="text-sm">❤️ {reel.likesCount || 0}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border-4 border-white/30 bg-white/10">
              <div className="text-6xl mb-4">📸</div>
              <div className="text-white font-black uppercase text-lg mb-2">NO POSTS YET</div>
              <div className="text-white/70 font-bold">Start sharing your anime moments!</div>
            </div>
          )}
        </div>

        {/* Post Detail Modal */}
        {selectedReel && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setSelectedReel(null)}>
            <div
              className="relative bg-white border-8 border-black shadow-[12px_12px_0px_0px_#FF6B35] max-w-[min(90vw,900px)] w-full max-h-[85vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header with three dots menu */}
              <div className="flex items-center justify-between px-4 py-2 bg-black text-white border-b-4 border-white">
                <div className="font-black uppercase">Your Post</div>
                <div className="relative">
                  <button
                    aria-label="More options"
                    className="px-2 py-1 border-2 border-white"
                    onClick={() => setMenuOpen((v) => !v)}
                  >
                    ⋯
                  </button>
                  {menuOpen && (
                    <div className="absolute right-0 mt-2 bg-white text-black border-4 border-black shadow-[6px_6px_0px_0px_#000] min-w-36 z-10">
                      <button
                        className="w-full text-left px-4 py-2 font-black hover:bg-red-500 hover:text-white"
                        disabled={isDeleting}
                        onClick={async () => {
                          const confirmed = window.confirm("Delete this post? This cannot be undone.");
                          if (!confirmed || !selectedReel) return;
                          try {
                            setIsDeleting(true);
                            await deleteReel({ reelId: selectedReel._id });
                            setSelectedReel(null);
                          } catch (e) {
                            console.error(e);
                            alert("Failed to delete post. Please try again.");
                          } finally {
                            setIsDeleting(false);
                            setMenuOpen(false);
                          }
                        }}
                      >
                        {isDeleting ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Media body */}
              <div className="relative w-full bg-black" style={{ aspectRatio: selectedReel.aspectRatio ?? 9/16 }}>
                {detailUrl ? (
                  selectedReel.mediaType === 'image' ? (
                    <img src={detailUrl} alt={selectedReel.caption ?? 'Post'} className="w-full h-full object-contain" />
                  ) : (
                    <video src={detailUrl} controls playsInline className="w-full h-full object-contain bg-black" />
                  )
                ) : (
                  <div className="w-full h-full grid place-items-center text-white">Loading…</div>
                )}
              </div>

              {/* Caption */}
              {selectedReel.caption && (
                <div className="px-4 py-3 border-t-4 border-black bg-white">
                  <div className="font-bold">Caption</div>
                  <div className="text-sm">{selectedReel.caption}</div>
                </div>
              )}

              {/* Close */}
              <button
                className="absolute -top-4 -right-4 bg-brand-accent-gold text-black border-4 border-black rounded-full w-10 h-10 font-black shadow-[4px_4px_0px_0px_#000]"
                onClick={() => setSelectedReel(null)}
                aria-label="Close"
                title="Close"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom spacer for mobile nav */}
      <div style={{ height: 'max(5.5rem, calc(env(safe-area-inset-bottom) + 4.5rem))' }} />
    </div>
  );
}