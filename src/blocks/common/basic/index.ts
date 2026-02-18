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
      // Beginner (Natural Language)
      beginner: {
        IMPORT_TIME: "시간(time) 라이브러리 사용하기",
        IMPORT_MATH: "수학(math) 라이브러리 사용하기",
        IMPORT_RANDOM: "무작위(random) 라이브러리 사용하기",
        PASS: "아무것도 하지 않기 (pass)",
        BREAK: "반복 멈추기 (break)",
        START_COMMENT: "# 여기에 코드를 작성하세요",
        WHILE_TRUE: "무한 반복하기",
        WHILE: "반복하기 (조건: %1)",
        IF: "만약 %1 라면:",
        ELIF: "아니고 만약 %1 라면:",
        ELSE: "아니면:",
        TRY: "에러 확인 (try):",
        EXCEPT: "에러 발생 시 (except %1):",
        FOR_RANGE: "%1 변수로 %2 번 반복하기:",
        FOR_ADV: "%1 변수 (리스트: %2) 반복하기:",
        DEF_FUNC: "함수 정의 %1 (매개변수: %2):",
        RETURN: "결과값 %1 돌려주기 (return)",
        CLASS: "클래스 정의 %1:",
        PRINT: "출력하기 (%1)",
        PRINT_TEXT: "문장 출력하기 (\"%1\")"
      },
      // Intermediate (Python Syntax)
      intermediate: {
        IMPORT_TIME: "import time",
        IMPORT_MATH: "import math",
        IMPORT_RANDOM: "import random",
        PASS: "pass",
        BREAK: "break",
        START_COMMENT: "# Start code here",
        WHILE_TRUE: "while True:",
        WHILE: "while %1 :",
        IF: "if %1 :",
        ELIF: "elif %1 :",
        ELSE: "else:",
        TRY: "try:",
        EXCEPT: "except %1 :",
        FOR_RANGE: "for %1 in range(%2):",
        FOR_ADV: "for %1 in %2 :",
        DEF_FUNC: "def %1 (%2):",
        RETURN: "return %1",
        CLASS: "class %1 :",
        PRINT: "print(%1)",
        PRINT_TEXT: "print(\"%1\")"
      }
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
      // Beginner (Natural Language)
      beginner: {
        IMPORT_TIME: "Use time library",
        IMPORT_MATH: "Use math library",
        IMPORT_RANDOM: "Use random library",
        PASS: "Do nothing (pass)",
        BREAK: "Break loop",
        START_COMMENT: "# Write code here",
        WHILE_TRUE: "Repeat forever",
        WHILE: "Repeat while %1",
        IF: "If %1 then:",
        ELIF: "Else if %1 then:",
        ELSE: "Else:",
        TRY: "Try:",
        EXCEPT: "Except %1:",
        FOR_RANGE: "Repeat %2 times with %1:",
        FOR_ADV: "For %1 in %2:",
        DEF_FUNC: "Define function %1 (params: %2):",
        RETURN: "Return result %1",
        CLASS: "Define class %1:",
        PRINT: "Print (%1)",
        PRINT_TEXT: "Print text (\"%1\")"
      },
      // Intermediate (Python Syntax)
      intermediate: {
        IMPORT_TIME: "import time",
        IMPORT_MATH: "import math",
        IMPORT_RANDOM: "import random",
        PASS: "pass",
        BREAK: "break",
        START_COMMENT: "# Start code here",
        WHILE_TRUE: "while True:",
        WHILE: "while %1 :",
        IF: "if %1 :",
        ELIF: "elif %1 :",
        ELSE: "else:",
        TRY: "try:",
        EXCEPT: "except %1 :",
        FOR_RANGE: "for %1 in range(%2):",
        FOR_ADV: "for %1 in %2 :",
        DEF_FUNC: "def %1 (%2):",
        RETURN: "return %1",
        CLASS: "class %1 :",
        PRINT: "print(%1)",
        PRINT_TEXT: "print(\"%1\")"
      }
    }
  }
};