import network
import binascii
import machine
import uasyncio as asyncio
import gc
import webrepl 

# 125MHz 기본값으로 테스트 권장 (안정화 후 80MHz로 낮추세요)
machine.freq(80000000)

hostname = "pico-device"

async def handle_client(reader, writer):
    try:
        request = await reader.read(256)
        voltage = 0.0 
        percentage = -1
        body = '{"hostname": "%s", "battery": %d, "voltage": %.2f}' % (hostname, percentage, voltage)
        
        response = (
            "HTTP/1.1 200 OK\r\n"
            "Content-Type: application/json\r\n"
            "Content-Length: %d\r\n"
            "Access-Control-Allow-Origin: *\r\n"
            "Connection: close\r\n\r\n" % len(body)
        ) + body
        
        writer.write(response.encode())
        await writer.drain()
    except Exception as e:
        pass
    finally:
        await writer.wait_closed()
        gc.collect()

async def main():
    global hostname
    
    ap = network.WLAN(network.AP_IF)
    uid = binascii.hexlify(machine.unique_id()).decode()
    hostname = f"pico-{uid[-4:]}"
    
    ap.active(True)
    ap.config(essid=hostname, password=f"pwd-{uid[-4:]}")
    
    # PM 설정을 일단 '표준 절전'으로 변경하여 WebREPL 안정성 확보
    # 0xa11140(강력 절전) 대신 network.WLAN.PM_POWERSAVE를 써보세요.
    # 만약 계속 끊기면 0xa111 (절전 안함)으로 테스트하여 범인을 확실히 잡아야 합니다.
    ap.config(pm=network.WLAN.PM_POWERSAVE)
    
    # WebREPL 시작 (네트워크 활성화 직후)
    webrepl.start(password='1234')
    
    print(f"AP Active: {hostname}, WebREPL Port: 8266")
    
    # LED Status Task
    async def led_task(wlan_ap):
        led = machine.Pin("LED", machine.Pin.OUT)
        while True:
            try:
                # Check for connected stations (Clients)
                # ap.status('stations') returns a list of (mac, rssi) tuples
                stations = wlan_ap.status('stations')
                if stations:
                    led.on() # Connected: Solid ON
                    await asyncio.sleep(1)
                else:
                    led.toggle() # Waiting: Blink (1Hz)
                    await asyncio.sleep(0.5)
            except Exception:
                await asyncio.sleep(1)

    asyncio.create_task(led_task(ap))

    server = await asyncio.start_server(handle_client, "0.0.0.0", 80)
    
    while True:
        await asyncio.sleep(10) 
        gc.collect()

try:
    asyncio.run(main())
except KeyboardInterrupt:
    pass
finally:
    asyncio.new_event_loop()