<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { aiEngine } from '../utils/ai-engine';
import type { HandLandmarkerResult } from '@mediapipe/tasks-vision';
import type { TrackDirection } from '../utils/ai-engine';
import JSZip from 'jszip';

const canvasRef = ref<HTMLCanvasElement | null>(null);
const isActive = ref(false);
const mode = ref<'hand' | 'track'>('hand');

// Dataset capture state
const captureLabel = ref('track');
const captureCount = ref<Record<string, number>>({});
const capturedDataset = ref<Array<{ label: string; dataUrl: string }>>([]);
const trackDirection = ref<TrackDirection>('NONE');
const trackRegions = ref({ l: 0, c: 0, r: 0 });

let ctx: CanvasRenderingContext2D | null = null;
let currentImage = new Image();
let lastBase64 = '';

onMounted(async () => {
  if (canvasRef.value) {
    ctx = canvasRef.value.getContext('2d');
  }
  window.addEventListener('serial-video-frame', handleVideoFrame as EventListener);
  window.addEventListener('pc-track-direction', handleTrackDirection as EventListener);
  await aiEngine.init();
});

onUnmounted(() => {
  isActive.value = false;
  window.removeEventListener('serial-video-frame', handleVideoFrame as EventListener);
  window.removeEventListener('pc-track-direction', handleTrackDirection as EventListener);
});

const handleVideoFrame = (e: CustomEvent<string>) => {
  lastBase64 = e.detail;
  updateFrame(e.detail);
};

const handleTrackDirection = (e: CustomEvent<{ direction: TrackDirection; leftDark: number; centerDark: number; rightDark: number }>) => {
  trackDirection.value = e.detail.direction;
  trackRegions.value = { l: e.detail.leftDark, c: e.detail.centerDark, r: e.detail.rightDark };
};

const setMode = (m: 'hand' | 'track') => {
  mode.value = m;
  aiEngine.setTrackMode(m === 'track');
};

const updateFrame = (base64Data: string) => {
  if (!isActive.value || !ctx || !canvasRef.value) return;

  currentImage.onload = () => {
    if (!canvasRef.value || !ctx) return;
    const { width, height } = canvasRef.value;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(currentImage, 0, 0, width, height);

    if (mode.value === 'hand') {
      const results = aiEngine.processFrame(canvasRef.value);
      if (results) drawLandmarks(results);
    } else if (mode.value === 'track') {
      aiEngine.analyzeTrack(canvasRef.value);
      drawTrackOverlay();
    }
  };
  currentImage.src = `data:image/jpeg;base64,${base64Data}`;
};

const drawLandmarks = (results: HandLandmarkerResult) => {
  if (!ctx || !canvasRef.value || !results.landmarks) return;
  const { width, height } = canvasRef.value;
  ctx.save();
  ctx.fillStyle = '#00ff00';
  ctx.strokeStyle = '#00ff00';
  ctx.lineWidth = 2;
  for (const hand of results.landmarks) {
    for (const point of hand) {
      ctx.beginPath();
      ctx.arc(point.x * width, point.y * height, 3, 0, 2 * Math.PI);
      ctx.fill();
    }
  }
  ctx.restore();
};

