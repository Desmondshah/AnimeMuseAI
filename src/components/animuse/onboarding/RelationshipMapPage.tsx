import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { motion, AnimatePresence } from "framer-motion";

interface GraphNode {
  id: string;
  name: string;
  genres: string[];
  year?: number;
  rating?: number;
  posterUrl?: string;
  nodeType: 'anime' | 'genre' | 'studio';
  color?: string;
  size?: number;
  cluster?: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

interface GraphLink {
  source: string;
  target: string;
  strength: number;
  type: 'genre' | 'studio' | 'year' | 'rating';
  color?: string;
  width?: number;
}

interface FilterState {
  showGenreNodes: boolean;
  showStudioNodes: boolean;
  minYear: number;
  maxYear: number;
  minRating: number;
  connectionType: 'all' | 'genre' | 'studio' | 'year';
  searchQuery: string;
}

const RELATIONSHIP_COLORS = {
  genre: '#FF6B35',
  studio: '#B08968',
  year: '#F4A261',
  rating: '#00D9FF'
};

const NODE_COLORS = {
  anime: '#FF6B35',
  genre: '#B08968',
  studio: '#F4A261'
};

export default function RelationshipMapPage() {
  const fetchTrending = useAction(api.externalApis.fetchTrendingAnime);
  const fetchTopRated = useAction(api.externalApis.fetchTopRatedAnime);
  const fetchPopular = useAction(api.externalApis.fetchPopularAnime);
  
  const [data, setData] = useState<{ nodes: GraphNode[]; links: GraphLink[] }>({
    nodes: [],
    links: [],
  });
  
  const [filteredData, setFilteredData] = useState<{ nodes: GraphNode[]; links: GraphLink[] }>({
    nodes: [],
    links: [],
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    showGenreNodes: true,
    showStudioNodes: false,
    minYear: 2000,
    maxYear: 2024,
    minRating: 0,
    connectionType: 'all',
    searchQuery: ''
  });
  
  const [viewMode, setViewMode] = useState<'universe' | 'clusters' | 'timeline'>('universe');
  const [highlightNodes, setHighlightNodes] = useState<Set<string>>(new Set());
  const [highlightLinks, setHighlightLinks] = useState<Set<string>>(new Set());
  
  // Canvas rendering refs - FIXED: Replace ForceGraph2D
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragNode, setDragNode] = useState<GraphNode | null>(null);

  // Enhanced data processing function - SAME AS ORIGINAL
  const processAnimeData = useCallback((animes: any[]) => {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const genreNodes = new Map<string, GraphNode>();
    const studioNodes = new Map<string, GraphNode>();

    // Create anime nodes
    animes.forEach((anime, idx) => {
      const animeNode: GraphNode = {
        id: `anime-${idx}`,
        name: anime.title,
        genres: anime.genres || [],
        year: anime.year,
        rating: anime.rating,
        posterUrl: anime.posterUrl,
        nodeType: 'anime',
        color: NODE_COLORS.anime,
        size: Math.max(8, (anime.rating || 5) * 1.5),
        cluster: anime.genres?.[0] || 'unknown'
      };
      nodes.push(animeNode);

      // Create genre nodes
      (anime.genres || []).forEach((genre: string) => {
        if (!genreNodes.has(genre)) {
          genreNodes.set(genre, {
            id: `genre-${genre}`,
            name: genre,
            genres: [genre],
            nodeType: 'genre',
            color: NODE_COLORS.genre,
            size: 6,
            cluster: genre
          });
        }
      });

      // Create studio nodes
      (anime.studios || []).forEach((studio: string) => {
        if (!studioNodes.has(studio)) {
          studioNodes.set(studio, {
            id: `studio-${studio}`,
            name: studio,
            genres: [],
            nodeType: 'studio',
            color: NODE_COLORS.studio,
            size: 5,
            cluster: 'studios'
          });
        }
      });
    });

    // Add genre and studio nodes
    nodes.push(...Array.from(genreNodes.values()));
    nodes.push(...Array.from(studioNodes.values()));

    // Create links
    animes.forEach((animeA, idxA) => {
      // Anime to genre links
      (animeA.genres || []).forEach((genre: string) => {
        links.push({
          source: `anime-${idxA}`,
          target: `genre-${genre}`,
          strength: 1,
          type: 'genre',
          color: RELATIONSHIP_COLORS.genre,
          width: 2
        });
      });

      // Anime to studio links
      (animeA.studios || []).forEach((studio: string) => {
        links.push({
          source: `anime-${idxA}`,
          target: `studio-${studio}`,
          strength: 1,
          type: 'studio',
          color: RELATIONSHIP_COLORS.studio,
          width: 1.5
        });
      });

      // Anime to anime links (shared genres)
      animes.forEach((animeB, idxB) => {
        if (idxA !== idxB) {
          const sharedGenres = (animeA.genres || []).filter((g: string) =>
            (animeB.genres || []).includes(g)
          );
          
          if (sharedGenres.length > 0) {
            const strength = sharedGenres.length / Math.max(animeA.genres?.length || 1, animeB.genres?.length || 1);
            if (strength > 0.3) { // Only strong connections
              links.push({
                source: `anime-${idxA}`,
                target: `anime-${idxB}`,
                strength,
                type: 'genre',
                color: `rgba(255, 107, 53, ${strength * 0.6})`,
                width: strength * 3
              });
            }
          }
        }
      });
    });

    return { nodes, links };
  }, []);

