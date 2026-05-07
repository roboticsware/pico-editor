import network
import binascii
import machine
import uasyncio as asyncio
import gc
import webrepl

hostname = "esp32-device"

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
    hostname = f"esp32-{uid[-4:]}"

    ap.active(True)
    ap.config(essid=hostname, password=f"pwd-{uid[-4:]}")

    # WebREPL 시작 (네트워크 활성화 직후)
    webrepl.start(password='1234')

    print(f"AP Active: {hostname}, WebREPL Port: 8266")

    # LED Status Task (ESP32 built-in LED is typically GPIO2)
    async def led_task(wlan_ap):
        try:
            led = machine.Pin(2, machine.Pin.OUT)
            while True:
                try:
                    stations = wlan_ap.status('stations')
                    if stations:
                        led.on()  # Connected: Solid ON
                        await asyncio.sleep(1)
                    else:
                        led.value(not led.value())  # Waiting: Blink
                        await asyncio.sleep(0.5)
                except Exception:
                    await asyncio.sleep(1)
        except Exception:
            # Some boards may not have LED on GPIO2, silently skip
            while True:
                await asyncio.sleep(10)

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
