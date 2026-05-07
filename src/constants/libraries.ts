export interface Library {
  id: string;
  name: string;
  fileName: string;
  description: string;
  version: string;
  sourceUrl?: string; // 나중에 fetch()할 때 사용
  content?: string;   // Assets에서 로드
  targetFamily?: 'pico' | 'esp32' | 'all'; // 특정 보드 제품군 전용
  isPackage?: boolean; // 단일 파일이 아닌 다중 파일 패키지 여부
  packageFiles?: string[]; // isPackage가 true일 때 복사할 하위 파일 목록
}

export const AVAILABLE_LIBRARIES: Library[] = [
  {
    id: 'picozero',
    name: 'PicoZero',
    fileName: 'picozero.py',
    description: 'A beginner-friendly library for controlling Pico components.',
    version: '0.4.5',
    targetFamily: 'pico',
    sourceUrl: 'https://raw.githubusercontent.com/roboticsware/picozero/refs/heads/main/picozero/picozero.py',
  },
  {
    id: 'espzero',
    name: 'EspZero',
    fileName: 'espzero', // 폴더명으로 활용
    description: 'A beginner-friendly library for controlling ESP32 components, including AI vision.',
    version: '0.0.5',
    targetFamily: 'esp32',
    isPackage: true,
    packageFiles: [
      '__init__.py',
      '_core.py',
      '_hal.py',
      '_touch.py',
      '_wifi.py',
      'vision.py',
      'profiles/__init__.py',
      'profiles/_base.py',
      'profiles/auto.py',
      'profiles/esp32_boards.py'
    ]
  },
  {
    id: 'boot',
    name: 'Boot Script',
    fileName: 'boot.py',
    description: 'System boot script for Pico W',
    version: '1.0.0',
    targetFamily: 'all',
    content: undefined // Load from assets
  },
  {
    id: 'neosoco',
    name: 'NeoSoCo Library',
    fileName: 'neosoco.py',
    description: 'Hardware control library for NeoSoCo board (PicoZero based)',
    version: '1.0.0',
    targetFamily: 'pico',
    content: undefined // Load from assets
  },
  {
    id: 'ble_uart',
    name: 'BLE UART',
    fileName: 'ble_uart.py',
    description: 'Bluetooth Low Energy UART Helper',
    version: '1.0.0',
    targetFamily: 'all',
    content: undefined // Load from assets
  },
  {
    id: 'nec',
    name: 'NEC Library',
    fileName: 'nec.py',
    description: 'NEC IR Protocol Library (Integrated)',
    version: '1.0.0',
    targetFamily: 'pico',
    content: undefined
  }
];