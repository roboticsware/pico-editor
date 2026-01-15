import * as Blockly from 'blockly';

export default function defineGenerators(P: any) {
  // 내장 LED 제어 로직
  P.forBlock['picozero_led'] = (block: Blockly.Block) => {
    const action = block.getFieldValue('ACTION');
    return `pico_led.${action}()\n`;
  };

  // 임포트 로직
  P.forBlock['import_picozero'] = () => {
    return 'from picozero import pico_led\n';
  };
}