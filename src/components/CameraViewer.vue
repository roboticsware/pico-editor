<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { aiEngine } from '../utils/ai-engine';
import type { HandLandmarkerResult } from '@mediapipe/tasks-vision';

const canvasRef = ref<HTMLCanvasElement | null>(null);
const isActive = ref(false);

let ctx: CanvasRenderingContext2D | null = null;
let currentImage = new Image();

onMounted(async () => {
  if (canvasRef.value) {
    ctx = canvasRef.value.getContext('2d');
  }
  window.addEventListener('serial-video-frame', handleVideoFrame as EventListener);
  await aiEngine.init();
});

onUnmounted(() => {
  isActive.value = false;
  window.removeEventListener('serial-video-frame', handleVideoFrame as EventListener);
});

const handleVideoFrame = (e: CustomEvent<string>) => {
  updateFrame(e.detail);
};

// Method to receive JPEG frames from the Serial/WebSocket bridge
const updateFrame = (base64Data: string) => {
  if (!isActive.value || !ctx || !canvasRef.value) return;

  currentImage.onload = () => {
    if (!canvasRef.value || !ctx) return;
    
    // Resize canvas to match aspect ratio if needed, or draw scaled
    const { width, height } = canvasRef.value;
    ctx.clearRect(0, 0, width, height);
    
    // Simple fit logic (stretch for now, can be improved)
    ctx.drawImage(currentImage, 0, 0, width, height);

    // AI Engine Processing
    const results = aiEngine.processFrame(canvasRef.value);
    if (results) {
      drawLandmarks(results);
    }
  };
  
  // ESP32 usually sends raw JPEG bytes. We convert to base64 Data URL.
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

// Expose methods for parent components
defineExpose({
  updateFrame,
  setActive: (val: boolean) => { isActive.value = val; },
  getCanvas: () => canvasRef.value
});

</script>

<template>
  <div class="camera-viewer" v-show="isActive">
    <div class="viewer-header">
      <span>AI Camera Viewer</span>
      <button @click="isActive = false" class="close-btn">X</button>
    </div>
    <div class="canvas-container">
      <canvas ref="canvasRef" width="320" height="240"></canvas>
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
  padding: 5px 10px;
  background: #2d2d2d;
  color: #ccc;
  font-size: 0.85rem;
}

.close-btn {
  background: none;
  border: none;
  color: #ff5555;
  cursor: pointer;
}

.canvas-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 10px;
}

canvas {
  max-width: 100%;
  max-height: 100%;
  border-radius: 4px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.3);
  object-fit: contain;
}
</style>
