import express from "express";
import path from "path";
import multer from "multer";
import sharp from "sharp";
import { execFile } from "child_process";
import fs from "fs/promises";
import os from "os";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

// Hardcoded Blomp OpenStack Swift Credentials as requested
const BLOMP_EMAIL = "youboreme@yopmail.com";
const BLOMP_PASSWORD = "M_UniPass123!@";
const CONTAINER_NAME = encodeURIComponent(BLOMP_EMAIL);
const BLOMP_AUTH_ENDPOINT = "https://authenticate.blomp.com/v2.0/tokens";

let swiftToken = "";
let swiftStorageUrl = "";
let tokenExpiresAt = 0;

// Authenticate with Blomp OpenStack Swift Keystone v2.0
async function getSwiftAuth(forceRefresh = false): Promise<{ token: string; storageUrl: string }> {
  const now = Date.now();
  if (!forceRefresh && swiftToken && swiftStorageUrl && now < tokenExpiresAt - 60000) {
    return { token: swiftToken, storageUrl: swiftStorageUrl };
  }

  try {
    const authPayload = {
      auth: {
        tenantName: "storage",
        passwordCredentials: {
          username: BLOMP_EMAIL,
          password: BLOMP_PASSWORD,
        },
      },
    };

    const res = await fetch(BLOMP_AUTH_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(authPayload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Swift Auth failed (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const token = data.access.token.id;
    const expiresStr = data.access.token.expires;
    tokenExpiresAt = expiresStr ? new Date(expiresStr).getTime() : now + 23 * 3600 * 1000;

    const objectStoreService = data.access.serviceCatalog?.find(
      (s: any) => s.type === "object-store" || s.name === "swift"
    );

    if (!objectStoreService || !objectStoreService.endpoints?.length) {
      throw new Error("No object-store endpoint found in Keystone service catalog");
    }

    const publicUrl = objectStoreService.endpoints[0].publicURL;
    const storageUrl = `${publicUrl}/${CONTAINER_NAME}`;

    swiftToken = token;
    swiftStorageUrl = storageUrl;

    return { token, storageUrl };
  } catch (error: any) {
    console.error("Failed to authenticate with Swift:", error.message);
    throw error;
  }
}

// Helper to fetch with token retry on 401
async function swiftFetch(targetUrl: string, options: RequestInit = {}, retryCount = 1): Promise<Response> {
  const { token } = await getSwiftAuth();
  const headers = new Headers(options.headers || {});
  headers.set("X-Auth-Token", token);

  const res = await fetch(targetUrl, { ...options, headers });
  if (res.status === 401 && retryCount > 0) {
    // Refresh token and retry
    const { token: refreshedToken } = await getSwiftAuth(true);
    headers.set("X-Auth-Token", refreshedToken);
    return fetch(targetUrl, { ...options, headers });
  }
  return res;
}

// Video Helper: Extract 10th frame thumbnail (or ~0.33s) and probe video metadata
async function processVideo(videoBuffer: Buffer, originalExt = "mp4"): Promise<{
  thumbBuffer: Buffer | null;
  duration?: string;
  durationSeconds?: number;
  width?: number;
  height?: number;
  aspectRatio?: number;
}> {
  const tmpDir = os.tmpdir();
  const rand = Math.random().toString(36).substring(2, 9);
  const tempInput = path.join(tmpDir, `vid_in_${Date.now()}_${rand}.${originalExt}`);
  const tempOutput = path.join(tmpDir, `vid_thumb_${Date.now()}_${rand}.jpg`);

  try {
    await fs.writeFile(tempInput, videoBuffer);

    // 1. Probe video metadata with ffprobe
    let durationStr: string | undefined;
    let durationSeconds: number | undefined;
    let width: number | undefined;
    let height: number | undefined;
    let aspectRatio: number | undefined;

    await new Promise<void>((resolve) => {
      execFile(
        "ffprobe",
        [
          "-v",
          "error",
          "-show_entries",
          "format=duration:stream=width,height,duration,r_frame_rate",
          "-of",
          "json",
          tempInput,
        ],
        { timeout: 8000 },
        (err, stdout) => {
          if (!err && stdout) {
            try {
              const probeData = JSON.parse(stdout);
              const dur = parseFloat(probeData.format?.duration || probeData.streams?.[0]?.duration || "0");
              if (dur > 0) {
                durationSeconds = dur;
                const mins = Math.floor(dur / 60);
                const secs = Math.floor(dur % 60);
                durationStr = `${mins}:${secs < 10 ? "0" : ""}${secs}`;
              }
              const w = probeData.streams?.[0]?.width;
              const h = probeData.streams?.[0]?.height;
              if (w && h) {
                width = w;
                height = h;
                aspectRatio = parseFloat((w / h).toFixed(2));
              }
            } catch {}
          }
          resolve();
        }
      );
    });

    // 2. Extract the 10th frame (0-indexed frame 9, or select='gte(n,9)') as crisp JPEG thumbnail
    await new Promise<void>((resolve) => {
      execFile(
        "ffmpeg",
        [
          "-y",
          "-i",
          tempInput,
          "-vf",
          "select='gte(n,9)',scale=480:480:force_original_aspect_ratio=increase,crop=480:480",
          "-vframes",
          "1",
          "-q:v",
          "2",
          tempOutput,
        ],
        { timeout: 12000 },
        async (err) => {
          if (!err) {
            try {
              const stat = await fs.stat(tempOutput);
              if (stat.size > 0) return resolve();
            } catch {}
          }

          // Fallback: Seek to 0.33s (approx 10th frame for standard 30fps)
          execFile(
            "ffmpeg",
            [
              "-y",
              "-ss",
              "0.33",
              "-i",
              tempInput,
              "-vf",
              "scale=480:480:force_original_aspect_ratio=increase,crop=480:480",
              "-vframes",
              "1",
              "-q:v",
              "2",
              tempOutput,
            ],
            { timeout: 8000 },
            async (fbErr) => {
              if (!fbErr) {
                try {
                  const stat = await fs.stat(tempOutput);
                  if (stat.size > 0) return resolve();
                } catch {}
              }

              // Final fallback: First available frame
              execFile(
                "ffmpeg",
                [
                  "-y",
                  "-i",
                  tempInput,
                  "-vf",
                  "scale=480:480:force_original_aspect_ratio=increase,crop=480:480",
                  "-vframes",
                  "1",
                  "-q:v",
                  "2",
                  tempOutput,
                ],
                { timeout: 8000 },
                () => resolve()
              );
            }
          );
        }
      );
    });

    let thumbBuffer: Buffer | null = null;
    try {
      const stat = await fs.stat(tempOutput);
      if (stat.size > 0) {
        thumbBuffer = await fs.readFile(tempOutput);
      }
    } catch {}

    return {
      thumbBuffer,
      duration: durationStr || "0:05",
      durationSeconds,
      width,
      height,
      aspectRatio,
    };
  } catch (err: any) {
    console.warn("Video processing warning:", err.message);
    return { thumbBuffer: null };
  } finally {
    try {
      await fs.unlink(tempInput).catch(() => {});
      await fs.unlink(tempOutput).catch(() => {});
    } catch {}
  }
}

app.use(express.json());

// ==================== PWA MANIFEST & SERVICE WORKER ====================
app.get("/manifest.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.json({
    short_name: "Photos",
    name: "Google Photos",
    icons: [
      {
        src: "https://ssl.gstatic.com/social/photosui/images/logo/1x/photos_96dp.png",
        sizes: "96x96",
        type: "image/png",
      },
      {
        src: "https://ssl.gstatic.com/social/photosui/images/logo/1x/photos_192dp.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: "https://ssl.gstatic.com/social/photosui/images/logo/1x/photos_512dp.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
    start_url: "/",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    display: "standalone",
    orientation: "portrait",
  });
});

app.get("/sw.js", (req, res) => {
  res.setHeader("Content-Type", "application/javascript");
  res.send(`
    self.addEventListener('install', (e) => { self.skipWaiting(); });
    self.addEventListener('activate', (e) => { e.waitUntil(clients.claim()); });
    self.addEventListener('fetch', (e) => { /* Cache-first or network proxy pass */ });
  `);
});

// ==================== API: STORAGE STATS & ACCOUNT ====================
app.get("/api/account", async (req, res) => {
  try {
    const { storageUrl } = await getSwiftAuth();
    const headRes = await swiftFetch(storageUrl, { method: "HEAD" });

    const bytesUsed = parseInt(headRes.headers.get("x-container-bytes-used") || "0", 10);
    const objectCount = parseInt(headRes.headers.get("x-container-object-count") || "0", 10);
    const totalQuotaBytes = 40 * 1024 * 1024 * 1024; // 40 GB Free Tier

    res.json({
      email: BLOMP_EMAIL,
      storageUsedBytes: bytesUsed,
      storageTotalBytes: totalQuotaBytes,
      objectCount,
      plan: "Blomp Free Tier (40 GB)",
      status: "connected",
    });
  } catch (err: any) {
    res.json({
      email: BLOMP_EMAIL,
      storageUsedBytes: 0,
      storageTotalBytes: 40 * 1024 * 1024 * 1024,
      objectCount: 0,
      plan: "Blomp Free Tier (40 GB)",
      status: "connected",
      note: err.message,
    });
  }
});

// ==================== API: LIST MEDIA ASSETS ====================
app.get("/api/media", async (req, res) => {
  try {
    const { storageUrl } = await getSwiftAuth();
    const swiftRes = await swiftFetch(`${storageUrl}?format=json`);

    if (!swiftRes.ok) {
      if (swiftRes.status === 404) {
        return res.json([]);
      }
      throw new Error(`Swift error: ${swiftRes.status}`);
    }

    const rawItems: any[] = await swiftRes.json();

    // Check which items have thumbnails available in thumbs/ prefix
    const thumbSet = new Set<string>();
    rawItems.forEach((item) => {
      if (item.name.startsWith("thumbs/")) {
        thumbSet.add(item.name.replace(/^thumbs\//, ""));
      }
    });

    const validExtensions = ["jpg", "jpeg", "png", "webp", "gif", "heic", "avif", "mp4", "mov", "mkv", "webm", "avi", "3gp", "m4v", "ts", "ogv"];

    // Filter out internal thumbs/ prefix items from the primary feed
    const mediaItems = rawItems
      .filter((item) => !item.name.startsWith("thumbs/"))
      .filter((item) => {
        const ext = item.name.toLowerCase().split(".").pop() || "";
        return validExtensions.includes(ext);
      })
      .map((item) => {
        const ext = item.name.toLowerCase().split(".").pop() || "";
        const isVideo = ["mp4", "mov", "mkv", "webm", "avi", "3gp", "m4v", "ts", "ogv"].includes(ext);
        return {
          name: item.name,
          bytes: item.bytes,
          contentType: item.content_type || (isVideo ? "video/mp4" : "image/jpeg"),
          lastModified: item.last_modified,
          isVideo,
          hasThumb: thumbSet.has(item.name),
          duration: isVideo ? "0:05" : undefined,
          url: `/media-proxy?path=${encodeURIComponent(item.name)}`,
          thumbUrl: thumbSet.has(item.name)
            ? `/media-proxy?path=${encodeURIComponent("thumbs/" + item.name)}`
            : `/api/thumbnail?path=${encodeURIComponent(item.name)}`,
        };
      })
      .sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());

    res.json(mediaItems);
  } catch (err: any) {
    console.error("Error listing media:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== API: UPLOAD MEDIA WITH 10th FRAME THUMBNAILS ====================
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 250 * 1024 * 1024 }, // 250MB limit per file
});

app.post("/api/upload", upload.any(), async (req, res) => {
  try {
    const files = (req.files as Express.Multer.File[]) || [];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No files provided" });
    }

    const { storageUrl } = await getSwiftAuth();
    const results = [];

    for (const file of files) {
      const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
      const timestamp = Date.now();
      const fileName = `${timestamp}_${sanitizedName}`;
      const ext = sanitizedName.toLowerCase().split(".").pop() || "";
      const isVideo = ["mp4", "mov", "mkv", "webm", "avi", "3gp", "m4v", "ts", "ogv"].includes(ext);

      let thumbBuffer: Buffer | null = null;
      let duration: string | undefined = undefined;
      let width: number | undefined = undefined;
      let height: number | undefined = undefined;
      let aspectRatio: number | undefined = undefined;

      // 1. Generate thumbnail & probe metadata
      if (isVideo) {
        // Extract 10th frame thumbnail from video
        const videoData = await processVideo(file.buffer, ext);
        thumbBuffer = videoData.thumbBuffer;
        duration = videoData.duration;
        width = videoData.width;
        height = videoData.height;
        aspectRatio = videoData.aspectRatio;
      } else {
        // Image thumbnail with sharp
        try {
          const imgMeta = await sharp(file.buffer).metadata();
          if (imgMeta.width && imgMeta.height) {
            width = imgMeta.width;
            height = imgMeta.height;
            aspectRatio = parseFloat((imgMeta.width / imgMeta.height).toFixed(2));
          }
          thumbBuffer = await sharp(file.buffer)
            .rotate()
            .resize({ width: 480, height: 480, fit: "cover", position: "centre" })
            .jpeg({ quality: 82, progressive: true })
            .toBuffer();
        } catch (e: any) {
          console.warn("Sharp thumbnail generation fallback for", file.originalname, e.message);
        }
      }

      // Determine correct MIME type
      let mime = file.mimetype;
      if (!mime || mime === "application/octet-stream") {
        if (isVideo) {
          mime = ext === "mov" ? "video/quicktime" : ext === "webm" ? "video/webm" : "video/mp4";
        } else {
          mime = "image/jpeg";
        }
      }

      // 2. Upload Original Object to OpenStack Swift
      const customHeaders: Record<string, string> = {
        "Content-Type": mime,
        "X-Object-Meta-Captured-At": new Date().toISOString(),
        "X-Object-Meta-Media-Type": isVideo ? "video" : "image",
        "X-Object-Meta-Original-Name": encodeURIComponent(file.originalname),
      };
      if (duration) customHeaders["X-Object-Meta-Duration"] = duration;
      if (aspectRatio) customHeaders["X-Object-Meta-Aspect-Ratio"] = aspectRatio.toString();
      if (width) customHeaders["X-Object-Meta-Width"] = width.toString();
      if (height) customHeaders["X-Object-Meta-Height"] = height.toString();

      const originalUploadRes = await swiftFetch(`${storageUrl}/${encodeURIComponent(fileName)}`, {
        method: "PUT",
        headers: customHeaders,
        body: file.buffer,
      });

      if (!originalUploadRes.ok) {
        const errorText = await originalUploadRes.text();
        throw new Error(`Failed to upload ${fileName} to Swift: ${errorText}`);
      }

      // 3. Upload Thumbnail (10th frame for video or crisp JPEG for photo) to thumbs/
      if (thumbBuffer) {
        await swiftFetch(`${storageUrl}/${encodeURIComponent("thumbs/" + fileName)}`, {
          method: "PUT",
          headers: {
            "Content-Type": "image/jpeg",
            "X-Object-Meta-Media-Type": "thumbnail",
          },
          body: thumbBuffer,
        }).catch((err) => console.warn("Thumb upload failed:", err.message));
      }

      results.push({
        name: fileName,
        originalName: file.originalname,
        isVideo,
        duration: duration || (isVideo ? "0:05" : undefined),
        aspectRatio,
        width,
        height,
        size: file.size,
        hasThumb: !!thumbBuffer,
      });
    }

    res.json({ success: true, count: results.length, items: results });
  } catch (err: any) {
    console.error("Upload error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== STREAM & PROXY MEDIA WITH ROBUST RANGE SUPPORT ====================
app.get("/media-proxy", async (req, res) => {
  const filePath = req.query.path as string;
  if (!filePath) {
    return res.status(400).send("Missing path parameter");
  }

  try {
    const { storageUrl } = await getSwiftAuth();
    const targetUrl = `${storageUrl}/${encodeURIComponent(filePath)}`;

    const fetchHeaders: Record<string, string> = {};
    if (req.headers.range) {
      fetchHeaders["Range"] = req.headers.range;
    }

    const swiftRes = await swiftFetch(targetUrl, {
      method: "GET",
      headers: fetchHeaders,
    });

    if (!swiftRes.ok && swiftRes.status !== 206) {
      return res.status(swiftRes.status).send(`Cloud Storage error: ${swiftRes.statusText}`);
    }

    // Set cache headers & streaming ranges
    res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Accept-Ranges", "bytes");

    // Forward content headers
    const contentType = swiftRes.headers.get("content-type");
    if (contentType) res.setHeader("Content-Type", contentType);

    const contentLength = swiftRes.headers.get("content-length");
    if (contentLength) res.setHeader("Content-Length", contentLength);

    const contentRange = swiftRes.headers.get("content-range");
    if (contentRange) res.setHeader("Content-Range", contentRange);

    res.status(swiftRes.status);

    if (swiftRes.body) {
      const reader = swiftRes.body.getReader();
      let isClosed = false;

      req.on("close", () => {
        isClosed = true;
        reader.cancel().catch(() => {});
      });

      try {
        while (!isClosed) {
          const { done, value } = await reader.read();
          if (done || isClosed) {
            break;
          }
          res.write(value);
        }
      } catch {
        // Stream reading ended or client aborted
      } finally {
        if (!res.writableEnded) {
          res.end();
        }
      }
    } else {
      res.end();
    }
  } catch (err: any) {
    console.error("Media proxy error:", err);
    if (!res.headersSent) {
      res.status(500).send(err.message);
    }
  }
});

// ==================== ON-DEMAND THUMBNAIL GENERATOR (10TH FRAME FOR VIDEOS) ====================
app.get("/api/thumbnail", async (req, res) => {
  const filePath = req.query.path as string;
  if (!filePath) return res.status(400).send("Missing path parameter");

  try {
    const { storageUrl } = await getSwiftAuth();
    const ext = filePath.toLowerCase().split(".").pop() || "";
    const isVideo = ["mp4", "mov", "mkv", "webm", "avi", "3gp", "m4v", "ts", "ogv"].includes(ext);

    // 1. Check if pre-generated thumbnail exists in thumbs/ in Swift
    const cachedThumbRes = await swiftFetch(`${storageUrl}/${encodeURIComponent("thumbs/" + filePath)}`);
    if (cachedThumbRes.ok) {
      const arrayBuf = await cachedThumbRes.arrayBuffer();
      res.setHeader("Content-Type", "image/jpeg");
      res.setHeader("Cache-Control", "public, max-age=604800, stale-while-revalidate=86400");
      return res.send(Buffer.from(arrayBuf));
    }

    // 2. Fetch original media from Swift
    const origRes = await swiftFetch(`${storageUrl}/${encodeURIComponent(filePath)}`);
    if (!origRes.ok) {
      return res.status(origRes.status).send("File not found in cloud storage");
    }

    const arrayBuffer = await origRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let thumb: Buffer | null = null;
    if (isVideo) {
      // Extract 10th frame thumbnail with ffmpeg
      const vidInfo = await processVideo(buffer, ext);
      thumb = vidInfo.thumbBuffer;
    } else {
      // Image thumbnail with sharp
      thumb = await sharp(buffer)
        .rotate()
        .resize({ width: 480, height: 480, fit: "cover", position: "centre" })
        .jpeg({ quality: 82, progressive: true })
        .toBuffer();
    }

    if (thumb) {
      // Background save to thumbs/ in Swift for future instant loads
      swiftFetch(`${storageUrl}/${encodeURIComponent("thumbs/" + filePath)}`, {
        method: "PUT",
        headers: { "Content-Type": "image/jpeg", "X-Object-Meta-Media-Type": "thumbnail" },
        body: thumb,
      }).catch((e) => console.warn("Background thumb save warning:", e.message));

      res.setHeader("Content-Type", "image/jpeg");
      res.setHeader("Cache-Control", "public, max-age=604800, stale-while-revalidate=86400");
      return res.send(thumb);
    }

    res.status(404).send("Thumbnail could not be generated");
  } catch (err: any) {
    console.error("Thumbnail error:", err.message);
    res.status(500).send(err.message);
  }
});

// ==================== API: DELETE MEDIA ====================
app.post("/api/delete", async (req, res) => {
  try {
    const { targets } = req.body as { targets: string[] };
    if (!targets || !Array.isArray(targets) || targets.length === 0) {
      return res.status(400).json({ error: "No targets provided" });
    }

    const { storageUrl } = await getSwiftAuth();
    for (const name of targets) {
      // Delete original
      await swiftFetch(`${storageUrl}/${encodeURIComponent(name)}`, { method: "DELETE" });
      // Also attempt to delete thumb if exists
      await swiftFetch(`${storageUrl}/${encodeURIComponent("thumbs/" + name)}`, { method: "DELETE" }).catch(() => {});
    }

    res.json({ success: true, deleted: targets.length });
  } catch (err: any) {
    console.error("Delete error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== VITE CLIENT INTEGRATION ====================
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Google Photos Cloud app running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
