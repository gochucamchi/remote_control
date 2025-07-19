import socketio
import pydirectinput
import pyautogui
import time
import threading # ◀◀ 스레딩 라이브러리 추가
import tkinter as tk # ◀◀ Tkinter 라이브러리 추가
import os # ◀◀◀ 프로그램 강제 종료를 위해 os 라이브러리 추가

# --- 기존 코드 (handle_input 함수 등)는 그대로 둡니다 ---
# 초기 설정
pydirectinput.FAILSAFE = False
pyautogui.FAILSAFE = False

# PC를 제어하는 핵심 로직 함수
def handle_input(command):
    # (이 안의 내용은 이전과 동일하므로 생략)
    action = command.get("action")
    mode = command.get("mode", "game")

    try:
        if action == "mouseMove":
            pydirectinput.moveRel(command.get("x"), command.get("y"), relative=True)
        elif action == "mouseMoveTo":
            screen_width, screen_height = pyautogui.size()
            target_x = int(command.get("x") / command.get("width") * screen_width)
            target_y = int(command.get("y") / command.get("height") * screen_height)
            pyautogui.moveTo(target_x, target_y)
        elif action == "keyDown":
            pydirectinput.keyDown(command.get("key")) if mode == "game" else pyautogui.keyDown(command.get("key"))
        elif action == "keyUp":
            pydirectinput.keyUp(command.get("key")) if mode == "game" else pyautogui.keyUp(command.get("key"))
        elif action == "mouseDown":
            pydirectinput.mouseDown(button=command.get("button")) if mode == "game" else pyautogui.mouseDown(button=command.get("button"))
        elif action == "mouseUp":
            pydirectinput.mouseUp(button=command.get("button")) if mode == "game" else pyautogui.mouseUp(button=command.get("button"))
        elif action == "scroll":
            delta = command.get("delta")
            scroll_amount = -1 if delta > 0 else 1
            pydirectinput.scroll(scroll_amount)
    except Exception as e:
        print(f"Error handling action '{action}': {e}")


# 🔽🔽🔽 이 아래부터가 새로 추가/수정되는 부분입니다 🔽🔽🔽

# 1. GUI 창을 생성하고 실행하는 함수
# 🔽🔽🔽 create_gui 함수만 아래와 같이 수정됩니다 🔽🔽🔽

def create_gui():
    window = tk.Tk()
    window.title("원격 제어 클라이언트")
    window.geometry("300x150")
    window.resizable(False, False)

    label_status = tk.Label(window, text="✅ 서버 연결 대기 중...", font=("맑은 고딕", 12), pady=20)
    label_status.pack()

    label_info = tk.Label(window, text="이 창이 켜져 있는 동안 원격 제어가 활성화됩니다.\n창을 닫으면 프로그램이 종료됩니다.", font=("맑은 고딕", 9))
    label_info.pack()

    # --- 💡 이 부분이 핵심 수정 사항입니다 ---
    def on_closing():
        """창이 닫힐 때 호출될 함수"""
        print("프로그램을 종료합니다.")
        sio.disconnect()  # 소켓 연결을 먼저 끊습니다.
        os._exit(0)       # 프로그램 전체를 강제 종료합니다.

    # 윈도우의 '닫기' 버튼 프로토콜에 위에서 만든 함수를 연결합니다.
    window.protocol("WM_DELETE_WINDOW", on_closing) # ◀◀◀ 닫기 버튼 이벤트 재정의

    @sio.on('connect')
    def on_connect():
        print("✅ EC2 서버에 성공적으로 연결되었습니다!")
        sio.emit('register', 'exe')
        label_status.config(text="🚀 서버에 연결되었습니다!", fg="blue")

    @sio.on('disconnect')
    def on_disconnect():
        print("❌ 서버와의 연결이 끊어졌습니다. 재연결을 시도합니다.")
        label_status.config(text="⏳ 서버와 연결이 끊겼습니다.", fg="red")

    window.mainloop()

# 2. Socket.IO 클라이언트 생성 및 이벤트 핸들러
sio = socketio.Client()

@sio.on('control')
def on_control(data):
    handle_input(data)


# 3. 메인 로직 실행
if __name__ == '__main__':
    # GUI를 별도의 스레드에서 실행
    gui_thread = threading.Thread(target=create_gui, daemon=True)
    gui_thread.start()

    # 서버 URL 설정
    EC2_SERVER_URL = "https://remote-control-pjwzz.run.goorm.site/"

    # 메인 스레드에서는 계속해서 서버 연결 시도
    while True:
        try:
            print(f"서버({EC2_SERVER_URL})에 연결을 시도합니다...")
            sio.connect(EC2_SERVER_URL, transports=['websocket'])
            sio.wait()
        except Exception as e:
            print(f"연결 실패 또는 오류 발생: {e}")
            time.sleep(5)