const drawTrackOverlay = () => {
  if (!ctx || !canvasRef.value) return;
  const { width, height } = canvasRef.value;
  const roiY = Math.floor(height * 0.6);
  const third = Math.floor(width / 3);

  // Draw ROI box
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,0,0.6)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(0, roiY, width, height - roiY);
  ctx.setLineDash([]);

  // Draw region dividers
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath(); ctx.moveTo(third, roiY); ctx.lineTo(third, height); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(third * 2, roiY); ctx.lineTo(third * 2, height); ctx.stroke();

  // Highlight active region
  const colors: Record<TrackDirection, string> = {
    LEFT: 'rgba(255,100,100,0.3)',
    CENTER: 'rgba(100,255,100,0.3)',
    RIGHT: 'rgba(100,100,255,0.3)',
    NONE: 'rgba(128,128,128,0.1)'
  };
  const dir = trackDirection.value;
  const xMap: Record<TrackDirection, number> = { LEFT: 0, CENTER: third, RIGHT: third * 2, NONE: 0 };
  const wMap: Record<TrackDirection, number> = { LEFT: third, CENTER: third, RIGHT: third, NONE: width };
  ctx.fillStyle = colors[dir];
  ctx.fillRect(xMap[dir], roiY, wMap[dir], height - roiY);

  // Direction label
  ctx.font = 'bold 14px monospace';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'black';
  ctx.shadowBlur = 4;
  ctx.fillText(`▶ ${dir}`, width / 2, roiY - 6);
  ctx.restore();
};

// ── Dataset capture ───────────────────────────────────────────────
const captureFrame = () => {
  if (!lastBase64 || !canvasRef.value) return;
  const label = captureLabel.value.trim() || 'unknown';
  
  // Create a small thumbnail canvas (96×96) for compact dataset
  const thumb = document.createElement('canvas');
  thumb.width = 96;
  thumb.height = 96;
  const tCtx = thumb.getContext('2d');
  if (!tCtx) return;
  const img = new Image();
  img.onload = () => {
    tCtx.drawImage(img, 0, 0, 96, 96);
    const dataUrl = thumb.toDataURL('image/jpeg', 0.8);
    capturedDataset.value.push({ label, dataUrl });
    captureCount.value[label] = (captureCount.value[label] ?? 0) + 1;
  };
  img.src = `data:image/jpeg;base64,${lastBase64}`;
};

const exportDataset = async () => {
  if (capturedDataset.value.length === 0) return;

  const zip = new JSZip();
  const counts: Record<string, number> = {};
  for (const item of capturedDataset.value) {
    const cnt = (counts[item.label] ?? 0);
    counts[item.label] = cnt + 1;
    const b64 = item.dataUrl.split(',')[1] ?? '';
    zip.file(`${item.label}/${item.label}_${String(cnt).padStart(4, '0')}.jpg`, b64, { base64: true });
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'track_dataset.zip';
  a.click();
  URL.revokeObjectURL(url);
};

const clearDataset = () => {
  capturedDataset.value = [];
  captureCount.value = {};
};

defineExpose({
  updateFrame,
  setActive: (val: boolean) => { isActive.value = val; },
  setMode,
  getCanvas: () => canvasRef.value
});
</script>

<template>
  <div class="camera-viewer" v-show="isActive">
    <!-- Header -->
    <div class="viewer-header">
      <span>AI Camera Viewer</span>
      <div class="header-modes">
        <button :class="['mode-btn', { active: mode === 'hand' }]" @click="setMode('hand')">✋ Hand</button>
        <button :class="['mode-btn', { active: mode === 'track' }]" @click="setMode('track')">🚗 Track</button>
      </div>
      <button @click="isActive = false" class="close-btn">✕</button>
    </div>

    <!-- Canvas -->
    <div class="canvas-container">
      <canvas ref="canvasRef" width="320" height="240"></canvas>
      <!-- Track direction badge -->
      <div v-if="mode === 'track'" class="track-badge" :class="trackDirection.toLowerCase()">
        {{ trackDirection }}
      </div>
    </div>

    <!-- Track mode: dataset capture panel -->
    <div v-if="mode === 'track'" class="capture-panel">
      <div class="capture-row">
        <label>레이블:</label>
        <select v-model="captureLabel" class="label-select">
          <option value="track">track (트랙 위)</option>
          <option value="no_track">no_track (트랙 밖)</option>
          <option value="left_turn">left_turn (좌회전)</option>
          <option value="right_turn">right_turn (우회전)</option>
          <option value="stop">stop (정지선)</option>
        </select>
        <button class="capture-btn" @click="captureFrame">📸 캡처</button>
      </div>
      <div class="dataset-stats">
        <span v-for="(cnt, label) in captureCount" :key="label" class="stat-badge">
          {{ label }}: {{ cnt }}장
        </span>
        <span v-if="!Object.keys(captureCount).length" class="stat-empty">캡처한 데이터 없음</span>
      </div>
      <div class="dataset-actions">
        <button class="export-btn" @click="exportDataset" :disabled="capturedDataset.length === 0">
          📦 ZIP 내보내기 ({{ capturedDataset.length }}장)
        </button>
        <button class="clear-btn" @click="clearDataset" :disabled="capturedDataset.length === 0">🗑 초기화</button>
      </div>
      <div class="guide-tip">
        💡 ZIP → <a href="https://teachablemachine.withgoogle.com/train/image" target="_blank">Teachable Machine</a> 업로드 → TFLite 내보내기
      </div>
    </div>
  </div>
</template>

<style scoped>
.camera-viewer {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background: #1e1e1e;
  border-left: 1px solid #333;
}

.viewer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 8px;
  background: #2d2d2d;
  color: #ccc;
  font-size: 0.82rem;
  gap: 4px;
}

