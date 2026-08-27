import { MediaItem, StoryMemory } from "../types";

export function extractClientVideoThumbnail(file: File): Promise<{ thumbUrl: string; duration: string; aspectRatio: number }> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    const url = URL.createObjectURL(file);
    video.src = url;

    let resolved = false;
    const finish = (thumbUrl: string, duration: string, aspectRatio: number) => {
      if (resolved) return;
      resolved = true;
      resolve({ thumbUrl, duration, aspectRatio });
    };

    const timeout = setTimeout(() => {
      finish(url, "0:05", 1.0);
    }, 4000);

    video.onloadedmetadata = () => {
      // Seek to ~0.33s (approx 10th frame for standard 30fps)
      const targetTime = Math.min(0.33, video.duration > 0.5 ? 0.33 : video.duration / 2);
      video.currentTime = targetTime;
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        const w = video.videoWidth || 480;
        const h = video.videoHeight || 480;
        canvas.width = Math.min(w, 480);
        canvas.height = Math.min(h, 480);
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const thumbUrl = canvas.toDataURL("image/jpeg", 0.85);
          const dur = video.duration || 5;
          const mins = Math.floor(dur / 60);
          const secs = Math.floor(dur % 60);
          const durationStr = `${mins}:${secs < 10 ? "0" : ""}${secs}`;
          const aspect = w / h || 1.0;
          clearTimeout(timeout);
          return finish(thumbUrl, durationStr, parseFloat(aspect.toFixed(2)));
        }
      } catch {}
      clearTimeout(timeout);
      finish(url, "0:05", 1.0);
    };

    video.onerror = () => {
      clearTimeout(timeout);
      finish(url, "0:05", 1.0);
    };
  });
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export function formatDateHeader(dateStr: string): { title: string; subtitle?: string; key: string } {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return { title: "Recently Added", key: "recent" };
    }

    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();

    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    if (isToday) {
      return { title: "Today", subtitle: `${dayNames[date.getDay()]}, ${monthNames[date.getMonth()]} ${date.getDate()}`, key: `today-${date.toISOString().slice(0, 10)}` };
    }
    if (isYesterday) {
      return { title: "Yesterday", subtitle: `${dayNames[date.getDay()]}, ${monthNames[date.getMonth()]} ${date.getDate()}`, key: `yesterday-${date.toISOString().slice(0, 10)}` };
    }

    const isCurrentYear = date.getFullYear() === now.getFullYear();
    if (isCurrentYear) {
      return {
        title: `${dayNames[date.getDay()]}, ${monthNames[date.getMonth()]} ${date.getDate()}`,
        subtitle: date.getFullYear().toString(),
        key: date.toISOString().slice(0, 10),
      };
    }

    return {
      title: `${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`,
      subtitle: `${dayNames[date.getDay()]}`,
      key: date.toISOString().slice(0, 10),
    };
  } catch {
    return { title: "Photos", key: "default" };
  }
}

export function getMonthYearLabel(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    return `${monthNames[date.getMonth()]}`;
  } catch {
    return "August";
  }
}

export function groupMediaByDate(items: MediaItem[]): { key: string; title: string; subtitle?: string; monthLabel: string; items: MediaItem[] }[] {
  const groupsMap = new Map<string, { title: string; subtitle?: string; monthLabel: string; items: MediaItem[] }>();

  items.forEach((item) => {
    const header = formatDateHeader(item.lastModified);
    const monthLabel = getMonthYearLabel(item.lastModified);
    if (!groupsMap.has(header.key)) {
      groupsMap.set(header.key, {
        title: header.title,
        subtitle: header.subtitle,
        monthLabel,
        items: [],
      });
    }
    groupsMap.get(header.key)!.items.push(item);
  });

  return Array.from(groupsMap.entries()).map(([key, value]) => ({
    key,
    ...value,
  }));
}

