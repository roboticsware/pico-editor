import defineBlocks from './definitions';
import defineGenerators from './generators';
import toolboxData from './toolbox.json';

export const ledModule = {
  definitions: defineBlocks,
  generators: defineGenerators,
  toolbox: toolboxData,
  i18n: {
    ko: {
      LED: "ESP32-S3 LED",
      PICO_LED_TEXT: "내장 LED를",
      PICO_LED_ON: "켜기",
      PICO_LED_OFF: "끄기",
      PICO_LED_BLINK: "깜빡이기",
      TT_PICO_LED: "espzero 라이브러리를 사용하여 내장 LED를 제어합니다."
    },
    en: {
      LED: "ESP32-S3 Led",
      PICO_LED_TEXT: "Built-in LED",
      PICO_LED_ON: "on",
      PICO_LED_OFF: "off",
      PICO_LED_BLINK: "blink",
      TT_PICO_LED: "Control the built-in LED using the espzero library."
    }
  }
};