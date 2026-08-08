# Bulk WebP Converter

A browser-based tool for converting JPG/JPEG/PNG images to WebP in bulk — with automatic resizing, aspect ratio preservation, and clean filename sanitisation. No server, no dependencies, no uploads. Everything runs locally in the browser.

---

## Features

- **Bulk conversion** — drop or browse multiple images at once
- **Format support** — accepts `.jpg`, `.jpeg`, and `.png`
- **Automatic resizing** — images exceeding 1920×1920 px are scaled down; smaller images are left untouched
- **Aspect ratio preserved** — resizing uses `Math.min(maxW/w, maxH/h)` so neither dimension is distorted
- **Quality control** — adjustable WebP quality slider from 50–100% (default: 85%)
- **Filename sanitisation** — output names are converted to clean kebab-case (see below)
- **Live stats** — per-file before/after size, total bytes saved, and average reduction percentage
- **Individual downloads** — one-click download per converted file
- **Download all as ZIP** — bundles all converted files via JSZip (CDN); falls back to staggered individual downloads if unavailable
- **Thumbnail previews** — each queued file shows a preview, original filename, sanitised output name, and pixel dimensions
- **Duplicate detection** — re-adding the same file (by name + size) is silently ignored
- **100% client-side** — no data ever leaves the browser

---

## Usage

1. Open `index.html` in any modern browser (Chrome, Edge, Firefox, Safari)
2. Drag and drop images onto the drop zone, or click **Browse files**
3. Adjust the quality slider if needed
4. Click **Convert to WebP**
5. Download files individually or click **Download all** for a ZIP

No installation, no build step, no internet connection required (except for the JSZip CDN fallback on "Download all").

---

## Filename Sanitisation

Output filenames are automatically cleaned before conversion. The rules applied in order:

| Step | Rule | Example |
|------|------|---------|
| Strip extension | Remove original format suffix | `My Photo.jpeg` → `My Photo` |
| Lowercase | Convert entire name to lowercase | `My Photo` → `my photo` |
| Remove diacritics | Normalise and strip accent characters | `café résumé` → `cafe resume` |
| Replace non-alphanumeric | Any character that isn't `a–z` or `0–9` becomes `-` | `my photo` → `my-photo` |
| Collapse dashes | Multiple consecutive dashes become one | `my--photo` → `my-photo` |
| Trim dashes | Leading and trailing dashes removed | `-my-photo-` → `my-photo` |
| Fallback | Empty result defaults to `image` | `!!!` → `image` |
| Add extension | `.webp` appended to final name | `my-photo` → `my-photo.webp` |

### Examples

| Original filename | Sanitised output |
|------------------|-----------------|
| `My Holiday Photo.jpg` | `my-holiday-photo.webp` |
| `IMG_4821.jpeg` | `img-4821.webp` |
| `café & résumé (final).png` | `cafe-resume-final.webp` |
| `screenshot 2024-01-15.png` | `screenshot-2024-01-15.webp` |
| `PRODUCT SHOT #3!!!.jpg` | `product-shot-3.webp` |

---

## Resizing Logic

Images are only resized if either dimension exceeds the 1920 px limit. The scale factor is calculated as:

```
ratio = Math.min(1920 / originalWidth, 1920 / originalHeight)
newWidth  = Math.round(originalWidth  * ratio)
newHeight = Math.round(originalHeight * ratio)
```

This ensures the largest dimension is capped at exactly 1920 px, and the other scales proportionally. Images already within bounds are converted at their original dimensions.

A **↓** indicator appears next to the output dimensions in the file list when resizing was applied.

---

## Browser Compatibility

Relies on the Canvas API's `toBlob()` with `image/webp` support.

| Browser | WebP encoding support |
|---------|----------------------|
| Chrome 32+ | ✓ |
| Edge 18+ | ✓ |
| Firefox 96+ | ✓ |
| Safari 16+ | ✓ |

> **Note:** Older browsers may silently fall back to PNG encoding. Check the output file size — if it matches the original closely, WebP encoding may not be supported.

---

## File Structure

```
index.html             — page markup and element layout
assets/converter.js    — all application logic
assets/style.css       — all styling
README.md              — this file
```

---

## Technical Notes

- **Canvas rendering** — images are drawn onto an off-screen `<canvas>` element and exported via `canvas.toBlob('image/webp', quality)`
- **Memory** — converted blobs are held in memory until the page is refreshed or "Clear all" is clicked; avoid loading thousands of very large images in a single session
- **ZIP generation** — uses [JSZip 3.10.1](https://stuk.github.io/jszip/) loaded from cdnjs at download time; if the CDN is unreachable, files are downloaded individually with a 300 ms stagger
- **No file size limit** — the browser is the only constraint; very large files (50 MB+) may cause slowdowns depending on available RAM

---

## License

MIT — do whatever you like with it.
