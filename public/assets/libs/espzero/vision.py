"""
espzero/vision.py
Provides camera streaming and AI vision utilities for ESP32 camera boards.
"""
import sys
import time

try:
    import camera
except ImportError:
    camera = None
    print("[espzero] Warning: 'camera' module not found. Vision features will not work.")

def start_stream_to_pc(framesize=None, fps=10):
    """
    Captures JPEG frames from the camera and sends them to stdout.
    The Pico Editor intercepts these frames (looking for FF D8 ... FF D9)
    and passes them to MediaPipe for PC-side AI inference.
    """
    if camera is None:
        print("[Vision] Error: Camera module is missing. Are you using a camera-enabled firmware?")
        return

    if framesize is None:
        framesize = camera.FRAME_QVGA

    try:
        # Re-initialize camera to ensure correct format
        camera.deinit()
    except Exception:
        pass

    try:
        camera.init(0, format=camera.JPEG, framesize=framesize)
    except Exception as e:
        print("[Vision] Camera Init Error:", e)
        return

    delay = 1.0 / fps
    print("[Vision] Starting PC stream ({} fps)... Press Stop in Editor to halt.".format(fps))
    
    # Try to get the raw stdout writer to write binary data.
    # In MicroPython, sys.stdout.buffer exists on some ports.
    writer = getattr(sys.stdout, 'buffer', sys.stdout)

    while True:
        try:
            buf = camera.capture()
            if buf:
                # JPEGs naturally start with \xff\xd8 and end with \xff\xd9.
                # Write binary buffer directly to serial.
                writer.write(buf)
            time.sleep(delay)
        except KeyboardInterrupt:
            print("\n[Vision] Stream stopped by user.")
            break
        except Exception as e:
            print("[Vision] Capture Error:", e)
            time.sleep(1)
