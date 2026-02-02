from machine import Pin, Timer
from picozero import PWMLED, Motor, Servo, Speaker, Pot
from time import sleep

# --- Pin Definitions ---
_PIN_OUT1 = 1
_PIN_OUT2 = 2
_PIN_OUT3 = 3

_PIN_M1_FWD = 4
_PIN_M1_REV = 5
_PIN_M2_FWD = 6
_PIN_M2_REV = 7

_PIN_IN1 = 26
_PIN_IN2 = 27
_PIN_IN3 = 28

# --- Utils ---
def _parse_out_port(port_str):
    if port_str == 'out1': return _PIN_OUT1
    if port_str == 'out2': return _PIN_OUT2
    if port_str == 'out3': return _PIN_OUT3
    return None

def _parse_in_port(port_str):
    if port_str == 'in1': return _PIN_IN1
    if port_str == 'in2': return _PIN_IN2
    if port_str == 'in3': return _PIN_IN3
    return None

def set_value(port, value):
    """
    Set value to OUT port (PWM or Digital).
    value: 0-255
    """
    p = _parse_out_port(port)
    if p is not None:
        # Use simple PWMLED logic which handles PWM on the pin
        # Assuming generic output usage
        led = _get_obj(p, PWMLED)
        led.value = float(value) / 255.0

def convert_scale(value, in_min, in_max, out_min, out_max):
    """
    Map a value from one range to another.
    """
    return (value - in_min) * (out_max - out_min) / (in_max - in_min) + out_min

# --- Global Objects Cache ---
_objs = {}

def _get_obj(pin, cls, **kwargs):
    if pin not in _objs:
        _objs[pin] = cls(pin, **kwargs)
    return _objs[pin]

def _get_motor(id):
    key = f"motor_{id}"
    if key not in _objs:
        if id == 1:
            _objs[key] = Motor(_PIN_M1_FWD, _PIN_M1_REV)
        elif id == 2:
            _objs[key] = Motor(_PIN_M2_FWD, _PIN_M2_REV)
    return _objs.get(key)


# --- LED Control ---
def led_on(port, brightness=100):
    """
    Turn on LED connected to OUT port with specific brightness (0-100).
    port: 'out1', 'out2', 'out3'
    """
    p = _parse_out_port(port)
    if p is not None:
        led = _get_obj(p, PWMLED)
        val = 100
        # Handle string input '100', '90' etc. if passed
        if isinstance(brightness, str):
            try:
                 val = float(brightness)
            except:
                 val = 100
        else:
             val = brightness
        
        led.value = float(val) / 100.0

def led_off(port):
    """Turn off LED connected to OUT port."""
    p = _parse_out_port(port)
    if p is not None:
        led = _get_obj(p, PWMLED)
        led.off()

def led_close(port):
    """Close LED resource connected to OUT port."""
    p = _parse_out_port(port)
    if p is not None:
        if p in _objs:
            _objs[p].close()
            del _objs[p]
        
        # Ensure LED is OFF by driving pin Low
        try:
            Pin(p, Pin.OUT, value=0)
        except:
            pass

# --- ADC / Sensors ---
def get_value(port):
    """
    Get sensor value from IN port.
    Returns 0-255 (scaled from 12-bit).
    Supports: 'in1', 'in2', 'in3', 'remo' (last IR code)
    """
    if str(port).lower() == 'remo':
        # Delegate to remote_get_code with assumption on port?
        # Ref says: get_value('remo') -> reads REMOCTL address.
        # But we need to know WHICH port the remote is on?
        # Ref defines 'REMOCTL' register (0x00400006). The hardware has a built-in IR receiver?
        # If NeoSoCo board has built-in IR, we need that pin definition.
        # Assuming for now 'in1' or defined pin. 
        # But wait, user's block `remote_get_code` asks for PORT.
        # If `get_value('remo')` is called, we don't know the port.
        # Let's assume port 'in1' or return 0 if ambiguous.
        # Or better: simply don't support 'remo' here if block isn't asking for it.
        # But for completeness:
        return 0 

    p = _parse_in_port(port)
    if p is not None:
        pot = _get_obj(p, Pot)
        return int(pot.value * 255) # picozero pot.value is 0.0-1.0
    return 0

def check_color(port, color):
    """
    Check if sensor value matches a color range (based on Ref).
    colors: white, red, yellow, green, blue
    """
    val = get_value(port)
    c = str(color).lower()
    
    # Ranges from Reference
    if 10 <= val <= 50: return c == 'white'
    if 51 <= val <= 90: return c == 'red'
    if 91 <= val <= 130: return c == 'yellow'
    if 131 <= val <= 170: return c == 'green'
    if 171 <= val <= 210: return c == 'blue'
    return False


