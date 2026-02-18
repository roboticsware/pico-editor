<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import * as Blockly from 'blockly';
import { pythonGenerator } from 'blockly/python';
import { useCodeStore } from '../stores/codeStore';
import { useModeStore } from '../stores/modeStore';
import { useProjectStore } from '../stores/projectStore';
import { loadModeBlocks } from '../blocks/loader';

import { useI18n } from 'vue-i18n';
import { useLangStore } from '../stores/langStore';
import { useThemeStore } from '../stores/themeStore';
import * as Ko from 'blockly/msg/ko';
import * as En from 'blockly/msg/en';
import { IonToolbar, IonButtons, IonIcon } from '@ionic/vue';
import { extensionPuzzle } from 'ionicons/icons';
const langStore = useLangStore();
const themeStore = useThemeStore();
const { t, tm} = useI18n();

const codeStore = useCodeStore();
const modeStore = useModeStore();
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
    workspace.clear(); // Clear explicitly to force re-render
    Blockly.serialization.workspaces.load(state, workspace);
  }
}, { immediate: true });

// 난이도 변경 감시
watch(() => modeStore.difficulty, async() => {
  if (workspace) {
    // 1. Re-load message keys (This updates Blockly.Msg)
    // We assume applying locale again or just re-loading blocks works.
    // Actually applyLocaleToBlockly only handles language packs.
    // We need to re-run "loadModeBlocks" part which injects messages.
    
    // Force re-fetch toolbox which internally re-runs loadModeBlocks logic for messages
    // BUT loadModeBlocks is designed to load modules.
    // Let's explicitly call getToolboxConfig which calls loadModeBlocks
    const newToolbox = await getToolboxConfig();
    workspace.updateToolbox(newToolbox);

    // 2. Reload Workspace to apply new Msg to Blocks
    const state = Blockly.serialization.workspaces.save(workspace);
    workspace.clear();
    Blockly.serialization.workspaces.load(state, workspace);
  }
});

const getToolboxConfig = async () => {
  // 1. 고도화된 로더를 통해 현재 모드와 언어에 맞는 툴박스를 가져옵니다.
  // 로더 내부에서 이미 Blockly.Msg 번역 병합이 완료된 상태여야 합니다.
  const toolbox = await loadModeBlocks(modeStore.currentMode);
  if (!toolbox) return { kind: 'categoryToolbox', contents: [] };
  return toolbox;
};

// Blockly 초기화 부분
// Blockly 초기화 부분
// 테마 설정 객체 정의
const themeConfig = {
  'name': 'scratch_theme',
  'base': Blockly.Themes.Classic,
  'blockStyles': {
    'basic_blocks': { 
        'colourPrimary': '#ff0066', 
        'colourSecondary': '#e6005c', 
        'colourTertiary': '#cc0052' 
    },
    'logic_blocks': { 
        'colourPrimary': '#38bdf8', 
        'colourSecondary': '#0ea5e9', 
        'colourTertiary': '#0284c7' 
    },
    'loop_blocks': { 
        'colourPrimary': '#818cf8', 
        'colourSecondary': '#6366f1', 
        'colourTertiary': '#4f46e5' 
    },
    'math_blocks': { 
        'colourPrimary': '#34d399', 
        'colourSecondary': '#10b981', 
        'colourTertiary': '#059669' 
    },
    'variable_blocks': { 
        'colourPrimary': '#fbbf24', 
        'colourSecondary': '#f59e0b', 
        'colourTertiary': '#d97706' 
    },
    'procedure_blocks': { 
        'colourPrimary': '#f472b6', 
        'colourSecondary': '#ec4899', 
        'colourTertiary': '#db2777' 
    },
    'hardware_blocks': { 
        'colourPrimary': '#673ab7', 
        'colourSecondary': '#5e35b1', 
        'colourTertiary': '#512da8' 
    }
  },
  'categoryStyles': {
    'basic_category': { 'colour': '#E91E63' },
    'logic_category': { 'colour': '#38bdf8' },
    'loop_category': { 'colour': '#818cf8' },
    'math_category': { 'colour': '#34d399' },
    'variable_category': { 'colour': '#fbbf24' },
    'procedure_category': { 'colour': '#f472b6' },
    'hardware_category': { 'colour': '#6200EA' }
  },
  'componentStyles': {
    'insertionMarkerColour': '#000000',
    'insertionMarkerOpacity': 0.2,
    'hat': 'cap'
  }
};

const getVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

