import * as Blockly from 'blockly';
import { pythonGenerator } from 'blockly/python';

// 1. 블록 모양 정의
Blockly.common.defineBlocksWithJsonArray([
  // 사용자 정의 블록
  {
    "type": "base_forever",
    "message0": "%{BKY_FOREVER}",
    "message1": "%1",
    "args1": [
      { "type": "input_statement", "name": "DO" }
    ],
    "previousStatement": null,
    // "nextStatement": null, --> 주석 처리하면 스크래치처럼 밑으로 도킹 불가
    "colour": "#FFAB19", // 제어 블록 색상
    "tooltip": "내부의 코드를 무한히 반복합니다.",
    "helpUrl": ""
  },
  
  // 피코 전용 블록
  {
    "type": "pico_led_builtin",
    "message0": "%{BKY_SET_BUILTIN_LED}",
    "args0": [
      {
        "type": "field_dropdown",
        "name": "STATUS",
        "options": [ ["켜기", "1"], ["끄기", "0"] ]
      }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 230,
    "tooltip": "Pico의 내장 LED을 제어합니다.",
    "helpUrl": ""
  },
  {
    "type": "base_delay",
    "message0": "%{BKY_WAIT_SECONDS}",
    "args0": [
      {
        "type": "field_number",
        "name": "SEC",
        "value": 1,
        "min": 0,
        "precision": 0.1
      }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 160,
    "tooltip": "정해진 시간 동안 프로그램을 일시 정지합니다.",
    "helpUrl": ""
  }
]);

// 2. 파이썬 코드 생성 규칙 정의
pythonGenerator.forBlock['base_forever'] = function(block) {
  // 내부 도킹된 블록들의 코드를 가져옴
  const branch = pythonGenerator.statementToCode(block, 'DO');
  // 들여쓰기 처리
  const code = 'while True:\n' + (branch || '    pass\n');
  return code;
};

pythonGenerator.forBlock['pico_led_builtin'] = function(block) {
  const status = block.getFieldValue('STATUS');
  
  // 마이크로파이썬에 필요한 import 코드를 상단에 자동 추가
  (pythonGenerator as any).definitions_['import_machine'] = 'from machine import Pin';
  // 실제 실행될 코드
  const code = `Pin('LED', Pin.OUT).value(${status})\n`;
  return code;
};

pythonGenerator.forBlock['base_delay'] = function(block) {
  const sec = block.getFieldValue('SEC');
  
  // 마이크로파이썬에서 시간 지연을 위해 utime 라이브러리 임포트 추가
  (pythonGenerator as any).definitions_['import_utime'] = 'import utime';
  // 생성될 코드: utime.sleep(초)
  const code = `utime.sleep(${sec})\n`;
  return code;
};