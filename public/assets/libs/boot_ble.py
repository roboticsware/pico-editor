
import machine
import os
import ubinascii
import ble_uart

_uid = ubinascii.hexlify(machine.unique_id()).decode()
hostname = "pico-{}".format(_uid[-4:])

# Initialize BLE UART
uart = ble_uart.BLEUART(name=hostname)
# 연결될 때까지 여기서 대기
while not uart._connections:
    machine.idle()

try:
    # Duplicate REPL to BLE UART
    # 디폴트값인 인덱스 0은 기본적으로 USB 시리얼(가상 COM 포트)를 점유
    os.dupterm(uart, 0)
    uart.write("--- BLE REPL ACTIVATED ---\r\n")
    print(f"BLE Active: {hostname}")
    print("REPL is now accessible via BLE (Nordic UART Service)")
except Exception as e:
    uart.write(f"DUPTERM ERROR: {e}\r\n")
    print(f"Failed to duplicate terminal: {e}")
