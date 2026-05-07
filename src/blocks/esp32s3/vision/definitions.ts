export default function defineBlocks(Blocks: any) {
  Blocks['vision_start_pc_stream'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("%{BKY_START_PC_STREAM}");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(230);
      this.setTooltip("%{BKY_TT_START_PC_STREAM}");
      this.setHelpUrl("");
    }
  };

  Blocks['vision_get_pc_hand_x'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("%{BKY_GET_PC_HAND_X}");
      this.setOutput(true, "Number");
      this.setColour(230);
      this.setTooltip("%{BKY_TT_GET_PC_HAND}");
      this.setHelpUrl("");
    }
  };

  Blocks['vision_get_pc_hand_y'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("%{BKY_GET_PC_HAND_Y}");
      this.setOutput(true, "Number");
      this.setColour(230);
      this.setTooltip("%{BKY_TT_GET_PC_HAND}");
      this.setHelpUrl("");
    }
  };

  // Device-side AI blocks
  Blocks['vision_load_tflite'] = {
    init: function() {
      this.appendValueInput("MODEL_NAME")
          .setCheck("String")
          .appendField("%{BKY_LOAD_TFLITE}");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(230);
      this.setTooltip("");
      this.setHelpUrl("");
    }
  };

  Blocks['vision_run_inference'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("%{BKY_RUN_INFERENCE}");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(230);
      this.setTooltip("");
      this.setHelpUrl("");
    }
  };

  Blocks['vision_get_inference_result'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("%{BKY_GET_INFERENCE_RESULT}");
      this.setOutput(true, "Number");
      this.setColour(230);
      this.setTooltip("");
      this.setHelpUrl("");
    }
  };
}
