import bluetooth, io
from micropython import const
from machine import Pin, Timer

_IRQ_CENTRAL_CONNECT = const(1)
_IRQ_CENTRAL_DISCONNECT = const(2)
_IRQ_GATTS_WRITE = const(3)

_FLAG_WRITE_NO_RESPONSE = const(0x0004)
_FLAG_WRITE = const(0x0008)
_FLAG_NOTIFY = const(0x0010)

_UART_UUID = bluetooth.UUID("6E400001-B5A3-F393-E0A9-E50E24DCCA9E")
_UART_TX = (bluetooth.UUID("6E400003-B5A3-F393-E0A9-E50E24DCCA9E"), _FLAG_NOTIFY,)
_UART_RX = (bluetooth.UUID("6E400002-B5A3-F393-E0A9-E50E24DCCA9E"), _FLAG_WRITE | _FLAG_WRITE_NO_RESPONSE,)
_UART_SERVICE = (_UART_UUID, (_UART_TX, _UART_RX,),)

class BLEUART(io.IOBase):
    def __init__(self, name="pico-ble", rxbuf=512):
        self._led = Pin("LED", Pin.OUT) # 피코 W 온보드 LED
        self._timer = Timer(-1)
        
        self._ble = bluetooth.BLE()
        self._ble.active(True)
        self._ble.irq(self._irq)
        
        ((self._tx_handle, self._rx_handle,),) = self._ble.gatts_register_services((_UART_SERVICE,))
        self._ble.gatts_set_buffer(self._rx_handle, rxbuf, True)
        
        self._connections = set()
        self._rx_buffer = bytearray()
        self._name = name
        self._advertise()
        self._start_blink() # 대기 중 깜빡임 시작

    def _start_blink(self):
        self._timer.init(period=500, mode=Timer.PERIODIC, callback=lambda t: self._led.toggle())

    def _stop_blink(self):
        self._timer.deinit()
        self._led.on() # 연결되면 켜짐

    def _irq(self, event, data):
        if event == _IRQ_CENTRAL_CONNECT:
            conn_handle, _, _ = data
            self._connections.add(conn_handle)
            self._stop_blink() # 깜빡임 멈추고 켜둠
        elif event == _IRQ_CENTRAL_DISCONNECT:
            conn_handle, _, _ = data
            if conn_handle in self._connections:
                self._connections.remove(conn_handle)
            self._start_blink() # 끊기면 다시 깜빡임
            self._advertise()
        elif event == _IRQ_GATTS_WRITE:
            conn_handle, value_handle = data
            if conn_handle in self._connections and value_handle == self._rx_handle:
                self._rx_buffer += self._ble.gatts_read(self._rx_handle)

    def _advertise(self):
        # 1. Flags (일반 발견 모드)
        adv = bytearray(b'\x02\x01\x06')
        
        # 2. 서비스 UUID 포함 (이게 있어야 브라우저 필터에 걸림)
        # 128비트 UUID는 \x07(Complete List of 128-bit Service Class UUIDs)를 사용
        uuid_bytes = bytes(_UART_UUID) # UUID 객체를 바이트로 변환
        adv += bytearray((len(uuid_bytes) + 1, 0x07)) + uuid_bytes
        
        # 3. 장치 이름 포함
        name_bytes = bytes(self._name, 'UTF-8')
        adv += bytearray((len(name_bytes) + 1, 0x09)) + name_bytes
        
        # 광고 간격 250ms (단위는 us)
        self._ble.gap_advertise(250000, adv)

    def any(self):
        return len(self._rx_buffer)

    def read(self, sz=None):
        if not self._rx_buffer: return None
        if sz is None:
            data = self._rx_buffer[:]
            self._rx_buffer = bytearray()
        else:
            data = self._rx_buffer[:sz]
            self._rx_buffer = self._rx_buffer[sz:]
        return data

    def write(self, data):
        if not self._connections: return 0
        if isinstance(data, str): data = data.encode('utf-8')
        
        # MTU를 고려한 안전한 전송
        chunk_size = 20
        for i in range(0, len(data), chunk_size):
            chunk = data[i : i + chunk_size]
            for conn_handle in self._connections:
                try:
                    self._ble.gatts_notify(conn_handle, self._tx_handle, chunk)
                except: pass
        return len(data)

    def readinto(self, buf):
        avail = self.any()
        if not avail: return None
        n = min(len(buf), avail)
        data = self.read(n)
        buf[:n] = data
        return n

    def ioctl(self, op, arg):
        if op == 4: # MP_STREAM_POLL
            res = 0
            if self.any(): res |= 1 # MP_STREAM_POLL_RD
            if self._connections: 
                res |= 4 # MP_STREAM_POLL_WR
            return res
        return 0