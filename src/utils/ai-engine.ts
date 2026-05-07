import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import type { HandLandmarkerResult } from '@mediapipe/tasks-vision';
import { serial } from './serial';

export class AIEngine {
  private handLandmarker: HandLandmarker | null = null;
  private isInitialized = false;

  async init() {
    if (this.isInitialized) return;

    try {
      // For full offline support, these URLs should point to local public/assets paths.
      // Using CDNs here for quick testing, but architecture supports local.
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

  processFrame(imageElement: HTMLImageElement | HTMLCanvasElement): HandLandmarkerResult | null {
    if (!this.handLandmarker || !this.isInitialized) return null;
    
    // Run inference
    const results = this.handLandmarker.detect(imageElement);
    
    // If hands are detected, send data back to ESP32
    if (results && results.landmarks && results.landmarks.length > 0) {
      this.sendDataToESP32(results);
    }

    return results;
  }

  private sendDataToESP32(results: HandLandmarkerResult) {
    // We only take the first hand, index finger tip (landmark 8) for a simple example
    const indexTip = results.landmarks[0][8];
    if (!indexTip) return;

    // Convert normalized coordinates (0.0 - 1.0) to something more useful (0-100)
    const x = Math.round(indexTip.x * 100);
    const y = Math.round(indexTip.y * 100);

    // Create a JSON string to inject into the Python REPL.
    // The ESP32 Python code will just read a global variable `__pc_ai_data`
    const payload = `__pc_ai_data = {"hand_x": ${x}, "hand_y": ${y}}\r\n`;

    // Only send if connected
    if (serial.isConnected()) {
      serial.write(payload);
    }
  }
}

export const aiEngine = new AIEngine();
