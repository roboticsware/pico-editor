import * as Blockly from 'blockly';

export default function defineGenerators(P: any) {
  // 내장 LED 제어 로직
  P.forBlock['picozero_led'] = (block: Blockly.Block) => {
    const action = block.getFieldValue('ACTION');
    return `esp_led.${action}()\n`;
  };

  // 임포트 로직
  P.forBlock['import_picozero'] = () => {
    return 'import espzero\ntry:\n    espzero.begin()\nexcept:\n    pass\nfrom espzero import esp_led\n';
  };
}