export function generateMemoriesFromMedia(items: MediaItem[]): StoryMemory[] {
  if (items.length === 0) {
    return [
      {
        id: "mem-welcome",
        title: "Welcome to Google Photos",
        subtitle: "Cloud Sync with Blomp OpenStack",
        dateLabel: "Today",
        coverUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80",
        items: [],
      },
    ];
  }

  const memories: StoryMemory[] = [];
  
  // 1. Recent Highlights
  if (items.length >= 1) {
    memories.push({
      id: "mem-recent",
      title: "Recent Highlights",
      subtitle: "Your latest memories",
      dateLabel: "This Week",
      coverUrl: items[0].thumbUrl || items[0].url,
      items: items.slice(0, Math.min(8, items.length)),
    });
  }

  // 2. Spotlight
  if (items.length >= 3) {
    const midIdx = Math.floor(items.length / 2);
    memories.push({
      id: "mem-spotlight",
      title: "Summer Days",
      subtitle: "August Highlights",
      dateLabel: "August",
      coverUrl: items[midIdx].thumbUrl || items[midIdx].url,
      items: items.slice(Math.max(0, midIdx - 2), Math.min(items.length, midIdx + 4)),
    });
  }

  // 3. Best of the Month
  if (items.length >= 5) {
    const lastItem = items[items.length - 1];
    memories.push({
      id: "mem-retro",
      title: "Rediscover",
      subtitle: getMonthYearLabel(lastItem.lastModified),
      dateLabel: getMonthYearLabel(lastItem.lastModified),
      coverUrl: lastItem.thumbUrl || lastItem.url,
      items: items.slice(-5),
    });
  }

  return memories;
}

