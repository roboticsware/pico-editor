import network, binascii, webrepl, machine, socket, _thread, time

# 전역 변수
hostname = "pico-device"

def info_server_thread():
    global hostname
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    try:
        s.bind(('0.0.0.0', 80))
        s.listen(1)
        while True:
            cl = None
            try:
                cl, addr = s.accept()
                cl.settimeout(1.0)
                request = cl.recv(512)
                
                # Pico W에서 전압 측정(ADC3)은 WiFi 칩셋(CS)과 핀을 공유하므로
                # WiFi 연결 중 측정 시 연결이 끊어질 수 있습니다.
                # 따라서 안정성을 위해 전압 측정 기능을 비활성화합니다.
                voltage = 0.0
                percentage = -1
                
                # HTTP 응답 구성 (Connection: close 필수)
                body = '{"hostname": "%s", "battery": %d, "voltage": %.2f}' % (hostname, percentage, voltage)
                response = "HTTP/1.1 200 OK\r\n"
                response += "Content-Type: application/json\r\n"
                response += "Access-Control-Allow-Origin: *\r\n"
                response += "Connection: close\r\n\r\n"
                response += body
                
                cl.send(response.encode())
                time.sleep(0.1) 
            except Exception as e:
                pass
            finally:
                if cl:
                    cl.close()
    except Exception as e:
        print("Server fatal error:", e)

# 네트워크 및 스레드 실행
def setup():
    global hostname
    ap = network.WLAN(network.AP_IF)
    uid = binascii.hexlify(machine.unique_id()).decode()
    hostname = f"pico-{uid[-4:]}"
    ap.active(True)
    # password는 최소 8자!, AP가 Sleep모드에 빠지지 않게 PM 설정
    ap.config(essid=hostname, password=f"pwd-{uid[-4:]}", pm=0xa11140)
    
    try:
        _thread.start_new_thread(info_server_thread, ())
    except OSError: pass
    
    webrepl.start(password='1234')

setup()