export default function defineGenerators(pythonGenerator: any) {
  pythonGenerator.forBlock['vision_start_pc_stream'] = function(block: any) {
    pythonGenerator.definitions_['import_espzero_vision'] = 'import espzero_vision';
    return 'espzero_vision.start_stream_to_pc()\n';
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
}
