import defineBlocks from './definitions';
import defineGenerators from './generators';
import toolboxData from './toolbox.json';

export const visionModule = {
  definitions: defineBlocks,
  generators: defineGenerators,
  toolbox: toolboxData,
  i18n: {
    ko: {
      VISION: "AI 비전 (ESP32-S3)",
      START_PC_STREAM: "카메라 영상을 에디터로 전송하기",
      GET_PC_HAND_X: "에디터에서 찾은 손가락 X 좌표",
      GET_PC_HAND_Y: "에디터에서 찾은 손가락 Y 좌표",
      TT_START_PC_STREAM: "ESP32의 카메라 영상을 PC로 전송하여 MediaPipe로 분석합니다.",
      TT_GET_PC_HAND: "PC에서 실시간으로 분석한 손가락 관절의 좌표값을 가져옵니다.",
      LOAD_TFLITE: "기기 내부 모델 로드하기",
      RUN_INFERENCE: "자체 AI 추론 실행하기",
      GET_INFERENCE_RESULT: "자체 AI 추론 결과 (클래스 ID)"
    },
    en: {
      VISION: "AI Vision (ESP32-S3)",
      START_PC_STREAM: "Stream Camera to Editor",
      GET_PC_HAND_X: "Hand X from Editor",
      GET_PC_HAND_Y: "Hand Y from Editor",
      TT_START_PC_STREAM: "Send camera stream to PC for MediaPipe analysis.",
      TT_GET_PC_HAND: "Get the hand coordinates analyzed by the PC.",
      LOAD_TFLITE: "Load on-device TFLite model",
      RUN_INFERENCE: "Run on-device AI inference",
      GET_INFERENCE_RESULT: "On-device AI Result (Class ID)"
    }
  }
};