// Fallback sample photos modeled closely to match the user's authentic screenshots
// with varied aspect ratios (tall portrait 9:16, 3:4, wide landscape 16:9, 4:3, square 1:1)
export const SAMPLE_FALLBACK_PHOTOS: MediaItem[] = [
  {
    name: "Bougainvillea_Pink_Flowers.jpg",
    bytes: 3820000,
    contentType: "image/jpeg",
    lastModified: new Date(Date.now() - 3600000 * 1).toISOString(),
    isVideo: false,
    hasThumb: true,
    url: "https://images.unsplash.com/photo-1596707328905-24c6c0612c6a?w=1600&auto=format&fit=crop&q=85",
    thumbUrl: "https://images.unsplash.com/photo-1596707328905-24c6c0612c6a?w=600&auto=format&fit=crop&q=80",
    isFavorite: true,
    aspectRatio: 0.56, // Tall 9:16 portrait span
    isSynced: true,
    caption: "Pink Bougainvillea and Clear Blue Sky",
  },
  {
    name: "Traditional_Roti_Platter.jpg",
    bytes: 2950000,
    contentType: "image/jpeg",
    lastModified: new Date(Date.now() - 3600000 * 2).toISOString(),
    isVideo: false,
    hasThumb: true,
    url: "https://images.unsplash.com/photo-1626074353765-517a681e40be?w=1600&auto=format&fit=crop&q=85",
    thumbUrl: "https://images.unsplash.com/photo-1626074353765-517a681e40be?w=600&auto=format&fit=crop&q=80",
    isFavorite: false,
    aspectRatio: 1.33, // 4:3 landscape
    isSynced: true,
    caption: "Fresh Tandoori Roti on Marble Table",
  },
  {
    name: "Evening_Birthday_Celebration.mp4",
    bytes: 14200000,
    contentType: "video/mp4",
    lastModified: new Date(Date.now() - 3600000 * 3).toISOString(),
    isVideo: true,
    hasThumb: true,
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    thumbUrl: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=600&auto=format&fit=crop&q=80",
    isFavorite: true,
    aspectRatio: 0.75, // 3:4 portrait video
    duration: "0:40",
    isSynced: true,
    caption: "Birthday Candle Night Celebration",
  },
  {
    name: "Friends_Motorbike_Ride.mp4",
    bytes: 8400000,
    contentType: "video/mp4",
    lastModified: new Date(Date.now() - 3600000 * 4).toISOString(),
    isVideo: true,
    hasThumb: true,
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    thumbUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&auto=format&fit=crop&q=80",
    isFavorite: false,
    aspectRatio: 0.8,
    duration: "0:06",
    isSynced: true,
    caption: "Road Trip With Friends",
  },
  {
    name: "Evening_Tea_Chai_Session.mp4",
    bytes: 9200000,
    contentType: "video/mp4",
    lastModified: new Date(Date.now() - 3600000 * 5).toISOString(),
    isVideo: true,
    hasThumb: true,
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    thumbUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80",
    isFavorite: false,
    aspectRatio: 0.75,
    duration: "0:05",
    isSynced: true,
    caption: "Evening Gathering",
  },
  {
    name: "Study_Notes_Manuscript.jpg",
    bytes: 1840000,
    contentType: "image/jpeg",
    lastModified: new Date(Date.now() - 3600000 * 6).toISOString(),
    isVideo: false,
    hasThumb: true,
    url: "https://images.unsplash.com/photo-1517842645767-c639042777db?w=1600&auto=format&fit=crop&q=85",
    thumbUrl: "https://images.unsplash.com/photo-1517842645767-c639042777db?w=600&auto=format&fit=crop&q=80",
    isFavorite: false,
    aspectRatio: 0.75, // 3:4 portrait document
    isSynced: true,
    caption: "Lecture Handwritten Notes",
  },
  {
    name: "Green_Pastures_Village_Walk.jpg",
    bytes: 3100000,
    contentType: "image/jpeg",
    lastModified: new Date(Date.now() - 3600000 * 7).toISOString(),
    isVideo: false,
    hasThumb: true,
    url: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1600&auto=format&fit=crop&q=85",
    thumbUrl: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&auto=format&fit=crop&q=80",
    isFavorite: true,
    aspectRatio: 0.85,
    isSynced: true,
    caption: "Green Agricultural Fields",
  },
  {
    name: "Golden_Smartphone_Reflection.mp4",
    bytes: 6500000,
    contentType: "video/mp4",
    lastModified: new Date(Date.now() - 3600000 * 8).toISOString(),
    isVideo: true,
    hasThumb: true,
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    thumbUrl: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80",
    isFavorite: false,
    aspectRatio: 1.25,
    duration: "0:12",
    isSynced: true,
    caption: "Device Capture",
  },
  {
    name: "Night_Outdoor_Conversation.mp4",
    bytes: 11200000,
    contentType: "video/mp4",
    lastModified: new Date(Date.now() - 3600000 * 9).toISOString(),
    isVideo: true,
    hasThumb: true,
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4",
    thumbUrl: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=600&auto=format&fit=crop&q=80",
    isFavorite: false,
    aspectRatio: 0.75,
    duration: "0:41",
    isSynced: true,
    caption: "Night Chat Under Lights",
  },
  {
    name: "Chai_Dhaba_Corner.mp4",
    bytes: 7800000,
    contentType: "video/mp4",
    lastModified: new Date(Date.now() - 3600000 * 10).toISOString(),
    isVideo: true,
    hasThumb: true,
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4",
    thumbUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80",
    isFavorite: false,
    aspectRatio: 0.75,
    duration: "0:04",
    isSynced: true,
    caption: "Evening Refreshment",
  },
  {
    name: "Crispy_Paratha_Breakfast.mp4",
    bytes: 9800000,
    contentType: "video/mp4",
    lastModified: new Date(Date.now() - 3600000 * 11).toISOString(),
    isVideo: true,
    hasThumb: true,
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    thumbUrl: "https://images.unsplash.com/photo-1626074353765-517a681e40be?w=600&auto=format&fit=crop&q=80",
    isFavorite: true,
    aspectRatio: 1.1,
    duration: "0:05",
    isSynced: true,
    caption: "Warm Crisp Paratha",
  },
  {
    name: "Golden_Hour_Coast_Sunset.jpg",
    bytes: 3420000,
    contentType: "image/jpeg",
    lastModified: new Date(Date.now() - 86400000 * 1).toISOString(),
    isVideo: false,
    hasThumb: true,
    url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&auto=format&fit=crop&q=85",
    thumbUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80",
    isFavorite: true,
    aspectRatio: 1.5, // 3:2 landscape
    isSynced: true,
    caption: "Pacific Coast Sunset",
  },
  {
    name: "Alps_Mountain_Sunrise.jpg",
    bytes: 4120000,
    contentType: "image/jpeg",
    lastModified: new Date(Date.now() - 86400000 * 2).toISOString(),
    isVideo: false,
    hasThumb: true,
    url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1600&auto=format&fit=crop&q=85",
    thumbUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&auto=format&fit=crop&q=80",
    isFavorite: false,
    aspectRatio: 1.6,
    isSynced: true,
    caption: "Alps Ridge Sunrise",
  },
];
