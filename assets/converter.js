/* ============================================
   Bulk WebP Converter — Main Script
   ============================================ */

const MAX_DIM = 1920;

// ── DOM References ───────────────────────────────────────
const dropzone       = document.getElementById('dropzone');
const fileInput      = document.getElementById('file-input');
const browseBtn      = document.getElementById('browse-btn');
const fileList       = document.getElementById('file-list');
const fileListWrap   = document.getElementById('file-list-wrap');
const fileCountEl    = document.getElementById('file-count');
const clearBtn       = document.getElementById('clear-btn');
const convertBtn     = document.getElementById('convert-btn');
const downloadAllBtn = document.getElementById('download-all-btn');
const qualitySlider  = document.getElementById('quality-slider');
const qualityVal     = document.getElementById('quality-val');
const progressWrap   = document.getElementById('progress-wrap');
const progressBar    = document.getElementById('progress-bar');
const statsRow       = document.getElementById('stats-row');
const statDone       = document.getElementById('stat-done');
const statSaved      = document.getElementById('stat-saved');
const statAvg        = document.getElementById('stat-avg');

// ── State ────────────────────────────────────────────────
// Each entry: { file, sanitizedName, el, status, originalSize, convertedBlob, convertedSize, resized, finalW, finalH }
let files = [];

// ── Sanitize Filename ────────────────────────────────────
function sanitizeName(name) {
  const base = name.replace(/\.[^.]+$/, ''); // strip extension
  return base
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^a-z0-9]+/g, '-')                      // non-alphanumeric → dash
    .replace(/^-+|-+$/g, '')                          // trim leading/trailing dashes
    .replace(/-{2,}/g, '-')                           // collapse multiple dashes
    || 'image';
}

// ── Format Bytes ─────────────────────────────────────────
function formatBytes(b) {
  if (b < 1024)        return b + ' B';
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
  return (b / (1024 * 1024)).toFixed(2) + ' MB';
}

// ── Drag & Drop ──────────────────────────────────────────
dropzone.addEventListener('dragover', e => {
  e.preventDefault();
  dropzone.classList.add('drag-over');
});

dropzone.addEventListener('dragleave', () => {
  dropzone.classList.remove('drag-over');
});

dropzone.addEventListener('drop', e => {
  e.preventDefault();
  dropzone.classList.remove('drag-over');
  handleFiles(Array.from(e.dataTransfer.files));
});

dropzone.addEventListener('click', e => {
  if (e.target !== browseBtn) fileInput.click();
});

browseBtn.addEventListener('click', e => {
  e.stopPropagation();
  fileInput.click();
});

fileInput.addEventListener('change', () => {
  handleFiles(Array.from(fileInput.files));
});

// ── Quality Slider ───────────────────────────────────────
qualitySlider.addEventListener('input', () => {
  qualityVal.textContent = qualitySlider.value + '%';
});

// ── Handle Incoming Files ────────────────────────────────
function handleFiles(incoming) {
  const valid = incoming.filter(f => /\.(jpe?g|png)$/i.test(f.name));
  if (!valid.length) return;

  valid.forEach(f => {
    // Deduplicate by name + size
    if (files.find(x => x.file.name === f.name && x.file.size === f.size)) return;

    const entry = {
      file: f,
      sanitizedName: sanitizeName(f.name),
      status: 'waiting',
      originalSize: f.size,
      convertedBlob: null,
      convertedSize: null,
      resized: false,
      finalW: null,
      finalH: null,
      el: null,
    };

    files.push(entry);
    renderFileItem(entry);
  });

  updateUI();
}

// ── Render File Row ──────────────────────────────────────
function renderFileItem(entry) {
  const item = document.createElement('div');
  item.className = 'file-item';
  item.innerHTML = `
    <div class="file-thumb-placeholder" id="thumb-${entry.sanitizedName}-${entry.originalSize}"></div>
    <div class="file-info">
      <div class="file-original">${entry.file.name}</div>
      <div class="file-name">${entry.sanitizedName}<span class="ext">.webp</span></div>
    </div>
    <div class="file-meta">
      <div>${formatBytes(entry.originalSize)}</div>
      <div class="dims" id="dims-${entry.sanitizedName}-${entry.originalSize}"></div>
    </div>
    <div class="file-status status-waiting" id="status-${entry.sanitizedName}-${entry.originalSize}">
      <div class="dot-icon"></div>
    </div>
  `;

  entry.el = item;
  fileList.appendChild(item);

  // Load thumbnail asynchronously
  const thumbId = `thumb-${entry.sanitizedName}-${entry.originalSize}`;
  const img = new Image();
  const url = URL.createObjectURL(entry.file);

  img.onload = () => {
    const thumbEl = document.getElementById(thumbId);
    if (thumbEl) {
      const imgEl = document.createElement('img');
      imgEl.className = 'file-thumb';
      imgEl.src = url;
      thumbEl.replaceWith(imgEl);
    }
    const dimsEl = document.getElementById(`dims-${entry.sanitizedName}-${entry.originalSize}`);
    if (dimsEl) dimsEl.textContent = `${img.naturalWidth}×${img.naturalHeight}`;
  };

  img.src = url;
}

// ── Update UI State ──────────────────────────────────────
function updateUI() {
  const hasFiles = files.length > 0;
  fileListWrap.style.display = hasFiles ? 'flex' : 'none';
  fileCountEl.textContent = `${files.length} file${files.length !== 1 ? 's' : ''}`;
  convertBtn.disabled = !hasFiles || files.some(f => f.status === 'processing');

  const allDone = files.length > 0 && files.every(f => f.status === 'done');
  downloadAllBtn.disabled = !allDone;
  if (allDone) updateStats();
}

