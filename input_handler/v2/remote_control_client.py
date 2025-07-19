import socketio
import pydirectinput
import pyautogui
import time

# 초기 설정
pydirectinput.FAILSAFE = False
pyautogui.FAILSAFE = False
# pydirectinput.PAUSE = 0 # 필요하다면 지연시간을 0으로 설정
# pyautogui.PAUSE = 0

# PC를 제어하는 핵심 로직 함수
def handle_input(command):
    action = command.get("action")
    
    key = command.get("key")
    x = command.get("x")
    y = command.get("y")
    width = command.get("width")
    height = command.get("height")
    button = command.get("button")
    delta = command.get("delta")
    mode = command.get("mode", "game")

    # print(f"Received: {command}") # 디버깅 시 주석 해제

    try:
        if action == "mouseMove":
            pydirectinput.moveRel(x, y, relative=True)
        elif action == "mouseMoveTo":
            screen_width, screen_height = pyautogui.size()
            target_x = int(x / width * screen_width)
            target_y = int(y / height * screen_height)
            pyautogui.moveTo(target_x, target_y)
        elif action == "keyDown":
            if mode == "game":
                pydirectinput.keyDown(key)
            else: # work mode
                pyautogui.keyDown(key)
        elif action == "keyUp":
            if mode == "game":
                pydirectinput.keyUp(key)
            else: # work mode
                pyautogui.keyUp(key)
        
        # --- 주요 변경점 1: 모드에 따른 마우스 클릭 분리 ---
        elif action == "mouseDown":
            if mode == "game":
                pydirectinput.mouseDown(button=button)
            else: # work mode
                pyautogui.mouseDown(button=button)
        elif action == "mouseUp":
            if mode == "game":
                pydirectinput.mouseUp(button=button)
            else: # work mode
                pyautogui.mouseUp(button=button)

        # --- 주요 변경점 2: 모드에 따른 마우스 휠 스크롤 분리 ---
        elif action == "scroll":
            # 브라우저의 deltaY는 아래로 스크롤 시 양수이므로, 부호를 반전시켜야 합니다.
            # 두 라이브러리 모두 양수가 위, 음수가 아래로 스크롤됩니다.
            scroll_amount = int(delta * -1)
            if mode == "game":
                pydirectinput.scroll(scroll_amount)
            else: # work mode
                pyautogui.scroll(scroll_amount)

    except Exception as e:
        print(f"Error handling action '{action}': {e}")


# 1. Socket.IO 클라이언트 인스턴스 생성
sio = socketio.Client()

# 2. EC2 서버에 성공적으로 연결되었을 때 실행될 함수
@sio.event
def connect():
    print("✅ EC2 서버에 성공적으로 연결되었습니다!")
    sio.emit('register', 'exe')

# 3. 서버와의 연결이 끊어졌을 때 실행될 함수
@sio.event
def disconnect():
    print("❌ 서버와의 연결이 끊어졌습니다.")

# 4. 서버로부터 'control' 이벤트를 받았을 때 실행될 함수
@sio.on('control')
def on_control(data):
    handle_input(data)


# 5. 메인 실행 블록
if __name__ == '__main__':
    # 여기에 실제 EC2 서버의 주소를 입력해야 합니다.
    EC2_SERVER_URL = "http://YOUR_EC2_PUBLIC_IP:8081"
    
    while True:
        try:
            print(f"{EC2_SERVER_URL}에 연결을 시도합니다...")
            sio.connect(EC2_SERVER_URL)
            sio.wait()
        except socketio.exceptions.ConnectionError as e:
            print(f"연결에 실패했습니다: {e}")
            print("5초 후 재시도합니다...")
            time.sleep(5)
        except Exception as e:
            print(f"알 수 없는 오류 발생: {e}")
            print("5초 후 재시도합니다...")
            time.sleep(5)
