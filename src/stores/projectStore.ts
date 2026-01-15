import { defineStore } from 'pinia';
import * as Blockly from 'blockly';
import { useModeStore } from './modeStore';
import { nextTick, shallowRef } from 'vue'; // Workspace는 무거우므로 shallowRef 권장
import { loadModeBlocks } from '@/blocks/loader';

export const useProjectStore = defineStore('project', () => {
  const modeStore = useModeStore();
  
  // shallowRef를 사용하면 내부 객체의 변경은 감시하지 않아 성능에 유리합니다.
  const workspace = shallowRef<Blockly.WorkspaceSvg | null>(null);

  // 외부에서 .value 없이 접근하기 위한 헬퍼 (내부 로직용)
  const getWS = () => workspace.value;

  const setWorkspace = (ws: Blockly.WorkspaceSvg) => {
    workspace.value = ws;
  };

  const saveProject = () => {
    const ws = getWS();
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
    const ws = getWS();
    if (!ws) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const projectData = JSON.parse(e.target?.result as string);
        
        // 1. 모드 불일치 시 처리
        if (projectData.mode && projectData.mode !== modeStore.currentMode) {
          if (confirm(`모드를 ${projectData.mode}(으)로 전환하고 파일을 불러올까요?`)) {
            // 모드에 필요한 블록 모듈들을 먼저 로드
            await loadModeBlocks(projectData.mode);
            // 중요: UI가 툴박스를 새로 그리고 블록 정의를 마칠 때까지 충분히 대기
            modeStore.setMode(projectData.mode);
            await nextTick();
            // 블록 정의가 완전히 로드되도록 강제 지연 (0.1초)
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }

        // 2. 워크스페이스 초기화 및 이벤트 중단
        ws.clear();
        Blockly.Events.disable(); 
        
        // 3. 연결DB 에러 방지를 위한 렌더링 일시 중단
        if (ws.setResizesEnabled) ws.setResizesEnabled(false);

        try {
          // 4. 데이터 로드
          Blockly.serialization.workspaces.load(projectData.blocks, ws);
        } finally {
          // 5. 로드 성공/실패 여부와 상관없이 렌더링 및 이벤트 재개
          Blockly.Events.enable();
          if (ws.setResizesEnabled) ws.setResizesEnabled(true);
          
          // 6. 로드 후 레이아웃 강제 재계산
          setTimeout(() => {
            ws.render();
            Blockly.svgResize(ws);
          }, 50);
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
    loadProject 
  };
});