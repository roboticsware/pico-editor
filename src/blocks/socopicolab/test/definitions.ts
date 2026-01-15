import * as Blockly from 'blockly';

export default function define(Blocks: any) {
  const maincolour = "#673AB7"; // picozero용 테마 색상

  Blocks['picozero_led'] = {
    init: function () {
      this.appendDummyInput()
        .appendField(Blockly.Msg['PICO_LED_TEXT']) // i18n 적용
        // FieldDropdown 값은 [Label, Value] 형식이며, Lable은 사용자에게 보여지는 UI텍스트, Value는 코드 생성 시 사용되는 값
        .appendField(new Blockly.FieldDropdown([ 
          [Blockly.Msg['PICO_LED_ON'], "on"],
          [Blockly.Msg['PICO_LED_OFF'], "off"],
          [Blockly.Msg['PICO_LED_BLINK'], "blink"]
        ] as any), "ACTION");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(maincolour);
      this.setTooltip(Blockly.Msg['TT_PICO_LED']);
    }
  };

  // picozero 임포트 블록
  Blocks['import_picozero'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("from picozero import pico_led");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(maincolour);
    }
  };
}