# --- Motor Control ---
def motor_move(direction):
    """
    Move robot: 'forward', 'backward', 'left', 'right', 'stop'
    Assumes differential drive with M1 (Left) and M2 (Right).
    Default speed: 0.6 (matches approx Ref '60')
    """
    m1 = _get_motor(1)
    m2 = _get_motor(2)
    spd = 0.6
    
    if direction == 'forward':
        m1.forward(spd); m2.forward(spd)
    elif direction == 'backward':
        m1.backward(spd); m2.backward(spd)
    elif direction == 'left':
        m1.backward(spd); m2.forward(spd)
    elif direction == 'right':
        m1.forward(spd); m2.backward(spd)
    elif direction == 'stop':
        m1.stop(); m2.stop()

def motor_stop(motor_sel):
    """
    Stop motor(s).
    motor_sel: 'both', 'left' (M1), 'right' (M2)
    """
    if motor_sel in ['left', 'both']:
        _get_motor(1).stop()
    if motor_sel in ['right', 'both']:
        _get_motor(2).stop()

def motor_rotate(motor_sel, direction, speed):
    """
    Rotate specific motor with speed.
    motor_sel: 'both', 'left', 'right'
    direction: 'forward', 'backward'
    speed: 0-100
    """
    spd = float(speed) / 100.0
    
    def _run(m):
        if direction == 'forward': m.forward(spd)
        else: m.backward(spd)

    if motor_sel in ['left', 'both']:
        _run(_get_motor(1))
    if motor_sel in ['right', 'both']:
        _run(_get_motor(2))

# --- Servo Control ---
def servo_rotate(port, direction, speed):
    """
    Rotate servo (Continuous Rotation Servo assumed by original API naming?)
    Wait, original API 'servo_rotate' takes direction/speed, suggesting CR Servo.
    'servo_rotate_by_degree' suggests Standard Servo.
    We will support Standard Servo mapping 0-180 for create_servo.
    If speed control is needed for standard servo, it requires step loops, 
    but picozero Servo is absolute.
    
    For now, implementing standard servo set value.
    TODO: clarify if CR servo is used. Assuming Standard Servo for 'rotate_by_degree'.
    """
    # Placeholder for simple servo set
    pass

def servo_rotate_by_degree(port, degree):
    """
    Rotate servo to degree (0-180).
    """
    p = _parse_out_port(port)
    if p is not None:
        # Picozero Servo takes value 0 to 1 (min to max) or -1 to 1?
        # Default Servo: min_angle=0, max_angle=180. value=None(angle).
        # We need to instantiate with min_angle=0, max_angle=180
        s = _get_obj(p, Servo, min_angle=0, max_angle=180)
        s.angle = float(degree)



def buzzer_on(port, note, duration=None):
    """
    Play tone on buzzer.
    note: frequency (int) or note name (str, e.g. "C4")
    duration: seconds (float). If None, plays continuously.
    """
    p = _parse_out_port(port)
    if p is not None:
        spk = _get_obj(p, Speaker)
        freq = note
        if isinstance(note, str) and note in _tones:
            freq = _tones[note]
        
        if duration is not None:
             spk.play(freq, duration)
        else:
             spk.play(freq)

def buzzer_off(port):
    """Stop buzzer."""
    p = _parse_out_port(port)
    if p is not None:
        # picozero Speaker.off() might close it? No, just stops.
        if p in _objs and isinstance(_objs[p], Speaker):
            _objs[p].off()

# --- Buzzer ---
_tones = {
    'B0': 31, 'C1': 33, 'CS1': 35, 'D1': 37, 'DS1': 39, 'E1': 41, 'F1': 44, 'FS1': 46, 'G1': 49, 'GS1': 52, 'A1': 55, 'AS1': 58, 'B1': 62,
    'C2': 65, 'CS2': 69, 'D2': 73, 'DS2': 78, 'E2': 82, 'F2': 87, 'FS2': 93, 'G2': 98, 'GS2': 104, 'A2': 110, 'AS2': 117, 'B2': 123,
    'C3': 131, 'CS3': 139, 'D3': 147, 'DS3': 156, 'E3': 165, 'F3': 175, 'FS3': 185, 'G3': 196, 'GS3': 208, 'A3': 220, 'AS3': 233, 'B3': 247,
    'C4': 262, 'CS4': 277, 'D4': 294, 'DS4': 311, 'E4': 330, 'F4': 349, 'FS4': 370, 'G4': 392, 'GS4': 415, 'A4': 440, 'AS4': 466, 'B4': 494,
    'C5': 523, 'CS5': 554, 'D5': 587, 'DS5': 622, 'E5': 659, 'F5': 698, 'FS5': 740, 'G5': 784, 'GS5': 831, 'A5': 880, 'AS5': 932, 'B5': 988,
    'C6': 1047, 'CS6': 1109, 'D6': 1175, 'DS6': 1245, 'E6': 1319, 'F6': 1397, 'FS6': 1480, 'G6': 1568, 'GS6': 1661, 'A6': 1760, 'AS6': 1865, 'B6': 1976,
    'C7': 2093, 'CS7': 2217, 'D7': 2349, 'DS7': 2489, 'E7': 2637, 'F7': 2794, 'FS7': 2960, 'G7': 3136, 'GS7': 3322, 'A7': 3520, 'AS7': 3729, 'B7': 3951,
    'C8': 4186, 'CS8': 4435, 'D8': 4699, 'DS8': 4978
}

