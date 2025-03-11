# python_server.py - 마우스 및 키보드 입력 처리를 위한 Python 서버
import socket
import pydirectinput
import pyautogui
import json

# 안전 설정 - 화면 경계에서 예외 발생 방지
pydirectinput.FAILSAFE = False
pydirectinput.PAUSE = 0
pyautogui.FAILSAFE = False
pyautogui.PAUSE = 0

def handle_input(command):
    """클라이언트로부터 받은 입력 명령을 처리하는 함수"""
    action = command.get("action")
    key = command.get("key")
    x = command.get("x")
    y = command.get("y")
    button = command.get("button")
    deltaY = command.get("deltaY")
    mode = command.get("mode", "game")

    print(f"명령 수신: {command}")

    if action == "mouseMove":
        # 상대적 마우스 이동 (포인터 락 모드)
        pydirectinput.moveRel(x, y, relative=True)
    elif action == "mouseMoveTo":
        # 절대적 마우스 이동 (화면 내 직접 클릭)
        pyautogui.moveTo(x, y)
    elif action == "keyDown":
        if mode == "game":
            pydirectinput.keyDown(key)
            print(f"게임 모드 - 키 다운: {key}")
        else:  # work mode
            if key == "hanguel":
                pyautogui.keyDown("hanguel")
                print("작업 모드 - 키 다운: hanguel")
            else:
                pyautogui.keyDown(key)
                print(f"작업 모드 - 키 다운: {key}")
    elif action == "keyUp":
        if mode == "game":
            pydirectinput.keyUp(key)
            print(f"게임 모드 - 키 업: {key}")
        else:  # work mode
            if key == "hanguel":
                pyautogui.keyUp("hanguel")
                print("작업 모드 - 키 업: hanguel")
            else:
                pyautogui.keyUp(key)
                print(f"작업 모드 - 키 업: {key}")
    elif action == "mouseDown":
        # 마우스 버튼 누름
        pydirectinput.mouseDown(button=button)
    elif action == "mouseUp":
        # 마우스 버튼 뗌
        pydirectinput.mouseUp(button=button)
    elif action == "mouseScroll":
        # 마우스 스크롤 - 스크롤 속도 증가
        pyautogui.scroll(-deltaY // 3)  # 10에서 3으로 변경하여 약 3배 더 빠르게

def start_server():
    """TCP 서버를 시작하고 클라이언트 요청을 처리하는 함수"""
    server = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind(("::", 5000))
    server.listen(5)
    print("Python 입력 제어 서버가 포트 5000에서 실행 중입니다.")

    while True:
        client, addr = server.accept()
        try:
            data = client.recv(1024)
            command = json.loads(data.decode())
            handle_input(command)
        except Exception as e:
            print(f"오류 발생: {e}")
        finally:
            client.close()

if __name__ == "__main__":
    start_server()