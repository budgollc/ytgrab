const express = require("express");
const { execFile, execFileSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const cors = require("cors");

// ── Resolve yt-dlp binary path at startup ─────────────────────────────────────
function resolveYtDlp() {
  // 1. Try whatever is in PATH first
  try {
    const p = execFileSync("which", ["yt-dlp"]).toString().trim();
    if (p) return p;
  } catch { }
  // 2. Common install locations (brew, pip --user, virtualenvs)
  const candidates = [
    "/usr/local/bin/yt-dlp",
    "/opt/homebrew/bin/yt-dlp",
    `${process.env.HOME}/myenv/bin/yt-dlp`,
    `${process.env.HOME}/.local/bin/yt-dlp`,
    "/usr/bin/yt-dlp",
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return "yt-dlp"; // last resort — will fail with a clear error at runtime
}
const YT_DLP = resolveYtDlp();
console.log(`🔍 Using yt-dlp: ${YT_DLP}`);

const app = express();
app.use(cors());
app.use(express.json());

// Serve index.html from root directory
app.use(express.static(__dirname));

const DOWNLOAD_DIR = path.join(__dirname, "downloads");
if (!fs.existsSync(DOWNLOAD_DIR)) fs.mkdirSync(DOWNLOAD_DIR);

app.use("/downloads", express.static(DOWNLOAD_DIR));

// Validate YouTube URL (basic guard against shell injection & garbage URLs)
function isValidYouTubeUrl(url) {
  try {
    const u = new URL(url);
    return (
      (u.hostname === "www.youtube.com" ||
        u.hostname === "youtube.com" ||
        u.hostname === "youtu.be" ||
        u.hostname === "m.youtube.com") &&
      (u.pathname.startsWith("/watch") ||
        u.pathname.startsWith("/shorts") ||
        u.hostname === "youtu.be")
    );
  } catch {
    return false;
  }
}

// Sanitize user-facing error messages (never leak raw stderr)
function safeError(stderr) {
  if (!stderr) return "An unknown error occurred.";
  if (stderr.includes("Video unavailable")) return "Video unavailable or private.";
  if (stderr.includes("Sign in")) return "This video requires sign-in.";
  if (stderr.includes("not a valid URL")) return "Invalid YouTube URL.";
  if (stderr.includes("Requested format is not available"))
    return "Requested quality/format is not available for this video.";
  if (stderr.includes("subtitles")) return "No subtitles found for this video.";
  return "Operation failed. Check the URL and try again.";
}

// ---------- GET VIDEO INFO ----------
app.post("/api/info", (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "URL required" });
  if (!isValidYouTubeUrl(url))
    return res.status(400).json({ error: "Invalid YouTube URL." });

  const args = ["--dump-json", "--no-playlist", url];
  execFile(YT_DLP, args, { timeout: 30000 }, (err, stdout, stderr) => {
    if (err)
      return res
        .status(500)
        .json({ error: safeError(stderr) });
    try {
      const info = JSON.parse(stdout);

      // Deduplicate formats by height, keep highest-fps variant per height
      const seen = new Map();
      for (const f of info.formats || []) {
        if (f.vcodec === "none" || !f.height) continue; // audio-only or no height
        const key = f.height;
        if (!seen.has(key) || (f.fps || 0) > (seen.get(key).fps || 0)) {
          seen.set(key, f);
        }
      }
      const formats = [...seen.values()]
        .sort((a, b) => b.height - a.height)
        .map((f) => ({ format_id: f.format_id, height: f.height, fps: f.fps }));

      res.json({
        title: info.title,
        thumbnail: info.thumbnail,
        duration: info.duration_string,
        uploader: info.uploader,
        view_count: info.view_count,
        formats,
      });
    } catch {
      res.status(500).json({ error: "Failed to parse video info." });
    }
  });
});

// ---------- DOWNLOAD ----------
app.post("/api/download", (req, res) => {
  const { url, type, quality } = req.body;
  if (!url) return res.status(400).json({ error: "URL required" });
  if (!isValidYouTubeUrl(url))
    return res.status(400).json({ error: "Invalid YouTube URL." });

  const outputTemplate = path.join(DOWNLOAD_DIR, "%(title)s.%(ext)s");
  let args = [];

  if (type === "mp3") {
    args = ["-x", "--audio-format", "mp3", "-o", outputTemplate, url];
  } else if (type === "thumbnail") {
    args = [
      "--write-thumbnail",
      "--skip-download",
      "--convert-thumbnails",
      "jpg",
      "-o",
      outputTemplate,
      url,
    ];
  } else if (type === "subtitles") {
    args = [
      "--write-subs",
      "--write-auto-subs",
      "--skip-download",
      "--sub-format",
      "vtt",
      "--sub-langs",
      "en",
      "-o",
      outputTemplate,
      url,
    ];
  } else {
    // Video
    const heightMap = {
      "2160": "bestvideo[height<=2160]+bestaudio/best",
      "1080": "bestvideo[height<=1080]+bestaudio/best",
      "720": "bestvideo[height<=720]+bestaudio/best",
      "480": "bestvideo[height<=480]+bestaudio/best",
      "360": "bestvideo[height<=360]+bestaudio/best",
    };
    const fmt = heightMap[quality] || "bestvideo+bestaudio/best";
    args = ["-f", fmt, "--merge-output-format", "mp4", "-o", outputTemplate, url];
  }

  // Capture list of files before download so we can find the new one
  const before = new Set(fs.readdirSync(DOWNLOAD_DIR));

  execFile(YT_DLP, args, { timeout: 600000 }, (err, stdout, stderr) => {
    if (err)
      return res.status(500).json({ error: safeError(stderr) });

    // Find newly added file(s)
    const after = fs.readdirSync(DOWNLOAD_DIR);
    const newFiles = after.filter((f) => !before.has(f));

    // Pick the most recently modified among new files (covers multi-file subtitles)
    const candidates = (newFiles.length ? newFiles : after)
      .map((f) => ({
        name: f,
        time: fs.statSync(path.join(DOWNLOAD_DIR, f)).mtimeMs,
        size: fs.statSync(path.join(DOWNLOAD_DIR, f)).size,
      }))
      .sort((a, b) => b.time - a.time);

    if (!candidates.length)
      return res.status(500).json({ error: "File not found after download." });

    const { name: filename, size } = candidates[0];
    res.json({
      filename,
      url: `/downloads/${encodeURIComponent(filename)}`,
      size,
    });
  });
});

const BASE_PORT = Number(process.env.PORT) || 3000;
const MAX_PORT_TRIES = 10;

function startServer(port, triesLeft) {
  const server = app.listen(port, () => {
    console.log(`✅ YT Grab running at http://localhost:${port}`);
  });

  server.on("error", (err) => {
    if (err.code !== "EADDRINUSE") {
      console.error("❌ Failed to start server:", err.message);
      process.exit(1);
    }

    if (triesLeft <= 0) {
      console.error(`❌ No free port found from ${BASE_PORT} to ${BASE_PORT + MAX_PORT_TRIES}.`);
      process.exit(1);
    }

    const nextPort = port + 1;
    console.warn(`⚠️ Port ${port} is busy, trying ${nextPort}...`);
    startServer(nextPort, triesLeft - 1);
  });
}

startServer(BASE_PORT, MAX_PORT_TRIES);