.header-modes {
  display: flex;
  gap: 4px;
}

.mode-btn {
  background: #444;
  border: 1px solid #555;
  color: #aaa;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.78rem;
  cursor: pointer;
  transition: all 0.15s;
}
.mode-btn.active {
  background: #6c5ce7;
  border-color: #a29bfe;
  color: #fff;
}

.close-btn {
  background: none;
  border: none;
  color: #ff5555;
  cursor: pointer;
  font-size: 0.9rem;
}

.canvas-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 6px;
  position: relative;
}

canvas {
  max-width: 100%;
  max-height: 100%;
  border-radius: 4px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.3);
  object-fit: contain;
}

.track-badge {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  padding: 3px 14px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: bold;
  letter-spacing: 0.08em;
  pointer-events: none;
}
.track-badge.left   { background: rgba(255,100,100,0.85); color: #fff; }
.track-badge.center { background: rgba(80,210,100,0.85);  color: #fff; }
.track-badge.right  { background: rgba(100,140,255,0.85); color: #fff; }
.track-badge.none   { background: rgba(100,100,100,0.7);  color: #ddd; }

/* Capture panel */
.capture-panel {
  padding: 6px 8px;
  background: #252525;
  border-top: 1px solid #3a3a3a;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.capture-row {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.78rem;
  color: #bbb;
}

.label-select {
  flex: 1;
  background: #333;
  border: 1px solid #555;
  color: #eee;
  padding: 2px 4px;
  border-radius: 4px;
  font-size: 0.75rem;
}

.capture-btn {
  background: #6c5ce7;
  border: none;
  color: #fff;
  padding: 3px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.78rem;
  white-space: nowrap;
}
.capture-btn:hover { background: #7d6ef0; }

.dataset-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  min-height: 18px;
}

.stat-badge {
  background: #3a3a5c;
  color: #a29bfe;
  padding: 1px 7px;
  border-radius: 10px;
  font-size: 0.72rem;
}
.stat-empty { color: #555; font-size: 0.72rem; }

.dataset-actions {
  display: flex;
  gap: 5px;
}

.export-btn {
  flex: 1;
  background: #00b894;
  border: none;
  color: #fff;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.76rem;
}
.export-btn:disabled { background: #2d4a44; color: #666; cursor: not-allowed; }
.export-btn:not(:disabled):hover { background: #00cec9; }

.clear-btn {
  background: #c0392b;
  border: none;
  color: #fff;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.76rem;
}
.clear-btn:disabled { background: #3a2020; color: #666; cursor: not-allowed; }

.guide-tip {
  font-size: 0.7rem;
  color: #888;
  text-align: center;
}
.guide-tip a {
  color: #74b9ff;
  text-decoration: none;
}
.guide-tip a:hover { text-decoration: underline; }
</style>
