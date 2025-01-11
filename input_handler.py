import sys
import pydirectinput
import json

# Fail-Safe 비활성화
pydirectinput.FAILSAFE = False

def handle_input(command):
    action = command.get("action")
    key = command.get("key")
    x = command.get("x")
    y = command.get("y")
    button = command.get("button")

    if action == "keyDown":
        pydirectinput.keyDown(key)
    elif action == "keyUp":
        pydirectinput.keyUp(key)
    elif action == "mouseMove":
        pydirectinput.moveRel(x, y, relative=True)  # 상대적 마우스 이동
    elif action == "mouseDown":
        pydirectinput.mouseDown(button=button)
    elif action == "mouseUp":
        pydirectinput.mouseUp(button=button)

if __name__ == "__main__":
    try:
        command = json.loads(sys.argv[1])  # JSON 형식의 명령어 받기
        handle_input(command)
    except Exception as e:
        print(f"Error: {e}")
