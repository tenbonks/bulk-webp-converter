# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A client-side, zero-dependency browser tool that bulk-converts JPG/JPEG/PNG images to WebP. Everything runs locally in the browser via the Canvas API — no server, no build step, no bundler, no package manager, no tests.

## Running it

Open `index.html` in a browser. There is nothing to build or install. For features that need a real origin (e.g. avoiding `file://` quirks) serve the folder statically:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Architecture

Three files, split by concern, loaded directly by the browser:

- `index.html` — static markup. Every interactive element has a fixed `id`; the JS binds to those ids at module load (see the DOM references block at the top of `assets/converter.js`). Changing an id in one file requires changing it in the other.
- `assets/converter.js` — all behaviour. No modules/imports; runs as a single classic script.
- `assets/style.css` — all styling.

Core data flow in `converter.js`: a module-level `files` array is the single source of truth. Each entry tracks its source `File`, `sanitizedName`, `status` (`waiting → processing → done`/`error`), sizes, and converted blob. The pipeline is: `handleFiles()` (dedup + build entries + `renderFileItem`) → convert click handler iterates pending entries → `convertFile()` (draws to an off-screen canvas, resizes if needed, `canvas.toBlob(..., 'image/webp', quality)`) → `setStatus()` mutates both the entry and its DOM row → `updateUI()`/`updateStats()`.

Things worth knowing before editing:

- **DOM row identity uses a composite key** `` `${sanitizedName}-${originalSize}` `` for per-file element ids (`thumb-`, `dims-`, `status-`). This is *not* guaranteed unique — two different files that sanitise to the same name and share a byte size would collide. Dedup in `handleFiles()` keys on original `name` + `size`, which is a different (stronger) tuple.
- **Resize rule**: only downscale when a dimension exceeds `MAX_DIM` (1920); scale factor is `Math.min(MAX_DIM/w, MAX_DIM/h)` so aspect ratio is preserved and nothing is upscaled.
- **JSZip is lazy-loaded from a CDN** at "Download all" time (cdnjs). If the CDN fails, it falls back to staggered individual downloads. A single converted file skips ZIP entirely. This CDN fetch is the only network dependency in the whole app.
- **WebP encoding depends on the browser's `toBlob` support**; older browsers may silently emit PNG instead.
