import { ref, watch, computed } from 'vue';
import { defineStore } from 'pinia';
import { AVAILABLE_MODES, type CodingMode } from '@/constants/modes';

export const useModeStore = defineStore('mode', () => {
  // 로컬스토리지에서 초기값 불러오기
  const savedMode = localStorage.getItem('coding_mode') as CodingMode;
  const currentMode = ref<CodingMode | null>(
    localStorage.getItem('coding_mode') as CodingMode || null
  );

  // 현재 모드의 전체 디테일 정보 반환
  const currentModeDetail = computed(() => 
    AVAILABLE_MODES.find(m => m.id === currentMode.value) || null
  );

  const setMode = (modeId: CodingMode | null) => {
    currentMode.value = modeId;
    if (modeId) {
      localStorage.setItem('coding_mode', modeId);
    } else {
      localStorage.removeItem('coding_mode');
    }
  };

  return { currentMode, currentModeDetail, allModes: AVAILABLE_MODES, setMode };
});