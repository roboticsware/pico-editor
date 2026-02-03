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

    P.forBlock['neosoco_set_value'] = (block: Blockly.Block) => {
        const port = block.getFieldValue('PORT');
        const value = P.valueToCode(block, 'VALUE', P.ORDER_NONE) || '0';
        return `neosoco.set_value(${port}, ${value})\n`;
    };

    P.forBlock['neosoco_convert_scale'] = (block: Blockly.Block) => {
        const value = P.valueToCode(block, 'VALUE', P.ORDER_NONE) || '0';
        const in_min = P.valueToCode(block, 'IN_MIN', P.ORDER_NONE) || '0';
        const in_max = P.valueToCode(block, 'IN_MAX', P.ORDER_NONE) || '1023';
        const out_min = P.valueToCode(block, 'OUT_MIN', P.ORDER_NONE) || '0';
        const out_max = P.valueToCode(block, 'OUT_MAX', P.ORDER_NONE) || '255';
        return [`neosoco.convert_scale(${value}, ${in_min}, ${in_max}, ${out_min}, ${out_max})`, P.ORDER_FUNCTION_CALL];
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

    // --- General ---
    P.forBlock['neosoco_sleep'] = (block: Blockly.Block) => {
        const seconds = P.valueToCode(block, 'SECONDS', P.ORDER_NONE) || '0';
        return `neosoco.sleep_s(${seconds})\n`;
    };

    // --- Color LED ---
    P.forBlock['neosoco_color_led_set'] = (block: Blockly.Block) => {
        const port = block.getFieldValue('PORT');
        const num = P.valueToCode(block, 'NUM', P.ORDER_NONE) || '0';
        const r = P.valueToCode(block, 'R', P.ORDER_NONE) || '0';
        const g = P.valueToCode(block, 'G', P.ORDER_NONE) || '0';
        const b = P.valueToCode(block, 'B', P.ORDER_NONE) || '0';
        return `neosoco.color_led_set(${port}, ${num}, ${r}, ${g}, ${b})\n`;
    };

    P.forBlock['neosoco_color_led_clear'] = (block: Blockly.Block) => {
        const port = block.getFieldValue('PORT');
        return `neosoco.color_led_clear(${port})\n`;
    };

    // --- Remote Controller ---
    P.forBlock['neosoco_remote_get_code'] = (block: Blockly.Block) => {
        const port = block.getFieldValue('PORT');
        return [`neosoco.remote_get_code(${port})`, P.ORDER_FUNCTION_CALL];
    };

    // --- Buzzer Blocks ---
    P.forBlock['neosoco_buzzer_on'] = (block: Blockly.Block) => {
        const port = block.getFieldValue('PORT');
        const note = P.valueToCode(block, 'NOTE', P.ORDER_NONE) || "'C4'";
        const duration = P.valueToCode(block, 'DURATION', P.ORDER_NONE) || 'None';
        return `neosoco.buzzer_on(${port}, ${note}, ${duration})\n`;
    };

    P.forBlock['neosoco_buzzer_off'] = (block: Blockly.Block) => {
        const port = block.getFieldValue('PORT');
        return `neosoco.buzzer_off(${port})\n`;
    };
}
