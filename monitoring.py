import asyncio
import websockets
import mss
import io
from PIL import Image
import pyautogui
import json

SERVER_URL = "ws://gocam.p-e.kr:8080"


# 화면을 캡처하여 전송하는 작업
async def send_screen_task(websocket, monitor):
    with mss.mss() as sct:
        while True:
            try:
                sct_img = sct.grab(monitor)
                img = Image.frombytes("RGB", sct_img.size, sct_img.bgra, "raw", "BGRX")

                buffer = io.BytesIO()
                img.save(buffer, format="JPEG", quality=80)
                jpeg_data = buffer.getvalue()

                await websocket.send(jpeg_data)
                await asyncio.sleep(0.033)  # 약 30 FPS
            except websockets.exceptions.ConnectionClosed:
                print("서버와의 연결이 끊어져 화면 전송을 중단합니다.")
                break


# 서버로부터 메시지를 수신하여 처리하는 작업
async def receive_commands_task(websocket):
    async for message in websocket:
        try:
            data = json.loads(message)
            if data.get('type') == 'click':
                x, y = data.get('x'), data.get('y')
                if x is not None and y is not None:
                    pyautogui.click(x, y)
                    print(f"클릭 실행: x={x}, y={y}")
        except Exception as e:
            print(f"명령 처리 중 오류 발생: {e}")


# 메인 비동기 함수
async def main():
    monitor = mss.mss().monitors[1]

    async with websockets.connect(SERVER_URL) as websocket:
        print("서버에 연결되었습니다.")

        # 1. 접속 직후, 자신의 역할과 해상도 정보를 담은 메시지를 전송
        screen_size = pyautogui.size()
        handshake_data = {
            "type": "sharer_connect",
            "width": screen_size.width,
            "height": screen_size.height
        }
        await websocket.send(json.dumps(handshake_data))
        print(f"역할 및 해상도 정보 전송: {handshake_data}")

        # 2. 송신/수신 작업 동시 실행
        send_task = asyncio.create_task(send_screen_task(websocket, monitor))
        receive_task = asyncio.create_task(receive_commands_task(websocket))

        await asyncio.gather(send_task, receive_task)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n프로그램을 중단합니다.")
    except Exception as e:
        print(f"실행 중 오류 발생: {e}")
