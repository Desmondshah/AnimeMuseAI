// src/components/animuse/BulkEpisodeFix.tsx - Component for bulk fixing missing episodes

import React, { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import StyledButton from "../shared/StyledButton";
import { toast } from "sonner";

interface BulkEpisodeFixProps {
  className?: string;
}

export default function BulkEpisodeFix({ className = "" }: BulkEpisodeFixProps) {
  const bulkFixAction = useAction(api.autoRefresh.bulkFixMissingEpisodeData);
  
  const [isChecking, setIsChecking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);

  const handlePreview = async () => {
    setIsChecking(true);
    const toastId = "bulk-fix-preview";
    toast.loading("Scanning your anime collection...", { id: toastId });

    try {
      const result = await bulkFixAction({
        dryRun: true,
        maxToProcess: 100
      });

      setPreviewData(result);
      setShowPreview(true);
      
      if (result.found === 0) {
        toast.success("🎉 All your anime already have episode data!", { id: toastId });
      } else {
        toast.success(`Found ${result.found} anime that need episode data`, { id: toastId });
      }
    } catch (error: any) {
      console.error("Preview error:", error);
      toast.error(`Failed to scan: ${error.message}`, { id: toastId });
    } finally {
      setIsChecking(false);
    }
  };

  const handleBulkFix = async () => {
    if (!previewData || previewData.found === 0) return;

    setIsProcessing(true);
    const toastId = "bulk-fix-process";
    toast.loading(`Processing ${previewData.found} anime... This may take a few minutes.`, { id: toastId });

    try {
      const result = await bulkFixAction({
        dryRun: false,
        maxToProcess: previewData.found
      });

      if (result.fixed > 0) {
        toast.success(
          `🎉 Success! Fixed episodes for ${result.fixed} out of ${result.processed} anime.`, 
          { id: toastId, duration: 6000 }
        );
      } else {
        toast.info(
          `Processed ${result.processed} anime, but no new episode data was found.`, 
          { id: toastId }
        );
      }

      // Reset state
      setPreviewData(null);
      setShowPreview(false);
      
    } catch (error: any) {
      console.error("Bulk fix error:", error);
      toast.error(`Bulk fix failed: ${error.message}`, { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div className="bg-black/30 backdrop-blur-sm border border-white/10 rounded-3xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-full">
            <span className="text-2xl">🔄</span>
          </div>
          <div>
            <h3 className="text-xl font-heading text-white font-bold">
              Bulk Episode Fix
            </h3>
            <p className="text-white/70 text-sm">
              Automatically add missing episode data to your entire collection
            </p>
          </div>
        </div>

        {!showPreview ? (
          <div className="space-y-4">
            <p className="text-white/80">
              This will scan your collection and automatically fetch episode data for anime that are missing it. 
              Perfect for your existing 50+ anime!
            </p>
            
            <StyledButton
              onClick={handlePreview}
              disabled={isChecking}
              variant="primary"
              className="w-full !bg-gradient-to-r !from-purple-500 !to-blue-500 hover:!from-blue-500 hover:!to-purple-500"
            >
              {isChecking ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">🔄</span>
                  Scanning Collection...
                </span>
              ) : (
                "🔍 Scan My Collection"
              )}
            </StyledButton>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-black/40 rounded-2xl p-4 border border-white/10">
              <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                <span className="text-lg">📊</span>
                Scan Results
              </h4>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-brand-accent-gold">
                    {previewData.found}
                  </div>
                  <div className="text-white/70 text-sm">Anime Need Episodes</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">
                    {previewData.animeList.filter((a: any) => a.priority === "high").length}
                  </div>
                  <div className="text-white/70 text-sm">High Priority</div>
                </div>
              </div>

              {previewData.found > 0 && (
                <div className="max-h-40 overflow-y-auto custom-scrollbar">
                  <h5 className="text-white/80 text-sm font-medium mb-2">Anime to be processed:</h5>
                  <div className="space-y-1">
                    {previewData.animeList.slice(0, 10).map((anime: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <span className="text-white/70 truncate">{anime.title}</span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          anime.priority === "high" ? "bg-orange-500/20 text-orange-300" :
                          anime.priority === "medium" ? "bg-yellow-500/20 text-yellow-300" :
                          "bg-blue-500/20 text-blue-300"
                        }`}>
                          {anime.priority}
                        </span>
                      </div>
                    ))}
                    {previewData.animeList.length > 10 && (
                      <div className="text-white/50 text-xs text-center">
                        ...and {previewData.animeList.length - 10} more
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <StyledButton
                onClick={() => {
                  setShowPreview(false);
                  setPreviewData(null);
                }}
                variant="ghost"
                className="flex-1 !bg-white/10 !text-white"
                disabled={isProcessing}
              >
                Cancel
              </StyledButton>
              
              {previewData.found > 0 && (
                <StyledButton
                  onClick={handleBulkFix}
                  disabled={isProcessing}
                  variant="primary"
                  className="flex-1 !bg-gradient-to-r !from-green-500 !to-emerald-400 hover:!from-emerald-400 hover:!to-green-500"
                >
                  {isProcessing ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin">⚙️</span>
                      Processing {previewData.found} anime...
                    </span>
                  ) : (
                    `🚀 Fix ${previewData.found} Anime`
                  )}
                </StyledButton>
              )}
            </div>

            {previewData.found === 0 && (
              <div className="text-center py-4">
                <div className="text-4xl mb-2">🎉</div>
                <p className="text-green-400 font-medium">
                  All your anime already have episode data!
                </p>
              </div>
            )}
          </div>
        )}

        <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
          <div className="flex items-start gap-2">
            <span className="text-blue-400 text-sm">💡</span>
            <div className="text-blue-300 text-xs">
              <strong>How it works:</strong> Scans your collection, finds anime missing episodes, 
              then fetches episode data from AniList/MyAnimeList. Rate-limited to be respectful to APIs.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}