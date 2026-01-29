import * as Blockly from 'blockly';

export default function defineGenerators(P: any) {
    // --- Import Block ---
    P.forBlock['neosoco_import'] = () => {
        return 'import neosoco\n';
    };

    // --- LED Blocks ---
    P.forBlock['neosoco_led_on'] = (block: Blockly.Block) => {
        const port = block.getFieldValue('PORT');
        const brightness = P.valueToCode(block, 'BRIGHTNESS', P.ORDER_NONE) || '100';
        return `neosoco.led_on(${port}, ${brightness})\n`;
    };

    P.forBlock['neosoco_led_off'] = (block: Blockly.Block) => {
        const port = block.getFieldValue('PORT');
        return `neosoco.led_off(${port})\n`;
    };

    P.forBlock['neosoco_led_close'] = (block: Blockly.Block) => {
        const port = block.getFieldValue('PORT');
        return `neosoco.led_close(${port})\n`;
    };

    // --- Input/Output Blocks ---
    P.forBlock['neosoco_get_value'] = (block: Blockly.Block) => {
        const port = block.getFieldValue('PORT');
        return [`neosoco.get_value(${port})`, P.ORDER_FUNCTION_CALL];
    };

    // --- Motor Blocks ---
    P.forBlock['neosoco_motor_move'] = (block: Blockly.Block) => {
        const direction = block.getFieldValue('DIRECTION');
        return `neosoco.motor_move(${direction})\n`;
    };

    P.forBlock['neosoco_motor_stop'] = (block: Blockly.Block) => {
        const motor = block.getFieldValue('MOTOR');
        return `neosoco.motor_stop(${motor})\n`;
    };

    P.forBlock['neosoco_motor_rotate'] = (block: Blockly.Block) => {
        const motor = block.getFieldValue('MOTOR');
        const direction = block.getFieldValue('DIRECTION');
        const speed = P.valueToCode(block, 'SPEED', P.ORDER_NONE) || '50';
        return `neosoco.motor_rotate(${motor}, ${direction}, ${speed})\n`;
    };

    // --- Servo Blocks ---
    P.forBlock['neosoco_servo_rotate_by_degree'] = (block: Blockly.Block) => {
        const port = block.getFieldValue('PORT');
        const degree = P.valueToCode(block, 'DEGREE', P.ORDER_NONE) || '90';
        return `neosoco.servo_rotate_by_degree(${port}, ${degree})\n`;
    };
}
