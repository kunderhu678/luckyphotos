import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Heart, Share2, Volume2, VolumeX, Pause, Play } from "lucide-react";
import { StoryMemory, MediaItem } from "../types";

interface StoryViewerModalProps {
  memory: StoryMemory | null;
  onClose: () => void;
  onToggleFavorite?: (item: MediaItem) => void;
}

export function StoryViewerModal({ memory, onClose, onToggleFavorite }: StoryViewerModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const storyDuration = 5000; // 5 seconds per photo

  const items = memory?.items || [];
  const currentItem = items[currentIndex];

  useEffect(() => {
    setCurrentIndex(0);
    setProgress(0);
    setIsPaused(false);
  }, [memory]);

  useEffect(() => {
    if (!memory || items.length === 0 || isPaused) return;

    const interval = 50;
    const step = (interval / storyDuration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (currentIndex < items.length - 1) {
            setCurrentIndex((c) => c + 1);
            return 0;
          } else {
            onClose();
            return 100;
          }
        }
        return prev + step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [memory, currentIndex, items.length, isPaused, onClose]);

  if (!memory || items.length === 0) return null;

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex > 0) {
      setCurrentIndex((c) => c - 1);
      setProgress(0);
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex < items.length - 1) {
      setCurrentIndex((c) => c + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="relative w-full h-full max-w-lg mx-auto bg-black flex flex-col justify-between overflow-hidden shadow-2xl"
        >
          {/* Top Progress Bars */}
          <div className="absolute top-0 left-0 right-0 z-30 pt-safe px-3 pt-3 flex gap-1">
            {items.map((_, idx) => {
              let fillPercent = 0;
              if (idx < currentIndex) fillPercent = 100;
              else if (idx === currentIndex) fillPercent = progress;

              return (
                <div key={idx} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white transition-all duration-75 ease-linear rounded-full"
                    style={{ width: `${fillPercent}%` }}
                  />
                </div>
              );
            })}
          </div>

          {/* Top Controls Header */}
          <div className="absolute top-5 left-0 right-0 z-30 px-4 pt-safe flex items-center justify-between text-white drop-shadow-md">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full overflow-hidden border border-white/40">
                <img src={memory.coverUrl} alt="Cover" className="w-full h-full object-cover" />
              </div>
              <div>
                <div className="font-semibold text-sm leading-tight text-white">{memory.title}</div>
                <div className="text-[11px] text-white/80">{memory.dateLabel}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {currentItem?.isVideo && (
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-2 rounded-full bg-black/30 backdrop-blur-md hover:bg-black/50 text-white"
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              )}
              <button
                onClick={() => setIsPaused(!isPaused)}
                className="p-2 rounded-full bg-black/30 backdrop-blur-md hover:bg-black/50 text-white"
              >
                {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-full bg-black/30 backdrop-blur-md hover:bg-black/50 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Media Content */}
          <div
            className="relative flex-1 flex items-center justify-center"
            onMouseDown={() => setIsPaused(true)}
            onMouseUp={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
          >
            {currentItem && (
              currentItem.isVideo ? (
                <video
                  ref={videoRef}
                  src={currentItem.url}
                  autoPlay
                  playsInline
                  muted={isMuted}
                  loop
                  className="w-full h-full object-contain"
                />
              ) : (
                <img
                  src={currentItem.url}
                  alt={currentItem.caption || "Story"}
                  className="w-full h-full object-contain"
                />
              )
            )}

            {/* Tap zones for left/right navigation */}
            <div className="absolute inset-y-0 left-0 w-1/3 z-20 cursor-pointer" onClick={handlePrev} />
            <div className="absolute inset-y-0 right-0 w-1/3 z-20 cursor-pointer" onClick={handleNext} />
          </div>

          {/* Bottom Footer Actions */}
          <div className="absolute bottom-0 left-0 right-0 z-30 p-4 pb-safe bg-gradient-to-t from-black/80 via-black/30 to-transparent flex items-center justify-between text-white">
            <div className="text-sm font-medium drop-shadow-md text-white/90">
              {currentItem?.caption || memory.subtitle}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => currentItem && onToggleFavorite?.(currentItem)}
                className="p-2.5 rounded-full bg-white/20 backdrop-blur-md hover:bg-white/30 text-white"
                title="Favorite"
              >
                <Heart
                  className={`w-5 h-5 ${currentItem?.isFavorite ? "fill-red-500 text-red-500" : "text-white"}`}
                />
              </button>
              <button
                onClick={() => {
                  if (navigator.share && currentItem) {
                    navigator.share({ title: "Google Photos Memory", url: window.location.href }).catch(() => {});
                  } else {
                    alert("Link copied!");
                  }
                }}
                className="p-2.5 rounded-full bg-white/20 backdrop-blur-md hover:bg-white/30 text-white"
                title="Share"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
