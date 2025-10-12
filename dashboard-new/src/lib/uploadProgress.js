const OVERLAY_ID = 'leka-upload-overlay';
const STYLE_ID = 'leka-upload-overlay-style';

const ensureOverlay = () => {
  if (typeof document === 'undefined') return null;

  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${OVERLAY_ID} {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 2100;
        width: 320px;
        pointer-events: none;
        display: none;
      }
      #${OVERLAY_ID}.is-visible {
        display: block;
      }
      #${OVERLAY_ID} .leka-upload-card {
        pointer-events: auto;
        background: #0f172a;
        color: #f8fafc;
        border-radius: 12px;
        padding: 16px 18px;
        box-shadow: 0 10px 30px rgba(15, 23, 42, 0.35);
        border: 1px solid rgba(148, 163, 184, 0.2);
        font-family: 'Noto Sans Thai', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      }
      #${OVERLAY_ID} .leka-upload-title {
        font-size: 0.95rem;
        font-weight: 600;
        margin-bottom: 4px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      #${OVERLAY_ID} .leka-upload-subtitle {
        font-size: 0.8rem;
        color: rgba(226, 232, 240, 0.75);
        margin-bottom: 12px;
      }
      #${OVERLAY_ID} .leka-upload-track {
        background: rgba(148, 163, 184, 0.2);
        border-radius: 9999px;
        height: 6px;
        overflow: hidden;
        position: relative;
      }
      #${OVERLAY_ID} .leka-upload-bar {
        background: linear-gradient(90deg, #60a5fa 0%, #3b82f6 50%, #2563eb 100%);
        height: 100%;
        width: 0%;
        border-radius: 9999px;
        transition: width 0.2s ease;
      }
      #${OVERLAY_ID} .leka-upload-bar.indeterminate {
        width: 40%;
        animation: lekaUploadIndeterminate 1.1s ease-in-out infinite;
      }
      @keyframes lekaUploadIndeterminate {
        0% { transform: translateX(-120%); }
        50% { transform: translateX(0%); }
        100% { transform: translateX(180%); }
      }
      #${OVERLAY_ID} .leka-upload-footer {
        margin-top: 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.78rem;
        color: rgba(226, 232, 240, 0.8);
      }
      #${OVERLAY_ID} .leka-upload-percent {
        font-weight: 600;
        color: #93c5fd;
      }
    `;
    document.head.appendChild(style);
  }

  let overlay = document.getElementById(OVERLAY_ID);
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.innerHTML = `
      <div class="leka-upload-card">
        <div class="leka-upload-title" id="leka-upload-title">📤 กำลังอัปโหลดไฟล์</div>
        <div class="leka-upload-subtitle" id="leka-upload-subtitle">โปรดรอสักครู่</div>
        <div class="leka-upload-track">
          <div class="leka-upload-bar indeterminate" id="leka-upload-bar"></div>
        </div>
        <div class="leka-upload-footer">
          <span class="leka-upload-percent" id="leka-upload-percent">0%</span>
          <span id="leka-upload-detail">กำลังเตรียมไฟล์...</span>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  return overlay;
};

const formatBytes = (bytes) => {
  if (typeof bytes !== 'number' || Number.isNaN(bytes)) return '-';
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
};

export const showUploadProgress = ({ title = '📤 กำลังอัปโหลดไฟล์', subtitle = 'โปรดรอสักครู่' } = {}) => {
  const overlay = ensureOverlay();
  if (!overlay) return;
  const titleEl = document.getElementById('leka-upload-title');
  const subtitleEl = document.getElementById('leka-upload-subtitle');
  const percentEl = document.getElementById('leka-upload-percent');
  const bar = document.getElementById('leka-upload-bar');
  const detailEl = document.getElementById('leka-upload-detail');

  if (titleEl) titleEl.textContent = title;
  if (subtitleEl) subtitleEl.textContent = subtitle || 'โปรดรอสักครู่';
  if (percentEl) percentEl.textContent = '0%';
  if (bar) {
    bar.style.width = '0%';
    bar.classList.add('indeterminate');
  }
  if (detailEl) detailEl.textContent = 'กำลังเตรียมไฟล์...';

  overlay.classList.add('is-visible');
};

export const updateUploadProgress = ({ loaded = 0, total = 0, lengthComputable = false, percent, detail } = {}) => {
  const percentEl = document.getElementById('leka-upload-percent');
  const bar = document.getElementById('leka-upload-bar');
  const detailEl = document.getElementById('leka-upload-detail');

  let computedPercent = typeof percent === 'number' ? Math.round(percent) : null;

  if (computedPercent === null && lengthComputable && total > 0) {
    computedPercent = Math.round(Math.max(0, Math.min(100, (loaded / total) * 100)));
  }

  if (percentEl && computedPercent !== null) {
    percentEl.textContent = `${computedPercent}%`;
  }

  if (bar) {
    if (computedPercent !== null) {
      bar.classList.remove('indeterminate');
      bar.style.width = `${computedPercent}%`;
    } else {
      bar.classList.add('indeterminate');
    }
  }

  if (detailEl) {
    if (detail) {
      detailEl.textContent = detail;
    } else if (lengthComputable && total > 0) {
      detailEl.textContent = `${formatBytes(loaded)} / ${formatBytes(total)}`;
    }
  }
};

export const hideUploadProgress = () => {
  const overlay = document.getElementById(OVERLAY_ID);
  if (overlay) {
    overlay.classList.remove('is-visible');
  }
};

export default {
  showUploadProgress,
  updateUploadProgress,
  hideUploadProgress,
};
