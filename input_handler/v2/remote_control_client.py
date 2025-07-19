import socketio
import pydirectinput
import pyautogui
import time

# 초기 설정
# pydirectinput.PAUSE = 0  # 필요 시 지연 시간 비활성화
# pyautogui.PAUSE = 0
pydirectinput.FAILSAFE = False
pyautogui.FAILSAFE = False

# PC를 제어하는 핵심 로직 함수
def handle_input(command):
    action = command.get("action")
    mode = command.get("mode", "game") # 기본 모드를 'game'으로 설정

    try:
        if action == "mouseMove":
            pydirectinput.moveRel(command.get("x"), command.get("y"), relative=True)

        elif action == "mouseMoveTo":
            screen_width, screen_height = pyautogui.size()
            # 웹 클라이언트의 창 기준 좌표를 실제 PC 화면의 절대 좌표로 변환
            target_x = int(command.get("x") / command.get("width") * screen_width)
            target_y = int(command.get("y") / command.get("height") * screen_height)
            pyautogui.moveTo(target_x, target_y)

        elif action == "keyDown":
            key = command.get("key")
            if mode == "game":
                pydirectinput.keyDown(key)
            else:
                pyautogui.keyDown(key)

        elif action == "keyUp":
            key = command.get("key")
            if mode == "game":
                pydirectinput.keyUp(key)
            else:
                pyautogui.keyUp(key)

        elif action == "mouseDown":
            button = command.get("button")
            if mode == "game":
                pydirectinput.mouseDown(button=button)
            else:
                pyautogui.mouseDown(button=button)

        elif action == "mouseUp":
            button = command.get("button")
            if mode == "game":
                pydirectinput.mouseUp(button=button)
            else:
                pyautogui.mouseUp(button=button)

        # --- 💡 마우스 휠 로직 수정 ---
        elif action == "scroll":
            delta = command.get("delta")
            # delta가 양수(아래)면 음수로, 음수(위)면 양수로 변환 (1 클릭 단위)
            scroll_amount = -1 if delta > 0 else 1
            
            if mode == "game":
                pydirectinput.scroll(scroll_amount)
            else: # work mode
                pyautogui.scroll(scroll_amount)
            
    except Exception as e:
        print(f"Error handling action '{action}': {e}")


# Socket.IO 클라이언트 생성
sio = socketio.Client()

@sio.event
def connect():
    print("✅ EC2 서버에 성공적으로 연결되었습니다!")
    # 서버에 'exe' 클라이언트로 등록
    sio.emit('register', 'exe')

@sio.event
def disconnect():
    print("❌ 서버와의 연결이 끊어졌습니다. 재연결을 시도합니다.")

@sio.on('control')
def on_control(data):
    # 서버로부터 제어 신호를 받으면 handle_input 함수 실행
    handle_input(data)

if __name__ == '__main__':
    # ❗ 본인의 EC2 서버 주소 또는 테스트용 주소를 입력하세요.
    EC2_SERVER_URL = "https://remote-control-pjwzz.run.goorm.site/" 
    
    # 연결이 끊어지면 5초마다 재연결을 시도하는 무한 루프
    while True:
        try:
            print(f"서버({EC2_SERVER_URL})에 연결을 시도합니다...")
            sio.connect(EC2_SERVER_URL, transports=['websocket']) # 웹소켓 전송 방식을 명시
            sio.wait()
        except Exception as e:
            print(f"연결 실패 또는 오류 발생: {e}")
            time.sleep(5)
