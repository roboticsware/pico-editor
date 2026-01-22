import network
import binascii
import webrepl
import time

def setup_ap_mode():
    # 1. 기기 고유 ID 추출 (MAC 주소 뒷자리 4자리)
    ap_if = network.WLAN(network.AP_IF)
    mac = binascii.hexlify(ap_if.config('mac'), ':').decode()
    unique_id = mac.split(':')[-2] + mac.split(':')[-1]

    # 2. 고유 SSID 및 호스트네임 설정 (pico-XXXX)
    hostname = f"pico-{unique_id}"
    password = f"pwd-{unique_id}" # 비밀번호 (최소 8자 이상, 없애려면 '' 입력)

    # 3. AP 활성화 및 설정
    ap_if.active(True)
    ap_if.config(essid=hostname, password=password)

    # 4. 네트워크 정보 설정 (기본값: 192.168.4.1)
    # 별도로 설정하지 않아도 기본적으로 192.168.4.1로 잡힙니다.

    print(f"AP Mode Started!")
    print(f"SSID: {hostname}")
    print(f"IP Address: {ap_if.ifconfig()[0]}")

    return hostname

# 네트워크 설정 실행
my_name = setup_ap_mode()

# 5. WebREPL 시작 (사전에 webrepl_cfg.py가 있어야 매끄럽게 연결됩니다)
try:
    webrepl.start(password='1234')
except Exception as e:
    print("WebREPL 시작 실패:", e)

# 6. mDNS 관련 (AP 모드에서도 .local 인식을 돕기 위해 호스트네임 등록)
try:
    network.hostname(my_name)
except:
    pass
