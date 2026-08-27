import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  CheckCircle2,
  Play,
  Grid3X3,
  Grid2X2,
  LayoutGrid,
  Calendar,
  Cloud,
  Layers,
  Sparkles
} from "lucide-react";
import { MediaItem, GridDensity } from "../types";
import { groupMediaByDate, getMonthYearLabel } from "../utils/mediaUtils";

interface PhotoGridProps {
  items: MediaItem[];
  density: GridDensity;
  onChangeDensity: (density: GridDensity) => void;
  isSelectMode: boolean;
  selectedTargets: Set<string>;
  onToggleSelect: (item: MediaItem) => void;
  onOpenItem: (index: number) => void;
  onEnterSelectMode: (item: MediaItem) => void;
}

export function PhotoGrid({
  items,
  density,
  onChangeDensity,
  isSelectMode,
  selectedTargets,
  onToggleSelect,
  onOpenItem,
  onEnterSelectMode,
}: PhotoGridProps) {
  const [activeScrubMonth, setActiveScrubMonth] = useState<string | null>("August");
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [isFastScrolling, setIsFastScrolling] = useState(false);
  const [viewMode, setViewMode] = useState<"mosaic" | "justified">("mosaic");
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const dateGroups = groupMediaByDate(items);

  // Flattened index lookup
  const itemIndexMap = new Map<string, number>();
  items.forEach((it, idx) => itemIndexMap.set(it.name, idx));

  // Dynamic fast scroll listener to detect scroll position and month label
  useEffect(() => {
    let lastScrollTop = window.scrollY;
    const handleScroll = () => {
      const currentScrollTop = window.scrollY;
      const speed = Math.abs(currentScrollTop - lastScrollTop);
      lastScrollTop = currentScrollTop;

      const groupElements = document.querySelectorAll("[data-date-group]");
      for (const el of Array.from(groupElements)) {
        const rect = el.getBoundingClientRect();
        if (rect.top <= 250 && rect.bottom >= 50) {
          const month = el.getAttribute("data-month");
          if (month) setActiveScrubMonth(month);
          break;
        }
      }

      if (speed > 35) {
        setIsFastScrolling(true);
      }

      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        setIsFastScrolling(false);
      }, 1000);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, []);

  // Handle long press to trigger select mode
  const handleTouchStart = (item: MediaItem) => {
    if (isSelectMode) return;
    longPressTimerRef.current = setTimeout(() => {
      onEnterSelectMode(item);
    }, 450);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
  };

  // Helper to determine span and aspect ratio styles for tightly packed mosaic
  const getItemSpanClass = (item: MediaItem, indexInGroup: number) => {
    // If density is 1 or 2 (large preview)
    if (density === 1) return "col-span-full aspect-auto min-h-[300px]";
    if (density === 2) {
      if (item.aspectRatio && item.aspectRatio < 0.7) {
        return "row-span-2 aspect-[9/16]";
      }
      if (item.aspectRatio && item.aspectRatio > 1.4) {
        return "col-span-2 aspect-[16/9]";
      }
      return "aspect-[4/3]";
    }

    // Standard density 3 (Google Photos mobile mosaic layout)
    // Tall portrait photos (e.g. Bougainvillea flowers) span 2 rows vertically
    if (item.aspectRatio && item.aspectRatio <= 0.65) {
      return "row-span-2 col-span-1 h-full min-h-[240px]";
    }

    // Wide landscape photos
    if (item.aspectRatio && item.aspectRatio >= 1.6 && indexInGroup % 5 === 0) {
      return "col-span-2 aspect-[16/9]";
    }

    // Standard portrait / photos
    if (item.aspectRatio && item.aspectRatio < 0.9) {
      return "aspect-[3/4]";
    }

    // Landscape photos
    if (item.aspectRatio && item.aspectRatio > 1.2) {
      return "aspect-[4/3]";
    }

    return "aspect-square";
  };

  return (
    <div className="relative w-full pb-28 select-none font-sans">
      {/* Floating Centered Month Header Pill (As shown in screenshot IMG_5524.PNG) */}
      <div className="sticky top-[58px] z-30 flex items-center justify-between px-3 sm:px-5 py-1.5 bg-white/90 backdrop-blur-md border-b border-gray-100/80">
        <div className="flex items-center gap-2">
          {/* Centered Month Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-gray-200/90 shadow-sm text-xs font-semibold text-gray-800">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span>{activeScrubMonth || "Photos"}</span>
          </div>

          <span className="text-[11px] font-medium text-gray-400 hidden sm:inline">
            {items.length} items • Cloud Synced
          </span>
        </div>

        {/* Layout & Density Controls */}
        <div className="flex items-center gap-1 bg-gray-100/90 p-0.5 rounded-full border border-gray-200/60 shadow-inner-xs">
          <button
            onClick={() => onChangeDensity(2)}
            className={`p-1.5 rounded-full transition-all ${
              density === 2 ? "bg-white text-blue-600 shadow-xs font-bold" : "text-gray-500 hover:text-gray-800"
            }`}
            title="Large view"
          >
            <Grid2X2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onChangeDensity(3)}
            className={`p-1.5 rounded-full transition-all ${
              density === 3 ? "bg-white text-blue-600 shadow-xs font-bold" : "text-gray-500 hover:text-gray-800"
            }`}
            title="Standard tightly packed view"
          >
            <Grid3X3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onChangeDensity(5)}
            className={`p-1.5 rounded-full transition-all ${
              density === 5 ? "bg-white text-blue-600 shadow-xs font-bold" : "text-gray-500 hover:text-gray-800"
            }`}
            title="Compact view"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Date Groups with Tightly Packed Mosaic Layout */}
      <div className="w-full">
        {dateGroups.map((group) => (
          <div key={group.key} data-date-group data-month={group.monthLabel} className="mb-3">
            {/* Sticky Date Group Header */}
            <div className="sticky top-[98px] z-20 bg-white/95 backdrop-blur-md px-3 sm:px-4 py-1.5 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-gray-900 tracking-tight flex items-center gap-1.5">
                  {group.title}
                </h2>
                {group.subtitle && (
                  <p className="text-[11px] text-gray-500 font-medium">{group.subtitle}</p>
                )}
              </div>

              {/* Quick Select Group Button if in select mode */}
              {isSelectMode && (
                <button
                  onClick={() => {
                    const allSelected = group.items.every((it) => selectedTargets.has(it.name));
                    group.items.forEach((it) => {
                      if (allSelected) {
                        if (selectedTargets.has(it.name)) onToggleSelect(it);
                      } else {
                        if (!selectedTargets.has(it.name)) onToggleSelect(it);
                      }
                    });
                  }}
                  className="text-xs text-blue-600 font-semibold px-2.5 py-1 rounded-full hover:bg-blue-50 transition-colors"
                >
                  {group.items.every((it) => selectedTargets.has(it.name)) ? "Deselect" : "Select Day"}
                </button>
              )}
            </div>

            {/* Tightly Packed Grid with Tiny 1.5px Separator Line (gap-[1.5px] / gap-[2px]) */}
            <div
              className={`grid gap-[2px] bg-white ${
                density === 1
                  ? "grid-cols-1"
                  : density === 2
                  ? "grid-cols-2"
                  : density === 5
                  ? "grid-cols-4 sm:grid-cols-5 md:grid-cols-6"
                  : "grid-cols-3 sm:grid-cols-4 md:grid-cols-5"
              }`}
              style={{ gridAutoFlow: "dense" }}
            >
              {group.items.map((item, indexInGroup) => {
                const globalIndex = itemIndexMap.get(item.name) ?? 0;
                const isSelected = selectedTargets.has(item.name);
                const spanClass = getItemSpanClass(item, indexInGroup);

                return (
                  <div
                    key={item.name}
                    onTouchStart={() => handleTouchStart(item)}
                    onTouchEnd={handleTouchEnd}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      onEnterSelectMode(item);
                    }}
                    onClick={() => {
                      if (isSelectMode) {
                        onToggleSelect(item);
                      } else {
                        onOpenItem(globalIndex);
                      }
                    }}
                    className={`group relative overflow-hidden cursor-pointer bg-gray-100 transition-all duration-150 ${spanClass} ${
                      isSelected
                        ? "ring-3 ring-blue-600 scale-[0.96] rounded-xl z-10"
                        : "hover:brightness-95 active:scale-[0.985]"
                    }`}
                  >
                    {/* Media Thumbnail with True Dimension Preservation */}
                    <img
                      src={item.thumbUrl || (item.isVideo ? `/api/thumbnail?path=${encodeURIComponent(item.name)}` : item.url)}
                      alt={item.caption || item.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      loading="lazy"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        if (!item.isVideo && item.url && target.src !== item.url) {
                          target.src = item.url;
                        } else if (item.isVideo && !target.src.includes("/api/thumbnail")) {
                          target.src = `/api/thumbnail?path=${encodeURIComponent(item.name)}`;
                        }
                      }}
                    />

                    {/* Video Duration & Play Icon Overlay (Top-Left, matching Google Photos screenshot) */}
                    {item.isVideo && (
                      <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-xs flex items-center gap-1 text-[11px] font-semibold text-white pointer-events-none shadow-sm">
                        <span>{item.duration || "0:05"}</span>
                        <Play className="w-2.5 h-2.5 fill-white text-white" />
                      </div>
                    )}

                    {/* Google Cloud Synced Icon (Bottom-Right, matching screenshot IMG_5524.PNG) */}
                    <div className="absolute bottom-1.5 right-1.5 pointer-events-none drop-shadow-md">
                      <Cloud className="w-3.5 h-3.5 text-white/90 fill-white/20 stroke-[2.2]" />
                    </div>

                    {/* Selection Checkbox Overlay */}
                    {isSelectMode && (
                      <div className="absolute top-1.5 left-1.5 z-10">
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center border-2 transition-all ${
                            isSelected
                              ? "bg-blue-600 border-white text-white shadow-md"
                              : "bg-black/30 border-white text-transparent"
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4 fill-blue-600 text-white" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Floating Timeline Quick Scrubber Pill */}
      <AnimatePresence>
        {(isFastScrolling || isScrubbing) && activeScrubMonth && (
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.9 }}
            className="fixed right-4 top-1/2 -translate-y-1/2 z-40 px-3.5 py-2 bg-gray-900/90 backdrop-blur-md text-white rounded-2xl shadow-xl flex items-center gap-2 border border-white/20 pointer-events-none"
          >
            <Calendar className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-bold tracking-wide">{activeScrubMonth}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
