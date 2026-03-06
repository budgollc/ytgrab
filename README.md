# YT Grab - YouTube Downloader
[![YTG](https://budgollc.github.io/ytgrab)](https://budgollc.github.io/ytgrab)
<img src="https://i.ibb.co/PJRH4mM/Screenshot-2026-03-05-at-4-04-47-PM.png" alt="YTGrab" border="0">

![Node.js](https://img.shields.io/badge/Node.js-v16%2B-339933?style=flat-square&logo=node.js&logoColor=white)
![yt-dlp](https://img.shields.io/badge/yt--dlp-latest-ff0000?style=flat-square&logo=youtube&logoColor=white)
![License](https://img.shields.io/badge/license-Personal%20Use-lightgrey?style=flat-square)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-blue?style=flat-square)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square)
![Made by K!MO](https://img.shields.io/badge/dev-K!MO-e25555?style=flat-square)

> A sleek, self-hosted web app to download YouTube videos, audio, subtitles,
> and thumbnails - straight from your browser.

---

## ✨ Features

| Type | Details |
|---|---|
| 🎬 **Video (MP4)** | Choose quality: 4K, 1080p, 720p, 480p, 360p |
| 🎵 **Audio (MP3)** | Extracts and converts audio only |
| 💬 **Subtitles** | Downloads auto-generated or manual subs (VTT) |
| 🖼 **Thumbnail** | Saves the video thumbnail as JPG |

- 📋 One-click **paste from clipboard**  
- 📂 **Download history** with file sizes  
- 🔒 **Shell injection protection** — all args passed as arrays, never via shell  
- ✅ **URL validation** on both client and server  
- 🛡 Safe error messages — raw `stderr` never exposed to users  

---

## 🛠 Prerequisites

1. **Node.js** (v16+) — [nodejs.org](https://nodejs.org)
2. **yt-dlp** — the download engine:
   ```bash
   # macOS (recommended)
   brew install yt-dlp

   # or via pip
   pip install yt-dlp
   ```
3. **ffmpeg** — required for merging video + audio streams:
   ```bash
   brew install ffmpeg
   ```

---

## 🚀 Setup & Run

```bash
# 1. Clone or download the project
cd yt-grab

# 2. Install Node dependencies
npm install

# 3. Start the server
npm start           # production
npm run dev         # development (auto-restart on file changes)
```

Then open **http://localhost:3000** in your browser.

> ⚠️ Never open `index.html` directly from your filesystem —  
> always use the `http://localhost:3000` address.

---

## 🔐 Security Notes

- All `yt-dlp` calls use `execFile()` with argument arrays — **no shell injection possible**
- YouTube URLs are validated on **both client and server** before processing
- Raw `stderr` output is **never forwarded** to the browser — only sanitized messages
- External links (dev tag) use `rel="noopener noreferrer"` to prevent tab-napping
- No user data is stored, logged, or transmitted anywhere outside your machine

---

## 📁 Project Structure

```
yt-grab/
├── index.html      # Frontend (single-page app)
├── server.js       # Express API server
├── package.json    # Node dependencies
├── downloads/      # Downloaded files saved here (auto-created)
└── README.md
```

---

## 🔧 Troubleshooting

| Problem | Fix |
|---|---|
| `yt-dlp not found` | Install via `brew install yt-dlp` or `pip install yt-dlp` |
| `ffmpeg not found` | Install via `brew install ffmpeg` |
| Port 3000 in use | Run `lsof -ti :3000 \| xargs kill -9` then restart |
| "Failed to fetch" | Make sure you opened `http://localhost:3000`, not the HTML file |
| 500 on `/api/info` | Update yt-dlp: `yt-dlp -U` |

---

## 📦 Keeping yt-dlp Updated

YouTube frequently changes its format. Keep yt-dlp fresh:

```bash
yt-dlp -U
# or
pip install -U yt-dlp
```

---

## ⚖️ Legal

- For **personal use only**
- Respect copyright and [YouTube's Terms of Service](https://www.youtube.com/t/terms)
- The developer assumes no liability for misuse

---

<div align="center">
  <sub>Built with ☮︎ by <a href="https://buymeacoffee.com/okimoov"><strong>K!MO</strong></a></sub>
</div>
