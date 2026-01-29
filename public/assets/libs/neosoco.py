from machine import Pin
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
        led.value = float(brightness) / 100.0

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


# --- Motor Control ---
def motor_move(direction):
    """
    Move robot: 'forward', 'backward', 'left', 'right', 'stop'
    Assumes differential drive with M1 (Left) and M2 (Right).
    """
    m1 = _get_motor(1)
    m2 = _get_motor(2)
    
    if direction == 'forward':
        m1.forward(); m2.forward()
    elif direction == 'backward':
        m1.backward(); m2.backward()
    elif direction == 'left':
        m1.backward(); m2.forward()
    elif direction == 'right':
        m1.forward(); m2.backward()
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

# --- ADC / Sensors ---
def get_value(port):
    """
    Get sensor value from IN port.
    Returns 0-255 (scaled from 12-bit).
    """
    p = _parse_in_port(port)
    if p is not None:
        pot = _get_obj(p, Pot)
        return int(pot.value * 255) # picozero pot.value is 0.0-1.0
    return 0

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
