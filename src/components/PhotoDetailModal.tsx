import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  Heart,
  Share2,
  Trash2,
  SlidersHorizontal,
  Info,
  MoreVertical,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Download,
  Copy,
  Calendar,
  Image as ImageIcon,
  HardDrive,
  MapPin,
  X
} from "lucide-react";
import { MediaItem } from "../types";
import { formatBytes } from "../utils/mediaUtils";

interface PhotoDetailModalProps {
  items: MediaItem[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (index: number) => void;
  onToggleFavorite: (item: MediaItem) => void;
  onDelete: (item: MediaItem) => void;
  onEdit: (item: MediaItem) => void;
}

export function PhotoDetailModal({
  items,
  currentIndex,
  isOpen,
  onClose,
  onNavigate,
  onToggleFavorite,
  onDelete,
  onEdit,
}: PhotoDetailModalProps) {
  const [showControls, setShowControls] = useState(true);
  const [showInfoSheet, setShowInfoSheet] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);

  // Native HTML5 video ref for imperative, zero-re-render high performance
  const videoRef = useRef<HTMLVideoElement>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchStartTime = useRef(0);

  const currentItem = items[currentIndex];

  useEffect(() => {
    // Reset video state on item switch
    if (currentItem?.isVideo && videoRef.current) {
      videoRef.current.currentTime = 0;
      setVideoCurrentTime(0);
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  }, [currentIndex, currentItem?.isVideo]);

  if (!isOpen || !currentItem) return null;

  // Imperative video play/pause toggle
  const togglePlayPause = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  const formatVideoTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const newTime = parseFloat(e.target.value);
    setVideoCurrentTime(newTime);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  };

  // Touch Swipe gestures (Next/Prev & Dismiss)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchStartTime.current = Date.now();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    const deltaTime = Date.now() - touchStartTime.current;

    // Fast swipe down -> Dismiss
    if (deltaY > 80 && Math.abs(deltaY) > Math.abs(deltaX) * 1.5 && deltaTime < 400) {
      onClose();
      return;
    }

    // Swipe up -> Open info sheet
    if (deltaY < -80 && Math.abs(deltaY) > Math.abs(deltaX) * 1.5 && deltaTime < 400) {
      setShowInfoSheet(true);
      return;
    }

