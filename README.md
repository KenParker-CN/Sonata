# Sonata — Local-First Web Music Player

A local-first, browser-based music player for personal libraries. Built with React, TypeScript, Vite, and HeroUI. Supports the File System Access API for persistent folder access across sessions.

## Features

- **Local library** — Pick a music folder once; Sonata caches metadata and artwork in IndexedDB. Subsequent loads are instant.
- **File System Access API** — Persistent directory handles; no re-picking folders after browser restart.
- **Rich metadata** — Reads ID3, Vorbis, APE, MP4 tags via `music-metadata-browser`. Supports cover art, composers, disc/track numbers, release dates, codecs, bit depth, sample rate, bitrate, lossless flag.
- **Classical-friendly** — Composer grouping, work grouping, performer/album artist separation.
- **Playlists** — Create, reorder, rename, delete, custom cover art (stored as blobs in IndexedDB).
- **Queue** — Persistent queue with shuffle, repeat modes, play-next, add-to-queue.
- **Responsive layout** — Desktop: fixed sidebar + optional right queue panel. Mobile: bottom-sheet queue, drawer navigation.
- **Theme system** — Light/dark toggle with **circular reveal transition** (View Transitions API) expanding from the theme button.
- **HeroUI theming** — OKLCH color tokens, zero-radius design, Google Sans font loaded via Google Fonts CDN.
- **Zero-config** — No backend, no auth, no external services. Runs entirely in the browser.

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | React 19 + TypeScript |
| Build | Vite 6 + Rolldown |
| Routing | React Router 7 |
| UI | HeroUI v3 (Tailwind CSS v4) |
| Animations | Motion (Framer Motion) + View Transitions API |
| Audio | Web Audio API (`AudioContext`) |
| Metadata | `music-metadata-browser` |
| Storage | IndexedDB (`idb`) |
| File Access | File System Access API (with fallback `<input type="file">`) |
| Linting | ESLint 9 + TypeScript ESLint |

## Project Structure

```
src/
├── components/
│   ├── animate/           # Animation primitives (theme-toggler, gradient, rolling, shimmering, splitting)
│   ├── context-menus/     # Right-click menus (album, entity, track)
│   ├── data/              # Data display (cards, rows, grids, shelves, lockups)
│   ├── dialogs/           # Confirm, playlist create/edit
│   ├── feedback/          # Empty, not-found, loading, status, search-empty
│   ├── layout/            # AppLayout, Sidebar, PlayerBar, QueuePanel, QueueSidePanel, PageHeader
│   ├── media/             # CoverArt, GeneratedArt, ArtPicker, AudioQualityBadge, PlayButton, NowPlayingBars
│   ├── navigation/        # SearchInput, BackLink, ViewModeToggle, SortSelect, AlphabetIndex, LetterSection
│   ├── queue/             # QueueList
│   └── ui/                # Primitives: ContextMenu, Dialog, Drawer
├── contexts/
│   └── app.tsx            # Global app context (tracks, playlists, player, theme, sidebar, etc.)
├── hooks/                 # useAudioPlayer, useImportManager, useMediaQuery, useSearch, useSort, useViewMode
├── pages/                 # Library, Artists, ArtistDetail, Composers, ComposerDetail, Albums, AlbumDetail, Playlists, PlaylistDetail, TrackDetail
├── services/              # customArt, libraryStore, metadata, musicFolders, restoreLibrary
├── types/                 # TypeScript types (music, file-system-access)
├── utils/                 # Helpers (alphabet, collate, format, generatedArt, group*, parse*, playlist, routes, search)
├── index.css              # Tailwind v4 + HeroUI styles + global theme tokens
├── global.css             # HeroUI OKLCH theme variables (light/dark)
├── App.tsx                # Root: state, providers, routing, player bar
└── main.tsx               # Entry point
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+ (or npm/yarn)
- A Chromium-based browser (File System Access API required for persistent folder access)

### Install & Run

```bash
pnpm install
pnpm dev
```

Open http://localhost:5173

### Build for Production

```bash
pnpm build
pnpm preview
```

## Usage

1. **Add Music** — Click "Add Music" in the sidebar, pick a folder containing audio files.
2. **Persistent Access** — Grant permission when prompted. Sonata will remember the folder.
3. **Browse** — Navigate Library, Artists, Composers, Albums, Playlists.
4. **Play** — Click any track. Queue persists across navigation.
5. **Playlists** — Create playlists, drag to reorder (via context menu), custom cover art.
6. **Theme** — Toggle light/dark in sidebar; circular reveal animates from the button.

## Key Implementation Details

### Theme Transition (View Transitions API)
`src/components/animate/theme-toggler.tsx` uses `document.startViewTransition()` with a circular `clip-path` animation. The old snapshot stays visible while the new theme expands from the button center — no blank flash.

### HeroUI Theming
`src/global.css` defines OKLCH color tokens for light/dark. `src/index.css` imports `@heroui/styles` then `./global.css`. The `#root` element has `view-transition-name: root` for the transition.

### Audio Player
`src/hooks/useAudioPlayer.ts` manages a single `AudioContext`, gapless playback via `AudioBufferSourceNode` chaining, and exposes a minimal imperative API (`playFromContext`, `queueNext`, `seek`, `setVolume`, etc.).

### Library Persistence
`src/services/libraryStore.ts` uses `idb` to store tracks, playlists, and artwork blobs. `src/services/restoreLibrary.ts` rehydrates on startup, re-requesting File System Access handles if needed.

### Metadata Parsing
`src/services/metadata.ts` extracts tags via `music-metadata-browser`. Artists/album artists are stored as raw strings; `parseArtists()` splits on `, ; / \` on-demand for display.

## Browser Support

| Feature | Chrome/Edge | Firefox | Safari |
|---------|-------------|---------|--------|
| File System Access API | ✅ | ❌ (fallback) | ❌ (fallback) |
| View Transitions API | ✅ | ✅ (behind flag) | ✅ (18.4+) |
| OKLCH Colors | ✅ | ✅ | ✅ |
| Web Audio API | ✅ | ✅ | ✅ |

Firefox/Safari users can still use the file-input fallback (re-pick folder each session).

## License

MIT