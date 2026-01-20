export interface Library {
  id: string;
  name: string;
  fileName: string;
  description: string;
  version: string;
  sourceUrl?: string; // 나중에 fetch()할 때 사용
  content?: string;    // Assets에서 로드
}

export const AVAILABLE_LIBRARIES: Library[] = [
  {
    id: 'picozero',
    name: 'PicoZero',
    fileName: 'picozero.py',
    description: 'A beginner-friendly library for controlling Pico components.',
    version: '0.4.5',
    sourceUrl: 'https://raw.githubusercontent.com/roboticsware/picozero/refs/heads/main/picozero/picozero.py',
  },
  // 추가 라이브러리들...
];