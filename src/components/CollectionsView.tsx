import React from "react";
import { Heart, Wrench, Archive, Trash2, Plus, Folder, Smartphone, Download, Camera, Image as ImageIcon } from "lucide-react";
import { MediaItem } from "../types";

interface CollectionsViewProps {
  items: MediaItem[];
  onOpenAlbum: (albumTitle: string, filteredItems: MediaItem[]) => void;
  onOpenItem: (item: MediaItem) => void;
}

export function CollectionsView({ items, onOpenAlbum, onOpenItem }: CollectionsViewProps) {
  const favorites = items.filter((it) => it.isFavorite);
  const archived = items.filter((it) => it.isArchived);

  const albums = [
    {
      title: "Favorites",
      count: favorites.length,
      coverUrl: favorites[0]?.thumbUrl || items[0]?.thumbUrl,
      items: favorites,
    },
    {
      title: "Videos",
      count: items.filter((it) => it.isVideo).length,
      coverUrl: items.find((it) => it.isVideo)?.thumbUrl || items[0]?.thumbUrl,
      items: items.filter((it) => it.isVideo),
    },
    {
      title: "Trips & Places",
      count: Math.min(items.length, 6),
      coverUrl: items[1]?.thumbUrl || items[0]?.thumbUrl,
      items: items.slice(0, 6),
    },
  ];

  const deviceFolders = [
    { title: "Camera", count: items.length, icon: Camera },
    { title: "Screenshots", count: 4, icon: Smartphone },
    { title: "Downloads", count: 2, icon: Download },
  ];

  return (
    <div className="w-full pb-28 pt-2 px-3.5 sm:px-6 max-w-4xl mx-auto select-none">
      {/* 4 Top Quick Cards */}
      <div className="grid grid-cols-4 gap-2.5 mb-7">
        {/* Favorites */}
        <div
          onClick={() => onOpenAlbum("Favorites", favorites)}
          className="flex flex-col items-center gap-2 p-3 bg-gray-50 hover:bg-gray-100/80 active:bg-gray-100 rounded-2xl cursor-pointer transition-all border border-gray-100/80 shadow-xs"
        >
          <div className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center">
            <Heart className="w-5 h-5 fill-red-500" />
          </div>
          <span className="text-xs font-semibold text-gray-800 text-center">Favorites</span>
        </div>

        {/* Utilities */}
        <div
          onClick={() => alert("Utilities: Storage Saver, Free up space, Clean up suggestions")}
          className="flex flex-col items-center gap-2 p-3 bg-gray-50 hover:bg-gray-100/80 active:bg-gray-100 rounded-2xl cursor-pointer transition-all border border-gray-100/80 shadow-xs"
        >
          <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
            <Wrench className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-gray-800 text-center">Utilities</span>
        </div>

        {/* Archive */}
        <div
          onClick={() => onOpenAlbum("Archive", archived)}
          className="flex flex-col items-center gap-2 p-3 bg-gray-50 hover:bg-gray-100/80 active:bg-gray-100 rounded-2xl cursor-pointer transition-all border border-gray-100/80 shadow-xs"
        >
          <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
            <Archive className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-gray-800 text-center">Archive</span>
        </div>

        {/* Trash */}
        <div
          onClick={() => alert("Trash is currently empty")}
          className="flex flex-col items-center gap-2 p-3 bg-gray-50 hover:bg-gray-100/80 active:bg-gray-100 rounded-2xl cursor-pointer transition-all border border-gray-100/80 shadow-xs"
        >
          <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center">
            <Trash2 className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-gray-800 text-center">Trash</span>
        </div>
      </div>

      {/* Albums Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3.5">
          <h3 className="text-base font-bold text-gray-800 tracking-tight">Albums</h3>
          <button
            onClick={() => {
              const name = prompt("Enter new album name:", "Summer Trip");
              if (name) alert(`Created album "${name}"!`);
            }}
            className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
          >
            <Plus className="w-4 h-4" />
            <span>New album</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {/* Create album card */}
          <div
            onClick={() => {
              const name = prompt("Enter album name:");
              if (name) alert(`Created album "${name}"`);
            }}
            className="aspect-square bg-gray-50 hover:bg-gray-100 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all p-3"
          >
            <Plus className="w-8 h-8 text-blue-600" />
            <span className="text-xs font-semibold text-gray-700">New album</span>
          </div>

          {/* Album Cards */}
          {albums.map((alb, i) => (
            <div
              key={i}
              onClick={() => onOpenAlbum(alb.title, alb.items)}
              className="group flex flex-col cursor-pointer"
            >
              <div className="aspect-square rounded-2xl overflow-hidden bg-gray-100 relative shadow-xs mb-1.5 ring-1 ring-black/5">
                {alb.coverUrl ? (
                  <img
                    src={alb.coverUrl}
                    alt={alb.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <Folder className="w-10 h-10" />
                  </div>
                )}
              </div>
              <span className="text-xs font-bold text-gray-800 truncate">{alb.title}</span>
              <span className="text-[11px] text-gray-400 font-medium">{alb.count} items</span>
            </div>
          ))}
        </div>
      </div>

      {/* Photos on this device */}
      <div>
        <div className="flex items-center justify-between mb-3.5">
          <h3 className="text-base font-bold text-gray-800 tracking-tight">Photos on device</h3>
          <span className="text-xs text-blue-600 font-semibold cursor-pointer">View all</span>
        </div>

        <div className="space-y-2">
          {deviceFolders.map((folder, i) => {
            const Icon = folder.icon;
            return (
              <div
                key={i}
                onClick={() => onOpenAlbum(folder.title, items)}
                className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-2xl cursor-pointer transition-colors border border-gray-100/60"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-white text-gray-700 flex items-center justify-center shadow-xs border border-gray-100">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-800">{folder.title}</div>
                    <div className="text-xs text-gray-400 font-medium">{folder.count} items</div>
                  </div>
                </div>
                <div className="text-xs font-semibold text-blue-600">Synced</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
