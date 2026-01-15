export interface Library {
  id: string;
  name: string;
  fileName: string;
  description: string;
  version: string;
  sourceUrl?: string; // 나중에 fetch()할 때 사용
  content: string;    // 현재는 하드코딩된 소스
}

export const AVAILABLE_LIBRARIES: Library[] = [
  {
    id: 'picozero',
    name: 'PicoZero',
    fileName: 'picozero.py',
    description: 'A beginner-friendly library for controlling Pico components.',
    version: '0.4.2',
    sourceUrl: 'https://raw.githubusercontent.com/picozero/picozero/main/picozero/picozero.py',
    content: `# PicoZero Library Placeholder\n# (실제 라이브러리 코드가 여기에 들어갑니다)\ndef hello():\n    print("PicoZero Ready")`
  },
  // 추가 라이브러리들...
];