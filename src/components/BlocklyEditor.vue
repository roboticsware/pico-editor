<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import * as Blockly from 'blockly';
import 'blockly/blocks'; // 표준 블록 정의(Logic, Loops, Math 등) 로드
import '@/blocks/pico-block'; // 커스텀 블록 정의 로드
import { pythonGenerator } from 'blockly/python';
import { usePicoStore } from '../stores/picoStore';
import TerminalLog from './TerminalLog.vue';
import { sanitizeCode } from '../utils/code-sanitizer';

import { useI18n } from 'vue-i18n';
import { useLangStore } from '../stores/langStore';
import * as Ko from 'blockly/msg/ko';
import * as En from 'blockly/msg/en';
const langStore = useLangStore();
const { t, tm} = useI18n();

const picoStore = usePicoStore();
const blocklyDiv = ref<HTMLElement | null>(null);
let workspace: Blockly.WorkspaceSvg;

// 부모(HomeView)에게 이 함수들을 노출
const getWorkspace = () => workspace;
const getPythonCode = () => {
  // 하이라이트 로직이 포함된 코드를 생성하려면 여기서 처리가능
  return pythonGenerator.workspaceToCode(workspace);
};

defineExpose({
  getWorkspace,
  getPythonCode,
});

const applyLocaleToBlockly = (lang: string) => {
  // 1. 공식 언어팩 주입
  Blockly.setLocale(lang === 'ko' ? Ko : En as any);

  // 2. 커스텀 블록 메시지 주입 (JSON -> Blockly.Msg)
  // tm()은 i18n의 객체 데이터를 가져옵니다.
  const customMessages = tm('blockly.blocks') as Record<string, string  | undefined>;
  if (customMessages) {
    for (const key in customMessages) {
      if (customMessages[key]) Blockly.Msg[key.toUpperCase()] = customMessages[key] as string;
    }
  }
};

// 언어 변경 감시
watch(() => langStore.currentLang, (newLang) => {
  if (workspace) {
    applyLocaleToBlockly(newLang);
    // 툴박스(카테고리 이름) 갱신
    workspace.updateToolbox(getToolboxConfig());
    // 이미 화면에 놓인 블록들의 텍스트 갱신 (직렬화 방식으로 리로드가 가장 확실함)
    const state = Blockly.serialization.workspaces.save(workspace);
    Blockly.serialization.workspaces.load(state, workspace);
  }
}, { immediate: true });

// 초기 블록 설정 (Toolbox)
const getToolboxConfig = () => ({
  kind: 'categoryToolbox',
  "contents": [
    {
      "kind": "category",
      "name": t('blockly.categories.control'), // Logic + Loops 통합
      "colour": "#FFAB19",
      "contents": [
        { "kind": "block", "type": "controls_if" },
        { "kind": "block", "type": "logic_compare" },
        { "kind": "block", "type": "controls_repeat_ext" },
        { "kind": "block", "type": "controls_whileUntil" },
        { "kind": "block", "type": "base_forever" },

      ]
    },
    {
      "kind": "category",
      "name": t('blockly.categories.operators'), // Math + Logic 연산
      "colour": "#59C059",
      "contents": [
        { "kind": "block", "type": "math_number" },
        { "kind": "block", "type": "math_arithmetic" },
        { "kind": "block", "type": "math_random_int" },
        { "kind": "block", "type": "logic_operation" },
        { "kind": "block", "type": "logic_negate" }
      ]
    },
    {
      "kind": "category",
      "name": t('blockly.categories.variables'),
      "colour": "#FF8C1A",
      "custom": "VARIABLE" // 변수는 Blockly가 자동으로 생성해주는 'custom' 속성 권장
    },
    {
      "kind": "category",
      "name": t('blockly.categories.pico'), // 하드웨어 전용 카테고리
      "colour": "#4C97FF", // 스크래치 '동작' 카테고리 색상과 유사
      "contents": [
        { "kind": "block", "type": "pico_led_builtin" }, // 미리 정의했다고 가정된 블록들
        { "kind": "block", "type": "base_delay" }
      ]
    },
    {
      "kind": "category",
      "name": t('blockly.categories.myBlocks'), // Functions
      "colour": "#FF6680",
      "custom": "PROCEDURE"
    }
  ],
});

// 1. 테마 설정 객체 정의
const themeConfig = {
  'name': 'scratch_theme',
  'base': Blockly.Themes.Classic,
  'blockStyles': {
    'logic_blocks': { 
        'colourPrimary': '#FFAB19', 
        'colourSecondary': '#EC9C13', 
        'colourTertiary': '#CF8B0A' 
    },
    'loop_blocks': { 
        'colourPrimary': '#FFAB19', 
        'colourSecondary': '#EC9C13', 
        'colourTertiary': '#CF8B0A' 
    },
    'math_blocks': { 
        'colourPrimary': '#59C059', 
        'colourSecondary': '#46B946', 
        'colourTertiary': '#389438' 
    },
    'variable_blocks': { 
        'colourPrimary': '#FF8C1A', 
        'colourSecondary': '#FF8000', 
        'colourTertiary': '#DB6E00' 
    },
    'procedure_blocks': { 
        'colourPrimary': '#FF6680', 
        'colourSecondary': '#FF4D6A', 
        'colourTertiary': '#FF3355' 
    }
  },
  'categoryStyles': {
    'logic_category': { 'colour': '#FFAB19' },
    'loop_category': { 'colour': '#FFAB19' },
    'math_category': { 'colour': '#59C059' },
    'variable_category': { 'colour': '#FF8C1A' }
  },
  'componentStyles': {
    'workspaceBackgroundColour': '#1e1e1e',
    'toolboxBackgroundColour': '#252526',
    'toolboxForegroundColour': '#cccccc', // toolboxTextColour 대신 사용
    'flyoutBackgroundColour': '#252526',
    'flyoutForegroundColour': '#cccccc', // flyoutTextColour 대신 사용
    'insertionMarkerColour': '#000000',
    'insertionMarkerOpacity': 0.2
  }
};
const ScratchTheme = Blockly.Theme.defineTheme(themeConfig.name, themeConfig);

