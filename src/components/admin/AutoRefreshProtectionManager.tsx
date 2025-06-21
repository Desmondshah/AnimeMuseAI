import React, { useState } from 'react';
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { toast } from "sonner";
import { useMobileOptimizations } from "../../../convex/useMobileOptimizations";

interface AutoRefreshProtectionManagerProps {
  animeId: Id<"anime">;
  anime: {
    title?: string;
    lastManualEdit?: {
      adminUserId: Id<"users">;
      timestamp: number;
      fieldsEdited: string[];
    };
  };
}

const AutoRefreshProtectionManager: React.FC<AutoRefreshProtectionManagerProps> = ({ 
  animeId, 
  anime 
}) => {
  const { iPad } = useMobileOptimizations();
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  
  const resetProtectionMutation = useMutation(api.admin.adminResetAutoRefreshProtection);
  
  const protectedFields = anime.lastManualEdit?.fieldsEdited || [];
  const hasProtection = protectedFields.length > 0;
  
  const availableFields = [
    'title',
    'description', 
    'posterUrl',
    'genres',
    'year',
    'rating',
    'emotionalTags',
    'trailerUrl',
    'studios',
    'themes'
  ];

  const handleResetAll = async () => {
    try {
      const result = await resetProtectionMutation({ animeId });
      toast.success(result.message || "All auto-refresh protection removed");
      // Close the expanded view after successful reset
      if (result.stillProtectedFields.length === 0) {
        setIsExpanded(false);
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to reset protection");
    }
  };

  const handleResetSelected = async () => {
    if (selectedFields.length === 0) {
      toast.error("Please select fields to reset");
      return;
    }
    
    try {
      const result = await resetProtectionMutation({ animeId, fieldsToReset: selectedFields });
      toast.success(result.message || `Protection removed for: ${selectedFields.join(', ')}`);
      setSelectedFields([]);
      // Close the expanded view if all protection is gone
      if (result.stillProtectedFields.length === 0) {
        setIsExpanded(false);
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to reset selected fields");
    }
  };

  const toggleFieldSelection = (field: string) => {
    setSelectedFields(prev => 
      prev.includes(field) 
        ? prev.filter(f => f !== field)
        : [...prev, field]
    );
  };

  if (!hasProtection) {
    return (
      <div className={`bg-green-900 border-4 border-green-500 relative ${
        iPad.isIPadMini ? 'p-4 mb-4' : iPad.isIPadPro12 ? 'p-8 mb-8' : 'p-6 mb-6'
      }`}>
        {/* Not clickable indicator */}
        <div className="absolute top-2 right-2 text-green-400 text-xs font-bold uppercase">
          Status Only
        </div>
        
        <div className="flex items-center gap-4">
          <div className={`bg-green-500 text-white flex items-center justify-center border-4 border-black font-black ${
            iPad.isIPadMini ? 'w-12 h-12 text-2xl' : 
            iPad.isIPadPro12 ? 'w-16 h-16 text-3xl' : 
            'w-14 h-14 text-2xl'
          }`}>
            ✓
          </div>
          <div className="flex-1">
            <h3 className={`font-black text-white uppercase tracking-wide ${
              iPad.isIPadMini ? 'text-lg' : iPad.isIPadPro12 ? 'text-2xl' : 'text-xl'
            }`}>
              Auto-Refresh Active
            </h3>
            <p className={`text-green-300 font-bold ${
              iPad.isIPadMini ? 'text-sm' : iPad.isIPadPro12 ? 'text-base' : 'text-sm'
            }`}>
              All fields can be updated by external APIs
            </p>
            <div className={`mt-3 p-3 bg-green-800/50 border-2 border-green-600 rounded ${
              iPad.isIPadMini ? 'text-xs' : iPad.isIPadPro12 ? 'text-sm' : 'text-xs'
            }`}>
              <p className="text-green-200 font-bold mb-1">
                📝 HOW TO PROTECT FIELDS:
              </p>
              <ol className="text-green-300 list-decimal list-inside space-y-1">
                <li>Edit any field below (title, description, etc.)</li>
                <li>Click "Save Changes"</li>
                <li>That field will be automatically protected!</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-red-900 border-4 border-red-500 ${
      iPad.isIPadMini ? 'p-4 mb-4' : iPad.isIPadPro12 ? 'p-8 mb-8' : 'p-6 mb-6'
    }`}>
      {/* Header */}
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4">
          <div className={`bg-red-500 text-white flex items-center justify-center border-4 border-black font-black ${
            iPad.isIPadMini ? 'w-12 h-12 text-2xl' : 
            iPad.isIPadPro12 ? 'w-16 h-16 text-3xl' : 
            'w-14 h-14 text-2xl'
          }`}>
            
          </div>
          <div>
            <h3 className={`font-black text-white uppercase tracking-wide ${
              iPad.isIPadMini ? 'text-lg' : iPad.isIPadPro12 ? 'text-2xl' : 'text-xl'
            }`}>
              Auto-Refresh Protection
            </h3>
            <p className={`text-red-300 font-bold ${
              iPad.isIPadMini ? 'text-sm' : iPad.isIPadPro12 ? 'text-base' : 'text-sm'
            }`}>
              {protectedFields.length} fields protected
            </p>
          </div>
        </div>
        <div className={`text-white font-black ${
          iPad.isIPadMini ? 'text-2xl' : iPad.isIPadPro12 ? 'text-3xl' : 'text-2xl'
        }`}>
          {isExpanded ? '' : ''}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-6 space-y-6">
          {/* Protected Fields List */}
          <div>
            <h4 className="text-white font-black uppercase text-lg mb-3">
              Currently Protected Fields:
            </h4>
            <div className="flex flex-wrap gap-2">
              {protectedFields.map(field => (
                <span 
                  key={field}
                  className="bg-red-600 text-white px-3 py-1 text-sm font-bold uppercase border-2 border-red-400"
                >
                  {field}
                </span>
              ))}
            </div>
          </div>

          {/* Field Selection */}
          <div>
            <h4 className="text-white font-black uppercase text-lg mb-3">
              Select Fields to Reset:
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {protectedFields.map(field => (
                <label 
                  key={field}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedFields.includes(field)}
                    onChange={() => toggleFieldSelection(field)}
                    className="w-4 h-4"
                  />
                  <span className="text-white font-bold text-sm uppercase">
                    {field}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4">
            <button
              onClick={handleResetSelected}
              disabled={selectedFields.length === 0}
              className={`px-6 py-3 bg-yellow-600 text-black font-black uppercase border-4 border-black hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                iPad.isIPadMini ? 'text-sm' : iPad.isIPadPro12 ? 'text-lg' : 'text-base'
              }`}
            >
              Reset Selected ({selectedFields.length})
            </button>
            
            <button
              onClick={handleResetAll}
              className={`px-6 py-3 bg-red-600 text-white font-black uppercase border-4 border-black hover:bg-red-500 transition-colors ${
                iPad.isIPadMini ? 'text-sm' : iPad.isIPadPro12 ? 'text-lg' : 'text-base'
              }`}
            >
              Reset All Protection
            </button>
          </div>

          {/* Warning */}
          <div className="bg-yellow-900 border-4 border-yellow-600 p-4">
            <div className="flex items-start gap-3">
              <div className="text-2xl"></div>
              <div>
                <h5 className="text-yellow-400 font-black uppercase text-lg mb-2">
                  Warning
                </h5>
                <p className="text-yellow-300 font-bold text-sm">
                  Removing protection will allow auto-refresh to overwrite these fields 
                  with data from external APIs. This action cannot be undone.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutoRefreshProtectionManager;
