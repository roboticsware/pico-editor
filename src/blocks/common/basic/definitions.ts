import * as Blockly from 'blockly';

export default function define(Blocks: any) {
  const maincolour = "#4facfe"; // Tech Blue
  const white = "#FFFFFF";

  // --- 1. 기초 및 라이브러리 임포트 블록 ---
  const simpleBlocks = [
    { id: 'import_time', msgKey: 'IMPORT_TIME', default: 'import time', tooltip: 'Imports the time library.' },
    { id: 'import_math', msgKey: 'IMPORT_MATH', default: 'import math', tooltip: 'Imports the math library.' },
    { id: 'random', msgKey: 'IMPORT_RANDOM', default: 'import random', tooltip: 'Imports the random library.' },
    { id: 'pass', msgKey: 'PASS', default: 'pass', tooltip: 'Pass to the next command' },
    { id: 'break', msgKey: 'BREAK', default: 'break', tooltip: 'breaks out of a loop' }
  ];

  simpleBlocks.forEach(b => {
    Blocks[b.id] = {
      init: function () {
        this.appendDummyInput().appendField(Blockly.Msg[b.msgKey] || b.default);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setStyle('basic_blocks');
        this.setTooltip(b.tooltip);
      }
    };
  });

  // --- 1-1. 특별 시작 블록 ---
  Blocks['start_comment'] = {
    init: function () {
      this.appendDummyInput().appendField(Blockly.Msg['START_COMMENT'] || "# Start code here");
      this.setNextStatement(true, null);
      this.setStyle('variable_blocks');
      this.setTooltip('Starting comment.');
    }
  };

  // --- 2. 제어문 (Loops & Logic) ---
  Blocks['while_true'] = {
    init: function () {
      this.appendDummyInput()
        .appendField(Blockly.Msg['WHILE_TRUE'] || 'while True:');
      this.appendStatementInput('DO')
        .appendField('');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setStyle('loop_blocks');
      this.setTooltip('Forever loop.');
      this.setHelpUrl('https://t.co/PCZC5EFe4D');
    },
  };

  Blocks['whileout'] = {
    init: function () {
      // "while %1 :"
      const msg = Blockly.Msg['WHILE'] || 'while %1 :';
      const parts = msg.split(/%1/);
      this.appendDummyInput().appendField(parts[0]);
      this.appendValueInput("cond").setCheck("Boolean");
      this.appendDummyInput().appendField(parts[1]);
      this.appendStatementInput('DO');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setStyle('loop_blocks');
    }
  };

  Blocks['ifinline'] = {
    init: function () {
      // "if %1 :"
      const msg = Blockly.Msg['IF'] || 'if %1 :';
      const parts = msg.split(/%1/);
      this.appendDummyInput().appendField(parts[0]);
      this.appendValueInput("iftext").setCheck("Boolean");
      this.appendDummyInput().appendField(parts[1]);
      this.appendStatementInput('ifstate');
      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setStyle('logic_blocks');
    }
  };

  Blocks['elifinline'] = {
    init: function () {
      // "elif %1 :"
      const msg = Blockly.Msg['ELIF'] || 'elif %1 :';
      const parts = msg.split(/%1/);
      this.appendDummyInput().appendField(parts[0]);
      this.appendValueInput('iftext').setCheck(null);
      this.appendDummyInput().appendField(parts[1]);
      this.appendStatementInput('ifstate');
      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setStyle('logic_blocks');
    }
  };

  Blocks['else'] = {
    init: function () {
      this.appendDummyInput().appendField(Blockly.Msg['ELSE'] || 'else:');
      this.appendStatementInput('DO');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setStyle('logic_blocks');
    }
  };

  Blocks['try'] = {
    init: function () {
      this.appendDummyInput()
        .appendField(Blockly.Msg['TRY'] || 'try:');
      this.appendStatementInput('DO')
        .appendField('');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setStyle('logic_blocks');
      this.setTooltip('Else statement');
      this.setHelpUrl('');
    },
  };

  Blocks['except'] = {
    init: function () {
      // "except %1 :"
      const msg = Blockly.Msg['EXCEPT'] || 'except %1 :';
      const parts = msg.split(/%1/);
      this.appendDummyInput()
        .appendField(parts[0]);
      this.appendValueInput("iftext")
        .setCheck("Boolean");
      this.appendDummyInput()
        .appendField(parts[1]);
      this.appendStatementInput('ifstate')
        .setCheck(null);
      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setStyle('logic_blocks');
      this.setTooltip('Except');
      this.setHelpUrl('');
    },
  };

  Blocks['for'] = {
    init: function () {
      // "for %1 in range(%2):"
      const msg = Blockly.Msg['FOR_RANGE'] || 'for %1 in range(%2):';
      // Approximate splitting for this specific pattern
      // We expect format: [pre] %1 [mid] %2 [post]
      // Simple Split might not work well if %1 and %2 order is swapped, 
      // but for now let's assume standard order or just split by %1 first

      const parts1 = msg.split(/%1/);
      const pre = parts1[0];
      const rest = parts1[1];
      const parts2 = rest.split(/%2/);
      const mid = parts2[0];
      const post = parts2[1];

      this.appendDummyInput().appendField(pre);
      this.appendValueInput('letter').setCheck(null);
      this.appendDummyInput().appendField(mid);
      this.appendValueInput('no').setCheck(null);
      this.appendDummyInput().appendField(post);
      this.appendStatementInput('DO');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setStyle('loop_blocks');
    }
  };

  Blocks['advancedforloops'] = {
    init: function () {
      // "for %1 in %2 :"
      const msg = Blockly.Msg['FOR_ADV'] || 'for %1 in %2 :';
      const parts1 = msg.split(/%1/);
      const pre = parts1[0];
      const rest = parts1[1];
      const parts2 = rest.split(/%2/);
      const mid = parts2[0];
      const post = parts2[1];

      this.appendDummyInput()
        .appendField(pre);
      this.appendValueInput('x')
        .setCheck(null);
      this.appendDummyInput()
        .appendField(mid);
      this.appendValueInput('y')
        .setCheck(null);
      this.appendDummyInput()
        .appendField(post);
      this.appendStatementInput('DO')
        .setCheck(null);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setStyle('loop_blocks');
      this.setTooltip('');
      this.setHelpUrl('');
    },
  };

  // --- 3. 함수 및 클래스 ---
  Blocks['define'] = {
    init: function () {
      // "def %1 (%2):"
      const msg = Blockly.Msg['DEF_FUNC'] || 'def %1 (%2):';
      const parts1 = msg.split(/%1/);
      const pre = parts1[0];
      const rest = parts1[1];
      const parts2 = rest.split(/%2/);
      const mid = parts2[0];
      const post = parts2[1];

      this.appendDummyInput().appendField(pre);
      this.appendValueInput('1').setCheck(null); // 함수명
      this.appendDummyInput().appendField(mid);
      this.appendValueInput('2').setCheck(null); // 매개변수
      this.appendDummyInput().appendField(post);
      this.appendStatementInput('DO');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setStyle('procedure_blocks');
    }
  };

  Blocks['return2'] = {
    init: function () {
      // "return %1"
      const msg = Blockly.Msg['RETURN'] || 'return %1';
      const parts = msg.split(/%1/);
      this.appendDummyInput().appendField(parts[0]);
      this.appendValueInput('return').setCheck(null);
      this.appendDummyInput().appendField(parts[1]);
      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setStyle('procedure_blocks');
    }
  };

  Blocks['class'] = {
    init: function () {
      // "class %1 :"
      const msg = Blockly.Msg['CLASS'] || 'class %1 :';
      const parts = msg.split(/%1/);
      this.appendDummyInput()
        .appendField(parts[0]);
      this.appendValueInput("class")
        .setCheck(null)
      this.appendDummyInput()
        .appendField(parts[1]);
      this.appendStatementInput('DO')
        .appendField('');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setStyle('procedure_blocks');
      this.setTooltip('Class Statement.');
      this.setHelpUrl('');
    },
  };

  // 함수 호출 (Call a defined function)
  Blocks['df'] = {
    init: function () {
      this.appendValueInput("def")
        .setCheck(null);
      this.appendDummyInput()
        .appendField('(');
      this.appendValueInput("params")
        .setCheck(null);
      this.appendDummyInput()
        .appendField(')');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setInputsInline(true);
      this.setStyle('procedure_blocks');
      this.setTooltip('이미 정의된 함수를 호출합니다.');
    },
  };

  Blocks['with'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('with');
      this.appendValueInput("iftext")
        .setCheck(null);
      this.appendDummyInput()
        .appendField('as');
      this.appendValueInput("iftext2")
        .setCheck(null);
      this.appendDummyInput()
        .appendField(':');
      this.appendStatementInput('ifstate')
        .setCheck(null);
      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setStyle('basic_blocks');
      this.setTooltip('With block');
      this.setHelpUrl('');
    },
  };

  // --- 4. 연산 및 인라인 블록 (중요!) ---
  Blocks['internal'] = {
    init: function () {
      const OPS = [['==', '=='], ['!=', '!='], ['<', '<'], ['<=', '<='], ['>', '>'], ['>=', '>=']] as const;
      this.appendValueInput("first").setCheck(null);
      this.appendDummyInput().appendField(new Blockly.FieldDropdown(OPS as any), "choose");
      this.appendValueInput("last").setCheck(null);
      this.setInputsInline(true);
      this.setOutput(true, null);
      this.setStyle('math_blocks');
    }
  };

  Blocks['andor'] = {
    init: function () {
      const OPS = [["and", "and"], ["or", "or"]] as const;
      this.appendValueInput("first").setCheck(null);
      this.appendDummyInput().appendField(new Blockly.FieldDropdown(OPS as any), "choose");
      this.appendValueInput("last").setCheck(null);
      this.setInputsInline(true);
      this.setOutput(true, null);
      this.setStyle('logic_blocks');
    }
  };

  Blocks['not'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('not');
      this.appendValueInput("bool")
        .setCheck(null);
      this.setInputsInline(true);
      this.setOutput(true, null);
      this.setStyle('logic_blocks');
      this.setTooltip('negates a Boolean value');
      this.setHelpUrl('http://www.example.com/');
    },
  };

  Blocks['textinline'] = {
    init: function () {
      this.appendDummyInput().appendField(new Blockly.FieldTextInput(""), "text");
      this.setOutput(true, null);
      this.setColour(white);
    }
  };

  Blocks['stringinline'] = {
    init: function () {
      this.appendDummyInput()
        .appendField(new Blockly.FieldTextInput(""), "text");
      this.setInputsInline(true);
      this.setOutput(true, null);
      this.setColour("#FFFFFF", "#FFFFFF", "#FFFFFF");
      this.setTooltip("String input for inline input");
      this.setHelpUrl("");
    }
  };

  Blocks['typeanything'] = {
    init: function () {
      this.appendValueInput("stuff").setCheck(null);
      this.appendDummyInput().appendField("# your own code");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setStyle('basic_blocks');
    }
  };

  // --- 5. 변수 관련 ---
  Blocks['variables_get'] = {
    init: function () {
      this.appendDummyInput().appendField(new Blockly.FieldVariable("var"), "VAR");
      this.setOutput(true, null);
      this.setStyle('variable_blocks');
    }
  };

  Blocks['variables_set'] = {
    init: function () {
      this.appendDummyInput()
        .appendField(new Blockly.FieldVariable("var"), "VAR")
        .appendField(" = ");
      this.appendValueInput("varset").setCheck(null);
      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setStyle('variable_blocks');
    }
  };

  Blocks['varinlines'] = {
    init: function () {
      this.appendDummyInput()
        .appendField(new Blockly.FieldVariable("variable"), "var")
        .appendField(new Blockly.FieldDropdown([['=', '='], ['+=', '+='], ["-=", "-="]]), 'NAME')
      this.appendValueInput("value")
        .setCheck(null);
      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setStyle('variable_blocks');
      this.setTooltip("assign a value, increment, or decrement a variable");
      this.setHelpUrl("");
    }
  };

  Blocks['boolstatus'] = {
    init: function () {
      this.appendDummyInput()
        .appendField(new Blockly.FieldDropdown([
          ["True", "True"],
          ["False", "False"]
        ]), "bool");
      this.setOutput(true, "Boolean");
      this.setStyle('logic_blocks');
      this.setTooltip("");
      this.setHelpUrl("");
    }
  };

  Blocks['buttonapressed'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('button_')
        .appendField(new Blockly.FieldDropdown([['a', 'a'], ['b', 'b']]), 'NAME')
        .appendField('.is_pressed()');
      this.setInputsInline(false);
      this.setOutput(true, null);
      this.setStyle('basic_blocks');
      this.setTooltip('Button A Pressed');
      this.setHelpUrl('');
    },
  };

  // --- 6. 기타 필수 블록 ---
  Blocks['varprint'] = {
    init: function () {
      // "print(%1)"
      const msg = Blockly.Msg['PRINT'] || 'print(%1)';
      const parts = msg.split(/%1/);
      this.appendDummyInput().appendField(parts[0]);
      this.appendValueInput('var').setCheck(null);
      this.appendDummyInput().appendField(parts[1]);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setStyle('basic_blocks');
    }
  };

  Blocks['printnew'] = {
    init: function () {
      // "print("%1")"
      const msg = Blockly.Msg['PRINT_TEXT'] || 'print("%1")';
      const parts = msg.split(/%1/);
      this.appendDummyInput()
        .appendField(parts[0])
      this.appendValueInput("text")
        .setCheck(null);
      this.appendDummyInput()
        .appendField(parts[1]);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setStyle('basic_blocks');
      this.setTooltip('Use this to print a string to the output box.');
      this.setHelpUrl('');
    },
  };

  Blocks['base_delay'] = {
    init: function () {
      const waitSecondsMsg = Blockly.Msg['WAIT_SECONDS'] || '기다리기 %1 초';
      const tpWaitSecondsMsg = Blockly.Msg['TP_WAIT_SECONDS'] || '지정된 시간만큼 대기합니다.';

      this.appendDummyInput()
        .appendField(waitSecondsMsg.split('%1')[0] || '')
        .appendField(new Blockly.FieldNumber(1, 0, undefined, 0.1), "SEC")
        .appendField(waitSecondsMsg.split('%1')[1] || '');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setStyle('basic_blocks');
      this.setTooltip(tpWaitSecondsMsg);
      this.setHelpUrl('');
    },
  };
}