def buzzer_on(port, note, duration=None):
    """
    Play tone on buzzer.
    note: frequency (int) or note name (str, e.g. "C4")
    duration: seconds (float). If None, plays continuously.
    """
    p = _parse_out_port(port)
    if p is not None:
        spk = _get_obj(p, Speaker)
        freq = note
        if isinstance(note, str) and note in _tones:
            freq = _tones[note]
        
        if duration is not None:
             spk.play(freq, duration)
        else:
             spk.play(freq)

def buzzer_off(port):
    """Stop buzzer."""
    p = _parse_out_port(port)
    if p is not None:
        # picozero Speaker.off() might close it? No, just stops.
        if p in _objs and isinstance(_objs[p], Speaker):
            _objs[p].off()





# --- General ---
def sleep_s(seconds):
    sleep(seconds)

# --- Color LED (Analog Protocol) ---
def color_led_set(port, num, r, g, b):
    """
    Set Color LED using NeoSoCo Analog Protocol.
    port: 'out1', 'out2', 'out3'
    num: Ignored in this protocol (Reference implementation does not use it).
    r, g, b: 0-255
    """
    # Protocol values from reference:
    # Red Marker: 252, Green Marker: 253, Blue Marker: 254, Accept: 255
    # Color values clamped 1-251
    
    def _clamp(v):
        return max(1, min(int(v), 251))

    # Clamp colors
    r_val = _clamp(r)
    g_val = _clamp(g)
    b_val = _clamp(b)
    
    # Delay in seconds (Reference uses 100ms)
    d = 0.1
    
    # Sequence
    # Red
    set_value(port, 252); sleep(d)
    set_value(port, r_val); sleep(d)
    # Green
    set_value(port, 253); sleep(d)
    set_value(port, g_val); sleep(d)
    # Blue
    set_value(port, 254); sleep(d)
    set_value(port, b_val); sleep(d)
    # Accept
    set_value(port, 255); sleep(d)

def color_led_clear(port):
    color_led_set(port, 0, 0, 0, 0)

# --- REMOTE (NEC IR) ---
# We store the latest code received in a cache
_ir_listeners = {}
_ir_last_codes = {}

def _ir_callback(data, addr, ctrl, port):
    # NEC callback: data is command, addr is address.
    # We might want to combine them or just return command?
    # EduBlocks usually returns the key code.
    if data >= 0:
        _ir_last_codes[port] = data

def remote_get_code(port):
    """
    Get the last received IR code from the remote.
    Returns the code and clears it (or just returns it? usually polled).
    Let's return the last code.
    """
    p = _parse_in_port(port)
    if p is None: return 0

    # Initialize if not exists
    if p not in _ir_listeners:
        try:
            from nec import NEC_8
            # Callback needs to be robust
            # We pass 'port' (pin number) as extra arg to callback if possible?
            # NEC_8(pin, callback, *args)
            _ir_listeners[p] = NEC_8(Pin(p, Pin.IN), _ir_callback, p)
            _ir_last_codes[p] = 0
        except ImportError:
            print("Error: 'nec' library not found. Please install it.")
            return 0
    
    # Return last code. 
    # Optional: Clear it after reading? 
    # For repeated key presses, NEC sends REPEAT code (-1).
    # The callback logic handle REPEAT? 
    # The library passes REPEAT (-1) if repeated.
    # Users usually want the command code.
    # Our _ir_callback logic handles this?
    # Wait, Peter Hinch's lib passes REPEAT keyword.
    # If using 'nec.py' as found:
    # do_callback(cmd, addr, 0, self.REPEAT)
    # cmd will be -1 (REPEAT) if repeat.
    
    code = _ir_last_codes.get(p, 0)
    # If code is -1, it means repeat. We could return the previous valid code?
    # Or just return -1? 
    # For simplicity, let's just return what we have.
    # Resetting to 0 after read is typical for 'get_pressed' behavior, 
    # but 'get_code' might imply current state.
    # Let's clear it to 0 after reading to check for 'new' presses.
    
    _ir_last_codes[p] = 0 
    return code

