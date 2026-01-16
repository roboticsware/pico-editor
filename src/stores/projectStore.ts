import { defineStore } from 'pinia';
import * as Blockly from 'blockly';
import { loadModeBlocks } from '@/blocks/loader';
import { useModeStore } from './modeStore';
import { useCodeStore } from './codeStore';
import { shallowRef, watch } from 'vue';
import { alertController } from '@ionic/vue';
import i18n from '@/i18n';

export const useProjectStore = defineStore('project', () => {
  const { t } = i18n.global;
  const modeStore = useModeStore();
  const codeStore = useCodeStore();
  const workspace = shallowRef<Blockly.WorkspaceSvg | null>(null); // shallowRef 사용시 내부 객체의 변경은 감시하지 않아 성능에 유리

  // 외부에서 .value 없이 접근하기 위한 헬퍼 (내부 로직용)
  const setWorkspace = (ws: Blockly.WorkspaceSvg) => {
    workspace.value = ws;
  };

  const saveProject = async () => {
    const ws = workspace.value;
    if (!ws) return;

    const json = Blockly.serialization.workspaces.save(ws);
    if (Object.keys(json).length === 0) {
      const alert = await alertController.create({
        header: '⚠️ ' + t('common.notice'),
        message: t('project.empty'),
        buttons: [t('common.ok')],
      });
      await alert.present();
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
    // 파일 읽기 시작 전 워크스페이스 존재 여부 체크
    if (!workspace.value) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const projectData = JSON.parse(e.target?.result as string);

        // **타겟 워크스페이스 결정**
        let targetWs = workspace.value;

        // 1단계: 모드 전환이 필요한 경우
        if (projectData.mode && projectData.mode !== modeStore.currentMode) {

          const alert = await alertController.create({
            header: '⚠️ ' + t('common.notice'),
            message: t('project.load.confirm_msg', { mode: projectData.mode }),
            buttons: [
              {
                text: t('common.cancel'),
                role: 'cancel',
              },
              {
                text: t('common.ok'),
                role: 'confirm',
              },
            ],
          });
          await alert.present();
          const { role } = await alert.onDidDismiss();

          if (role === 'confirm') {
            // 모드 블록 로드
            await loadModeBlocks(projectData.mode);

            // **정석 해결책**: 워크스페이스가 갱신될 때까지 기다리는 프로미스 생성
            const workspaceReadyPromise = new Promise<Blockly.WorkspaceSvg>((resolve, reject) => {
              const timeout = setTimeout(() => {
                stopWatch();
                reject(new Error("워크스페이스 초기화 시간 초과"));
              }, 3000); // 3초 타임아웃

              // workspace Ref 값이 바뀌는 것을 감지
              const stopWatch = watch(workspace, (newWs) => {
                if (newWs && newWs !== targetWs) { // 새 워크스페이스가 생성되면
                  clearTimeout(timeout);
                  stopWatch(); // 감시 종료
                  resolve(newWs);
                }
              });
            });

            // 모드 변경 요청 (비동기 UI 업데이트 트리거)
            modeStore.setMode(projectData.mode);

            // 새 워크스페이스가 준비될 때까지 대기
            try {
              targetWs = await workspaceReadyPromise;
            } catch (error) {
              const errAlert = await alertController.create({
                header: '❗ ' + t('common.error'),
                message: t('project.workspace_error'),
                buttons: [t('common.ok')],
              });
              await errAlert.present();
              return;
            }

          } else { // 사용자가 모드 전환 거부
            return;
          }
        }

        // targetWs 유효성 재확인
        if (!targetWs) {
          const alert = await alertController.create({
            header: '❗ ' + t('common.error'),
            message: t('project.no_workspace'),
            buttons: [t('common.ok')]
          });
          await alert.present();
          return;
        }

        // 2단계: 데이터 주입
        Blockly.Events.disable();
        if (targetWs.setResizesEnabled) targetWs.setResizesEnabled(false);

        try {
          // 기존 블록 클리어
          targetWs.clear();

          // 데이터 로드
          Blockly.serialization.workspaces.load(projectData.blocks, targetWs);

          // 블록 렌더링 초기화
          targetWs.getAllBlocks(false).forEach(b => {
            if (b instanceof Blockly.BlockSvg) b.initSvg();
          });

        } finally {
          // 3단계: 복구 및 초기화 완료 이벤트
          Blockly.Events.enable();
          if (targetWs.setResizesEnabled) targetWs.setResizesEnabled(true);

          const finishEvent = new (Blockly.Events.get(Blockly.Events.FINISHED_LOADING))(targetWs);
          Blockly.Events.fire(finishEvent);

          // UI 렌더링 큐가 정리된 후 리사이즈 및 코드 갱신
          setTimeout(() => {
            targetWs?.render();
            Blockly.svgResize(targetWs!); // ! 단언 사용 (위에서 null 체크 함)
            codeStore.triggerCodeUpdate();
          }, 0);
        }
      } catch (err) {
        console.error("파일 로드 오류:", err);
        const alert = await alertController.create({
          header: '❗ ' + t('common.error'),
          message: t('project.load_error'),
          buttons: [t('common.ok')],
        });
        await alert.present();
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