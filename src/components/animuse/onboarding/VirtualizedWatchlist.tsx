import React from "react";
import AutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeGrid as Grid } from "react-window";
import { Doc, Id } from "../../../../convex/_generated/dataModel";
import AnimeCard from "../AnimeCard";
import StyledButton from "../shared/StyledButton";

export type WatchlistItemWithAnime = Doc<"watchlist"> & { anime: Doc<"anime"> | null };

interface StatusConfig {
  [key: string]: { icon: string; color: string };
}

interface VirtualizedWatchlistProps {
  items: WatchlistItemWithAnime[];
  statusConfig: StatusConfig;
  onViewDetails: (id: Id<"anime">) => void;
  onEditNotes: (item: WatchlistItemWithAnime) => void;
  columnWidth?: number;
  rowHeight?: number;
}

const WatchlistItem: React.FC<{
  data: WatchlistItemWithAnime;
  statusConfig: StatusConfig;
  style: React.CSSProperties;
  onViewDetails: (id: Id<"anime">) => void;
  onEditNotes: (item: WatchlistItemWithAnime) => void;
}> = ({ data, statusConfig, style, onViewDetails, onEditNotes }) => {
  if (!data.anime) return null;
  return (
    <div style={style} className="p-2 group">
      <div className="relative bg-black/20 backdrop-blur-sm rounded-2xl overflow-hidden border border-white/10 group-hover:border-white/30 transition-all duration-300">
        <div className="relative">
          <AnimeCard anime={data.anime} onViewDetails={onViewDetails} className="w-full" />
          <div className="absolute top-2 right-2">
            <div className={`p-1.5 rounded-full bg-gradient-to-r ${statusConfig[data.status]?.color || statusConfig.All.color} shadow-lg`}>
              <span className="text-xs">{statusConfig[data.status]?.icon || "📚"}</span>
            </div>
          </div>
        </div>
        <div className="p-3 bg-gradient-to-t from-black/80 to-transparent">
          <h4 className="text-sm font-medium text-white text-center truncate mb-2 group-hover:text-brand-accent-gold transition-colors duration-300" title={data.anime.title}>
            {data.anime.title}
          </h4>
          <div className="space-y-2">
            <StyledButton
              onClick={() => onEditNotes(data)}
              variant="ghost"
              className="w-full !text-xs !py-1.5 !bg-white/10 !backdrop-blur-sm !border-white/20 hover:!bg-white/20 !text-white flex items-center justify-center gap-1"
            >
              <span className="text-sm">📝</span>
              {data.notes ? "Edit Notes" : "Add Notes"}
            </StyledButton>
            {data.notes && (
              <div className="bg-black/40 backdrop-blur-sm rounded-lg p-2 border border-white/10">
                <p className="text-xs text-white/80 line-clamp-2 leading-relaxed" title={data.notes}>{data.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const VirtualizedWatchlist: React.FC<VirtualizedWatchlistProps> = ({ items, statusConfig, onViewDetails, onEditNotes, columnWidth = 200, rowHeight = 340 }) => {
  return (
    <div style={{ height: "70vh" }}>
      <AutoSizer>
        {({ height, width }) => {
          const columnCount = Math.max(1, Math.floor(width / columnWidth));
          const rowCount = Math.ceil(items.length / columnCount);
          return (
            <Grid
              columnCount={columnCount}
              columnWidth={columnWidth}
              height={height}
              rowCount={rowCount}
              rowHeight={rowHeight}
              width={width}
            >
              {({ columnIndex, rowIndex, style }) => {
                const index = rowIndex * columnCount + columnIndex;
                if (index >= items.length) return null;
                return (
                  <WatchlistItem
                    data={items[index]}
                    statusConfig={statusConfig}
                    style={style}
                    onViewDetails={onViewDetails}
                    onEditNotes={onEditNotes}
                  />
                );
              }}
            </Grid>
          );
        }}
      </AutoSizer>
    </div>
  );
};

export default VirtualizedWatchlist;