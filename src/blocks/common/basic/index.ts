import defineBlocks from './definitions';
import defineGenerators from './generators';
import toolboxData from './toolbox.json';

export const basicModule = {
  definitions: defineBlocks,
  generators: defineGenerators,
  toolbox: toolboxData,
  i18n: {
    ko: {
      BASIC: "기본",
      STATEMENTS: "구문",
      LOGIC: "논리",
      LOOPS: "반복",
      CONDITIONS: "조건",
      DEFINITIONS: "정의",
      CONTROLS: "제어",
      OPERATORS: "연산",
      VARIABLES: "변수",
      WAIT_SECONDS: "기다리기 %1 초",
      TP_WAIT_SECONDS: "지정된 시간만큼 대기합니다.",
    },
    en: {
      BASIC: "Basic",
      STATEMENTS: "Statements",
      LOGIC: "Logic",
      LOOPS: "Loops",
      CONDITIONS: "Conditions",
      DEFINITIONS: "Definitions",
      CONTROLS: "Controls",
      OPERATORS: "Operators",
      VARIABLES: "Variables",
      WAIT_SECONDS: "Wait %1 seconds",
      TP_WAIT_SECONDS: "Wait for a specified amount of time.",
    }
  }
};