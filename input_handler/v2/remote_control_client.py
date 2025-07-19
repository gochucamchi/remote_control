import socketio
import pydirectinput
import pyautogui
import time

# PC를 제어하는 핵심 로직 함수
def handle_input(command):
    action = command.get("action")
    mode = command.get("mode", "game")
    try:
        if action == "mouseMove":
            pydirectinput.moveRel(command.get("x"), command.get("y"), relative=True)
        elif action == "mouseMoveTo":
            screen_width, screen_height = pyautogui.size()
            target_x = int(command.get("clientX") / command.get("clientWidth") * screen_width)
            target_y = int(command.get("clientY") / command.get("clientHeight") * screen_height)
            pyautogui.moveTo(target_x, target_y)
        elif action == "keyDown":
            key = command.get("key")
            if mode == "game": pydirectinput.keyDown(key)
            else: pyautogui.keyDown(key)
        elif action == "keyUp":
            key = command.get("key")
            if mode == "game": pydirectinput.keyUp(key)
            else: pyautogui.keyUp(key)
        elif action == "mouseDown":
            pydirectinput.mouseDown(button=command.get("button"))
        elif action == "mouseUp":
            pydirectinput.mouseUp(button=command.get("button"))
        
        # --- 모드별 휠 제어: 스크롤 처리 로직 수정 ---
        elif action == "scroll":
            # 브라우저의 deltaY는 아래로 스크롤 시 양수이므로, 부호를 반전시켜야 합니다.
            scroll_amount = int(command.get("delta") * -1)
            if mode == "game":
                # pydirectinput.scroll()은 양수가 위, 음수가 아래입니다.
                pydirectinput.scroll(scroll_amount)
            else: # work mode
                # pyautogui.scroll()도 양수가 위, 음수가 아래입니다.
                pyautogui.scroll(scroll_amount)
            
    except Exception as e:
        print(f"Error handling action '{action}': {e}")

# Socket.IO 클라이언트 생성
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
