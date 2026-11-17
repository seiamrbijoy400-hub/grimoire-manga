# 📜 GrimoireX (KuroScroll)
> **2026 Gen-Z Victorian Scroll Manga Reading Platform**  
> Powered by WeebCentral Engine • Optimized for Mobile & Web on Termux

---

## ✨ Features

- **Victorian Scroll Reading Core**:
  - **Gapless Continuous Vertical Strip**: True webtoon/manhwa & tankobon manga seamless reading.
  - **Victorian Satin Ribbon Bookmark**: Floating ribbon progress marker showing exact scroll percentage and current page.
  - **Wax-Seal Milestones**: Antique wax seal markers at chapter headers and chapter conclusion cards.
  - **Visual Themes**:
    - `OLED Void`: Deep AMOLED obsidian black (`#09090b`).
    - `Victorian Parchment`: Vintage sepia grain paper filter.
    - `Midnight Amethyst`: Gen-Z deep purple aesthetic.
  - **Auto-Scroll Engine**: Fluid velocity acceleration with adjustable speed (1x to 8x).
  - **Dynamic Ambient Backlight**: Gentle ambient lighting responding to the mood of the panels.
  - **Adjustable Panel Gap**: From seamless (0px) up to 16px.

- **WeebCentral Content Integration**:
  - Live Trending & Latest Updates discovery.
  - Instant Spotlight Search (`Ctrl + K`).
  - Immersive Cover & Metadata View (Author, Artist, Tags, Synopsis).
  - Complete Chapter List with instant filter & date tags.
  - Built-in Streaming Image Proxy bypassing anti-hotlink 403 blocks.

- **Local-First Privacy**:
  - Zero login required.
  - Bookmarks & reading history saved to `localStorage` / `IndexedDB`.

---

## 🚀 Running the Platform

Inside `/data/user/0/com.termux/files/home/projects/grimoire-manga`:

### Start Production Server (Single Port: 3001)
```bash
pnpm start
```
Then open your mobile or desktop browser at:
👉 **`http://localhost:3001`**

### Development Mode (with Vite HMR)
```bash
pnpm run dev
```
- Frontend: `http://localhost:5173`
- Backend API Proxy: `http://localhost:3001`
