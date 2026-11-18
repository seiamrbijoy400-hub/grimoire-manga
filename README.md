# ⚡ KuroScroll // Neo-Archive
> **2026 Future-Tech Dual-Engine Manga Platform**  
> Powered by WeebCentral Scraper Engine • Optimized for Mobile & Desktop on Termux

---

## ✨ Features & Architecture

### 1. Dual-Engine Reading Core
- **Engine A: Continuous Webtoon Strip**:
  - Endless gapless strip with infinite next-chapter streaming.
  - Micro page-number watermark overlay on panel edges.
  - Granular auto-scroll velocity engine (1x to 8x).
  - Wax-seal milestones between chapter transitions.
- **Engine B: Traditional Tankōbon Paged Reader**:
  - Right-to-Left (RTL Japanese) and Left-to-Right (LTR) reading directions.
  - Double-page spread viewing mode.
  - Keyboard shortcuts (`←`/`→`, `A`/`D`, `Space`, `F` for Fullscreen, `H` for HUD).
  - Interactive page scrubber range slider.
- **Universal Immersive Tools**:
  - Native browser fullscreen immersion mode.
  - Slide-out Chapter Jumper Drawer with live search.
  - Visual Surface Themes: `OLED Abyss (#050608)`, `Dark Graphite (#0D1117)`, `Warm Parchment (#1A1713)`, `Amethyst (#0C0914)`.
  - Image scaling: `Fit Width`, `Fit Height`, `Original Native`, `Smart Auto-Fill`.
  - Night high-contrast inversion filter.

### 2. Personal Codex Shelves & Sovereignty
- Shelves: `Reading 📖`, `Plan to Read ⏳`, `Completed 🏆`, `Favorites ⭐`.
- In-shelf live title search.
- **JSON Data Sovereignty**: One-click **Export Library (.json)** and **Restore Library (.json)**.
- Reading Chronicles (History) with relative timestamps and exact resume points.

### 3. Manga Codex & Chapter Management
- Series overview with high-res cover backdrop, synopsis, and metadata.
- Smart chapter chunking (`Ch 1–50`, `51–100`, etc.) for series with hundreds of chapters.
- Read status checkmarks on completed chapters.
- Quick batch utilities: `Mark All Read` and ascending/descending ordering.

---

## 🚀 Running the Platform

Inside `/data/user/0/com.termux/files/home/projects/grimoire-manga`:

### Start Production Server (Port 3001)
```bash
pnpm start
```
Then open:
👉 **`http://localhost:3001`**

### Development Mode (with Vite HMR)
```bash
pnpm run dev
```
- Frontend: `http://localhost:5173`
- Backend API Proxy: `http://localhost:3001`
