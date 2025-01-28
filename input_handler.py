import socket
import pydirectinput
import json

pydirectinput.FAILSAFE = False
pydirectinput.PAUSE = False

def handle_input(command):
    action = command.get("action")
    key = command.get("key")
    x = command.get("x")
    y = command.get("y")
    button = command.get("button")

    if action == "mouseMove":
         pydirectinput.moveRel(x, y, relative=True,disable_mouse_acceleration = True )  # 상대적 마우스 이동
    elif action == "keyUp":
        pydirectinput.keyUp(key)
    elif action == "keyDown":
        pydirectinput.keyDown(key)
    elif action == "mouseDown":
        pydirectinput.mouseDown(button=button)
    elif action == "mouseUp":
        pydirectinput.mouseUp(button=button)



def start_server():
    server = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)  # IPv6 지원
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind(("::", 5000))  # IPv4 및 IPv6 모두 수신
    server.listen(5)  # 최대 5개의 동시 연결 허용
    print("Python server listening on port 5000")

    while True:
        client, addr = server.accept()
        try:
            data = client.recv(1024)
            command = json.loads(data.decode())
            handle_input(command)
        except Exception:
            pass  # 모든 예외를 무시
        finally:
            client.close()

# def start_server():
#     server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
#     server.bind(("localhost", 5000))
#     server.listen(1)
#     print("Python server listening on port 5000")

#     while True:
#         client, addr = server.accept()
#         data = client.recv(1024)
#         #print(f"Received data: {data.decode()}")  # 디버깅용 로그

#         try:
#             command = json.loads(data.decode())
#             #print(f"Parsed command: {command}")  # 명령 파싱 성공 로그
#             handle_input(command)
#         #except json.JSONDecodeError as e:
#             #print(f"JSON Decode Error: {e}")  # JSON 디코딩 오류
#         #except KeyError as e:
#          #   print(f"Key Error: {e}")  # 필드 누락 오류
#         #except Exception as e:
#             #print(f"Unhandled Error: {e}")  # 기타 예외
#         finally:
#             client.close()


if __name__ == "__main__":
    start_server()
