import React from "react";
import { motion } from "motion/react";
import { Image, Search, PlusCircle, FolderHeart, Camera } from "lucide-react";
import { ActiveTab } from "../types";

interface BottomNavigationProps {
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
  isSelectMode: boolean;
  onOpenCamera: () => void;
}

export function BottomNavigation({
  activeTab,
  onChangeTab,
  isSelectMode,
  onOpenCamera,
}: BottomNavigationProps) {
  if (isSelectMode) return null;

  const mainTabs: { id: ActiveTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "photos", label: "Photos", icon: Image },
    { id: "collections", label: "Collections", icon: FolderHeart },
    { id: "create", label: "Create", icon: PlusCircle },
  ];

  return (
    <div className="fixed bottom-3 sm:bottom-5 left-0 right-0 z-40 flex justify-center items-center pointer-events-none px-4 pb-safe gap-2">
      {/* Primary Pill Capsule (Photos, Collections, Create) */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="pointer-events-auto bg-white/95 backdrop-blur-xl border border-gray-200/80 rounded-full shadow-2xl px-2 sm:px-2.5 py-1.5 flex items-center gap-1 sm:gap-1.5 ring-1 ring-black/5"
      >
        {mainTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={`relative flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 ${
                isActive
                  ? "bg-[#C2E7FF] text-[#001D35] shadow-xs"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/60"
              }`}
            >
              <Icon className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${isActive ? "text-[#001D35] stroke-[2.5]" : "text-gray-500"}`} />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </motion.div>

      {/* Floating Circular Search Button */}
      <motion.button
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.05 }}
        onClick={() => onChangeTab("search")}
        className={`pointer-events-auto w-11 h-11 rounded-full flex items-center justify-center border shadow-2xl transition-all active:scale-95 ${
          activeTab === "search"
            ? "bg-[#C2E7FF] text-[#001D35] border-blue-300 ring-2 ring-blue-400/30"
            : "bg-white/95 backdrop-blur-xl border-gray-200/80 text-gray-700 hover:bg-gray-50"
        }`}
        title="Search"
      >
        <Search className="w-5 h-5 stroke-[2.2]" />
      </motion.button>

      {/* Floating Circular Camera Button (Right next to Search Button) */}
      <motion.button
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        onClick={onOpenCamera}
        className="pointer-events-auto w-11 h-11 rounded-full bg-gradient-to-tr from-red-600 to-rose-500 text-white flex items-center justify-center shadow-2xl border border-red-400/40 hover:from-red-500 hover:to-rose-400 active:scale-95 transition-all ring-2 ring-red-500/20"
        title="Open Camera & Backup to Swift"
      >
        <Camera className="w-5 h-5 stroke-[2.2]" />
      </motion.button>
    </div>
  );
}
