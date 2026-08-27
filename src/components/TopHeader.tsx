import React, { useRef } from "react";
import { Plus, Bell, Cloud, Check, Trash2, Share2, X, CheckSquare, Square, MoreVertical, Search, Camera } from "lucide-react";
import { GooglePhotosPinwheel, GooglePhotosWordmark } from "./GooglePhotosLogo";
import { AccountInfo } from "../types";

interface TopHeaderProps {
  isSelectMode: boolean;
  selectedCount: number;
  totalCount: number;
  onExitSelectMode: () => void;
  onSelectAll: () => void;
  onDeleteSelected: () => void;
  onShareSelected: () => void;
  onOpenAccountModal: () => void;
  onUploadFiles: (files: FileList) => void;
  isUploading: boolean;
  uploadProgress: number;
  account: AccountInfo | null;
  activeTab: string;
  onSearchFocus?: () => void;
}

export function TopHeader({
  isSelectMode,
  selectedCount,
  totalCount,
  onExitSelectMode,
  onSelectAll,
  onDeleteSelected,
  onShareSelected,
  onOpenAccountModal,
  onUploadFiles,
  isUploading,
  uploadProgress,
  account,
  activeTab,
  onSearchFocus,
}: TopHeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUploadFiles(e.target.files);
      e.target.value = "";
    }
  };

  if (isSelectMode) {
    const isAllSelected = totalCount > 0 && selectedCount === totalCount;
    return (
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200/80 px-3 sm:px-4 py-2.5 flex items-center justify-between transition-all pt-safe shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onExitSelectMode}
            className="p-2 -ml-1 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
            title="Cancel selection"
          >
            <X className="w-5 h-5 text-gray-700" />
          </button>
          <span className="font-semibold text-base text-gray-800">
            {selectedCount} selected
          </span>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={onSelectAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium hover:bg-gray-100 active:bg-gray-200 text-gray-700 transition-colors"
            title="Select all"
          >
            {isAllSelected ? (
              <CheckSquare className="w-4 h-4 text-blue-600" />
            ) : (
              <Square className="w-4 h-4 text-gray-500" />
            )}
            <span className="hidden sm:inline">{isAllSelected ? "Deselect" : "Select all"}</span>
          </button>

          {selectedCount > 0 && (
            <>
              <button
                onClick={onShareSelected}
                className="p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 text-gray-700 transition-colors"
                title="Share"
              >
                <Share2 className="w-5 h-5" />
              </button>
              <button
                onClick={onDeleteSelected}
                className="p-2 rounded-full hover:bg-red-50 active:bg-red-100 text-red-600 transition-colors"
                title="Delete"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100/60 px-3.5 sm:px-5 py-2.5 flex items-center justify-between pt-safe shadow-xs">
      {/* Hidden file input for uploads */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        multiple
        accept="image/*,video/*"
        className="hidden"
      />

      {/* Brand & Search Bar */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <div
          className="flex items-center gap-2 cursor-pointer select-none group"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          title="Google Photos"
        >
          <GooglePhotosPinwheel className="w-7 h-7 shrink-0 transition-transform group-hover:scale-105" />
          <GooglePhotosWordmark className="hidden sm:flex" />
          <span className="text-lg font-bold tracking-tight text-[#444746] font-sans sm:hidden">
            Photos
          </span>
        </div>

        {/* Global Search Bar (Mobile pill) */}
        <div
          onClick={onSearchFocus}
          className="flex-1 ml-1 sm:ml-3 bg-[#F0F4F9] hover:bg-[#E8EDF5] active:bg-[#E0E7F0] transition-all rounded-full px-3.5 py-2 flex items-center gap-2 cursor-pointer text-gray-600 text-xs sm:text-sm"
        >
          <Search className="w-4 h-4 text-gray-500 shrink-0" />
          <span className="truncate text-gray-500 font-medium">Search photos, videos...</span>
        </div>
      </div>

      {/* Right Action Icons */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0 ml-2">
        {/* Upload Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 text-gray-700 transition-colors relative"
          title="Upload photos or videos"
        >
          <Plus className="w-5 h-5 stroke-[2.2]" />
        </button>

        {/* Cloud Backup Status Pill */}
        <button
          onClick={onOpenAccountModal}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
            isUploading
              ? "bg-blue-50 text-blue-600 border border-blue-200 animate-pulse"
              : "hover:bg-gray-100 text-gray-700"
          }`}
          title="Cloud Backup Status"
        >
          {isUploading ? (
            <>
              <Cloud className="w-4 h-4 text-blue-600 animate-spin" />
              <span className="text-[11px] font-bold hidden sm:inline">{uploadProgress}%</span>
            </>
          ) : (
            <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
          )}
        </button>

        {/* Notifications */}
        <button
          className="p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 text-gray-700 transition-colors hidden xs:flex relative"
          title="Notifications"
          onClick={() => alert("All cloud backups up to date.")}
        >
          <Bell className="w-5 h-5" />
        </button>

        {/* Google Profile Avatar Button */}
        <button
          onClick={onOpenAccountModal}
          className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-semibold text-xs flex items-center justify-center ring-2 ring-transparent hover:ring-blue-300 active:scale-95 transition-all shadow-xs ml-1"
          title="Google Account & Blomp Storage"
        >
          YB
        </button>
      </div>
    </header>
  );
}
