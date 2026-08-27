import React, { useState } from "react";
import { Layout, Film, Sparkles, Wand2, X, Check, Image as ImageIcon } from "lucide-react";
import { MediaItem } from "../types";

interface CreateModalProps {
  items: MediaItem[];
  onCreatedCollage?: (newPhotoUrl: string) => void;
}

export function CreateModal({ items, onCreatedCollage }: CreateModalProps) {
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [selectedPhotoNames, setSelectedPhotoNames] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);

  const tools = [
    {
      id: "collage",
      title: "Collage",
      subtitle: "Combine 2-6 photos into a modern art grid",
      icon: Layout,
      color: "bg-blue-50 text-blue-600 border-blue-100",
    },
    {
      id: "cinematic",
      title: "Cinematic Photo",
      subtitle: "Add 3D depth and parallax motion to your favorite shot",
      icon: Sparkles,
      color: "bg-purple-50 text-purple-600 border-purple-100",
    },
    {
      id: "animation",
      title: "Animation",
      subtitle: "Bring a sequence of photos to life in a fast looping GIF",
      icon: Film,
      color: "bg-amber-50 text-amber-600 border-amber-100",
    },
    {
      id: "remix",
      title: "Remix & Highlight",
      subtitle: "Auto-generate a memory highlight video with music",
      icon: Wand2,
      color: "bg-emerald-50 text-emerald-600 border-emerald-100",
    },
  ];

  const handleSelectPhoto = (name: string) => {
    if (selectedPhotoNames.includes(name)) {
      setSelectedPhotoNames(selectedPhotoNames.filter((n) => n !== name));
    } else {
      if (selectedPhotoNames.length < 6) {
        setSelectedPhotoNames([...selectedPhotoNames, name]);
      }
    }
  };

  const handleCreateCollage = () => {
    if (selectedPhotoNames.length < 2) {
      alert("Please select at least 2 photos for a collage");
      return;
    }
    setIsProcessing(true);
    setTimeout(() => {
      // Pick first selected as result demonstration
      const picked = items.find((it) => it.name === selectedPhotoNames[0]);
      setResultImage(picked?.url || items[0]?.url || "");
      setIsProcessing(false);
    }, 1200);
  };

  return (
    <div className="w-full pb-28 pt-2 px-3.5 sm:px-6 max-w-4xl mx-auto select-none">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 tracking-tight">Create & Studio</h2>
        <p className="text-xs text-gray-500 mt-0.5">Turn your photos into creative memories and collages</p>
      </div>

      {/* Tools List */}
      {!selectedTool && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <div
                key={tool.id}
                onClick={() => {
                  setSelectedTool(tool.id);
                  setSelectedPhotoNames([]);
                  setResultImage(null);
                }}
                className="flex items-start gap-4 p-4 bg-gray-50 hover:bg-gray-100 active:bg-gray-100/90 rounded-2xl cursor-pointer transition-all border border-gray-100/80 shadow-xs"
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${tool.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm text-gray-900">{tool.title}</h3>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{tool.subtitle}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Creation Workspace Mode */}
      {selectedTool && (
        <div className="bg-white rounded-3xl border border-gray-200 p-4 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setSelectedTool(null);
                  setSelectedPhotoNames([]);
                  setResultImage(null);
                }}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-bold text-base text-gray-900 capitalize">{selectedTool} Studio</h3>
            </div>
            <span className="text-xs font-semibold text-blue-600">
              {selectedPhotoNames.length} of 6 selected
            </span>
          </div>

          {resultImage ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="relative w-full max-w-sm aspect-square rounded-2xl overflow-hidden shadow-lg border border-gray-200">
                <img src={resultImage} alt="Created Collage" className="w-full h-full object-cover" />
                <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/60 text-white text-[11px] font-semibold backdrop-blur-md">
                  ✨ Created
                </div>
              </div>
              <div className="flex gap-3 w-full max-w-sm">
                <button
                  onClick={() => setResultImage(null)}
                  className="flex-1 py-2.5 rounded-full bg-gray-100 hover:bg-gray-200 font-semibold text-xs text-gray-700"
                >
                  Create another
                </button>
                <button
                  onClick={() => {
                    alert("Saved to Google Photos cloud!");
                    setSelectedTool(null);
                  }}
                  className="flex-1 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 font-semibold text-xs text-white"
                >
                  Save to Photos
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-xs text-gray-600 mb-3 font-medium">
                Select 2 to 6 photos from your Swift storage library:
              </p>

              {/* Photos selector grid */}
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-72 overflow-y-auto mb-5 p-1">
                {items
                  .filter((it) => !it.isVideo)
                  .map((item) => {
                    const isPicked = selectedPhotoNames.includes(item.name);
                    return (
                      <div
                        key={item.name}
                        onClick={() => handleSelectPhoto(item.name)}
                        className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer transition-all ${
                          isPicked ? "ring-3 ring-blue-600 scale-95" : "hover:opacity-90"
                        }`}
                      >
                        <img src={item.thumbUrl} alt={item.name} className="w-full h-full object-cover" />
                        {isPicked && (
                          <div className="absolute inset-0 bg-blue-600/30 flex items-center justify-center">
                            <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md">
                              <Check className="w-4 h-4" />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setSelectedTool(null)}
                  className="px-4 py-2 rounded-full hover:bg-gray-100 font-medium text-xs text-gray-600"
                >
                  Cancel
                </button>
                <button
                  disabled={selectedPhotoNames.length < 2 || isProcessing}
                  onClick={handleCreateCollage}
                  className="px-6 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 font-semibold text-xs text-white shadow-xs transition-all flex items-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <Sparkles className="w-4 h-4 animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Create {selectedTool}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
