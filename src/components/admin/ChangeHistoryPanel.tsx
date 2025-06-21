// BRUTALIST CHANGE HISTORY PANEL - ChangeHistoryPanel.tsx
import React, { useState, memo, useMemo } from "react";
import { usePaginatedQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useMobileOptimizations } from "../../../convex/useMobileOptimizations";
import { toast } from "sonner";

interface ChangeHistoryPanelProps {
  animeId?: Id<"anime">;
  onClose: () => void;
}

// BRUTALIST Change Entry Component
const BrutalistChangeEntry: React.FC<{
  change: any;
}> = memo(({ change }) => {
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getChangeTypeColor = (changeType: string) => {
    switch (changeType) {
      case "create": return "bg-green-500";
      case "update": return "bg-blue-500";
      case "delete": return "bg-red-500";
      case "enrich": return "bg-purple-500";
      case "bulk_update": return "bg-orange-500";
      default: return "bg-gray-500";
    }
  };

  const getChangeTypeIcon = (changeType: string) => {
    switch (changeType) {
      case "create": return "➕";
      case "update": return "✏️";
      case "delete": return "🗑️";
      case "enrich": return "🤖";
      case "bulk_update": return "📦";
      default: return "❓";
    }
  };

  return (
    <div className="bg-black border-4 border-white p-6 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className={`w-8 h-8 ${getChangeTypeColor(change.changeType)} flex items-center justify-center text-white font-black text-lg`}>
            {getChangeTypeIcon(change.changeType)}
          </div>
          <div>
            <h4 className="text-2xl font-black text-white uppercase tracking-wider">
              {change.changeType.toUpperCase()}
            </h4>
            <p className="text-lg text-white font-bold uppercase tracking-wide">
              {change.entityTitle}
            </p>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-lg text-white font-black uppercase tracking-wide">
            {formatTimestamp(change.timestamp)}
          </div>
          <div className="text-sm text-white font-bold uppercase tracking-wide">
            BY {change.adminUserName}
          </div>
        </div>
      </div>

      {/* Character Context */}
      {change.characterName && (
        <div className="bg-white text-black p-4 mb-6 border-4 border-black">
          <div className="text-lg font-black uppercase tracking-wide mb-2">
            CHARACTER: {change.characterName}
          </div>
          {change.characterIndex !== undefined && (
            <div className="text-sm font-bold uppercase tracking-wide">
              INDEX: {change.characterIndex}
            </div>
          )}
        </div>
      )}

      {/* Changes List */}
      <div className="space-y-4">
        {change.changes.map((changeDetail: any, index: number) => (
          <div key={index} className="bg-white text-black p-4 border-4 border-black">
            <div className="flex items-center justify-between mb-3">
              <h5 className="text-lg font-black uppercase tracking-wide">
                {changeDetail.field.toUpperCase()}
              </h5>
              <div className="text-sm font-bold uppercase tracking-wide bg-black text-white px-3 py-1">
                FIELD CHANGE
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-3">
              <div>
                <div className="text-sm font-bold uppercase tracking-wide mb-1 text-red-600">
                  OLD VALUE:
                </div>
                <div className="bg-gray-100 p-3 border-2 border-gray-300 font-mono text-sm">
                  {changeDetail.oldValue !== undefined 
                    ? JSON.stringify(changeDetail.oldValue, null, 2)
                    : "NULL"
                  }
                </div>
              </div>
              
              <div>
                <div className="text-sm font-bold uppercase tracking-wide mb-1 text-green-600">
                  NEW VALUE:
                </div>
                <div className="bg-gray-100 p-3 border-2 border-gray-300 font-mono text-sm">
                  {changeDetail.newValue !== undefined 
                    ? JSON.stringify(changeDetail.newValue, null, 2)
                    : "NULL"
                  }
                </div>
              </div>
            </div>
            
            <div className="bg-black text-white p-3 border-4 border-white">
              <div className="text-sm font-bold uppercase tracking-wide mb-1">
                DESCRIPTION:
              </div>
              <div className="font-black uppercase tracking-wide">
                {changeDetail.changeDescription}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Revert Status */}
      {change.isReverted && (
        <div className="bg-red-500 text-white p-4 mt-6 border-4 border-red-600">
          <div className="text-lg font-black uppercase tracking-wide mb-2">
            ⚠️ THIS CHANGE HAS BEEN REVERTED
          </div>
          <div className="text-sm font-bold uppercase tracking-wide">
            REVERTED BY: {change.revertedByUserName}
          </div>
          <div className="text-sm font-bold uppercase tracking-wide">
            REVERTED AT: {formatTimestamp(change.revertedAt)}
          </div>
        </div>
      )}
    </div>
  );
});

// BRUTALIST Filter Component
const BrutalistHistoryFilter: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}> = memo(({ value, onChange, placeholder }) => (
  <div className="relative">
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-white text-black border-4 border-black px-6 py-4 text-lg font-black uppercase tracking-wide placeholder-black/50 focus:outline-none focus:border-gray-500 transition-colors"
    />
    <div className="absolute right-6 top-1/2 transform -translate-y-1/2 text-black text-2xl">
      🔍
    </div>
  </div>
));

const ChangeHistoryPanelComponent: React.FC<ChangeHistoryPanelProps> = ({ animeId, onClose }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [currentPage, setCurrentPage] = useState(0);
  
  const { isMobile, shouldReduceAnimations } = useMobileOptimizations();
  
  // Fetch change history
  const changeHistory = usePaginatedQuery(
    animeId 
      ? api.admin.getAnimeChangeHistory 
      : api.admin.getAllChangeHistory,
    animeId 
      ? { animeId, paginationOpts: { numItems: 20, cursor: null } }
      : { paginationOpts: { numItems: 20, cursor: null } },
    { initialNumItems: 20 }
  );

  const filteredChanges = useMemo(() => {
    if (!changeHistory?.results) return [];
    
    return changeHistory.results.filter((change: any) => {
      const matchesSearch = 
        change.entityTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        change.adminUserName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        change.changes?.some((c: any) => 
          c.changeDescription?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      
      const matchesType = filterType === "all" || change.changeType === filterType;
      
      return matchesSearch && matchesType;
    });
  }, [changeHistory?.results, searchTerm, filterType]);

  const stats = useMemo(() => {
    if (!changeHistory?.results) return { total: 0, creates: 0, updates: 0, deletes: 0, enriches: 0 };
    
    const total = changeHistory.results.length;
    const creates = changeHistory.results.filter((c: any) => c.changeType === "create").length;
    const updates = changeHistory.results.filter((c: any) => c.changeType === "update").length;
    const deletes = changeHistory.results.filter((c: any) => c.changeType === "delete").length;
    const enriches = changeHistory.results.filter((c: any) => c.changeType === "enrich").length;
    
    return { total, creates, updates, deletes, enriches };
  }, [changeHistory?.results]);

  const loadMore = () => {
    if (changeHistory?.status === "CanLoadMore") {
      changeHistory.loadMore(20);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-6">
      <div className="bg-white border-4 border-black p-8 max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-4xl font-black text-black mb-4 uppercase tracking-wider">
              CHANGE HISTORY
            </h2>
            <p className="text-xl text-black font-bold uppercase tracking-wide">
              {animeId ? "ANIME-SPECIFIC CHANGES" : "ALL ADMIN CHANGES"}
            </p>
          </div>
          
          <button
            onClick={onClose}
            className="bg-black text-white hover:bg-gray-800 border-4 border-black px-8 py-4 font-black uppercase tracking-wide transition-colors"
          >
            CLOSE
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'TOTAL', value: stats.total, color: 'bg-blue-500' },
            { label: 'CREATES', value: stats.creates, color: 'bg-green-500' },
            { label: 'UPDATES', value: stats.updates, color: 'bg-blue-500' },
            { label: 'DELETES', value: stats.deletes, color: 'bg-red-500' },
            { label: 'ENRICHES', value: stats.enriches, color: 'bg-purple-500' },
          ].map((stat, index) => (
            <div key={index} className="bg-black border-4 border-white p-4">
              <div className="flex items-center justify-between mb-2">
                <div className={`w-4 h-4 ${stat.color}`}></div>
              </div>
              <div className="text-2xl font-black text-white mb-1">{stat.value}</div>
              <div className="text-sm text-white font-bold uppercase tracking-wide">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-black border-4 border-white p-6 mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BrutalistHistoryFilter
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="SEARCH CHANGES..."
            />
            
            <div className="flex gap-4">
              {[
                { value: "all", label: "ALL" },
                { value: "create", label: "CREATES" },
                { value: "update", label: "UPDATES" },
                { value: "delete", label: "DELETES" },
                { value: "enrich", label: "ENRICHES" },
              ].map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setFilterType(filter.value)}
                  className={`px-4 py-3 font-black uppercase tracking-wide border-4 transition-colors
                    ${filterType === filter.value 
                      ? 'bg-white text-black border-white' 
                      : 'bg-black text-white border-white hover:bg-gray-800'
                    }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Changes List */}
        <div className="space-y-6">
          {filteredChanges.length > 0 ? (
            filteredChanges.map((change: any, index: number) => (
              <BrutalistChangeEntry key={change._id || index} change={change} />
            ))
          ) : (
            <div className="bg-black border-4 border-white p-12 text-center">
              <div className="text-6xl mb-6">📝</div>
              <h3 className="text-3xl font-black text-white mb-4 uppercase tracking-wider">
                NO CHANGES FOUND
              </h3>
              <p className="text-xl text-white font-bold uppercase tracking-wide">
                TRY ADJUSTING YOUR SEARCH OR FILTER CRITERIA
              </p>
            </div>
          )}
        </div>

        {/* Load More */}
        {changeHistory?.status === "CanLoadMore" && (
          <div className="mt-8 text-center">
            <button
              onClick={loadMore}
              className="bg-black text-white hover:bg-gray-800 border-4 border-black px-8 py-4 font-black uppercase tracking-wide transition-colors"
            >
              LOAD MORE CHANGES
            </button>
          </div>
        )}

        {/* Loading State */}
        {changeHistory?.status === "LoadingMore" && (
          <div className="mt-8 text-center">
            <div className="text-2xl font-black text-black uppercase tracking-wider">
              LOADING MORE CHANGES...
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(ChangeHistoryPanelComponent); 