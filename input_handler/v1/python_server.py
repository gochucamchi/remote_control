import socket
import pydirectinput
import pyautogui
import json

pydirectinput.FAILSAFE = False
pydirectinput.PAUSE = 0
pyautogui.FAILSAFE = False
pyautogui.PAUSE = 0

def handle_input(command):
    action = command.get("action")
    key = command.get("key")
    x = command.get("x")
    y = command.get("y")
    button = command.get("button")
    deltaY = command.get("deltaY")
    mode = command.get("mode", "game")

    print(f"Received: {command}")

    if action == "mouseMove":
        pydirectinput.moveRel(x, y, relative=True)
    elif action == "mouseMoveTo":
        pyautogui.moveTo(x, y)
    elif action == "keyDown":
        if mode == "game":
            pydirectinput.keyDown(key)
            print(f"Game mode - Key down: {key}")
        else:  # work mode
            if key == "hanguel":
                pyautogui.keyDown("hanguel")
                print("Work mode - Key down: hanguel")
            else:
                pyautogui.keyDown(key)
                print(f"Work mode - Key down: {key}")
    elif action == "keyUp":
        if mode == "game":
            pydirectinput.keyUp(key)
            print(f"Game mode - Key up: {key}")
        else:  # work mode
            if key == "hanguel":
                pyautogui.keyUp("hanguel")
                print("Work mode - Key up: hanguel")
            else:
                pyautogui.keyUp(key)
                print(f"Work mode - Key up: {key}")
    elif action == "mouseDown":
        pydirectinput.mouseDown(button=button)
    elif action == "mouseUp":
        pydirectinput.mouseUp(button=button)
    elif action == "mouseScroll":
        pyautogui.scroll(-deltaY // 10)

def start_server():
    server = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind(("::", 5000))
    server.listen(5)
    print("Python server listening on port 5000")

    while True:
        client, addr = server.accept()
        try:
            data = client.recv(1024)
            command = json.loads(data.decode())
            handle_input(command)
        except Exception as e:
            print(f"Error: {e}")
        finally:
            client.close()

if __name__ == "__main__":
    start_server()