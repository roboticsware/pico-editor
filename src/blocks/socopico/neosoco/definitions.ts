import * as Blockly from 'blockly';

export default function define(Blocks: any) {
    const maincolour = "#9C27B0"; // Hardware category color (Purple)

    // --- Import Block ---
    Blocks['neosoco_import'] = {
        init: function () {
            this.appendDummyInput()
                .appendField("import neosoco");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(maincolour);
            this.setTooltip("Import the NeoSoCo library");
        }
    };

    // --- LED Blocks ---
    Blocks['neosoco_led_on'] = {
        init: function () {
            this.appendDummyInput()
                .appendField("neosoco.led_on(");
            this.appendDummyInput()
                .appendField(new Blockly.FieldDropdown([
                    ["'out1'", "'out1'"], ["'out2'", "'out2'"], ["'out3'", "'out3'"]
                ]), "PORT");
            this.appendDummyInput()
                .appendField(",");
            this.appendValueInput("BRIGHTNESS")
                .setCheck(["Number", "String"]); // Accept standard number block or variables
            this.appendDummyInput()
                .appendField(")");

            this.setInputsInline(true); // EduBlocks style
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(maincolour);
            this.setTooltip("Turn on LED with brightness (0-100)");
        }
    };

    Blocks['neosoco_led_off'] = {
        init: function () {
            this.appendDummyInput()
                .appendField("neosoco.led_off(");
            this.appendDummyInput()
                .appendField(new Blockly.FieldDropdown([
                    ["'out1'", "'out1'"], ["'out2'", "'out2'"], ["'out3'", "'out3'"]
                ]), "PORT");
            this.appendDummyInput()
                .appendField(")");

            this.setInputsInline(true);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(maincolour);
            this.setTooltip("Turn off LED");
        }
    };

    Blocks['neosoco_led_close'] = {
        init: function () {
            this.appendDummyInput()
                .appendField("neosoco.led_close(");
            this.appendDummyInput()
                .appendField(new Blockly.FieldDropdown([
                    ["'out1'", "'out1'"], ["'out2'", "'out2'"], ["'out3'", "'out3'"]
                ]), "PORT");
            this.appendDummyInput()
                .appendField(")");

            this.setInputsInline(true);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(maincolour);
            this.setTooltip("Close LED resource");
        }
    };

    // --- Input/Output Blocks ---
    Blocks['neosoco_get_value'] = {
        init: function () {
            this.appendDummyInput()
                .appendField("neosoco.get_value(");
            this.appendDummyInput()
                .appendField(new Blockly.FieldDropdown([
                    ["'in1'", "'in1'"], ["'in2'", "'in2'"], ["'in3'", "'in3'"]
                ]), "PORT");
            this.appendDummyInput()
                .appendField(")");

            this.setInputsInline(true);
            this.setOutput(true, "Number");
            this.setColour(maincolour);
            this.setTooltip("Get sensor value (0-255)");
        }
    };

    Blocks['neosoco_set_value'] = {
        init: function () {
            this.appendDummyInput()
                .appendField("neosoco.set_value(");
            this.appendDummyInput()
                .appendField(new Blockly.FieldDropdown([
                    ["'out1'", "'out1'"], ["'out2'", "'out2'"], ["'out3'", "'out3'"]
                ]), "PORT");
            this.appendDummyInput()
                .appendField(",");
            this.appendValueInput("VALUE")
                .setCheck("Number");
            this.appendDummyInput()
                .appendField(")");

            this.setInputsInline(true);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(maincolour);
            this.setTooltip("Set value to OUT port (0-255)");
        }
    };

    Blocks['neosoco_convert_scale'] = {
        init: function () {
            this.appendDummyInput()
                .appendField("neosoco.convert_scale(");
            this.appendValueInput("VALUE")
                .setCheck("Number");
            this.appendDummyInput()
                .appendField(",");
            this.appendValueInput("IN_MIN")
                .setCheck("Number");
            this.appendDummyInput()
                .appendField(",");
            this.appendValueInput("IN_MAX")
                .setCheck("Number");
            this.appendDummyInput()
                .appendField(",");
            this.appendValueInput("OUT_MIN")
                .setCheck("Number");
            this.appendDummyInput()
                .appendField(",");
            this.appendValueInput("OUT_MAX")
                .setCheck("Number");
            this.appendDummyInput()
                .appendField(")");

            this.setInputsInline(true);
            this.setOutput(true, "Number");
            this.setColour(maincolour);
            this.setTooltip("Map a value from one range to another");
        }
    };

    // --- Motor Blocks ---
    Blocks['neosoco_motor_move'] = {
        init: function () {
            this.appendDummyInput()
                .appendField("neosoco.motor_move(");
            this.appendDummyInput()
                .appendField(new Blockly.FieldDropdown([
                    ["'forward'", "'forward'"],
                    ["'backward'", "'backward'"],
                    ["'left'", "'left'"],
                    ["'right'", "'right'"],
                    ["'stop'", "'stop'"]
                ]), "DIRECTION");
            this.appendDummyInput()
                .appendField(")");

            this.setInputsInline(true);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(maincolour);
            this.setTooltip("Move robot in direction");
        }
    };

    Blocks['neosoco_motor_stop'] = {
        init: function () {
            this.appendDummyInput()
                .appendField("neosoco.motor_stop(");
            this.appendDummyInput()
                .appendField(new Blockly.FieldDropdown([
                    ["'both'", "'both'"], ["'left'", "'left'"], ["'right'", "'right'"]
                ]), "MOTOR");
            this.appendDummyInput()
                .appendField(")");

            this.setInputsInline(true);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(maincolour);
            this.setTooltip("Stop specific motors");
        }
    };

    Blocks['neosoco_motor_rotate'] = {
        init: function () {
            this.appendDummyInput()
                .appendField("neosoco.motor_rotate(");
            this.appendDummyInput()
                .appendField(new Blockly.FieldDropdown([
                    ["'both'", "'both'"], ["'left'", "'left'"], ["'right'", "'right'"]
                ]), "MOTOR");
            this.appendDummyInput()
                .appendField(",");
            this.appendDummyInput()
                .appendField(new Blockly.FieldDropdown([
                    ["'forward'", "'forward'"], ["'backward'", "'backward'"]
                ]), "DIRECTION");
            this.appendDummyInput()
                .appendField(",");
            this.appendValueInput("SPEED")
                .setCheck("Number");
            this.appendDummyInput()
                .appendField(")");

            this.setInputsInline(true);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(maincolour);
            this.setTooltip("Rotate motor with specific speed");
        }
    };


    // --- Servo Blocks ---
    Blocks['neosoco_servo_rotate_by_degree'] = {
        init: function () {
            this.appendDummyInput()
                .appendField("neosoco.servo_rotate_by_degree(");
            this.appendDummyInput()
                .appendField(new Blockly.FieldDropdown([
                    ["'out1'", "'out1'"], ["'out2'", "'out2'"], ["'out3'", "'out3'"]
                ]), "PORT");
            this.appendDummyInput()
                .appendField(",");
            this.appendValueInput("DEGREE")
                .setCheck("Number");
            this.appendDummyInput()
                .appendField(")");

            this.setInputsInline(true);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(maincolour);
            this.setTooltip("Rotate servo to degree (0-180)");
        }
    };

    // --- General ---
    Blocks['neosoco_sleep'] = {
        init: function () {
            this.appendDummyInput()
                .appendField("neosoco.sleep(");
            this.appendValueInput("SECONDS")
                .setCheck("Number");
            this.appendDummyInput()
                .appendField(")");
            this.setInputsInline(true);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(maincolour);
            this.setTooltip("Sleep for N seconds");
        }
    };

    // --- Color LED ---
    Blocks['neosoco_color_led_set'] = {
        init: function () {
            this.appendDummyInput()
                .appendField("neosoco.color_led_set(");
            this.appendDummyInput()
                .appendField(new Blockly.FieldDropdown([
                    ["'out1'", "'out1'"], ["'out2'", "'out2'"], ["'out3'", "'out3'"]
                ]), "PORT");
            this.appendDummyInput()
                .appendField(",");
            this.appendValueInput("NUM")
                .setCheck("Number");
            this.appendDummyInput()
                .appendField(",");
            this.appendValueInput("R")
                .setCheck("Number");
            this.appendDummyInput()
                .appendField(",");
            this.appendValueInput("G")
                .setCheck("Number");
            this.appendDummyInput()
                .appendField(",");
            this.appendValueInput("B")
                .setCheck("Number");
            this.appendDummyInput()
                .appendField(")");
            this.setInputsInline(true);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(maincolour);
            this.setTooltip("Set Color LED");
        }
    };

    Blocks['neosoco_color_led_clear'] = {
        init: function () {
            this.appendDummyInput()
                .appendField("neosoco.color_led_clear(");
            this.appendDummyInput()
                .appendField(new Blockly.FieldDropdown([
                    ["'out1'", "'out1'"], ["'out2'", "'out2'"], ["'out3'", "'out3'"]
                ]), "PORT");
            this.appendDummyInput()
                .appendField(")");
            this.setInputsInline(true);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(maincolour);
            this.setTooltip("Clear Color LED");
        }
    };

    // --- Remote Controller ---
    Blocks['neosoco_remote_get_code'] = {
        init: function () {
            this.appendDummyInput()
                .appendField("neosoco.remote_get_code(");
            this.appendDummyInput()
                .appendField(new Blockly.FieldDropdown([
                    ["'in1'", "'in1'"], ["'in2'", "'in2'"], ["'in3'", "'in3'"]
                ]), "PORT");
            this.appendDummyInput()
                .appendField(")");
            this.setInputsInline(true);
            this.setOutput(true, "Number");
            this.setColour(maincolour);
            this.setTooltip("Get IR Remote Code");
        }
    };


    // --- Buzzer Blocks ---
    Blocks['neosoco_buzzer_on'] = {
        init: function () {
            this.appendDummyInput()
                .appendField("neosoco.buzzer_on(");
            this.appendDummyInput()
                .appendField(new Blockly.FieldDropdown([
                    ["'out1'", "'out1'"], ["'out2'", "'out2'"], ["'out3'", "'out3'"]
                ]), "PORT");
            this.appendDummyInput()
                .appendField(",");
            this.appendValueInput("NOTE")
                .setCheck(["Number", "String"]);
            this.appendDummyInput()
                .appendField(",");
            this.appendValueInput("DURATION")
                .setCheck("Number");
            this.appendDummyInput()
                .appendField(")");
            this.setInputsInline(true);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(maincolour); // Use maincolour from scope
            this.setTooltip("Play tone");
        }
    };

    Blocks['neosoco_buzzer_off'] = {
        init: function () {
            this.appendDummyInput()
                .appendField("neosoco.buzzer_off(");
            this.appendDummyInput()
                .appendField(new Blockly.FieldDropdown([
                    ["'out1'", "'out1'"], ["'out2'", "'out2'"], ["'out3'", "'out3'"]
                ]), "PORT");
            this.appendDummyInput()
                .appendField(")");
            this.setInputsInline(true);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(maincolour);
            this.setTooltip("Stop buzzer");
        }
    };

}
