import socketio
import pydirectinput
import pyautogui
import time

# 초기 설정 (기존 코드와 동일)
pydirectinput.FAILSAFE = False
pyautogui.FAILSAFE = False
# pydirectinput.PAUSE = 0 # 필요하다면 지연시간을 0으로 설정
# pyautogui.PAUSE = 0

# PC를 제어하는 핵심 로직 함수 (거의 그대로 사용)
def handle_input(command):
    action = command.get("action")
    
    # Node.js 서버에서 오는 데이터에 맞게 변수명 조정
    key = command.get("key")
    x = command.get("x")
    y = command.get("y")
    width = command.get("width")
    height = command.get("height")
    button = command.get("button")
    delta = command.get("delta") # deltaY -> delta
    mode = command.get("mode", "game")

    # print(f"Received: {command}") # 디버깅 시 주석 해제

    try:
        if action == "mouseMove":
            pydirectinput.moveRel(x, y, relative=True)
        elif action == "mouseMoveTo":
            # 화면 크기 정보를 받아 절대 위치로 이동
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
        elif action == "mouseDown":
            pydirectinput.mouseDown(button=button)
        elif action == "mouseUp":
            pydirectinput.mouseUp(button=button)
        elif action == "scroll": # mouseScroll -> scroll
            pyautogui.scroll(int(delta * -0.1)) # 스크롤 감도 조절

    except Exception as e:
        print(f"Error handling action '{action}': {e}")


# 1. Socket.IO 클라이언트 인스턴스 생성
sio = socketio.Client()

# 2. EC2 서버에 성공적으로 연결되었을 때 실행될 함수
@sio.event
def connect():
    print("✅ EC2 서버에 성공적으로 연결되었습니다!")
    # 서버에 자신이 'exe' 클라이언트임을 등록
    sio.emit('register', 'exe')

# 3. 서버와의 연결이 끊어졌을 때 실행될 함수
@sio.event
def disconnect():
    print("❌ 서버와의 연결이 끊어졌습니다.")

# 4. 서버로부터 'control' 이벤트를 받았을 때 실행될 함수
@sio.on('control')
def on_control(data):
    # 전달받은 제어 명령(data)을 handle_input 함수로 넘겨줌
    handle_input(data)


# 5. 메인 실행 블록
if __name__ == '__main__':
    # 여기에 실제 EC2 서버의 주소를 입력해야 합니다.
    EC2_SERVER_URL = "https://remote-control-pjwzz.run.goorm.site/"
    
    while True:
        try:
            print(f"{EC2_SERVER_URL}에 연결을 시도합니다...")
            sio.connect(EC2_SERVER_URL)
            # 연결이 성공하면, 연결이 끊어질 때까지 여기서 대기
            sio.wait()
        except socketio.exceptions.ConnectionError as e:
            print(f"연결에 실패했습니다: {e}")
            print("5초 후 재시도합니다...")
            time.sleep(5)
        except Exception as e:
            print(f"알 수 없는 오류 발생: {e}")
            print("5초 후 재시도합니다...")
            time.sleep(5)