  // FIXED: Working Canvas Renderer - Replace ForceGraph2D
  const startSimulation = useCallback((nodes: GraphNode[], links: GraphLink[]) => {
    if (!canvasRef.current || nodes.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Initialize positions
    nodes.forEach(node => {
      if (node.x === undefined) node.x = Math.random() * width;
      if (node.y === undefined) node.y = Math.random() * height;
      if (node.vx === undefined) node.vx = 0;
      if (node.vy === undefined) node.vy = 0;
    });

    let alpha = 1.0;
    const alphaDecay = 0.0228;
    const alphaMin = 0.001;

    const animate = () => {
      // Clear canvas
      ctx.fillStyle = 'transparent';
      ctx.clearRect(0, 0, width, height);

      if (alpha > alphaMin) {
        // Apply forces
        const centerX = width / 2;
        const centerY = height / 2;

        // Center force
        nodes.forEach(node => {
          if (node.fx === null && node.fy === null) {
            const dx = centerX - node.x!;
            const dy = centerY - node.y!;
            node.vx! += dx * 0.0003 * alpha;
            node.vy! += dy * 0.0003 * alpha;
          }
        });

        // Collision/repulsion
        nodes.forEach((nodeA, i) => {
          nodes.forEach((nodeB, j) => {
            if (i !== j && nodeA.fx === null && nodeA.fy === null) {
              const dx = nodeA.x! - nodeB.x!;
              const dy = nodeA.y! - nodeB.y!;
              const distance = Math.sqrt(dx * dx + dy * dy);
              const minDistance = (nodeA.size! + nodeB.size!) + 20;
              
              if (distance < minDistance && distance > 0) {
                const force = (minDistance - distance) / distance * 0.1 * alpha;
                nodeA.vx! += (dx / distance) * force;
                nodeA.vy! += (dy / distance) * force;
              }
            }
          });
        });

        // Link forces
        links.forEach(link => {
          const source = nodes.find(n => n.id === link.source);
          const target = nodes.find(n => n.id === link.target);
          
          if (source && target) {
            const dx = target.x! - source.x!;
            const dy = target.y! - source.y!;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            let targetDistance = 80;
            if (link.type === 'genre') targetDistance = 60;
            else if (link.type === 'studio') targetDistance = 100;
            
            if (distance > 0) {
              const force = (distance - targetDistance) / distance * link.strength * 0.01 * alpha;
              
              if (source.fx === null && source.fy === null) {
                source.vx! += (dx / distance) * force;
                source.vy! += (dy / distance) * force;
              }
              if (target.fx === null && target.fy === null) {
                target.vx! -= (dx / distance) * force;
                target.vy! -= (dy / distance) * force;
              }
            }
          }
        });

        // Update positions
        nodes.forEach(node => {
          if (node.fx === null && node.fy === null) {
            node.vx! *= 0.95;
            node.vy! *= 0.95;
            
            node.x! += node.vx!;
            node.y! += node.vy!;

            // Boundary constraints
            const padding = node.size! + 10;
            if (node.x! < padding) { node.x! = padding; node.vx! = 0; }
            if (node.x! > width - padding) { node.x! = width - padding; node.vx! = 0; }
            if (node.y! < padding) { node.y! = padding; node.vy! = 0; }
            if (node.y! > height - padding) { node.y! = height - padding; node.vy! = 0; }
          } else {
            if (node.fx !== null) node.x = node.fx;
            if (node.fy !== null) node.y = node.fy;
          }
        });

        alpha *= (1 - alphaDecay);
      }

      // Draw links
      links.forEach(link => {
        const source = nodes.find(n => n.id === link.source);
        const target = nodes.find(n => n.id === link.target);
        
        if (source && target && source.x !== undefined && source.y !== undefined && 
            target.x !== undefined && target.y !== undefined) {
          
          const isHighlighted = highlightLinks.has(`${link.source}-${link.target}`) || 
                                highlightLinks.has(`${link.target}-${link.source}`);
          const opacity = isHighlighted ? '80' : '40';
          const width = (link.width || 1) * (isHighlighted ? 2 : 1);

          ctx.beginPath();
          ctx.moveTo(source.x, source.y);
          ctx.lineTo(target.x, target.y);
          ctx.strokeStyle = (link.color || '#FF6B35') + opacity;
          ctx.lineWidth = width;
          ctx.stroke();
        }
      });

      // Draw nodes with original advanced styling
      nodes.forEach(node => {
        if (node.x !== undefined && node.y !== undefined) {
          const isSelected = selectedNode?.id === node.id;
          const isHighlighted = highlightNodes.has(node.id);
          const nodeColor = node.color || NODE_COLORS[node.nodeType] || '#FF6B35';
          const size = (node.size || 5) * (isSelected ? 1.5 : isHighlighted ? 1.2 : 1);

          // Glow effect for highlighted/selected nodes
          if (isSelected || isHighlighted) {
            ctx.beginPath();
            const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, size * 3);
            gradient.addColorStop(0, nodeColor + '40');
            gradient.addColorStop(1, nodeColor + '00');
            ctx.fillStyle = gradient;
            ctx.arc(node.x, node.y, size * 3, 0, 2 * Math.PI);
            ctx.fill();
          }

          // Main node
          ctx.beginPath();
          ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
          
          if (node.nodeType === 'anime') {
            // Gradient fill for anime nodes
            const gradient = ctx.createRadialGradient(
              node.x - size/3, node.y - size/3, 0,
              node.x, node.y, size
            );
            gradient.addColorStop(0, '#FF8A5C');
            gradient.addColorStop(1, nodeColor);
            ctx.fillStyle = gradient;
          } else {
            ctx.fillStyle = nodeColor;
          }
          
          ctx.fill();

          // Border
          ctx.strokeStyle = isSelected ? '#FFFFFF' : isHighlighted ? '#FFFFFF' : nodeColor;
          ctx.lineWidth = isSelected ? 2 : 1;
          ctx.stroke();

          // Label
          if (size > 3 && alpha < 0.3) {
            ctx.fillStyle = '#FFFFFF';
            ctx.font = `${Math.max(8, size / 2)}px Inter, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            const label = node.name.length > 15 ? node.name.substring(0, 12) + '...' : node.name;
            ctx.fillText(label, node.x, node.y + size + 12);
          }
        }
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();
  }, [selectedNode, highlightNodes, highlightLinks]);

  // Graph interaction handlers - FIXED
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Find clicked node
    const clickedNode = filteredData.nodes.find(node => {
      if (!node.x || !node.y) return false;
      const distance = Math.sqrt((x - node.x) ** 2 + (y - node.y) ** 2);
      return distance <= (node.size || 5) + 5;
    });

    if (clickedNode) {
      setSelectedNode(clickedNode);
      
      // Highlight connected nodes
      const connectedNodes = new Set<string>();
      const connectedLinks = new Set<string>();
      
      filteredData.links.forEach(link => {
        if (link.source === clickedNode.id || link.target === clickedNode.id) {
          connectedNodes.add(link.source as string);
          connectedNodes.add(link.target as string);
          connectedLinks.add(`${link.source}-${link.target}`);
        }
      });
      
      setHighlightNodes(connectedNodes);
      setHighlightLinks(connectedLinks);
    } else {
      setSelectedNode(null);
      setHighlightNodes(new Set());
      setHighlightLinks(new Set());
    }
  }, [filteredData.links]);

  // Apply filters to data - SAME AS ORIGINAL
  const applyFilters = useCallback(() => {
    let filteredNodes = [...data.nodes];
    let filteredLinks = [...data.links];

    // Filter by node types
    if (!filters.showGenreNodes) {
      filteredNodes = filteredNodes.filter(n => n.nodeType !== 'genre');
    }
    if (!filters.showStudioNodes) {
      filteredNodes = filteredNodes.filter(n => n.nodeType !== 'studio');
    }

    // Filter by year range
    filteredNodes = filteredNodes.filter(n => 
      n.nodeType !== 'anime' || 
      !n.year || 
      (n.year >= filters.minYear && n.year <= filters.maxYear)
    );

    // Filter by rating
    filteredNodes = filteredNodes.filter(n =>
      n.nodeType !== 'anime' ||
      !n.rating ||
      n.rating >= filters.minRating
    );

    // Filter by search query
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filteredNodes = filteredNodes.filter(n =>
        n.name.toLowerCase().includes(query) ||
        n.genres.some(g => g.toLowerCase().includes(query))
      );
    }

    // Filter by connection type
    if (filters.connectionType !== 'all') {
      filteredLinks = filteredLinks.filter(l => l.type === filters.connectionType);
    }

    // Remove orphaned links
    const nodeIds = new Set(filteredNodes.map(n => n.id));
    filteredLinks = filteredLinks.filter(l => 
      nodeIds.has(l.source as string) && nodeIds.has(l.target as string)
    );

    setFilteredData({ nodes: filteredNodes, links: filteredLinks });
  }, [data, filters]);

  // Load data - SAME AS ORIGINAL
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [trending, topRated, popular] = await Promise.all([
          fetchTrending({ limit: 15 }),
          fetchTopRated({ limit: 15 }),
          fetchPopular({ limit: 15 })
        ]);

        const allAnimes = [
          ...(trending.animes || []),
          ...(topRated.animes || []),
          ...(popular.animes || [])
        ].filter((anime, index, self) => 
          index === self.findIndex(a => a.title === anime.title)
        );

        const processedData = processAnimeData(allAnimes);
        setData(processedData);
      } catch (err) {
        console.error("Failed to load relationship map data", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [fetchTrending, fetchTopRated, fetchPopular, processAnimeData]);

  // Apply filters when data or filters change - SAME AS ORIGINAL
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // FIXED: Start simulation when filtered data changes
  useEffect(() => {
    if (filteredData.nodes.length > 0 && canvasRef.current) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      startSimulation(filteredData.nodes, filteredData.links);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [filteredData, startSimulation]);

  // FIXED: Handle canvas resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        canvasRef.current.width = rect.width;
        canvasRef.current.height = rect.height;
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const stats = useMemo(() => ({
    totalNodes: filteredData.nodes.length,
    animeNodes: filteredData.nodes.filter(n => n.nodeType === 'anime').length,
    genreNodes: filteredData.nodes.filter(n => n.nodeType === 'genre').length,
    studioNodes: filteredData.nodes.filter(n => n.nodeType === 'studio').length,
    totalConnections: filteredData.links.length
  }), [filteredData]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full bg-gradient-to-r from-brand-primary-action/20 to-brand-accent-gold/20"
              style={{
                width: Math.random() * 100 + 50,
                height: Math.random() * 100 + 50,
                left: Math.random() * 100 + '%',
                top: Math.random() * 100 + '%',
              }}
              animate={{
                x: [0, Math.random() * 200 - 100],
                y: [0, Math.random() * 200 - 100],
                scale: [1, Math.random() * 0.5 + 0.8, 1],
              }}
              transition={{
                duration: Math.random() * 10 + 10,
                repeat: Infinity,
                ease: "linear"
              }}
            />
          ))}
        </div>
        
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="glass-card p-8 text-center">
            <div className="relative mb-6">
              <div className="w-16 h-16 border-4 border-transparent border-t-brand-primary-action border-r-brand-accent-gold rounded-full animate-spin mx-auto"></div>
              <div className="absolute top-2 left-2 w-12 h-12 border-4 border-transparent border-b-brand-accent-peach border-l-white/50 rounded-full animate-spin animate-reverse"></div>
            </div>
            <h2 className="text-2xl font-heading text-white mb-2">Mapping the Anime Universe</h2>
            <p className="text-white/70">Building connections across genres, studios, and stories...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Artistic background - ORIGINAL UI PRESERVED */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-10 left-10 w-96 h-96 bg-gradient-to-br from-brand-primary-action/20 to-transparent rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-16 w-80 h-80 bg-gradient-to-tr from-brand-accent-gold/15 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-gradient-to-l from-brand-accent-peach/10 to-transparent rounded-full blur-3xl animate-ping"></div>
      </div>

      {/* Header - ORIGINAL UI PRESERVED */}
      <div className="relative z-20 p-6">
        <div className="glass-card p-6 mb-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h1 className="text-3xl lg:text-4xl font-heading text-white mb-2">
                🌌 Anime Universe Map
              </h1>
              <p className="text-white/70">
                Explore the interconnected world of anime through genres, studios, and shared themes
              </p>
            </div>
            
            <div className="flex gap-2">
              {(['universe', 'clusters', 'timeline'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                    viewMode === mode
                      ? 'bg-gradient-to-r from-brand-primary-action to-brand-accent-gold text-white'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Stats - ORIGINAL UI PRESERVED */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mt-6">
            {[
              { label: 'Total Nodes', value: stats.totalNodes, icon: '🔵' },
              { label: 'Anime', value: stats.animeNodes, icon: '🎌' },
              { label: 'Genres', value: stats.genreNodes, icon: '🏷️' },
              { label: 'Studios', value: stats.studioNodes, icon: '🏢' },
              { label: 'Connections', value: stats.totalConnections, icon: '🔗' }
            ].map((stat) => (
              <div key={stat.label} className="bg-black/30 rounded-lg p-3 text-center">
                <div className="text-2xl mb-1">{stat.icon}</div>
                <div className="text-xl font-bold text-brand-primary-action">{stat.value}</div>
                <div className="text-xs text-white/60">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Controls - ORIGINAL UI PRESERVED */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
          {/* Search */}
          <div className="glass-card p-4">
            <h3 className="text-white font-medium mb-3 flex items-center gap-2">
              🔍 Search
            </h3>
            <input
              type="text"
              placeholder="Search anime, genres..."
              value={filters.searchQuery}
              onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
              className="form-input w-full bg-black/30 border-white/20 text-white placeholder-white/50"
            />
          </div>

          {/* Node Types */}
          <div className="glass-card p-4">
            <h3 className="text-white font-medium mb-3 flex items-center gap-2">
              🎯 Show Nodes
            </h3>
            <div className="space-y-2">
              {[
                { key: 'showGenreNodes', label: 'Genres', color: NODE_COLORS.genre },
                { key: 'showStudioNodes', label: 'Studios', color: NODE_COLORS.studio }
              ].map((option) => (
                <label key={option.key} className="flex items-center gap-2 text-sm text-white/80">
                  <input
                    type="checkbox"
                    checked={filters[option.key as keyof FilterState] as boolean}
                    onChange={(e) => setFilters(prev => ({ 
                      ...prev, 
                      [option.key]: e.target.checked 
                    }))}
                    className="form-checkbox accent-brand-primary-action"
                  />
                  <span 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: option.color || '#FF6B35' }}
                  ></span>
                  {option.label}
                </label>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div className="glass-card p-4">
            <h3 className="text-white font-medium mb-3 flex items-center gap-2">
              ⚙️ Filters
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-white/60 block mb-1">Min Rating</label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  value={filters.minRating}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    minRating: parseFloat(e.target.value) 
                  }))}
                  className="slider w-full"
                />
                <div className="text-xs text-white/70 text-center">{filters.minRating}+</div>
              </div>
              
              <div>
                <label className="text-xs text-white/60 block mb-1">Connection Type</label>
                <select
                  value={filters.connectionType}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    connectionType: e.target.value as any 
                  }))}
                  className="form-input w-full text-xs bg-black/30 border-white/20 text-white"
                >
                  <option value="all">All Connections</option>
                  <option value="genre">Genre Only</option>
                  <option value="studio">Studio Only</option>
                  <option value="year">Year Based</option>
                </select>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="glass-card p-4">
            <h3 className="text-white font-medium mb-3 flex items-center gap-2">
              🎨 Legend
            </h3>
            <div className="space-y-2">
              {Object.entries(RELATIONSHIP_COLORS).map(([type, color]) => (
                <div key={type} className="flex items-center gap-2 text-xs text-white/80">
                  <div 
                    className="w-3 h-0.5 rounded-full"
                    style={{ backgroundColor: color || '#FF6B35' }}
                  ></div>
                  <span className="capitalize">{type} Links</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Graph Container - FIXED: Replace ForceGraph2D with Canvas */}
      <div className="relative z-10 h-[calc(100vh-24rem)]" ref={containerRef}>
        <div className="glass-card h-full mx-6 overflow-hidden">
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            className="w-full h-full cursor-pointer"
            style={{ display: 'block' }}
          />
        </div>
      </div>

      {/* Selected Node Panel - ORIGINAL UI PRESERVED */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="fixed top-0 right-0 h-full w-80 z-30 bg-black/90 backdrop-blur-xl border-l border-white/20 p-6 overflow-y-auto"
          >
            <button
              onClick={() => setSelectedNode(null)}
              className="absolute top-4 right-4 text-white/60 hover:text-white text-2xl"
            >
              ×
            </button>
            
            <div className="mt-8">
              <div className="flex items-center gap-3 mb-4">
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: selectedNode.color || NODE_COLORS[selectedNode.nodeType] || '#FF6B35' }}
                ></div>
                <span className="text-xs px-2 py-1 bg-white/10 rounded-full text-white/70">
                  {selectedNode.nodeType}
                </span>
              </div>
              
              <h2 className="text-xl font-heading text-white mb-4">{selectedNode.name}</h2>
              
              {selectedNode.nodeType === 'anime' && (
                <div className="space-y-3">
                  {selectedNode.year && (
                    <div className="flex justify-between">
                      <span className="text-white/60">Year:</span>
                      <span className="text-white">{selectedNode.year}</span>
                    </div>
                  )}
                  {selectedNode.rating && (
                    <div className="flex justify-between">
                      <span className="text-white/60">Rating:</span>
                      <span className="text-brand-primary-action">{selectedNode.rating}/10</span>
                    </div>
                  )}
                  {selectedNode.genres.length > 0 && (
                    <div>
                      <span className="text-white/60 block mb-2">Genres:</span>
                      <div className="flex flex-wrap gap-1">
                        {selectedNode.genres.map(genre => (
                          <span 
                            key={genre}
                            className="text-xs px-2 py-1 bg-brand-accent-gold/20 text-brand-accent-gold rounded"
                          >
                            {genre}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              <div className="mt-6">
                <h3 className="text-white font-medium mb-2">Connections</h3>
                <div className="text-sm text-white/70">
                  {Array.from(highlightNodes).length - 1} connected nodes
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}