onMounted(() => {
  // 파이썬 코드 제너레이터 튜닝
  const tunePythonGenerator = () => {
    // 1. 기본 들여쓰기를 공백 4칸으로 고정 (PEP8 준수)
    pythonGenerator.INDENT = '    ';

    // 2. 파이썬 연산자 우선순위 재정의 (괄호 억제 핵심)
    // 숫자가 낮을수록 우선순위가 높습니다.
    const Order = {
      ATOMIC: 0,            // 리터럴, 변수
      COLLECTION: 1,        // [x], {x}
      MEMBER: 2,            // . (속성 접근)
      FUNCTION_CALL: 2,     // f(x)
      EXPONENTIATION: 3,    // **
      UNARY_SIGN: 4,        // +x, -x, ~x
      MULTIPLICATIVE: 5,    // *, /, %, //
      ADDITIVE: 6,          // +, -
      BITWISE_SHIFT: 7,     // <<, >>
      BITWISE_AND: 8,       // &
      BITWISE_XOR: 9,       // ^
      BITWISE_OR: 10,       // |
      COMPARISON: 11,       // <, <=, >, >=, ==, !=
      LOGICAL_NOT: 12,      // not x
      LOGICAL_AND: 13,      // and
      LOGICAL_OR: 14,       // or
      CONDITIONAL: 15,      // if-else
      LAMBDA: 16            // lambda
    };

    Object.assign(pythonGenerator, Order); // 기존 제너레이터의 Order 객체를 덮어씌우기
  };
  tunePythonGenerator();
 
  // Blockly 워크스페이스 생성관련 설정
  applyLocaleToBlockly(langStore.currentLang); // 워크스페이스 생성 전, 현재 저장된 언어로 locale 먼저 초기화
  if (blocklyDiv.value) {
    workspace = Blockly.inject(blocklyDiv.value, {
      toolbox: getToolboxConfig(),
      renderer: 'zelos', // 기본 geras 대신 zelos 사용
      grid: { spacing: 20, length: 3, colour: '#333', snap: true }, // 코딩영역에 그리드 생성
      horizontalLayout: false,
      toolboxPosition: 'start', // 블록을 꺼내면 카테고리 창을 자동으로 닫음
      move: { // Flyout이 워크스페이스를 밀어내지 않고 위에 뜨게 함
        scrollbars: {
          vertical: true,
          horizontal: true
        },
        drag: true,
        wheel: true
      },
      theme: ScratchTheme, // 정의한 테마 적용
      zoom: {
        controls: true,
        wheel: true,
        startScale: 1.0,
        maxScale: 3,
        minScale: 0.3,
        scaleSpeed: 1.2,
      },
    });

    // 블록 변경 이벤트 감지 -> 파이썬 코드 생성
    workspace.addChangeListener(() => {
      const rawCode = pythonGenerator.workspaceToCode(workspace!);
      picoStore.setPythonCode(sanitizeCode(rawCode));
    });
  }
});

onUnmounted(() => {
  if (workspace) {
    workspace.dispose();
  }
});
</script>

<template>
  <div class="editor-container">
    <div ref="blocklyDiv" class="blockly-div"></div>
    
    <aside class="right-sidebar">
      <div class="sidebar-label">Python Code</div>
      <div class="code-preview">
        <pre><code>{{ picoStore.pythonCode }}</code></pre>
      </div>

      <TerminalLog class="log-section" />
    </aside>
  </div>
</template>

<style scoped>
  .editor-container {
    display: flex;
    height: 100%;
    width: 100%;
    background-color: #f0f0f0;
  }
  .blockly-div {
    flex: 1;
    height: 100%;
  }
  .right-sidebar {
    flex: 1; /* 사이드바가 1의 비율 (정확히 화면의 1/3) */
    min-width: 350px; /* 너무 좁아지는 것 방지 */
    display: flex;
    flex-direction: column;
    border-left: 1px solid #333;
  }
  .sidebar-label {
    padding: 8px 12px;
    background: #252526;
    font-size: 11px;
    color: #888;
    font-weight: bold;
    text-transform: uppercase;
  }
  .code-preview {
    flex: 1;
    background: #1e1e1e;
    color: #fff;
    padding: 15px;
    overflow-y: auto;
    font-family: monospace;
  }
  .log-section { 
    height: 200px; 
    border-top: 1px s
    olid #333; 
  }

  /* 사이드바 카테고리 스타일 정의 */
  :deep(.blocklyTreeRow) {
    height: 40px !important;
    margin-bottom: 8px !important;
    padding: 8px 16px !important;
    border-radius: 8px !important;
    border: none !important;
  }
  :deep(.blocklyTreeLabel) {
    font-size: 14px;
    font-weight: 600;
  }

  /* 블록 목록 창(Flyout) 배경을 반투명하게 */
  :deep(.blocklyFlyoutBackground) {
    fill: rgba(8, 18, 32, 0.7) !important; /* DaisyUI base-200 색상 + 투명도 */
    backdrop-filter: blur(8px); /* 뒤쪽 블록들이 살짝 비치는 효과 */
  }
</style>