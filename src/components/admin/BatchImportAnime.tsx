// BRUTALIST BATCH IMPORT - BatchImportAnime.tsx
import React, { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import StyledButton from "../animuse/shared/StyledButton";
import { toast } from "sonner";
import { useMobileOptimizations } from "../../hooks/useMobileOptimizations";

interface BatchImportAnimeProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface ImportResult {
  success: boolean;
  data?: any;
  error?: string;
  anilistId?: number;
  myAnimeListId?: number;
}

const BatchImportAnime: React.FC<BatchImportAnimeProps> = ({ onSuccess, onCancel }) => {
  const { iPad } = useMobileOptimizations();
  const batchImport = useAction(api.externalApis.batchSmartAutoFill);
  
  const [isImporting, setIsImporting] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [inputText, setInputText] = useState("");
  const [previewData, setPreviewData] = useState<ImportResult[] | null>(null);
  const [showResults, setShowResults] = useState(false);

  const parseInput = (text: string): Array<{ anilistId?: number; myAnimeListId?: number }> => {
    const lines = text.trim().split('\n').filter(line => line.trim());
    const ids: Array<{ anilistId?: number; myAnimeListId?: number }> = [];

    lines.forEach(line => {
      const trimmed = line.trim();
      
      // Try to parse as just a number
      const num = parseInt(trimmed);
      if (!isNaN(num)) {
        // Assume it's an AniList ID if it's just a number
        ids.push({ anilistId: num });
        return;
      }

      // Try to parse formats like "anilist:123" or "mal:456"
      if (trimmed.toLowerCase().startsWith('anilist:')) {
        const id = parseInt(trimmed.substring(8).trim());
        if (!isNaN(id)) ids.push({ anilistId: id });
      } else if (trimmed.toLowerCase().startsWith('mal:') || trimmed.toLowerCase().startsWith('myanimelist:')) {
        const prefix = trimmed.toLowerCase().startsWith('mal:') ? 4 : 12;
        const id = parseInt(trimmed.substring(prefix).trim());
        if (!isNaN(id)) ids.push({ myAnimeListId: id });
      }
    });

    return ids;
  };

  const handlePreview = async () => {
    const ids = parseInput(inputText);
    
    if (ids.length === 0) {
      toast.error("No valid IDs found. Please check your input format.");
      return;
    }

    setIsPreviewing(true);
    const toastId = "batch-preview";
    toast.loading(`Fetching data for ${ids.length} anime...`, { id: toastId });

    try {
      const result = await batchImport({
        ids,
        createNew: false // Just fetch data, don't create yet
      });

      setPreviewData(result.results);
      setShowResults(true);
      
      toast.success(
        `Fetched data for ${result.summary.successful}/${result.summary.total} anime`, 
        { id: toastId }
      );
    } catch (error: any) {
      toast.error(`Preview failed: ${error.message}`, { id: toastId });
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleImport = async () => {
    if (!previewData) return;

    const ids = parseInput(inputText);
    setIsImporting(true);
    const toastId = "batch-import";
    toast.loading(`Importing ${ids.length} anime...`, { id: toastId });

    try {
      const result = await batchImport({
        ids,
        createNew: true
      });

      if (result.summary.created > 0) {
        toast.success(
          `Successfully imported ${result.summary.created} new anime!`, 
          { id: toastId }
        );
        onSuccess?.();
      } else {
        toast.info(
          `No new anime imported. ${result.summary.successful} already exist.`, 
          { id: toastId }
        );
      }
    } catch (error: any) {
      toast.error(`Import failed: ${error.message}`, { id: toastId });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="bg-black border-4 border-white p-6 max-w-4xl mx-auto">
      <div className="bg-white border-4 border-black p-6 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className={`bg-black text-white flex items-center justify-center border-4 border-white font-black ${
            iPad.isIPadMini ? 'w-14 h-14 text-2xl' : 
            iPad.isIPadPro12 ? 'w-20 h-20 text-4xl' : 
            'w-16 h-16 text-3xl'
          }`}>
            📦
          </div>
          <div>
            <h3 className={`font-black text-black uppercase tracking-wider ${
              iPad.isIPadMini ? 'text-xl' : 
              iPad.isIPadPro12 ? 'text-3xl' : 
              'text-2xl'
            }`}>
              BATCH IMPORT ANIME
            </h3>
            <p className="text-black/70 uppercase tracking-wide text-sm font-bold">
              Import multiple anime at once using IDs
            </p>
          </div>
        </div>

        {!showResults ? (
          <>
            <div className="mb-6">
              <label className="block text-black font-black uppercase tracking-wide mb-3">
                PASTE IDS (ONE PER LINE)
              </label>
              
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`Examples:
21
anilist:1
mal:1
myanimelist:43608`}
                className={`w-full bg-white text-black border-4 border-black font-mono focus:outline-none focus:border-gray-500 transition-colors resize-none ${
                  iPad.isIPadMini ? 'px-4 py-3 text-sm' : 
                  iPad.isIPadPro12 ? 'px-8 py-6 text-lg' : 
                  'px-6 py-4'
                }`}
                rows={10}
                disabled={isPreviewing || isImporting}
              />
              
              <div className="mt-3 text-sm text-black/60 font-bold uppercase">
                <p>📝 SUPPORTED FORMATS:</p>
                <ul className="list-disc list-inside ml-4 mt-2">
                  <li>Just numbers (defaults to AniList)</li>
                  <li>anilist:ID</li>
                  <li>mal:ID or myanimelist:ID</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-4">
              <StyledButton
                onClick={onCancel}
                variant="ghost"
                className="flex-1 !bg-white !text-black !border-4 !border-black"
                disabled={isPreviewing}
              >
                CANCEL
              </StyledButton>
              
              <StyledButton
                onClick={handlePreview}
                variant="primary"
                className="flex-1 !bg-black !text-white"
                disabled={isPreviewing || !inputText.trim()}
              >
                {isPreviewing ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">🔄</span>
                    FETCHING DATA...
                  </span>
                ) : (
                  "🔍 PREVIEW IMPORT"
                )}
              </StyledButton>
            </div>
          </>
        ) : (
          <>
            <div className="mb-6">
              <h4 className="font-black text-black uppercase tracking-wide mb-4">
                PREVIEW RESULTS
              </h4>
              
              <div className="max-h-96 overflow-y-auto border-4 border-black">
                {previewData?.map((result, idx) => (
                  <div 
                    key={idx} 
                    className={`p-4 border-b-2 border-black ${
                      result.success ? 'bg-green-100' : 'bg-red-100'
                    }`}
                  >
                    {result.success && result.data ? (
                      <div className="flex items-start gap-4">
                        {result.data.posterUrl && (
                          <img 
                            src={result.data.posterUrl} 
                            alt={result.data.title}
                            className="w-16 h-20 object-cover border-2 border-black"
                          />
                        )}
                        <div className="flex-1">
                          <h5 className="font-black text-black uppercase">
                            {result.data.title}
                          </h5>
                          <p className="text-sm text-black/70 mt-1">
                            {result.data.year && `${result.data.year} • `}
                            {result.data.genres?.join(', ')}
                          </p>
                          <p className="text-xs text-black/50 mt-1">
                            {result.anilistId && `AniList: ${result.anilistId}`}
                            {result.myAnimeListId && ` MAL: ${result.myAnimeListId}`}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="font-bold text-red-800">
                          ❌ {result.error || 'Failed to fetch'}
                        </p>
                        <p className="text-xs text-black/50">
                          {result.anilistId && `AniList: ${result.anilistId}`}
                          {result.myAnimeListId && ` MAL: ${result.myAnimeListId}`}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-4">
              <StyledButton
                onClick={() => {
                  setShowResults(false);
                  setPreviewData(null);
                }}
                variant="ghost"
                className="flex-1 !bg-white !text-black !border-4 !border-black"
                disabled={isImporting}
              >
                ← BACK TO INPUT
              </StyledButton>
              
              <StyledButton
                onClick={handleImport}
                variant="primary"
                className="flex-1 !bg-green-600 !text-white hover:!bg-green-700"
                disabled={isImporting || !previewData?.some(r => r.success)}
              >
                {isImporting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">⚙️</span>
                    IMPORTING...
                  </span>
                ) : (
                  `📥 IMPORT ${previewData?.filter(r => r.success).length || 0} ANIME`
                )}
              </StyledButton>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BatchImportAnime; 