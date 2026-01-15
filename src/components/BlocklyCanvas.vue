<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import * as Blockly from 'blockly';
import { pythonGenerator } from 'blockly/python';
import { useCodeStore } from '../stores/codeStore';
// import { sanitizeCode } from '../utils/code-sanitizer';
import { useModeStore } from '../stores/modeStore';
import { useProjectStore } from '../stores/projectStore';
import { loadModeBlocks } from '../blocks/loader';

import { useI18n } from 'vue-i18n';
import { useLangStore } from '../stores/langStore';
import * as Ko from 'blockly/msg/ko';
import * as En from 'blockly/msg/en';
const langStore = useLangStore();
const { t, tm} = useI18n();

const codeStore = useCodeStore();
const emit = defineEmits(['show-save-warnning'])
const blocklyDiv = ref<HTMLElement | null>(null);
let workspace: Blockly.WorkspaceSvg;

// 부모(HomeView)에게 이 함수들을 노출
const getPythonCode = () => {
  // 하이라이트 로직이 포함된 코드를 생성하려면 여기서 처리가능
  return pythonGenerator.workspaceToCode(workspace);
};

// 사용자가 구역 크기를 조절할 때마다 자식의 resize 메서드 호출
const handleResize = () => {
  if (workspace) {
    Blockly.svgResize(workspace);
  }
};

defineExpose({
  getPythonCode,
  handleResize
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
watch(() => langStore.currentLang, async(newLang) => {
  if (workspace) {
    applyLocaleToBlockly(newLang);
    // 툴박스(카테고리 이름) 갱신
    workspace.updateToolbox(await getToolboxConfig());
    // 이미 화면에 놓인 블록들의 텍스트 갱신 (직렬화 방식으로 리로드가 가장 확실함)
    const state = Blockly.serialization.workspaces.save(workspace);
    Blockly.serialization.workspaces.load(state, workspace);
  }
}, { immediate: true });

const getToolboxConfig = async () => {
  // 1. 고도화된 로더를 통해 현재 모드와 언어에 맞는 툴박스를 가져옵니다.
  // 로더 내부에서 이미 Blockly.Msg 번역 병합이 완료된 상태여야 합니다.
  const toolbox = await loadModeBlocks(modeStore.currentMode);
  if (!toolbox) return { kind: 'categoryToolbox', contents: [] };
  return toolbox;
};

// Blockly 초기화 부분
const modeStore = useModeStore();
// 테마 설정 객체 정의
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

const initBlockly = async () => {
  if (!blocklyDiv.value || !modeStore.currentMode) return;

  // 모드에 맞는 블록 및 툴박스 로드 (동적 로딩)
  const toolboxConfig = await getToolboxConfig();

  workspace = Blockly.inject(blocklyDiv.value, {
    toolbox: toolboxConfig,
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
      // media: 'blockly/media/', // Public 폴더 내 미디어 경로 확인 필요
  });

  // 스토어에 워크스페이스 등록 (다른 컴포넌트에서 접근 가능하도록)
  projectStore.setWorkspace(workspace);

  // 블록 변경 이벤트 감지 -> 파이썬 코드 생성
  workspace.addChangeListener((event) => {
    if (event.isUiEvent) return;
    if (codeStore.isManualEditing) {
        console.log("텍스트 수정 중이므로 블록 업데이트를 건너뜁니다.");
        return;
    }
    onWorkspaceChange(event);
  });

  Blockly.svgResize(workspace);
};

// 워크스페이스 변경 감지 리스너
const onWorkspaceChange = (event: Blockly.Events.Abstract) => {
  // 사용자의 조작뿐만 아니라 FINISHED_LOADING(파일 로드 완료) 이벤트 때도 코드를 갱신함
  if (event.type === Blockly.Events.BLOCK_MOVE || 
      event.type === Blockly.Events.BLOCK_CHANGE ||
      event.type === Blockly.Events.FINISHED_LOADING) {
    codeStore.triggerCodeUpdate();
  }
};

// 모드가 바뀔 때마다 블록리 재설정
watch(() => modeStore.currentMode, async (newMode) => {
  if (newMode) {
    workspace.clear(); // 모드 변경 시 워크스페이스를 비우기
    await initBlockly();
  }
});

// 사용자가 고치고 아직 저장하지 않은 텍스트가 있다면 경고 모달 띄우기
const checkManualEdit = () => {
  if (codeStore.hasUnsavedChanges) {
    emit('show-save-warnning'); 
  }
}

const projectStore = useProjectStore();
onMounted(async () => {
  // 파이썬 코드 제너레이터 튜닝하여 불필요한 소괄호 억제
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
 
  // Blockly 워크스페이스 생성
  applyLocaleToBlockly(langStore.currentLang); // 워크스페이스 생성 전, 현재 저장된 언어로 locale 먼저 초기화
  initBlockly();

  // splitpanes 처음 나타날 때 빈 공간 생기는 현상을 방지용
  await nextTick();
  setTimeout(() => {
    handleResize();
  }, 200); // DOM이 완전히 안착하고 splitpanes 계산이 끝날 때까지 대기 후 화면 리사이즈 호출해 빈 공간까지 채우기
});

onUnmounted(() => {
  if (workspace) {
    workspace.dispose();
    projectStore.setWorkspace(null as any); // 컴포넌트 파괴 시 참조 제거 (메모리 누수 방지)
  }
});
</script>

<template>
  <div class="relative w-full h-full">
    <div ref="blocklyDiv" class="w-full h-full"></div>
    
    <div 
      v-if="codeStore.hasUnsavedChanges" 
      @mousedown.stop="checkManualEdit"
      class="absolute inset-0 z-[50] cursor-pointer"
      title="수정된 코드를 먼저 처리해주세요"
    ></div>
  </div>
</template>

<style scoped>
  .blockly-container {
    height: 100%;
    width: 100%;
    position: relative; /* 자식인 blockly-div의 기준점이 됨 */
    overflow: hidden;   /* 블록이 영역 밖으로 나가는 것 방지 */
  }
  .blockly-div {
    position: absolute; /* container 내부를 꽉 채움 */
    top: 0; left: 0; right: 0; bottom: 0;
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