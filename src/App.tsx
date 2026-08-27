import React, { useState, useEffect, useCallback } from "react";
import { TopHeader } from "./components/TopHeader";
import { MemoriesCarousel } from "./components/MemoriesCarousel";
import { PhotoGrid } from "./components/PhotoGrid";
import { PhotoDetailModal } from "./components/PhotoDetailModal";
import { StoryViewerModal } from "./components/StoryViewerModal";
import { BottomNavigation } from "./components/BottomNavigation";
import { AccountModal } from "./components/AccountModal";
import { SearchView } from "./components/SearchView";
import { CollectionsView } from "./components/CollectionsView";
import { CreateModal } from "./components/CreateModal";
import { PhotoEditorModal } from "./components/PhotoEditorModal";
import { CameraModal } from "./components/CameraModal";
import { MediaItem, AccountInfo, StoryMemory, ActiveTab, GridDensity } from "./types";
import { generateMemoriesFromMedia, SAMPLE_FALLBACK_PHOTOS, extractClientVideoThumbnail } from "./utils/mediaUtils";
import { ArrowLeft, UploadCloud } from "lucide-react";

export default function App() {
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [uploadErrorToast, setUploadErrorToast] = useState<string | null>(null);

  // Tab & Grid Density State
  const [activeTab, setActiveTab] = useState<ActiveTab>("photos");
  const [gridDensity, setGridDensity] = useState<GridDensity>(3);

  // Modals & Selection State
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedTargets, setSelectedTargets] = useState<Set<string>>(new Set());
  const [activeDetailIndex, setActiveDetailIndex] = useState<number | null>(null);
  const [activeStoryMemory, setActiveStoryMemory] = useState<StoryMemory | null>(null);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null);

  // Album drill-down state
  const [activeAlbumTitle, setActiveAlbumTitle] = useState<string | null>(null);
  const [albumFilteredItems, setAlbumFilteredItems] = useState<MediaItem[]>([]);

  // 1. Fetch Media from Swift Storage backend
  const fetchMedia = useCallback(async () => {
    try {
      const res = await fetch("/api/media");
      if (res.ok) {
        const cloudItems: MediaItem[] = await res.json();
        if (cloudItems.length > 0) {
          setMediaList(cloudItems);
        } else {
          // If fresh account with no items yet, show rich sample photos
          setMediaList(SAMPLE_FALLBACK_PHOTOS);
        }
      } else {
        setMediaList(SAMPLE_FALLBACK_PHOTOS);
      }
    } catch {
      setMediaList(SAMPLE_FALLBACK_PHOTOS);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 2. Fetch Storage Account Stats
  const fetchAccount = useCallback(async () => {
    try {
      const res = await fetch("/api/account");
      if (res.ok) {
        const data = await res.json();
        setAccount(data);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchMedia();
    fetchAccount();
  }, [fetchMedia, fetchAccount]);

  // Handle Multi-file Upload to OpenStack Swift (Videos & Photos)
  const handleUploadFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setIsUploading(true);
    setUploadProgress(15);
    setUploadErrorToast(null);

    // 1. Generate instant optimistic previews
    const optimisticItems: MediaItem[] = [];
    for (const file of fileArray) {
      const isVideo = file.type.startsWith("video/") || /\.(mp4|mov|mkv|webm|avi|3gp|m4v|ts|ogv)$/i.test(file.name);
      let thumbUrl = URL.createObjectURL(file);
      let duration = "0:05";
      let aspectRatio = 1.0;

      if (isVideo) {
        try {
          const videoThumbData = await extractClientVideoThumbnail(file);
          thumbUrl = videoThumbData.thumbUrl;
          duration = videoThumbData.duration;
          aspectRatio = videoThumbData.aspectRatio;
        } catch {
          // Fallback to basic object URL
        }
      }

      optimisticItems.push({
        name: `uploading_${Date.now()}_${file.name}`,
        bytes: file.size,
        contentType: file.type || (isVideo ? "video/mp4" : "image/jpeg"),
        lastModified: new Date().toISOString(),
        isVideo,
        hasThumb: true,
        url: URL.createObjectURL(file),
        thumbUrl: thumbUrl,
        duration: isVideo ? duration : undefined,
        aspectRatio,
        isSynced: false,
        caption: file.name,
      });
    }

    // Insert optimistic items at top of media list
    setMediaList((prev) => [...optimisticItems, ...prev]);

    // 2. Perform multipart upload to Blomp Swift
    const formData = new FormData();
    for (let i = 0; i < fileArray.length; i++) {
      formData.append("files", fileArray[i]);
    }

    try {
      setUploadProgress(40);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      setUploadProgress(85);
      if (res.ok) {
        await fetchMedia();
        await fetchAccount();
        setUploadProgress(100);
      } else {
        const errText = await res.text();
        console.error("Upload error response:", errText);
        setUploadErrorToast(`Upload notice: ${errText}`);
        await fetchMedia();
      }
    } catch (err: any) {
      console.error("Upload failed:", err.message);
      setUploadErrorToast(`Upload error: ${err.message}`);
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 600);
    }
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUploadFiles(e.dataTransfer.files);
    }
  };

  // Handle Instant Camera Photo Capture & Direct Blomp Swift Upload
  const handlePhotoCaptured = async (newItem: MediaItem, file: File) => {
    // 1. Immediately inject photo into state for zero-latency preview
    setMediaList((prev) => [newItem, ...prev]);

    // 2. Upload photo in background to Blomp Swift storage
    try {
      const formData = new FormData();
      formData.append("files", file);

      setIsUploading(true);
      setUploadProgress(50);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        fetchAccount();
      }
    } catch (err) {
      console.error("Camera Swift upload error:", err);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Toggle Favorite Status
  const handleToggleFavorite = (item: MediaItem) => {
    setMediaList((prev) =>
      prev.map((it) =>
        it.name === item.name ? { ...it, isFavorite: !it.isFavorite } : it
      )
    );
  };

  // Handle Deleting Selected Items from Swift Storage
  const handleDeleteSelected = async () => {
    const targets = Array.from(selectedTargets);
    if (targets.length === 0) return;

    if (!confirm(`Permanently delete ${targets.length} item(s) from Swift Cloud?`)) return;

    try {
      await fetch("/api/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targets }),
      });

      setMediaList((prev) => prev.filter((it) => !selectedTargets.has(it.name)));
      setSelectedTargets(new Set());
      setIsSelectMode(false);
      fetchAccount();
    } catch (e: any) {
      alert(`Delete error: ${e.message}`);
    }
  };

  // Single Item Delete
  const handleDeleteSingle = async (item: MediaItem) => {
    if (!confirm(`Delete "${item.name}" permanently from Blomp Cloud?`)) return;

    try {
      await fetch("/api/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targets: [item.name] }),
      });

      setMediaList((prev) => prev.filter((it) => it.name !== item.name));
      if (activeDetailIndex !== null) {
        setActiveDetailIndex(null);
      }
      fetchAccount();
    } catch (e: any) {
      alert(`Delete error: ${e.message}`);
    }
  };

  // Multi-select handlers
  const handleToggleSelect = (item: MediaItem) => {
    const next = new Set(selectedTargets);
    if (next.has(item.name)) {
      next.delete(item.name);
    } else {
      next.add(item.name);
    }
    setSelectedTargets(next);
    if (next.size === 0) {
      setIsSelectMode(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedTargets.size === mediaList.length) {
      setSelectedTargets(new Set());
    } else {
      setSelectedTargets(new Set(mediaList.map((it) => it.name)));
    }
  };

  const handleEnterSelectMode = (item: MediaItem) => {
    setIsSelectMode(true);
    setSelectedTargets(new Set([item.name]));
  };

  const handleShareSelected = async () => {
    if (selectedTargets.size === 0) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${selectedTargets.size} items from Google Photos`,
          url: window.location.href,
        });
      } catch {}
    } else {
      alert(`${selectedTargets.size} item link(s) ready to share!`);
    }
  };

  const memories = generateMemoriesFromMedia(mediaList);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="min-h-screen bg-white text-[#1f1f1f] flex flex-col font-sans relative"
    >
      {/* Drag & Drop Cloud Upload Overlay */}
      {isDraggingOver && (
        <div className="fixed inset-0 z-50 bg-blue-600/85 backdrop-blur-md flex flex-col items-center justify-center text-white pointer-events-none transition-all animate-in fade-in duration-200">
          <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mb-4 animate-bounce">
            <UploadCloud className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight mb-1">Drop Photos & Videos Here</h2>
          <p className="text-sm text-white/80 font-medium">Instantly extract thumbnails & sync to Blomp Cloud</p>
        </div>
      )}

      {/* Upload error or notice toast */}
      {uploadErrorToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-gray-900/90 backdrop-blur-md text-white text-xs px-4 py-2.5 rounded-full shadow-lg border border-white/20 flex items-center gap-2">
          <span>{uploadErrorToast}</span>
          <button
            onClick={() => setUploadErrorToast(null)}
            className="ml-2 underline text-blue-300 font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 1:1 Google Photos Top Navigation Header */}
      <TopHeader
        isSelectMode={isSelectMode}
        selectedCount={selectedTargets.size}
        totalCount={mediaList.length}
        onExitSelectMode={() => {
          setIsSelectMode(false);
          setSelectedTargets(new Set());
        }}
        onSelectAll={handleSelectAll}
        onDeleteSelected={handleDeleteSelected}
        onShareSelected={handleShareSelected}
        onOpenAccountModal={() => setIsAccountModalOpen(true)}
        onUploadFiles={handleUploadFiles}
        isUploading={isUploading}
        uploadProgress={uploadProgress}
        account={account}
        activeTab={activeTab}
        onSearchFocus={() => setActiveTab("search")}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto">
        {/* Album Drill-down View Header if active */}
        {activeAlbumTitle && (
          <div className="px-4 py-3 flex items-center gap-3 border-b border-gray-100 mb-2">
            <button
              onClick={() => setActiveAlbumTitle(null)}
              className="p-2 rounded-full hover:bg-gray-100"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <h2 className="font-bold text-lg text-gray-800">{activeAlbumTitle}</h2>
          </div>
        )}

        {/* Tab Views */}
        {activeAlbumTitle ? (
          <PhotoGrid
            items={albumFilteredItems}
            density={gridDensity}
            onChangeDensity={setGridDensity}
            isSelectMode={isSelectMode}
            selectedTargets={selectedTargets}
            onToggleSelect={handleToggleSelect}
            onOpenItem={(idx) => {
              const item = albumFilteredItems[idx];
              const origIdx = mediaList.findIndex((it) => it.name === item.name);
              setActiveDetailIndex(origIdx >= 0 ? origIdx : idx);
            }}
            onEnterSelectMode={handleEnterSelectMode}
          />
        ) : (
          <>
            {activeTab === "photos" && (
              <>
                {/* Horizontal Memories Stories Reel */}
                <MemoriesCarousel
                  memories={memories}
                  onSelectMemory={(mem) => setActiveStoryMemory(mem)}
                />

                {/* Main Dynamic Tightly-Packed Photo Grid */}
                <PhotoGrid
                  items={mediaList}
                  density={gridDensity}
                  onChangeDensity={setGridDensity}
                  isSelectMode={isSelectMode}
                  selectedTargets={selectedTargets}
                  onToggleSelect={handleToggleSelect}
                  onOpenItem={(idx) => setActiveDetailIndex(idx)}
                  onEnterSelectMode={handleEnterSelectMode}
                />
              </>
            )}

            {activeTab === "memories" && (
              <div className="pt-2">
                <MemoriesCarousel
                  memories={memories}
                  onSelectMemory={(mem) => setActiveStoryMemory(mem)}
                />
                <div className="px-4 py-3">
                  <h3 className="font-bold text-base text-gray-800 mb-3">All Highlight Reels</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {memories.map((mem) => (
                      <div
                        key={mem.id}
                        onClick={() => setActiveStoryMemory(mem)}
                        className="relative aspect-3/4 rounded-2xl overflow-hidden shadow-xs cursor-pointer group"
                      >
                        <img
                          src={mem.coverUrl}
                          alt={mem.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        <div className="absolute bottom-3 left-3 right-3 text-white">
                          <div className="text-[10px] font-semibold text-white/80">{mem.dateLabel}</div>
                          <div className="font-bold text-sm line-clamp-2">{mem.title}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "search" && (
              <SearchView
                items={mediaList}
                onOpenItem={(item) => {
                  const idx = mediaList.findIndex((it) => it.name === item.name);
                  setActiveDetailIndex(idx >= 0 ? idx : 0);
                }}
              />
            )}

            {activeTab === "create" && (
              <CreateModal items={mediaList} />
            )}

            {activeTab === "collections" && (
              <CollectionsView
                items={mediaList}
                onOpenAlbum={(title, items) => {
                  setActiveAlbumTitle(title);
                  setAlbumFilteredItems(items);
                }}
                onOpenItem={(item) => {
                  const idx = mediaList.findIndex((it) => it.name === item.name);
                  setActiveDetailIndex(idx >= 0 ? idx : 0);
                }}
              />
            )}
          </>
        )}
      </main>

      {/* Floating Capsule Bottom Navigation Bar with Search and Camera buttons */}
      <BottomNavigation
        activeTab={activeTab}
        onChangeTab={(tab) => {
          setActiveAlbumTitle(null);
          setActiveTab(tab);
        }}
        isSelectMode={isSelectMode}
        onOpenCamera={() => setIsCameraOpen(true)}
      />

      {/* Live Camera Viewfinder Modal with Red Shutter Button & Swift Backup */}
      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onPhotoCaptured={handlePhotoCaptured}
        latestMediaItem={mediaList[0]}
      />

      {/* Full Screen Photo Detail Lightbox & Video Player */}
      <PhotoDetailModal
        items={mediaList}
        currentIndex={activeDetailIndex ?? 0}
        isOpen={activeDetailIndex !== null}
        onClose={() => setActiveDetailIndex(null)}
        onNavigate={(idx) => setActiveDetailIndex(idx)}
        onToggleFavorite={handleToggleFavorite}
        onDelete={handleDeleteSingle}
        onEdit={(item) => setEditingItem(item)}
      />

      {/* Story Viewer Modal */}
      <StoryViewerModal
        memory={activeStoryMemory}
        onClose={() => setActiveStoryMemory(null)}
        onToggleFavorite={handleToggleFavorite}
      />

      {/* Google Account Profile & Swift Storage Modal */}
      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        account={account}
        isUploading={isUploading}
        uploadProgress={uploadProgress}
      />

      {/* Photo Editor Modal */}
      <PhotoEditorModal
        item={editingItem}
        isOpen={editingItem !== null}
        onClose={() => setEditingItem(null)}
        onSave={() => {
          fetchMedia();
        }}
      />
    </div>
  );
}
