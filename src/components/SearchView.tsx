import React, { useState } from "react";
import { Search, X, Video, Heart, Sparkles, MapPin, Smile, FileText, Camera, Smartphone } from "lucide-react";
import { MediaItem } from "../types";

interface SearchViewProps {
  items: MediaItem[];
  onOpenItem: (item: MediaItem) => void;
}

export function SearchView({ items, onOpenItem }: SearchViewProps) {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  // Filter items
  const filteredItems = items.filter((item) => {
    if (activeFilter === "videos") return item.isVideo;
    if (activeFilter === "favorites") return item.isFavorite;
    if (activeFilter === "photos") return !item.isVideo;

    if (!query) return true;
    const q = query.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      (item.caption && item.caption.toLowerCase().includes(q)) ||
      item.lastModified.includes(q)
    );
  });

  const categories = [
    { id: "favorites", label: "Favorites", icon: Heart, color: "text-red-500 bg-red-50" },
    { id: "videos", label: "Videos", icon: Video, color: "text-blue-500 bg-blue-50" },
    { id: "photos", label: "Photos", icon: Camera, color: "text-emerald-500 bg-emerald-50" },
    { id: "screenshots", label: "Screenshots", icon: Smartphone, color: "text-purple-500 bg-purple-50" },
  ];

  const peopleSample = [
    { name: "Alex", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80" },
    { name: "Sarah", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80" },
    { name: "Elena", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80" },
    { name: "David", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80" },
  ];

  const placesSample = [
    { name: "Coastlines", img: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&auto=format&fit=crop&q=80" },
    { name: "Mountains", img: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=300&auto=format&fit=crop&q=80" },
    { name: "Cities", img: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=300&auto=format&fit=crop&q=80" },
    { name: "Forests", img: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=300&auto=format&fit=crop&q=80" },
  ];

  return (
    <div className="w-full pb-28 pt-2 px-3.5 sm:px-6 max-w-4xl mx-auto">
      {/* Search Input Bar */}
      <div className="relative mb-5">
        <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search places, favorites, videos..."
          className="w-full bg-gray-100/90 focus:bg-white text-gray-900 placeholder-gray-400 pl-11 pr-10 py-3 rounded-2xl text-sm border border-transparent focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-hidden transition-all shadow-inner-xs"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-200 text-gray-500"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Category Pills */}
      <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-3 mb-6">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isSelected = activeFilter === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveFilter(isSelected ? null : cat.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold shrink-0 transition-all ${
                isSelected
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-gray-100 hover:bg-gray-200/80 text-gray-700"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {!query && !activeFilter && (
        <>
          {/* People & Pets Section */}
          <div className="mb-7">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-800 tracking-tight">People & Pets</h3>
              <span className="text-xs text-blue-600 font-semibold cursor-pointer">View all</span>
            </div>
            <div className="flex gap-3.5 overflow-x-auto no-scrollbar pb-2">
              {peopleSample.map((p, i) => (
                <div
                  key={i}
                  onClick={() => setQuery(p.name)}
                  className="flex flex-col items-center gap-1.5 cursor-pointer shrink-0 group"
                >
                  <div className="w-16 h-16 rounded-full overflow-hidden ring-2 ring-transparent group-hover:ring-blue-500 transition-all shadow-xs">
                    <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                  </div>
                  <span className="text-xs font-medium text-gray-700">{p.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Places Section */}
          <div className="mb-7">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-800 tracking-tight">Places</h3>
              <span className="text-xs text-blue-600 font-semibold cursor-pointer">Explore</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {placesSample.map((pl, i) => (
                <div
                  key={i}
                  onClick={() => setQuery(pl.name)}
                  className="relative aspect-4/3 rounded-2xl overflow-hidden cursor-pointer group shadow-xs"
                >
                  <img
                    src={pl.img}
                    alt={pl.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <div className="absolute bottom-2 left-2.5 text-white font-semibold text-xs drop-shadow-sm">
                    {pl.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Filtered Search Results Grid */}
      <div>
        <h3 className="text-sm font-bold text-gray-800 tracking-tight mb-3">
          {query || activeFilter ? `Results (${filteredItems.length})` : "All Cloud Photos & Videos"}
        </h3>

        {filteredItems.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No matching items found</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1.5">
            {filteredItems.map((item) => (
              <div
                key={item.name}
                onClick={() => onOpenItem(item)}
                className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer active:scale-95 transition-transform group"
              >
                <img
                  src={item.thumbUrl || (item.isVideo ? `/api/thumbnail?path=${encodeURIComponent(item.name)}` : item.url)}
                  alt={item.caption || item.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (!item.isVideo && item.url && target.src !== item.url) {
                      target.src = item.url;
                    }
                  }}
                />
                {item.isVideo && (
                  <div className="absolute bottom-1.5 right-1.5 px-1 py-0.5 rounded-sm bg-black/60 text-[9px] font-bold text-white">
                    VIDEO
                  </div>
                )}
                {item.isFavorite && (
                  <div className="absolute top-1.5 right-1.5">
                    <Heart className="w-3.5 h-3.5 fill-red-500 text-red-500" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