    // Horizontal swipe -> Prev / Next
    if (Math.abs(deltaX) > 50 && deltaTime < 500) {
      if (deltaX < 0 && currentIndex < items.length - 1) {
        onNavigate(currentIndex + 1);
      } else if (deltaX > 0 && currentIndex > 0) {
        onNavigate(currentIndex - 1);
      }
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: currentItem.caption || currentItem.name,
          url: window.location.origin + currentItem.url,
        });
      } catch {}
    } else {
      navigator.clipboard.writeText(window.location.origin + currentItem.url);
      alert("Media link copied to clipboard!");
    }
  };

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = currentItem.url;
    a.download = currentItem.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setShowMoreMenu(false);
  };

  const dateObj = new Date(currentItem.lastModified);
  const formattedDate = !isNaN(dateObj.getTime())
    ? dateObj.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      }) +
      " • " +
      dateObj.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    : "Recent";

  return (
    <div className="fixed inset-0 z-50 bg-black text-white flex flex-col justify-between select-none overflow-hidden">
      {/* Top Header Bar */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-0 left-0 right-0 z-30 pt-safe px-3 sm:px-4 py-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between transition-all"
          >
            {/* Back Button */}
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="p-2 rounded-full bg-black/30 backdrop-blur-md hover:bg-black/50 active:bg-black/70 text-white transition-colors"
                title="Back to gallery"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="text-xs text-white/80 font-medium truncate max-w-[160px] sm:max-w-xs">
                {formattedDate}
              </div>
            </div>

            {/* Top Right Action Buttons */}
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={() => onToggleFavorite(currentItem)}
                className="p-2 rounded-full bg-black/30 backdrop-blur-md hover:bg-black/50 text-white transition-colors"
                title="Favorite"
              >
                <Heart
                  className={`w-5 h-5 ${currentItem.isFavorite ? "fill-red-500 text-red-500" : "text-white"}`}
                />
              </button>

              <button
                onClick={() => setShowInfoSheet(!showInfoSheet)}
                className="p-2 rounded-full bg-black/30 backdrop-blur-md hover:bg-black/50 text-white transition-colors"
                title="Info & EXIF"
              >
                <Info className="w-5 h-5" />
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowMoreMenu(!showMoreMenu)}
                  className="p-2 rounded-full bg-black/30 backdrop-blur-md hover:bg-black/50 text-white transition-colors"
                  title="More options"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>

                {/* More Options Dropdown */}
                {showMoreMenu && (
                  <div
                    className="absolute right-0 top-11 w-48 bg-[#202124] text-white rounded-2xl shadow-2xl py-2 border border-gray-700 z-50 text-sm"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={handleDownload}
                      className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-gray-700/60 transition-colors text-left"
                    >
                      <Download className="w-4 h-4 text-gray-300" />
                      <span>Download</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowMoreMenu(false);
                        setShowInfoSheet(true);
                      }}
                      className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-gray-700/60 transition-colors text-left"
                    >
                      <Info className="w-4 h-4 text-gray-300" />
                      <span>Details</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowMoreMenu(false);
                        onDelete(currentItem);
                      }}
                      className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-red-900/30 text-red-400 transition-colors text-left"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                      <span>Delete from Swift</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Media Stage */}
      <div
        className="relative flex-1 w-full h-full flex items-center justify-center cursor-pointer"
        onClick={() => setShowControls(!showControls)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {currentItem.isVideo ? (
          <div className="relative w-full h-full flex items-center justify-center bg-black">
            <video
              ref={videoRef}
              src={currentItem.url}
              autoPlay
              playsInline
              loop
              className="max-w-full max-h-full object-contain"
              onClick={togglePlayPause}
              onTimeUpdate={() => {
                if (videoRef.current) {
                  setVideoCurrentTime(videoRef.current.currentTime);
                }
              }}
              onLoadedMetadata={() => {
                if (videoRef.current) {
                  setVideoDuration(videoRef.current.duration);
                }
              }}
            />

            {/* Video Play/Pause Overlay Indicator */}
            {showControls && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <button
                  onClick={togglePlayPause}
                  className="p-4 rounded-full bg-black/40 backdrop-blur-md text-white pointer-events-auto hover:bg-black/60 transition-all active:scale-95"
                >
                  {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 fill-white ml-0.5" />}
                </button>
              </div>
            )}

            {/* Video Audio, Timeline Scrubber & Duration Overlay */}
            {showControls && (
              <div
                className="absolute bottom-20 left-4 right-4 z-20 flex flex-col gap-2 pointer-events-auto bg-black/50 backdrop-blur-md p-3 rounded-2xl border border-white/10"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Timeline slider bar */}
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-mono text-white/90 shrink-0">
                    {formatVideoTime(videoCurrentTime)}
                  </span>
                  <input
                    type="range"
                    min="0"
                    max={videoDuration || 100}
                    step="0.1"
                    value={videoCurrentTime}
                    onChange={handleSeek}
                    className="flex-1 h-1.5 bg-white/30 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:bg-white/40 transition-all"
                  />
                  <span className="text-[11px] font-mono text-white/60 shrink-0">
                    {formatVideoTime(videoDuration)}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={toggleMute}
                    className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                    title={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <span className="text-[11px] font-medium text-white/80">
                    {currentItem.duration ? `Duration: ${currentItem.duration}` : "HD Video"}
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center p-0 sm:p-4">
            <img
              src={currentItem.url}
              alt={currentItem.caption || currentItem.name}
              className="max-w-full max-h-full object-contain transition-transform duration-300"
              loading="eager"
            />
          </div>
        )}

        {/* Desktop Navigation Arrows */}
        {currentIndex > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNavigate(currentIndex - 1);
            }}
            className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/40 backdrop-blur-md hover:bg-black/70 text-white z-20 transition-all active:scale-95"
            title="Previous"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {currentIndex < items.length - 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNavigate(currentIndex + 1);
            }}
            className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/40 backdrop-blur-md hover:bg-black/70 text-white z-20 transition-all active:scale-95"
            title="Next"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Bottom Floating Google Photos Action Bar */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-0 left-0 right-0 z-30 pb-safe px-4 py-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex justify-around items-center"
          >
            {/* Share */}
            <button
              onClick={handleShare}
              className="flex flex-col items-center gap-1 p-2 text-white/90 hover:text-white transition-colors"
            >
              <Share2 className="w-5 h-5" />
              <span className="text-[11px] font-medium tracking-tight">Share</span>
            </button>

            {/* Edit */}
            {!currentItem.isVideo && (
              <button
                onClick={() => onEdit(currentItem)}
                className="flex flex-col items-center gap-1 p-2 text-white/90 hover:text-white transition-colors"
              >
                <SlidersHorizontal className="w-5 h-5" />
                <span className="text-[11px] font-medium tracking-tight">Edit</span>
              </button>
            )}

            {/* Lens / Enhance */}
            <button
              onClick={() => setShowInfoSheet(true)}
              className="flex flex-col items-center gap-1 p-2 text-white/90 hover:text-white transition-colors"
            >
              <Sparkles className="w-5 h-5 text-blue-400" />
              <span className="text-[11px] font-medium tracking-tight text-blue-300">Info</span>
            </button>

            {/* Delete */}
            <button
              onClick={() => onDelete(currentItem)}
              className="flex flex-col items-center gap-1 p-2 text-white/90 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-5 h-5" />
              <span className="text-[11px] font-medium tracking-tight">Delete</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Swipe-Up EXIF & Details Sheet */}
      <AnimatePresence>
        {showInfoSheet && (
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end justify-center"
            onClick={() => setShowInfoSheet(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full max-w-lg bg-[#202124] text-white rounded-t-3xl p-5 pb-safe max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Sheet Drag Handle */}
              <div className="w-10 h-1 bg-gray-600 rounded-full mx-auto mb-4" />

              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">Details</h3>
                <button
                  onClick={() => setShowInfoSheet(false)}
                  className="p-1.5 rounded-full hover:bg-gray-700 text-gray-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Detail Items */}
              <div className="space-y-4 text-sm">
                {/* Date & Time */}
                <div className="flex items-start gap-3.5">
                  <Calendar className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-gray-200">{formattedDate}</div>
                    <div className="text-xs text-gray-400">Captured timestamp</div>
                  </div>
                </div>

                {/* File info */}
                <div className="flex items-start gap-3.5">
                  <ImageIcon className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-gray-200 truncate">{currentItem.name}</div>
                    <div className="text-xs text-gray-400">
                      {formatBytes(currentItem.bytes)} • {currentItem.contentType}
                    </div>
                  </div>
                </div>

                {/* Cloud storage info */}
                <div className="flex items-start gap-3.5">
                  <HardDrive className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-gray-200">Blomp OpenStack Swift Cloud</div>
                    <div className="text-xs text-blue-300">
                      Container: youboreme@yopmail.com • 40GB Tier
                    </div>
                  </div>
                </div>

                {/* Device & Location */}
                <div className="flex items-start gap-3.5">
                  <MapPin className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-gray-200">Backed Up to Swift Object Store</div>
                    <div className="text-xs text-gray-400">
                      Original full-res master + 100kb fast grid thumbnail
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions in Info */}
              <div className="mt-6 pt-4 border-t border-gray-700 flex gap-3">
                <button
                  onClick={handleDownload}
                  className="flex-1 py-2.5 bg-gray-700/70 hover:bg-gray-700 rounded-full font-medium text-xs flex items-center justify-center gap-2 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
                <button
                  onClick={() => {
                    setShowInfoSheet(false);
                    onDelete(currentItem);
                  }}
                  className="flex-1 py-2.5 bg-red-950/40 hover:bg-red-900/50 text-red-400 rounded-full font-medium text-xs flex items-center justify-center gap-2 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
