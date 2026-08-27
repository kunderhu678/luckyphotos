import React, { useState } from "react";
import { motion } from "motion/react";
import { X, Check, RotateCw, Sliders, Sparkles, Sun, Contrast, Palette, RefreshCw } from "lucide-react";
import { MediaItem } from "../types";

interface PhotoEditorModalProps {
  item: MediaItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (editedItem: MediaItem) => void;
}

export function PhotoEditorModal({ item, isOpen, onClose, onSave }: PhotoEditorModalProps) {
  const [activeTab, setActiveTab] = useState<"filters" | "adjust" | "crop">("filters");
  const [activeFilter, setActiveFilter] = useState("none");
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturate, setSaturate] = useState(100);
  const [rotation, setRotation] = useState(0);

  if (!isOpen || !item) return null;

  const filters = [
    { id: "none", name: "Original", filterCss: "none" },
    { id: "enhance", name: "Enhance", filterCss: "contrast(115%) saturate(120%) brightness(105%)" },
    { id: "warm", name: "Warm", filterCss: "sepia(25%) saturate(130%) brightness(105%)" },
    { id: "cool", name: "Cool", filterCss: "hue-rotate(20deg) saturate(110%) brightness(102%)" },
    { id: "vivid", name: "Vivid", filterCss: "saturate(160%) contrast(110%)" },
    { id: "metro", name: "Metro", filterCss: "contrast(130%) brightness(95%)" },
    { id: "mono", name: "B&W", filterCss: "grayscale(100%) contrast(120%)" },
    { id: "palma", name: "Palma", filterCss: "sepia(40%) contrast(90%) brightness(110%)" },
  ];

  const getCombinedFilterStyle = () => {
    const selectedFilterObj = filters.find((f) => f.id === activeFilter);
    const preset = selectedFilterObj?.filterCss !== "none" ? selectedFilterObj?.filterCss : "";
    return `${preset} brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%)`.trim();
  };

  const handleRotate = () => {
    setRotation((r) => (r + 90) % 360);
  };

  const handleReset = () => {
    setActiveFilter("none");
    setBrightness(100);
    setContrast(100);
    setSaturate(100);
    setRotation(0);
  };

  const handleSave = () => {
    alert("Enhancements saved to your Google Photos cloud!");
    onSave(item);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#121212] text-white flex flex-col justify-between select-none">
      {/* Top Header */}
      <div className="pt-safe px-4 py-3 flex items-center justify-between border-b border-gray-800">
        <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-800 text-gray-400">
          <X className="w-5 h-5" />
        </button>
        <span className="font-semibold text-sm text-gray-200">Edit Photo</span>
        <button
          onClick={handleSave}
          className="px-4 py-1.5 rounded-full bg-blue-600 hover:bg-blue-500 font-semibold text-xs text-white shadow-xs"
        >
          Save
        </button>
      </div>

      {/* Image Preview Canvas */}
      <div className="flex-1 relative flex items-center justify-center p-4 overflow-hidden">
        <img
          src={item.url}
          alt="Editing"
          className="max-w-full max-h-[60vh] object-contain transition-all duration-200"
          style={{
            filter: getCombinedFilterStyle(),
            transform: `rotate(${rotation}deg)`,
          }}
        />
      </div>

      {/* Controls Drawer */}
      <div className="bg-[#1e1e1e] pb-safe pt-3 border-t border-gray-800">
        {/* Sub-controls depending on tab */}
        <div className="px-4 py-3 min-h-[90px]">
          {activeTab === "filters" && (
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
              {filters.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setActiveFilter(f.id)}
                  className={`flex flex-col items-center gap-1.5 shrink-0 transition-all ${
                    activeFilter === f.id ? "scale-105" : "opacity-70 hover:opacity-100"
                  }`}
                >
                  <div
                    className={`w-14 h-14 rounded-xl overflow-hidden ring-2 ${
                      activeFilter === f.id ? "ring-blue-500" : "ring-transparent"
                    }`}
                  >
                    <img
                      src={item.thumbUrl}
                      alt={f.name}
                      className="w-full h-full object-cover"
                      style={{ filter: f.filterCss }}
                    />
                  </div>
                  <span className="text-[11px] font-medium text-gray-300">{f.name}</span>
                </button>
              ))}
            </div>
          )}

          {activeTab === "adjust" && (
            <div className="space-y-3 max-w-md mx-auto">
              <div className="flex items-center gap-3 text-xs">
                <Sun className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="w-20 text-gray-300">Brightness</span>
                <input
                  type="range"
                  min="50"
                  max="150"
                  value={brightness}
                  onChange={(e) => setBrightness(Number(e.target.value))}
                  className="flex-1 accent-blue-500"
                />
                <span className="w-8 text-right text-gray-400">{brightness}%</span>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <Contrast className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="w-20 text-gray-300">Contrast</span>
                <input
                  type="range"
                  min="50"
                  max="150"
                  value={contrast}
                  onChange={(e) => setContrast(Number(e.target.value))}
                  className="flex-1 accent-blue-500"
                />
                <span className="w-8 text-right text-gray-400">{contrast}%</span>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <Palette className="w-4 h-4 text-purple-400 shrink-0" />
                <span className="w-20 text-gray-300">Saturation</span>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={saturate}
                  onChange={(e) => setSaturate(Number(e.target.value))}
                  className="flex-1 accent-blue-500"
                />
                <span className="w-8 text-right text-gray-400">{saturate}%</span>
              </div>
            </div>
          )}

          {activeTab === "crop" && (
            <div className="flex justify-center gap-6 py-2">
              <button
                onClick={handleRotate}
                className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-gray-800 text-gray-300"
              >
                <RotateCw className="w-5 h-5" />
                <span className="text-xs">Rotate 90°</span>
              </button>
              <button
                onClick={handleReset}
                className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-gray-800 text-gray-300"
              >
                <RefreshCw className="w-5 h-5" />
                <span className="text-xs">Reset All</span>
              </button>
            </div>
          )}
        </div>

        {/* Bottom Mode Tabs */}
        <div className="flex justify-around items-center border-t border-gray-800/80 px-4 py-2">
          <button
            onClick={() => setActiveTab("filters")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold ${
              activeTab === "filters" ? "bg-blue-600/30 text-blue-400" : "text-gray-400 hover:text-white"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Filters</span>
          </button>

          <button
            onClick={() => setActiveTab("adjust")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold ${
              activeTab === "adjust" ? "bg-blue-600/30 text-blue-400" : "text-gray-400 hover:text-white"
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Adjust</span>
          </button>

          <button
            onClick={() => setActiveTab("crop")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold ${
              activeTab === "crop" ? "bg-blue-600/30 text-blue-400" : "text-gray-400 hover:text-white"
            }`}
          >
            <RotateCw className="w-4 h-4" />
            <span>Crop & Rotate</span>
          </button>
        </div>
      </div>
    </div>
  );
}
