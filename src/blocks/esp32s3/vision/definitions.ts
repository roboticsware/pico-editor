import * as Blockly from 'blockly';

export default function defineBlocks(Blocks: any) {

  // ── PC Vision: Hand tracking ──────────────────────────────────
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

  // ── PC Vision: Line Tracker (pixel analysis in editor) ────────
  Blocks['vision_track_start'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("%{BKY_TRACK_START}");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(160);
      this.setTooltip("%{BKY_TT_TRACK_START}");
      this.setHelpUrl("");
    }
  };

  Blocks['vision_track_direction'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("%{BKY_TRACK_DIRECTION}");
      this.setOutput(true, "String");
      this.setColour(160);
      this.setTooltip("%{BKY_TT_TRACK_DIRECTION}");
      this.setHelpUrl("");
    }
  };

  Blocks['vision_track_direction_is'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("%{BKY_TRACK_DIRECTION_IS}")
          .appendField(new Blockly.FieldDropdown([
            ["%{BKY_TRACK_DIR_LEFT}",   "LEFT"],
            ["%{BKY_TRACK_DIR_CENTER}", "CENTER"],
            ["%{BKY_TRACK_DIR_RIGHT}",  "RIGHT"],
            ["%{BKY_TRACK_DIR_NONE}",   "NONE"]
          ] as any), "DIR");
      this.setOutput(true, "Boolean");
      this.setColour(160);
      this.setTooltip("%{BKY_TT_TRACK_DIRECTION_IS}");
      this.setHelpUrl("");
    }
  };

  Blocks['vision_track_raw_count'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("%{BKY_TRACK_RAW_COUNT}")
          .appendField(new Blockly.FieldDropdown([
            ["%{BKY_TRACK_DIR_LEFT}",   "l"],
            ["%{BKY_TRACK_DIR_CENTER}", "c"],
            ["%{BKY_TRACK_DIR_RIGHT}",  "r"]
          ] as any), "REGION");
      this.setOutput(true, "Number");
      this.setColour(160);
      this.setTooltip("%{BKY_TT_TRACK_RAW_COUNT}");
      this.setHelpUrl("");
    }
  };

  // ── Device Vision: TFLite inference ───────────────────────────
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

  Blocks['vision_is_hand_in_zone'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("%{BKY_IS_HAND_IN_ZONE}")
          .appendField(new Blockly.FieldDropdown([
            ["%{BKY_ZONE_LEFT}", "LEFT"],
            ["%{BKY_ZONE_CENTER}", "CENTER"],
            ["%{BKY_ZONE_RIGHT}", "RIGHT"],
            ["%{BKY_ZONE_TOP}", "TOP"],
            ["%{BKY_ZONE_BOTTOM}", "BOTTOM"]
          ] as any), "ZONE");
      this.setOutput(true, "Boolean");
      this.setColour(230);
      this.setTooltip("%{BKY_TT_IS_HAND_IN_ZONE}");
      this.setHelpUrl("");
    }
  };

  Blocks['vision_is_detected_class_equal'] = {
    init: function() {
      this.appendValueInput("CLASS_ID")
          .setCheck("Number")
          .appendField("%{BKY_IS_DETECTED_CLASS_EQUAL}");
      this.setOutput(true, "Boolean");
      this.setColour(230);
      this.setTooltip("%{BKY_TT_IS_DETECTED_CLASS_EQUAL}");
      this.setHelpUrl("");
    }
  };

  Blocks['vision_get_class_name_by_index'] = {
    init: function() {
      this.appendValueInput("CLASS_ID")
          .setCheck("Number")
          .appendField("%{BKY_GET_CLASS_NAME_BY_INDEX}");
      this.appendValueInput("LABELS")
          .setCheck("String")
          .appendField("%{BKY_GET_CLASS_NAME_LIST}");
      this.setOutput(true, "String");
      this.setColour(230);
      this.setTooltip("%{BKY_TT_GET_CLASS_NAME_BY_INDEX}");
      this.setHelpUrl("");
    }
  };
}