const darkThemeConfig = {
  ...themeConfig,
  'componentStyles': {
    ...themeConfig.componentStyles,
    'workspaceBackgroundColour': '#1a1a1a', // Matches variables.css dark background
    'toolboxBackgroundColour': '#111216', // Matches variables.css toolbox background
    'flyoutBackgroundColour': '#111216',
    'toolboxForegroundColour': '#9ca3af',
    'flyoutForegroundColour': '#9ca3af',
  }
};

const lightThemeConfig = {
  ...themeConfig,
  'componentStyles': {
    ...themeConfig.componentStyles,
    'workspaceBackgroundColour': '#ffffff',
    'toolboxBackgroundColour': '#f1f5f9', // Slightly gray for contrast
    'flyoutBackgroundColour': '#f1f5f9',
    'toolboxForegroundColour': '#4b5563',
    'flyoutForegroundColour': '#4b5563',
  }
};

const BlocklyDarkTheme = Blockly.Theme.defineTheme('dark', darkThemeConfig);
const BlocklyLightTheme = Blockly.Theme.defineTheme('light', lightThemeConfig);

// 테마 변경 감시
watch(() => themeStore.isDarkMode, (isDark) => {
  if (workspace) {
    workspace.setTheme(isDark ? BlocklyDarkTheme : BlocklyLightTheme);
  }
});

