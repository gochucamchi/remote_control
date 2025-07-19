import socketio
import pydirectinput
import pyautogui
import time

# 초기 설정
pydirectinput.FAILSAFE = False
pyautogui.FAILSAFE = False


# pydirectinput.PAUSE = 0
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
            else:
                pyautogui.keyDown(key)
        elif action == "keyUp":
            if mode == "game":
                pydirectinput.keyUp(key)
            else:
                pyautogui.keyUp(key)
        elif action == "mouseDown":
            if mode == "game":
                pydirectinput.mouseDown(button=button)
            else:
                pyautogui.mouseDown(button=button)
        elif action == "mouseUp":
            if mode == "game":
                pydirectinput.mouseUp(button=button)
            else:
                pyautogui.mouseUp(button=button)

        # --- 휠 단위 변환 로직 수정 ---
        elif action == "scroll":
            # 브라우저의 픽셀 단위 delta 값을 '클릭' 단위로 변환합니다.
            # 보통 브라우저에서 1클릭은 100픽셀이므로, 100으로 나누어 단위를 맞춥니다.
            SCROLL_SENSITIVITY_DIVISOR = 100.0

            # 부호를 반전시켜 스크롤 방향을 맞춥니다.
            scroll_amount = int(delta / SCROLL_SENSITIVITY_DIVISOR * -1)

            # delta 값이 0은 아니지만 나누기 결과가 0이 되는 것을 방지 (미세 스크롤 보장)
            if delta != 0 and scroll_amount == 0:
                scroll_amount = -1 if delta > 0 else 1

            if mode == "game":
                pydirectinput.scroll(scroll_amount)
            else:  # work mode
                pyautogui.scroll(scroll_amount)

    except Exception as e:
        print(f"Error handling action '{action}': {e}")


# Socket.IO 클라이언트 생성 및 이벤트 핸들러 (이하 동일)
sio = socketio.Client()


@sio.event
def connect():
    print("✅ EC2 서버에 성공적으로 연결되었습니다!")
    sio.emit('register', 'exe')


@sio.event
def disconnect():
    print("❌ 서버와의 연결이 끊어졌습니다.")


@sio.on('control')
def on_control(data):
    handle_input(data)


if __name__ == '__main__':
    EC2_SERVER_URL = "https://remote-control-pjwzz.run.goorm.site/"

    while True:
        try:
            print(f"{EC2_SERVER_URL}에 연결을 시도합니다...")
            sio.connect(EC2_SERVER_URL)
            sio.wait()
        except Exception as e:
            print(f"연결 실패 또는 오류 발생: {e}")
            print("5초 후 재시도합니다...")
            time.sleep(5)
