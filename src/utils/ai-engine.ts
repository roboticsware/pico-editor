import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import type { HandLandmarkerResult } from '@mediapipe/tasks-vision';
import { serial } from './serial';

export type TrackDirection = 'LEFT' | 'CENTER' | 'RIGHT' | 'NONE';

export class AIEngine {
  private handLandmarker: HandLandmarker | null = null;
  private isInitialized = false;
  private trackMode = false;

  async init() {
    if (this.isInitialized) return;

    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm"
      );
      
      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          delegate: "GPU"
        },
        runningMode: "IMAGE",
        numHands: 2
      });

      this.isInitialized = true;
      console.log('[AIEngine] HandLandmarker initialized successfully.');
    } catch (err) {
      console.error('[AIEngine] Initialization failed:', err);
    }
  }

  setTrackMode(enabled: boolean) {
    this.trackMode = enabled;
  }

  processFrame(canvas: HTMLCanvasElement): HandLandmarkerResult | null {
    if (this.trackMode) {
      this.analyzeTrack(canvas);
      return null;
    }

    if (!this.handLandmarker || !this.isInitialized) return null;
    
    const results = this.handLandmarker.detect(canvas);
    
    if (results && results.landmarks && results.landmarks.length > 0) {
      this.sendHandDataToESP32(results);
    }

    return results;
  }

  // ── Vision-based line tracker ──────────────────────────────────
  // Analyzes the bottom third of the frame, splits into 3 horizontal regions,
  // counts dark pixels per region, and determines track direction.
  analyzeTrack(canvas: HTMLCanvasElement): TrackDirection {
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'NONE';

    const { width, height } = canvas;
    // Analyze bottom 40% of the frame where the track line is visible
    const roiY = Math.floor(height * 0.6);
    const roiH = height - roiY;
    const imageData = ctx.getImageData(0, roiY, width, roiH);
    const data = imageData.data;

    const third = Math.floor(width / 3);
    let leftDark = 0, centerDark = 0, rightDark = 0;
    const darkThreshold = 80; // pixel brightness threshold (0-255)

    for (let y = 0; y < roiH; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const r = data[idx] ?? 0;
        const g = data[idx + 1] ?? 0;
        const b = data[idx + 2] ?? 0;
        const brightness = (r + g + b) / 3;
        if (brightness < darkThreshold) {
          if (x < third) leftDark++;
          else if (x < third * 2) centerDark++;
          else rightDark++;
        }
      }
    }

    const total = leftDark + centerDark + rightDark;
    let direction: TrackDirection = 'NONE';
    if (total > (third * roiH * 0.03)) { // at least 3% dark pixels = line found
      const max = Math.max(leftDark, centerDark, rightDark);
      if (max === centerDark) direction = 'CENTER';
      else if (max === leftDark) direction = 'LEFT';
      else direction = 'RIGHT';
    }

    // Broadcast via custom event for UI overlay display
    window.dispatchEvent(new CustomEvent('pc-track-direction', { detail: { direction, leftDark, centerDark, rightDark } }));

    // Inject into ESP32 REPL
    if (serial.isConnected) {
      const dirNum = { NONE: -1, LEFT: 0, CENTER: 1, RIGHT: 2 }[direction];
      const payload = `__pc_track_data = {"direction": "${direction}", "dir_id": ${dirNum}, "l": ${leftDark}, "c": ${centerDark}, "r": ${rightDark}}\r\n`;
      serial.write(payload);
    }

    return direction;
  }

  private sendHandDataToESP32(results: HandLandmarkerResult) {
    const hand = results.landmarks[0];
    if (!hand) return;
    const indexTip = hand[8];
    if (!indexTip) return;

    const x = Math.round(indexTip.x * 100);
    const y = Math.round(indexTip.y * 100);
    const payload = `__pc_ai_data = {"hand_x": ${x}, "hand_y": ${y}}\r\n`;

    if (serial.isConnected) {
      serial.write(payload);
    }
  }
}

export const aiEngine = new AIEngine();
