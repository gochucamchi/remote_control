const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('ws');

const app = express();
const server = http.createServer(app);

app.use(express.static(__dirname));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const wss = new Server({ server });

let sharer = null;
const viewers = new Set();
let sharerResolution = null;

wss.on('connection', (ws) => {
    console.log('새로운 클라이언트가 연결되었습니다.');

    ws.on('message', (message) => {
        let data;
        try {
            // 메시지를 텍스트로 변환하여 JSON 파싱
            data = JSON.parse(message.toString());
        } catch (e) {
            // JSON 파싱 실패 시, 이미지 데이터로 간주 (sharer가 보내는)
            if (ws === sharer) {
                viewers.forEach(viewer => {
                    if (viewer.readyState === 1) viewer.send(message);
                });
            }
            return;
        }

        // 타입에 따라 역할 분담
        if (data.type === 'sharer_connect') {
            viewers.delete(ws);
            sharer = ws;
            sharerResolution = { type: 'resolution', width: data.width, height: data.height };
            console.log(`화면 공유 클라이언트 설정 및 해상도 수신: ${JSON.stringify(sharerResolution)}`);
            
            // 모든 기존 뷰어들에게 새로운 해상도 정보 전송
            viewers.forEach(viewer => {
                if (viewer.readyState === 1) viewer.send(JSON.stringify(sharerResolution));
            });

        } else if (data.type === 'click') {
            // 클릭 정보는 sharer에게만 전달
            if (sharer && sharer.readyState === 1) {
                sharer.send(message.toString());
            }
        }
    });

    // 뷰어가 접속하면, 이미 sharer가 있다면 해상도 정보를 보내줌
    if (sharerResolution) {
        ws.send(JSON.stringify(sharerResolution));
    }
    viewers.add(ws); // 일단 뷰어 Set에 추가

    ws.on('close', () => {
        if (ws === sharer) {
            sharer = null;
            sharerResolution = null;
            console.log('화면 공유 클라이언트 연결이 끊어졌습니다.');
        } else {
            viewers.delete(ws);
            console.log(`뷰어 연결이 끊어졌습니다. (남은 뷰어 ${viewers.size}명)`);
        }
    });
});

const port = 8080;
server.listen(port, () => {
  console.log(`웹 서버와 WebSocket 서버가 ${port} 포트에서 실행 중입니다...`);
});
