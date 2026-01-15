import { defineStore } from 'pinia';
import * as Blockly from 'blockly';
import { nextTick, shallowRef } from 'vue'; // Workspace는 무거우므로 shallowRef 권장
import { loadModeBlocks } from '@/blocks/loader';
import { useModeStore } from './modeStore';
import { useCodeStore } from './codeStore';

export const useProjectStore = defineStore('project', () => {
  const modeStore = useModeStore();
  const codeStore = useCodeStore();
  const workspace = shallowRef<Blockly.WorkspaceSvg | null>(null); // shallowRef 사용시 내부 객체의 변경은 감시하지 않아 성능에 유리

  // 외부에서 .value 없이 접근하기 위한 헬퍼 (내부 로직용)
  const setWorkspace = (ws: Blockly.WorkspaceSvg) => {
    workspace.value = ws;
  };

  const saveProject = () => {
    const ws = workspace.value;
    if (!ws) return;

    const json = Blockly.serialization.workspaces.save(ws);
    if (Object.keys(json).length === 0) {
        alert("저장할 코드가 없습니다.");
        return;
    }

    const projectData = {
      appName: "Pico Editor",
      version: "1.0.0",
      lastModified: new Date().toISOString(),
      mode: modeStore.currentMode,
      blocks: json,
    };

    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pico_project_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const loadProject = async (file: File) => {
    const ws = workspace.value;
    if (!ws) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const projectData = JSON.parse(e.target?.result as string);
        
        // 1단계: 환경 준비 (모드 전환 및 블록 정의 로드)
        if (projectData.mode && projectData.mode !== modeStore.currentMode) { // 모드 불일치 시 처리
          if (confirm(`모드를 ${projectData.mode}(으)로 전환하고 파일을 불러올까요?`)) {
            // 모드에 필요한 블록 모듈들을 먼저 로드
            await loadModeBlocks(projectData.mode);
            // 중요: UI가 툴박스를 새로 그리고 블록 정의를 마칠 때까지 충분히 대기
            modeStore.setMode(projectData.mode);
            await nextTick();
            // 블록 정의가 완전히 로드되도록 강제 지연 (0.2초)
            await new Promise(resolve => setTimeout(resolve, 200));
          } else { // 사용자가 모드 전환을 거부한 경우
            return;
          }
        }

        // 2단계: 데이터 주입 (이벤트와 렌더링을 끄고 조용히 작업)
        Blockly.Events.disable(); 
        if (ws.setResizesEnabled) ws.setResizesEnabled(false); // 렌더링 일시 중단
        
        try {
          ws.clear();
          Blockly.serialization.workspaces.load(projectData.blocks, ws); // 직열화 데이터 로드
          ws.getAllBlocks(false).forEach(b => { // 로드 직후 모든 블록의 모양을 강제로 계산하여 연결점 복구
            if (b instanceof Blockly.BlockSvg) b.initSvg();
          });

        } finally {
          // 3단계: 복구 및 강제 트리거
          Blockly.Events.enable();
          if (ws.setResizesEnabled) ws.setResizesEnabled(true);

          // 강제로 변경 이벤트를 발생시켜 제너레이터 깨우기
          const finishEvent = new (Blockly.Events.get(Blockly.Events.FINISHED_LOADING))(ws);
          Blockly.Events.fire(finishEvent);
          
          // 레이아웃 정리 및 코드 생성기 실행
          setTimeout(() => {
            ws.render();
            Blockly.svgResize(ws);
            codeStore.triggerCodeUpdate(); // 코드 갱신 수동 호출
          }, 100);
        }
      } catch (err) {
        console.error("파일 로드 오류:", err);
        alert("프로젝트를 불러오는 중 문제가 발생했습니다.");
      }
    };
    reader.readAsText(file);
  };

  return { 
    workspace, // 컴포넌트에서는 store.workspace로 접근
    setWorkspace, 
    saveProject, 
    loadProject,
  };
});