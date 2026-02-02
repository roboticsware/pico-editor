import defineBlocks from './definitions';
import defineGenerators from './generators';
import toolboxData from './toolbox.json';

export const basicModule = {
  definitions: defineBlocks,
  generators: defineGenerators,
  toolbox: toolboxData,
  i18n: {
    ko: {
      BASIC_TITLE: "🐍 기본",
      BASIC_IMPORTS: "📦 라이브러리",
      BASIC_STATEMENTS: "📝 구문",
      BASIC_LOGIC: "🤔 논리",
      BASIC_LOOPS: "🔄 반복",
      BASIC_CONDITIONS: "❓ 조건",
      BASIC_DEFINITIONS: "📚 정의",
      WAIT_SECONDS: "기다리기 %1 초",
      TP_WAIT_SECONDS: "지정된 시간만큼 대기합니다.",
    },
    en: {
      BASIC_TITLE: "🐍 Basic",
      BASIC_IMPORTS: "📦 Imports",
      BASIC_STATEMENTS: "📝 Statements",
      BASIC_LOGIC: "🤔 Logic",
      BASIC_LOOPS: "🔄 Loops",
      BASIC_CONDITIONS: "❓ Conditions",
      BASIC_DEFINITIONS: "📚 Definitions",
      WAIT_SECONDS: "Wait %1 seconds",
      TP_WAIT_SECONDS: "Wait for a specified amount of time.",
    }
  }
};