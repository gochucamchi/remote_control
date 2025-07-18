// 1. 필요한 라이브러리들을 불러옵니다.
const http = require('http');
const express = require('express');
const socketIO = require('socket.io');
const path = require('path');

// 2. Express 앱, HTTP 서버, Socket.IO 인스턴스를 생성합니다.
const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    cors: { // 웹 클라이언트와 서버의 주소가 다를 경우 필요 (CORS 정책 허용)
        origin: "*", // 실제 프로덕션에서는 특정 도메인 주소를 넣는 것이 안전합니다.
        methods: ["GET", "POST"]
    }
});

const PORT = 8081; // EC2에서 사용할 포트

// 3. 'public' 폴더를 정적 파일 제공 폴더로 지정합니다.
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 4. 클라이언트들을 관리할 객체
// key: 소켓 ID, value: 소켓 객체
const webClients = {}; // 제어하는 웹 클라이언트 (브라우저)
const exeClients = {}; // 제어받는 EXE 클라이언트 (파이썬)

// 5. 키 매핑 (기존 코드와 동일)
const keyMapping = {
    "arrowup": "up",
    "arrowdown": "down",
    "arrowleft": "left",
    "arrowright": "right",
    "control": "ctrl",
    "hangulmode": "hanguel"
};


// 6. Socket.IO 연결 처리
io.on('connection', (socket) => {
    console.log(`[연결] 새로운 클라이언트 접속: ${socket.id}`);

    // 클라이언트 등록: 웹, EXE 클라이언트를 구분하여 저장
    socket.on('register', (clientType) => {
        if (clientType === 'web') {
            webClients[socket.id] = socket;
            console.log(`[등록] 웹 클라이언트: ${socket.id}`);
        } else if (clientType === 'exe') {
            exeClients[socket.id] = socket;
            console.log(`[등록] EXE 클라이언트: ${socket.id}`);
        }
    });

    // 모든 제어 이벤트는 첫 번째로 연결된 EXE 클라이언트에게 전달
    // (향후 룸(room) 기반으로 특정 클라이언트에게만 보내도록 확장 가능)
    const forwardToExe = (eventName, data) => {
        const targetExeId = Object.keys(exeClients)[0]; // 가장 먼저 연결된 EXE 클라이언트
        if (targetExeId) {
            exeClients[targetExeId].emit(eventName, data);
        } else {
            // console.log("전달할 EXE 클라이언트가 없습니다.");
        }
    };

    // --- 웹 클라이언트로부터 받은 이벤트를 EXE 클라이언트로 전달 ---

    socket.on("relativeMouseMove", ({ movementX, movementY }) => {
        forwardToExe('control', { action: "mouseMove", x: movementX, y: movementY });
    });

    socket.on("absoluteMouseMove", ({ clientX, clientY, clientWidth, clientHeight }) => {
        // 이제 이 계산은 EXE 클라이언트가 담당하거나, 여기서 계산해서 넘겨도 됨
        // 여기서는 클라이언트의 상대 좌표를 그대로 전달
        forwardToExe('control', { 
            action: "mouseMoveTo", 
            x: clientX, y: clientY, 
            width: clientWidth, height: clientHeight 
        });
    });

    socket.on("mouseClick", ({ button, type }) => {
        const mappedButton = button === 0 ? "left" : button === 1 ? "middle" : "right";
        forwardToExe('control', { 
            action: type === "down" ? "mouseDown" : "mouseUp", 
            button: mappedButton 
        });
    });

    socket.on("mouseWheel", ({ deltaY }) => {
        forwardToExe('control', { action: "scroll", delta: deltaY });
    });

    socket.on("keyPress", ({ key, type }) => {
        const mappedKey = keyMapping[key.toLowerCase()] || key.toLowerCase();
        forwardToExe('control', { 
            action: type === "down" ? "keyDown" : "keyUp", 
            key: mappedKey,
            mode: "game" 
        });
    });

    socket.on("work_keyPress", ({ key, type }) => {
        const mappedKey = keyMapping[key.toLowerCase()] || key.toLowerCase();
        forwardToExe('control', { 
            action: type === "down" ? "keyDown" : "keyUp", 
            key: mappedKey,
            mode: "work" 
        });
    });

    // 클라이언트 연결 종료 시 관리 목록에서 제거
    socket.on('disconnect', () => {
        if (webClients[socket.id]) {
            delete webClients[socket.id];
            console.log(`[연결 종료] 웹 클라이언트: ${socket.id}`);
        } else if (exeClients[socket.id]) {
            delete exeClients[socket.id];
            console.log(`[연결 종료] EXE 클라이언트: ${socket.id}`);
        }
    });
});

// 7. 서버 실행
server.listen(PORT, () => {
    console.log(`🚀 EC2 서버가 포트 ${PORT}에서 실행 중입니다.`);
});
