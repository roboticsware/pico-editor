import { ref } from 'vue';

interface ConfirmOptions {
  title: string;
  message: string;
}

// 모달의 상태를 외부에서 제어할 수 있도록 내보냄
export const isConfirmOpen = ref(false);
export const confirmOptions = ref<ConfirmOptions>({ title: '', message: '' });

let resolveCallback: (value: boolean) => void;

/**
 * 전역에서 사용할 수 있는 함수형 컨펌 창
 * @example const ok = await confirmCustom('주의', '삭제하시겠습니까?');
 */
export const confirmCustom = (title: string, message: string): Promise<boolean> => {
  confirmOptions.value = { title, message };
  isConfirmOpen.value = true;

  return new Promise((resolve) => {
    resolveCallback = resolve;
  });
};

// 모달에서 버튼 클릭 시 호출할 함수
export const handleConfirmResponse = (response: boolean) => {
  isConfirmOpen.value = false;
  resolveCallback(response);
};