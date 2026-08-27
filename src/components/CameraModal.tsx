import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Camera as CameraIcon,
  RotateCcw,
  Zap,
  ZapOff,
  Grid,
  Sparkles,
  Check,
  AlertCircle,
  FlipHorizontal,
  CloudUpload,
  Layers
} from "lucide-react";
import { MediaItem } from "../types";

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPhotoCaptured: (newItem: MediaItem, file: File) => void;
  latestMediaItem?: MediaItem;
}

export function CameraModal({
  isOpen,
  onClose,
  onPhotoCaptured,
  latestMediaItem,
}: CameraModalProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [permissionState, setPermissionState] = useState<"prompt" | "granted" | "denied">("prompt");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [flashMode, setFlashMode] = useState<"off" | "on">("off");
  const [showGrid, setShowGrid] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [flashEffect, setFlashEffect] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Play shutter sound via Web Audio API (zero external assets needed)
  const playShutterSound = useCallback(() => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.09);
    } catch {}
  }, []);

  // Request Camera Stream
  const startCamera = useCallback(async (desiredFacing: "user" | "environment" = facingMode) => {
    try {
      setErrorMessage(null);
      // Stop any existing stream
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: desiredFacing,
          width: { ideal: 1920, max: 2560 },
          height: { ideal: 1080, max: 1440 },
        },
        audio: false,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      setPermissionState("granted");

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn("Camera access error:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setPermissionState("denied");
        setErrorMessage("Camera access was denied. Please allow camera permissions in your browser.");
      } else {
        // Try with basic fallback constraints
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
          setStream(fallbackStream);
          setPermissionState("granted");
          if (videoRef.current) {
            videoRef.current.srcObject = fallbackStream;
            videoRef.current.play().catch(() => {});
          }
        } catch (fbErr: any) {
          setPermissionState("denied");
          setErrorMessage(fbErr.message || "Unable to start camera on this device.");
        }
      }
    }
  }, [facingMode, stream]);

  // Handle open/close lifecycle
  useEffect(() => {
    if (isOpen) {
      startCamera(facingMode);
    } else {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }
      setCapturedPreview(null);
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOpen]);

  // Flip Camera between Front and Back
  const handleToggleFacingMode = () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Capture Photo from live Video Stream
  const handleCapture = async () => {
    if (!videoRef.current || isCapturing) return;

    setIsCapturing(true);
    playShutterSound();

    // Trigger visual shutter flash
    setFlashEffect(true);
    setTimeout(() => setFlashEffect(false), 120);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current || document.createElement("canvas");
      const width = video.videoWidth || 1280;
      const height = video.videoHeight || 720;

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not get 2D canvas context");

      // If front camera, flip horizontally for natural selfie orientation
      if (facingMode === "user") {
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
      }

      ctx.drawImage(video, 0, 0, width, height);

      // Fast compression to high-resolution JPEG blob (quality 0.88)
      const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
      setCapturedPreview(dataUrl);

      // Convert dataURL to File for direct upload to Blomp OpenStack Swift
      const timestamp = Date.now();
      const filename = `IMG_${timestamp}.jpg`;

      // Create blob from canvas directly (whichever is fastest)
      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            setIsCapturing(false);
            return;
          }

          const file = new File([blob], filename, { type: "image/jpeg" });

          // Create optimistic MediaItem
          const optimisticItem: MediaItem = {
            name: filename,
            bytes: file.size,
            contentType: "image/jpeg",
            lastModified: new Date().toISOString(),
            isVideo: false,
            hasThumb: true,
            url: dataUrl,
            thumbUrl: dataUrl,
            isFavorite: false,
            caption: "Captured with Google Photos Camera",
            width,
            height,
          };

          onPhotoCaptured(optimisticItem, file);
          setIsCapturing(false);
        },
        "image/jpeg",
        0.88
      );
    } catch (err: any) {
      console.error("Capture error:", err);
      setIsCapturing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black text-white flex flex-col justify-between select-none overflow-hidden font-sans">
      {/* Hidden offscreen canvas for snapshot rendering */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Shutter White Flash Animation */}
      <AnimatePresence>
        {flashEffect && (
          <motion.div
            initial={{ opacity: 0.9 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-white z-40 pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Top Camera Controls Bar */}
      <div className="relative z-30 pt-safe px-4 py-3 bg-gradient-to-b from-black/80 via-black/30 to-transparent flex items-center justify-between">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="p-2.5 rounded-full bg-black/40 backdrop-blur-md hover:bg-black/60 active:bg-black/80 transition-colors"
          title="Close Camera"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        {/* Central Mode & Cloud Sync Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-xs font-medium text-white/90">
          <CloudUpload className="w-3.5 h-3.5 text-blue-400" />
          <span>Blomp Swift Sync</span>
        </div>

        {/* Quick Toggles: Flash, Grid */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFlashMode(flashMode === "off" ? "on" : "off")}
            className={`p-2.5 rounded-full backdrop-blur-md transition-colors ${
              flashMode === "on" ? "bg-amber-400 text-black font-bold" : "bg-black/40 text-white hover:bg-black/60"
            }`}
            title="Toggle Flash"
          >
            {flashMode === "on" ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`p-2.5 rounded-full backdrop-blur-md transition-colors ${
              showGrid ? "bg-blue-600 text-white" : "bg-black/40 text-white hover:bg-black/60"
            }`}
            title="Toggle Composition Grid"
          >
            <Grid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Camera Viewfinder Stream */}
      <div className="relative flex-1 w-full h-full flex items-center justify-center bg-black overflow-hidden">
        {permissionState === "granted" ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover transition-transform ${
                facingMode === "user" ? "scale-x-[-1]" : ""
              }`}
            />

            {/* Rule of Thirds Composition Grid Overlay */}
            {showGrid && (
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                <div className="border-r border-b border-white/20" />
                <div className="border-r border-b border-white/20" />
                <div className="border-b border-white/20" />
                <div className="border-r border-b border-white/20" />
                <div className="border-r border-b border-white/20" />
                <div className="border-b border-white/20" />
                <div className="border-r border-white/20" />
                <div className="border-r border-white/20" />
                <div className="" />
              </div>
            )}

            {/* Screen Flash Overlay when flashMode is ON */}
            {flashMode === "on" && (
              <div className="absolute inset-0 border-8 border-amber-300/40 pointer-events-none" />
            )}
          </>
        ) : permissionState === "denied" ? (
          <div className="max-w-sm px-6 py-8 text-center bg-[#202124] rounded-3xl mx-4 border border-gray-800 shadow-2xl">
            <div className="w-14 h-14 rounded-full bg-red-950/60 text-red-400 flex items-center justify-center mx-auto mb-4 border border-red-800/50">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Camera Permission Required</h3>
            <p className="text-xs text-gray-300 mb-6 leading-relaxed">
              {errorMessage ||
                "Google Photos needs camera permissions to take photos and backup directly to your Blomp OpenStack storage."}
            </p>
            <button
              onClick={() => startCamera(facingMode)}
              className="w-full py-3 rounded-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 font-semibold text-xs text-white transition-all shadow-md"
            >
              Allow Camera Access
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-gray-400">
            <CameraIcon className="w-10 h-10 animate-pulse text-blue-500" />
            <p className="text-xs font-medium">Starting camera...</p>
          </div>
        )}
      </div>

      {/* Bottom Shutter & Controls Stage */}
      <div className="relative z-30 pb-safe pt-4 pb-6 px-6 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex items-center justify-around">
        {/* Left: Gallery Thumbnail / Captured Thumbnail Preview */}
        <div className="w-12 h-12 flex items-center justify-center">
          {capturedPreview ? (
            <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-white ring-2 ring-blue-500 shadow-md">
              <img src={capturedPreview} alt="Captured" className="w-full h-full object-cover" />
            </div>
          ) : latestMediaItem ? (
            <div
              onClick={onClose}
              className="w-11 h-11 rounded-xl overflow-hidden border border-white/40 cursor-pointer active:scale-95 transition-transform"
              title="View in Gallery"
            >
              <img
                src={latestMediaItem.thumbUrl || latestMediaItem.url}
                alt="Latest"
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-11 h-11 rounded-xl bg-gray-800 border border-gray-700" />
          )}
        </div>

        {/* Center: Prominent Red & White Camera Shutter Button */}
        <button
          onClick={handleCapture}
          disabled={permissionState !== "granted" || isCapturing}
          className="relative group p-1 rounded-full border-4 border-white/90 shadow-2xl active:scale-90 transition-transform disabled:opacity-50"
          title="Take Photo"
        >
          {/* Inner pulsating red shutter button */}
          <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-red-600 group-hover:bg-red-500 group-active:bg-red-700 flex items-center justify-center shadow-inner transition-colors">
            {isCapturing ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-white/20 ring-2 ring-white/40" />
            )}
          </div>
        </button>

        {/* Right: Switch Front / Back Camera Flip Button */}
        <div className="w-12 h-12 flex items-center justify-center">
          <button
            onClick={handleToggleFacingMode}
            disabled={permissionState !== "granted"}
            className="p-3 rounded-full bg-black/40 backdrop-blur-md hover:bg-black/60 active:bg-black/80 border border-white/10 text-white active:rotate-180 transition-all disabled:opacity-50"
            title="Switch Camera (Front / Back)"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
