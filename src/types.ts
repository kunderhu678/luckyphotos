export interface MediaItem {
  name: string;
  bytes: number;
  contentType: string;
  lastModified: string;
  isVideo: boolean;
  hasThumb: boolean;
  url: string;
  thumbUrl: string;
  isFavorite?: boolean;
  isArchived?: boolean;
  album?: string;
  width?: number;
  height?: number;
  aspectRatio?: number; // width / height
  duration?: string; // e.g. "0:05", "0:14", "0:41"
  isSynced?: boolean;
  caption?: string;
}

export interface AccountInfo {
  email: string;
  storageUsedBytes: number;
  storageTotalBytes: number;
  objectCount: number;
  plan: string;
  status: string;
  note?: string;
}

export interface StoryMemory {
  id: string;
  title: string;
  subtitle: string;
  dateLabel: string;
  coverUrl: string;
  items: MediaItem[];
}

export type ActiveTab = "photos" | "memories" | "search" | "collections" | "create";

export type GridDensity = 1 | 2 | 3 | 5;