// ── Update Stats Cards ───────────────────────────────────
function updateStats() {
  const done = files.filter(f => f.status === 'done');
  if (!done.length) return;

  statsRow.classList.add('visible');
  statDone.textContent = done.length;

  const totalOrig = done.reduce((s, f) => s + f.originalSize, 0);
  const totalConv = done.reduce((s, f) => s + f.convertedSize, 0);
  const savedBytes = totalOrig - totalConv;
  const savedPct = ((savedBytes / totalOrig) * 100).toFixed(1);

  statSaved.textContent = formatBytes(savedBytes > 0 ? savedBytes : 0);
  statAvg.textContent   = savedBytes > 0 ? `-${savedPct}%` : '0%';
}

// ── Convert All ──────────────────────────────────────────
convertBtn.addEventListener('click', async () => {
  const quality = parseInt(qualitySlider.value) / 100;
  const pending = files.filter(f => f.status === 'waiting');
  if (!pending.length) return;

  convertBtn.disabled = true;
  progressWrap.classList.add('active');
  let done = 0;

  for (const entry of pending) {
    setStatus(entry, 'processing');
    try {
      await convertFile(entry, quality);
      setStatus(entry, 'done');
    } catch (e) {
      setStatus(entry, 'error');
    }
    done++;
    progressBar.style.width = (done / pending.length * 100) + '%';
  }

  setTimeout(() => {
    progressWrap.classList.remove('active');
    progressBar.style.width = '0%';
  }, 600);

  updateUI();
  updateStats();
});

// ── Convert Single File ──────────────────────────────────
function convertFile(entry, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(entry.file);

    img.onload = () => {
      try {
        let { naturalWidth: w, naturalHeight: h } = img;
        let resized = false;

        if (w > MAX_DIM || h > MAX_DIM) {
          const ratio = Math.min(MAX_DIM / w, MAX_DIM / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
          resized = true;
        }

        const canvas = document.createElement('canvas');
        canvas.width  = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);

        canvas.toBlob(blob => {
          URL.revokeObjectURL(url);
          if (!blob) { reject(new Error('Conversion failed')); return; }
          entry.convertedBlob = blob;
          entry.convertedSize = blob.size;
          entry.resized        = resized;
          entry.finalW         = w;
          entry.finalH         = h;
          resolve();
        }, 'image/webp', quality);

      } catch (e) {
        URL.revokeObjectURL(url);
        reject(e);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Image load failed'));
    };

    img.src = url;
  });
}

// ── Set File Status ──────────────────────────────────────
function setStatus(entry, status) {
  entry.status = status;
  const key      = `${entry.sanitizedName}-${entry.originalSize}`;
  const statusEl = document.getElementById(`status-${key}`);
  if (!statusEl) return;

  entry.el.className    = `file-item ${status}`;
  statusEl.className    = `file-status status-${status}`;

  if (status === 'processing') {
    statusEl.innerHTML = `<div class="spinner"></div>`;

  } else if (status === 'done') {
    const metaEl = entry.el.querySelector('.file-meta');
    if (metaEl) {
      metaEl.innerHTML = `
        <div>${formatBytes(entry.originalSize)} → <span class="size-after">${formatBytes(entry.convertedSize)}</span></div>
        <div class="dims">${entry.finalW}×${entry.finalH}${entry.resized ? ' ↓' : ''}</div>
      `;
    }
    // Replace status indicator with per-file download button
    const dlBtn = document.createElement('a');
    dlBtn.className   = 'dl-link';
    dlBtn.textContent = 'DL';
    dlBtn.href        = '#';
    dlBtn.addEventListener('click', e => { e.preventDefault(); downloadSingle(entry); });
    statusEl.replaceWith(dlBtn);

  } else if (status === 'error') {
    statusEl.innerHTML = `<svg class="x-icon" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
  }
}

// ── Download Single File ─────────────────────────────────
function downloadSingle(entry) {
  const a      = document.createElement('a');
  a.href       = URL.createObjectURL(entry.convertedBlob);
  a.download   = entry.sanitizedName + '.webp';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

// ── Download All (ZIP) ───────────────────────────────────
downloadAllBtn.addEventListener('click', async () => {
  const done = files.filter(f => f.status === 'done' && f.convertedBlob);
  if (!done.length) return;

  // Single file — no need for a ZIP
  if (done.length === 1) { downloadSingle(done[0]); return; }

  try {
    // Lazy-load JSZip from CDN
    const script = document.createElement('script');
    script.src   = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
    document.head.appendChild(script);
    await new Promise((res, rej) => { script.onload = res; script.onerror = rej; });

    const zip = new JSZip();
    done.forEach(entry => zip.file(entry.sanitizedName + '.webp', entry.convertedBlob));

    const blob   = await zip.generateAsync({ type: 'blob' });
    const a      = document.createElement('a');
    a.href       = URL.createObjectURL(blob);
    a.download   = 'converted-images.zip';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);

  } catch {
    // CDN unavailable — fall back to staggered individual downloads
    done.forEach((entry, i) => setTimeout(() => downloadSingle(entry), i * 300));
  }
});

// ── Clear All ────────────────────────────────────────────
clearBtn.addEventListener('click', () => {
  files = [];
  fileList.innerHTML = '';
  statsRow.classList.remove('visible');
  fileInput.value          = '';
  downloadAllBtn.disabled  = true;
  convertBtn.disabled      = true;
  updateUI();
});
