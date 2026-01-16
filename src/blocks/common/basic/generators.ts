

import * as Blockly from 'blockly';
import { pythonGenerator } from 'blockly/python';

export default function definePythonGenerators(P: typeof pythonGenerator) {
  // 자주 사용하는 상수를 짧게 선언
  const ORDER = (P as any).ORDER_ATOMIC || 0;

  // 헬퍼 함수: 들여쓰기가 필요한 코드 블록(Statement) 처리
  const getBranch = (block: Blockly.Block, name: string) => {
    let branch = P.statementToCode(block, name);
    return P.addLoopTrap(branch, (block as any).id) || P.PASS;
  };

  // --- 1. 기초 및 라이브러리 임포트 ---
  P.forBlock['import_math'] = () => 'import math\n';
  P.forBlock['import_time'] = () => 'import time\n';
  P.forBlock['random'] = () => 'import random\n';
  P.forBlock['pass'] = () => 'pass\n';
  P.forBlock['break'] = () => 'break\n';

  // --- 2. 기본 제어문 (Basic Control Structures) ---
  P.forBlock['while_true'] = (block: Blockly.Block) => `while True:\n${getBranch(block, 'DO')}`;

  P.forBlock['whileout'] = (block: Blockly.Block) => {
    const cond = P.valueToCode(block, 'cond', ORDER) || 'True';
    return `while ${cond}:\n${getBranch(block, 'DO')}`;
  };

  P.forBlock['ifinline'] = (block: Blockly.Block) => {
    const cond = P.valueToCode(block, 'iftext', ORDER) || 'True';
    return `if ${cond}:\n${getBranch(block, 'ifstate')}`;
  };

  P.forBlock['elifinline'] = (block: Blockly.Block) => {
    const cond = P.valueToCode(block, 'iftext', ORDER) || 'True';
    return `elif ${cond}:\n${getBranch(block, 'ifstate')}`;
  };

  P.forBlock['else'] = (block: Blockly.Block) => `else:\n${getBranch(block, 'DO')}`;

  P.forBlock['for'] = (block: Blockly.Block) => {
    const varName = P.valueToCode(block, 'letter', ORDER) || 'i';
    const rangeVal = P.valueToCode(block, 'no', ORDER) || '0';
    const branch = P.statementToCode(block, 'DO') || '    pass\n';
    return `for ${varName} in range(${rangeVal}):\n${branch}`;
  };

  P.forBlock['advancedforloops'] = (block: Blockly.Block) => {
    const x = P.valueToCode(block, 'x', ORDER);
    const y = P.valueToCode(block, 'y', ORDER);
    return `for ${x} in ${y}:\n${getBranch(block, 'DO')}`;
  };

  // --- 3. 함수 및 클래스 (Functions & Classes) ---
  P.forBlock['define'] = (block: Blockly.Block) => {
    const funcName = P.valueToCode(block, '1', ORDER) || 'my_function';
    const params = P.valueToCode(block, '2', ORDER) || '';
    const branch = P.statementToCode(block, 'DO') || '    pass\n';
    return `def ${funcName}(${params}):\n${branch}`;
  };

  P.forBlock['return2'] = (block: Blockly.Block) => {
    const val = P.valueToCode(block, 'return', ORDER) || '';
    return `return ${val}\n`;
  };

  P.forBlock['class'] = (block: Blockly.Block) => {
    const name = P.valueToCode(block, 'class', ORDER) || 'ClassName';
    return `class ${name}:\n${getBranch(block, 'DO')}`;
  };

  // --- 6. 연산 및 인라인 블록 (Expressions - Return Array) ---
  P.forBlock['internal'] = (block: Blockly.Block) => {
    const first = P.valueToCode(block, 'first', ORDER);
    const op = block.getFieldValue('choose');
    const last = P.valueToCode(block, 'last', ORDER);
    return [`${first} ${op} ${last}`, ORDER];
  };
  P.forBlock['andor'] = P.forBlock['internal'];

  P.forBlock['not'] = (block: Blockly.Block) => {
    const val = P.valueToCode(block, 'bool', ORDER);
    return [`not ${val}`, ORDER];
  };

  P.forBlock['textinline'] = (block: Blockly.Block) => [block.getFieldValue('text'), ORDER];

  P.forBlock['stringinline'] = (block: Blockly.Block) => [`"${block.getFieldValue('text')}"`, ORDER];

  P.forBlock['typeanything'] = (block: Blockly.Block) => {
    const stuff = P.valueToCode(block, 'stuff', ORDER) || '';
    return `${stuff} # your own code\n`;
  };

  // --- 7. 변수 관련 (Variables) ---
  P.forBlock['variables_get'] = (block: Blockly.Block) => {
    const varName = P.nameDB_!.getName(block.getFieldValue('VAR'), 'VARIABLE');
    return [varName, ORDER];
  };

  P.forBlock['variables_set'] = (block: Blockly.Block) => {
    const varName = P.nameDB_!.getName(block.getFieldValue('VAR'), 'VARIABLE');
    const val = P.valueToCode(block, 'varset', ORDER);
    return `${varName} = ${val}\n`;
  };

  // 인라인 변수 설정 (varinlines)
  P.forBlock['varinlines'] = (block: Blockly.Block) => {
    const varName = P.nameDB_!.getName(block.getFieldValue('var'), 'VARIABLE');
    const op = block.getFieldValue('NAME'); // =, +=, -=
    const val = P.valueToCode(block, 'value', ORDER) || '0';
    return `${varName} ${op} ${val}\n`;
  };

  // 불리언 상태 값
  P.forBlock['boolstatus'] = (block: Blockly.Block) => {
    const code = block.getFieldValue('bool');
    return [code, ORDER];
  };

  // 버튼 압축 상태 (입력용)
  P.forBlock['buttonapressed'] = (block: Blockly.Block) => {
    const name = block.getFieldValue('NAME');
    const code = `button_${name}.is_pressed()`;
    return [code, ORDER];
  };

  // 슬라이더 값
  P.forBlock['sliderinline'] = (block: Blockly.Block) => {
    const code = block.getFieldValue('slider');
    return [code, ORDER];
  };

  // --- 6. 기타 필수 블록 ---
  P.forBlock['varprint'] = (block: Blockly.Block) => {
    const val = P.valueToCode(block, 'var', ORDER) || '';
    return `print(${val})\n`;
  };

  P.forBlock['printnew'] = (block: Blockly.Block) => {
    const msg = P.valueToCode(block, 'text', ORDER) || "'Hello World'";
    return `print(${msg})\n`;
  };

  P.forBlock['base_delay'] = (block: Blockly.Block) => {
    const sec = block.getFieldValue('SEC') || '1';
    return `time.sleep(${sec})\n`;
  };
}