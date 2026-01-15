import * as Blockly from 'blockly';

export default function define(Blocks: any) {
  const maincolour = "#ff0066";
  const white = "#FFFFFF";

  // --- 1. 기초 및 라이브러리 임포트 블록 ---
  const simpleBlocks = [
    { id: 'import_time', text: 'import time', tooltip: 'Imports the time library.' },
    { id: 'import_math', text: 'import math', tooltip: 'Imports the math library.' },
    { id: 'random', text: 'import random', tooltip: 'Imports the random library.' },
    { id: 'pass', text: 'pass', tooltip: 'Pass to the next command' },
    { id: 'break', text: 'break', tooltip: 'breaks out of a loop' }
  ];

  simpleBlocks.forEach(b => {
    Blocks[b.id] = {
      init: function() {
        this.appendDummyInput().appendField(b.text);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(maincolour);
        this.setTooltip(b.tooltip);
      }
    };
  });

  // --- 2. 제어문 (Loops & Logic) ---
  Blocks['while_true'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('while True:');
      this.appendStatementInput('DO')
        .appendField('');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(maincolour);
      this.setTooltip('Forever loop.');
      this.setHelpUrl('https://t.co/PCZC5EFe4D');
    },
  };

  Blocks['whileout'] = {
    init: function() {
      this.appendDummyInput().appendField('while');
      this.appendValueInput("cond").setCheck("Boolean");
      this.appendDummyInput().appendField(':');
      this.appendStatementInput('DO');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(maincolour);
    }
  };

  Blocks['ifinline'] = {
    init: function() {
      this.appendDummyInput().appendField('if');
      this.appendValueInput("iftext").setCheck("Boolean");
      this.appendDummyInput().appendField(':');
      this.appendStatementInput('ifstate');
      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(maincolour);
    }
  };

  Blocks['elifinline'] = {
    init: function() {
      this.appendDummyInput().appendField('elif');
      this.appendValueInput('iftext').setCheck(null);
      this.appendDummyInput().appendField(':');
      this.appendStatementInput('ifstate');
      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(maincolour);
    }
  };

  Blocks['else'] = {
    init: function() {
      this.appendDummyInput().appendField('else:');
      this.appendStatementInput('DO');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(maincolour);
    }
  };

  Blocks['try'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('try:');
      this.appendStatementInput('DO')
        .appendField('');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(maincolour);
      this.setTooltip('Else statement');
      this.setHelpUrl('');
    },
  };

  Blocks['except'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('except');
      this.appendValueInput("iftext")
        .setCheck("Boolean");
      this.appendDummyInput()
        .appendField(':');
      this.appendStatementInput('ifstate')
        .setCheck(null);
      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(maincolour);
      this.setTooltip('Except');
      this.setHelpUrl('');
    },
  };

  Blocks['for'] = {
    init: function() {
      this.appendDummyInput().appendField('for');
      this.appendValueInput('letter').setCheck(null);
      this.appendDummyInput().appendField('in range(');
      this.appendValueInput('no').setCheck(null);
      this.appendDummyInput().appendField('):');
      this.appendStatementInput('DO');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(maincolour);
    }
  };

  Blocks['advancedforloops'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('for');
      this.appendValueInput('x')
        .setCheck(null);
      this.appendDummyInput()
        .appendField('in');
      this.appendValueInput('y')
        .setCheck(null);
      this.appendDummyInput()
        .appendField(":");
      this.appendStatementInput('DO')
        .setCheck(null);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(maincolour);
      this.setTooltip('');
      this.setHelpUrl('');
    },
  };

  // --- 3. 함수 및 클래스 ---
  Blocks['define'] = {
    init: function() {
      this.appendDummyInput().appendField('def ');
      this.appendValueInput('1').setCheck(null); // 함수명
      this.appendDummyInput().appendField('(');
      this.appendValueInput('2').setCheck(null); // 매개변수
      this.appendDummyInput().appendField('):');
      this.appendStatementInput('DO');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(maincolour);
    }
  };

  Blocks['return2'] = {
    init: function() {
      this.appendDummyInput().appendField('return');
      this.appendValueInput('return').setCheck(null);
      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(maincolour);
    }
  };

  Blocks['class'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('class')
      this.appendValueInput("class")
        .setCheck(null)
      this.appendDummyInput()
        .appendField(':');
      this.appendStatementInput('DO')
        .appendField('');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(maincolour);
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
      this.setColour(maincolour);
      this.setTooltip('이미 정의된 함수를 호출합니다.');
    },
  };

  Blocks['with'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('with');
      this.appendValueInput("iftext")
        .setCheck("null");
      this.appendDummyInput()
        .appendField('as');
      this.appendValueInput("iftext2")
        .setCheck("null");
      this.appendDummyInput()
        .appendField(':');
      this.appendStatementInput('ifstate')
        .setCheck(null);
      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(maincolour);
      this.setTooltip('With block');
      this.setHelpUrl('');
    },
  };

  // --- 4. 연산 및 인라인 블록 (중요!) ---
  Blocks['internal'] = {
    init: function() {
      const OPS = [['==', '=='], ['!=', '!='], ['<', '<'], ['<=', '<='], ['>', '>'], ['>=', '>=']] as const;
      this.appendValueInput("first").setCheck(null);
      this.appendDummyInput().appendField(new Blockly.FieldDropdown(OPS as any), "choose");
      this.appendValueInput("last").setCheck(null);
      this.setInputsInline(true);
      this.setOutput(true, null);
      this.setColour(maincolour);
      if (this.setOutputShape) this.setOutputShape(2);
    }
  };

  Blocks['andor'] = {
    init: function() {
      const OPS = [["and", "and"], ["or", "or"]] as const;
      this.appendValueInput("first").setCheck(null);
      this.appendDummyInput().appendField(new Blockly.FieldDropdown(OPS as any), "choose");
      this.appendValueInput("last").setCheck(null);
      this.setInputsInline(true);
      this.setOutput(true, null);
      this.setColour(maincolour);
      if (this.setOutputShape) this.setOutputShape(2);
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
      this.setColour(maincolour);
      // this.setOutputShape(Blockly.OUTPUT_SHAPE_ROUND);
      this.setTooltip('negates a Boolean value');
      this.setHelpUrl('http://www.example.com/');
    },
  };

  Blocks['textinline'] = {
    init: function() {
      this.appendDummyInput().appendField(new Blockly.FieldTextInput(""), "text");
      this.setOutput(true, null);
      this.setColour(white);
      if (this.setOutputShape) this.setOutputShape(2);
    }
  };

  Blocks['stringinline'] = {
    init: function() {
      this.appendDummyInput()
        .appendField(new Blockly.FieldString(""), "text");
      this.setInputsInline(true);
      this.setOutput(true, null);
      this.setColour("#FFFFFF", "#FFFFFF", "#FFFFFF");
      this.setOutputShape(Blockly.OUTPUT_SHAPE_ROUND);
      this.setTooltip("String input for inline input");
      this.setHelpUrl("");
    }
  };

  Blocks['typeanything'] = {
    init: function() {
      this.appendValueInput("stuff").setCheck(null);
      this.appendDummyInput().appendField("# your own code");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(maincolour);
    }
  };

  // --- 5. 변수 관련 ---
  Blocks['variables_get'] = {
    init: function() {
      this.appendDummyInput().appendField(new Blockly.FieldVariable("var"), "VAR");
      this.setOutput(true, null);
      this.setColour(maincolour);
      if (this.setOutputShape) this.setOutputShape(2);
    }
  };

  Blocks['variables_set'] = {
    init: function() {
      this.appendDummyInput()
          .appendField(new Blockly.FieldVariable("var"), "VAR")
          .appendField(" = ");
      this.appendValueInput("varset").setCheck(null);
      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(maincolour);
    }
  };

  Blocks['varinlines'] = {
    init: function() {
      this.appendDummyInput()
        .appendField(new Blockly.FieldVariable("variable"), "var")
        .appendField(new Blockly.FieldDropdown([['=', '='], ['+=', '+='], ["-=", "-="]]), 'NAME')
      this.appendValueInput("value")
        .setCheck(null);
      this.setInputsInline(true);
      // this.setOutputShape(Blockly.OUTPUT_SHAPE_ROUND);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(maincolour);
      this.setTooltip("assign a value, increment, or decrement a variable");
      this.setHelpUrl("");
    }
  };

  Blocks['boolstatus'] = {
    init: function() {
      this.appendDummyInput()
        .appendField(new Blockly.FieldDropdown([
            ["True","True"], 
            ["False","False"]
        ]), "bool");
      this.setOutput(true, "Boolean");
      // this.setOutputShape(Blockly.OUTPUT_SHAPE_ROUND);
      this.setColour(maincolour);
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
      this.setColour(maincolour);
      this.setTooltip('Button A Pressed');
      this.setHelpUrl('');
    },
  };

  Blocks['varinlines'] = {
    init: function() {
      this.appendDummyInput()
        .appendField(new Blockly.FieldVariable("variable"), "var")
        .appendField(new Blockly.FieldDropdown([['=', '='], ['+=', '+='], ["-=", "-="]]), 'NAME')
      this.appendValueInput("value")
        .setCheck(null);
      this.setInputsInline(true);
      // this.setOutputShape(Blockly.OUTPUT_SHAPE_ROUND);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(maincolour);
      this.setTooltip("assign a value, increment, or decrement a variable");
      this.setHelpUrl("");
    }
  };

  // --- 6. 기타 필수 블록 ---
  Blocks['varprint'] = {
    init: function() {
      this.appendDummyInput().appendField('print(');
      this.appendValueInput('var').setCheck(null);
      this.appendDummyInput().appendField(')');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(maincolour);
    }
  };

  Blocks['printnew'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('print("')
      this.appendValueInput("text")
        .setCheck(null);
      this.appendDummyInput()
        .appendField('" )');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(maincolour);
      this.setTooltip('Use this to print a string to the output box.');
      this.setHelpUrl('');
    },
  };
}