import { defineStore } from 'pinia';
import * as Blockly from 'blockly';

export const useProjectStore = defineStore('project', () => {
  
  // 1. 파일 저장 로직
  const saveProject = (workspace: Blockly.WorkspaceSvg) => {
    const json = Blockly.serialization.workspaces.save(workspace);
    const data = JSON.stringify(json);
    if (data == "{}") {
        alert("저장할 코드가 없습니다. 블록을 먼저 배치하세요!");
        return;
    }
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `pico_project_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // 2. 파일 로드 로직
  const loadProject = (workspace: Blockly.WorkspaceSvg, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        Blockly.serialization.workspaces.load(json, workspace);
      } catch (err) {
        alert("유효한 프로젝트 파일이 아닙니다.");
      }
    };
    reader.readAsText(file);
  };

  return { saveProject, loadProject };
});