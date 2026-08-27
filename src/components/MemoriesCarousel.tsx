import React from "react";
import { StoryMemory } from "../types";
import { Sparkles } from "lucide-react";

interface MemoriesCarouselProps {
  memories: StoryMemory[];
  onSelectMemory: (memory: StoryMemory) => void;
}

export function MemoriesCarousel({ memories, onSelectMemory }: MemoriesCarouselProps) {
  if (!memories || memories.length === 0) return null;

  return (
    <div className="w-full py-3 pl-3.5 sm:pl-5 overflow-hidden">
      <div className="flex items-center gap-2 mb-2 pr-3.5">
        <Sparkles className="w-4 h-4 text-blue-600" />
        <span className="text-xs font-semibold text-gray-700 tracking-wide uppercase">Memories</span>
      </div>

      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 pr-4 snap-x">
        {memories.map((mem) => (
          <div
            key={mem.id}
            onClick={() => onSelectMemory(mem)}
            className="group relative shrink-0 w-28 h-40 sm:w-32 sm:h-48 rounded-2xl overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-all duration-300 transform active:scale-95 snap-start ring-2 ring-transparent hover:ring-blue-500"
          >
            {/* Background Image */}
            <img
              src={mem.coverUrl}
              alt={mem.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />

            {/* Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent opacity-60" />

            {/* Top Date Badge */}
            <div className="absolute top-2.5 left-2.5 right-2.5">
              <span className="inline-block px-2 py-0.5 bg-black/40 backdrop-blur-md rounded-full text-[10px] font-semibold text-white/90">
                {mem.dateLabel}
              </span>
            </div>

            {/* Bottom Titles */}
            <div className="absolute bottom-2.5 left-2.5 right-2.5 text-white">
              <div className="font-semibold text-xs leading-tight drop-shadow-sm line-clamp-2">
                {mem.title}
              </div>
              <div className="text-[10px] text-white/80 line-clamp-1 mt-0.5">
                {mem.subtitle}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
