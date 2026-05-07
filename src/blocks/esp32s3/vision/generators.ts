export default function defineGenerators(pythonGenerator: any) {
  pythonGenerator.forBlock['vision_start_pc_stream'] = function(block: any) {
    pythonGenerator.definitions_['import_espzero_vision'] = 'from espzero import vision';
    return 'vision.start_stream_to_pc()\n';
  };

  // ── PC Vision: Track ──────────────────────────────────────────
  // vision_track_start: signals the editor to switch to track analysis mode
  pythonGenerator.forBlock['vision_track_start'] = function(block: any) {
    pythonGenerator.definitions_['import_espzero_vision'] = 'from espzero import vision';
    return 'vision.start_stream_to_pc()  # Track mode: editor analyzes frames\n';
  };

  pythonGenerator.forBlock['vision_track_direction'] = function(block: any) {
    const code = '(__pc_track_data.get("direction", "NONE") if "\\__pc_track_data" in globals() else "NONE")';
    return [code, pythonGenerator.ORDER_ATOMIC];
  };

  pythonGenerator.forBlock['vision_track_direction_is'] = function(block: any) {
    const dir = block.getFieldValue('DIR');
    const code = `(__pc_track_data.get("direction", "") == "${dir}" if "\\__pc_track_data" in globals() else False)`;
    return [code, pythonGenerator.ORDER_ATOMIC];
  };

  pythonGenerator.forBlock['vision_track_raw_count'] = function(block: any) {
    const region = block.getFieldValue('REGION'); // 'l', 'c', or 'r'
    const code = `(__pc_track_data.get("${region}", 0) if "\\__pc_track_data" in globals() else 0)`;
    return [code, pythonGenerator.ORDER_ATOMIC];
  };

  pythonGenerator.forBlock['vision_get_pc_hand_x'] = function(block: any) {
    // The ai-engine injects `__pc_ai_data = {"hand_x": 120, "hand_y": 50}` into the REPL
    const code = '__pc_ai_data.get("hand_x", 0) if "\\__pc_ai_data" in globals() else 0';
    return [code, pythonGenerator.ORDER_ATOMIC];
  };

  pythonGenerator.forBlock['vision_get_pc_hand_y'] = function(block: any) {
    const code = '__pc_ai_data.get("hand_y", 0) if "\\__pc_ai_data" in globals() else 0';
    return [code, pythonGenerator.ORDER_ATOMIC];
  };

  pythonGenerator.forBlock['vision_load_tflite'] = function(block: any) {
    pythonGenerator.definitions_['import_camera'] = 'import camera';
    pythonGenerator.definitions_['import_tflite'] = 'import tflite';
    const modelName = pythonGenerator.valueToCode(block, 'MODEL_NAME', pythonGenerator.ORDER_NONE) || '""';
    return `camera.init(framesize=camera.FRAME_QVGA)\nmodel = tflite.load(${modelName})\n`;
  };

  pythonGenerator.forBlock['vision_run_inference'] = function(block: any) {
    return 'img = camera.capture()\n__inference_result = model.detect(img)\n';
  };

  pythonGenerator.forBlock['vision_get_inference_result'] = function(block: any) {
    const code = '__inference_result.class_id if "\\__inference_result" in globals() else -1';
    return [code, pythonGenerator.ORDER_ATOMIC];
  };

  pythonGenerator.forBlock['vision_is_hand_in_zone'] = function(block: any) {
    const zone = block.getFieldValue('ZONE');
    let condition = 'False';
    if (zone === 'LEFT') {
      condition = '(__pc_ai_data.get("hand_x", 100) < 33)';
    } else if (zone === 'CENTER') {
      condition = '(33 <= __pc_ai_data.get("hand_x", -1) <= 66)';
    } else if (zone === 'RIGHT') {
      condition = '(__pc_ai_data.get("hand_x", -1) > 66)';
    } else if (zone === 'TOP') {
      condition = '(__pc_ai_data.get("hand_y", 100) < 50)';
    } else if (zone === 'BOTTOM') {
      condition = '(__pc_ai_data.get("hand_y", -1) > 50)';
    }
    const code = `(${condition} if "\\__pc_ai_data" in globals() else False)`;
    return [code, pythonGenerator.ORDER_ATOMIC];
  };

  pythonGenerator.forBlock['vision_is_detected_class_equal'] = function(block: any) {
    const classId = pythonGenerator.valueToCode(block, 'CLASS_ID', pythonGenerator.ORDER_NONE) || '0';
    const code = `(__inference_result.class_id == ${classId} if "\\__inference_result" in globals() else False)`;
    return [code, pythonGenerator.ORDER_ATOMIC];
  };

  pythonGenerator.forBlock['vision_get_class_name_by_index'] = function(block: any) {
    const classId = pythonGenerator.valueToCode(block, 'CLASS_ID', pythonGenerator.ORDER_NONE) || '0';
    const labels = pythonGenerator.valueToCode(block, 'LABELS', pythonGenerator.ORDER_NONE) || '""';
    const code = `([label.strip() for label in ${labels}.split(",")][int(${classId})] if 0 <= int(${classId}) < len(${labels}.split(",")) else "Unknown")`;
    return [code, pythonGenerator.ORDER_ATOMIC];
  };
}