const initBlockly = async () => {
  if (!blocklyDiv.value || !modeStore.currentMode) return;

  // 모드에 맞는 블록 및 툴박스 로드 (동적 로딩)
  const toolboxConfig = await getToolboxConfig();

  workspace = Blockly.inject(blocklyDiv.value, {
    toolbox: toolboxConfig,
    renderer: 'zelos',
    grid: { 
      spacing: 25, 
      length: themeStore.isDarkMode ? 0 : 2, 
      colour: getVar('--grid-color') || (themeStore.isDarkMode ? 'transparent' : '#e5e7eb'), 
      snap: true 
    },
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
    theme: themeStore.isDarkMode ? BlocklyDarkTheme : BlocklyLightTheme,
    zoom: {
      controls: true,
      wheel: true,
      startScale: 1.0,
      maxScale: 3,
      minScale: 0.3,
      scaleSpeed: 1.2,
    },
    media: 'blockly-media/',
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

  // 기본 주석 블록 추가 (# Start code here) - 워크스페이스가 비어있을 때만
  if (workspace.getAllBlocks(false).length === 0) {
    const startBlock = workspace.newBlock('start_comment');
    startBlock.initSvg();
    startBlock.render();
    startBlock.setDeletable(false); // 삭제 방지
    // 상단 중앙 배치를 위해 메트릭스 계산
    const metrics = workspace.getMetrics();
    // 캔버스 중앙 계산 (View 영역 기준)
    const centerX = metrics.viewWidth / 2;
    const blockWidth = startBlock.getHeightWidth().width;
    // 블록 위치 이동 (X: 중앙, Y: 상단에서 60px 아래)
    startBlock.moveBy(centerX - blockWidth / 2, 60);
  }

  // 초기화 직후 코드 스토어 동기화 (빈 코드 또는 기본 코드 반영)
  codeStore.triggerCodeUpdate();
};

// 워크스페이스 내 블록변경 감지 리스너
const onWorkspaceChange = (event: Blockly.Events.Abstract) => {
  // 사용자가 조작뿐만 아니라 FINISHED_LOADING(파일 로드 완료) 이벤트 때도 코드를 갱신함
  if (event.type === Blockly.Events.BLOCK_MOVE || 
      event.type === Blockly.Events.BLOCK_CHANGE ||
      event.type === Blockly.Events.FINISHED_LOADING) {
    codeStore.triggerCodeUpdate();
  }
};

// 테마 보완: 테마 변경 시 블록리 테마와 그리드 업데이트
watch(() => themeStore.isDarkMode, (isDark) => {
  if (workspace) {
    workspace.setTheme(isDark ? BlocklyDarkTheme : BlocklyLightTheme);
    const grid = workspace.getGrid();
    if (grid) {
      // @ts-ignore
      if (typeof grid.update === 'function') {
        const gridColor = getVar('--grid-color') || (isDark ? 'transparent' : '#e5e7eb');
        // @ts-ignore
        grid.update(isDark ? 0 : 2, gridColor);
      } else {
        // Fallback: Re-inject if necessary or just let it be. 
        // For simplicity, let's try to update via the workspace metrics if possible
        // but setTheme usually handles most things. Grid might need re-injection for full effect.
        // Let's re-inject for absolute correctness since Blockly grid is sticky.
        initBlockly();
      }
    }
  }
});

// 모드가 바뀔 때마다 블록리 재설정
watch(() => modeStore.currentMode, async (newMode) => {
  if (newMode) {
    if (workspace) {
       workspace.dispose(); // 기존 인스턴스 파괴하여 DOM 중복 방지
    }
    // blocklyDiv 내부 비우기 (dispose가 일부 DOM을 남길 수 있는 경우 대비)
    if (blocklyDiv.value) blocklyDiv.value.innerHTML = '';
    
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
  await initBlockly();

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
  <div class="canvas-wrapper">
    <ion-toolbar class="panel-header">
       <ion-buttons slot="start">
          <ion-icon :icon="extensionPuzzle" class="header-icon"></ion-icon>
          <span class="header-title">BLOCKS WORKSPACE</span>
       </ion-buttons>
    </ion-toolbar>

    <div class="blockly-container">
      <div ref="blocklyDiv" class="blockly-host"></div>
      
      <div 
        v-if="codeStore.hasUnsavedChanges" 
        @mousedown.stop="checkManualEdit"
        class="overlay-mask"
        title="수정된 코드를 먼저 처리해주세요"
      ></div>
    </div>
  </div>
</template>

<style scoped>
  .canvas-wrapper {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .panel-header {
    --min-height: 38px;
    --padding-start: 16px;
    --background: var(--panel-header-bg);
    --border-width: 0px !important; /* Ionic Toolbar 자체 보더 제거 */
    border-bottom: none !important;
  }
  .header-icon {
    font-size: 16px;
    color: var(--ion-color-primary);
    margin-right: 10px;
  }
  .header-title {
    font-family: var(--app-font-main);
    font-size: 0.7rem;
    font-weight: 800;
    letter-spacing: 0.1em;
    color: var(--panel-header-text);
    text-transform: uppercase;
  }
  .blockly-container {
    flex: 1;
    position: relative;
    overflow: hidden;
    background-color: var(--ion-background-color); /* 배경색 일치 */
    border: none !important;
  }
  .blockly-host {
    width: 100%;
    height: 100%;
    position: absolute;
    top: 0; left: 0; bottom: 0; right: 0;
  }
  .overlay-mask {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    z-index: 50;
    cursor: pointer;
  }
  
  /* 사이드바 카테고리 스타일 정의 */
  :deep(.blocklyToolboxDiv) {
    border-right: 1px solid var(--ion-border-color);
  }
  :deep(.blocklyTreeRoot) {
    padding: 12px 0;
  }
  :deep(.blocklyTreeRow) {
    height: 44px !important;
    margin: 4px 12px !important;
    padding: 0 16px !important;
    border-radius: 12px !important;
    border: none !important;
    color: inherit !important;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
  }
  :deep(.blocklyTreeRow:not(.blocklyTreeSelected):hover) {
    background-color: rgba(148, 163, 184, 0.1) !important;
  }
  :deep(.blocklyTreeSelected) {
    background: linear-gradient(135deg, #10b981 0%, #34d399 100%) !important;
    color: white !important;
    box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4) !important;
  }
  :deep(.blocklyTreeLabel) {
    font-size: 13px;
    font-weight: 700;
    font-family: var(--app-font-main);
    letter-spacing: 0.2px;
  }

  /* Root level categories (Basic, NeoSoCo) */
  :deep(.blocklyTreeRow[aria-level="1"]) {
    height: 50px !important;
    margin-top: 10px !important;
    margin-bottom: 4px !important;
    background-color: rgba(255, 255, 255, 0.03) !important;
    border: 1px solid var(--ion-border-color) !important;
  }
  
  :deep(.blocklyTreeRow[aria-level="1"]) .blocklyTreeLabel {
    font-size: 1.1rem !important; /* Bigger */
    font-weight: 900 !important; /* Bolder */
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  /* 블록 목록 창(Flyout) 배경 */
  :deep(.blocklyFlyoutBackground) {
    fill: var(--ion-background-color) !important;
    fill-opacity: 0.8 !important;
  }
  :deep(.blocklyFlyout) {
    border-right: 1px solid var(--ion-border-color);
    box-shadow: 10px 0 30px rgba(0,0,0,0.05);
  }

  /* 블록리 자체 보더 및 배경 잔상 제거 */
  :deep(.blocklySvg) {
    border: none !important;
    outline: none !important;
  }
  :deep(.blocklyMainBackground) {
    stroke: none !important;
  }
  :deep(.blocklyInjectionDiv) {
    border: none !important;
    outline: none !important;
  }
  :deep(.blocklyWidgetDiv), :deep(.blocklyTooltipDiv) {
    border: none !important;
  }
</style>