// integrated-server.js - 화면 공유 및 원격 제어를 위한 통합 서버
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const screenshot = require('screenshot-desktop');
const robot = require('robotjs');
const path = require('path');
const net = require('net');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const port = 8080;

// 정적 파일 제공
app.use(express.static('public'));

// 서버 스크린샷 및 마우스 위치 전송 간격
let screenInterval = null;
let activeViewers = 0;
let fps = 60; // 초당 프레임 수 (60fps로 증가, 변수를 const에서 let으로 변경하여 동적으로 변경 가능)

// 화면 크기 정보 가져오기
const screenSize = robot.getScreenSize();

// 방향키 매핑
const keyMapping = {
    "arrowup": "up",
    "arrowdown": "down",
    "arrowleft": "left",
    "arrowright": "right",
    "control": "ctrl",
    "hangulmode": "hanguel"
};

// Python 서버로 명령 전송
function sendToPython(command) {
    return new Promise((resolve, reject) => {
        const client = net.createConnection({ port: 5000 }, () => {
            client.write(JSON.stringify(command));
        });
        client.on("error", (err) => {
            console.error("Python 서버 연결 오류:", err.message);
            reject(err);
        });
        client.on("close", () => resolve());
    });
}

// 서버 화면 스트리밍 시작 함수
function startServerStream() {
    if (screenInterval) return; // 이미 실행 중이면 중복 실행 방지
    
    console.log('서버 화면 스트리밍 시작');
    screenInterval = setInterval(async () => {
        try {
            // 서버 화면 캡처
            const img = await screenshot();
            
            // 현재 마우스 위치 가져오기
            const mousePos = robot.getMousePos();
            
            // 모든 연결된 클라이언트에게 화면 데이터와 마우스 위치 전송
            io.emit('screen-data', { 
                image: `data:image/png;base64,${img.toString('base64')}`,
                mouseX: mousePos.x,
                mouseY: mousePos.y,
                screenWidth: screenSize.width,
                screenHeight: screenSize.height
            });
        } catch (err) {
            console.error('서버 스크린샷 오류:', err);
        }
    }, 1000 / fps);
}

// 서버 화면 스트리밍 중지 함수
function stopServerStream() {
    if (screenInterval) {
        console.log('서버 화면 스트리밍 중지');
        clearInterval(screenInterval);
        screenInterval = null;
    }
}

// 클라이언트 연결 이벤트 처리
io.on('connection', (socket) => {
    console.log('클라이언트 연결됨');
    activeViewers++;
    
    // 첫 클라이언트 연결 시 서버 스트리밍 시작
    if (activeViewers === 1) {
        startServerStream();
    }
    
    // 클라이언트에게 서버 스트리밍 상태 및 화면 크기 정보 전송
    socket.emit('stream-status', { 
        streaming: screenInterval !== null,
        screenWidth: screenSize.width,
        screenHeight: screenSize.height
    });
    
    // 클라이언트 연결 해제 시 처리
    socket.on('disconnect', () => {
        console.log('클라이언트 연결 해제');
        activeViewers--;
        
        // 모든 클라이언트가 연결 해제되면 스트리밍 중지
        if (activeViewers <= 0) {
            activeViewers = 0;
            stopServerStream();
        }
    });
    
    // 스트리밍 제어 이벤트 처리
    socket.on('admin-start-stream', () => {
        startServerStream();
        io.emit('stream-status', { 
            streaming: true,
            screenWidth: screenSize.width,
            screenHeight: screenSize.height
        });
    });
    
    socket.on('admin-stop-stream', () => {
        stopServerStream();
        io.emit('stream-status', { 
            streaming: false,
            screenWidth: screenSize.width,
            screenHeight: screenSize.height
        });
    });
    
    // 상대적 마우스 이동 처리 (포인터 락 상태)
    socket.on('relativeMouseMove', async ({ movementX, movementY }) => {
        try {
            const command = { action: "mouseMove", x: movementX, y: movementY };
            await sendToPython(command);
        } catch (error) {
            console.error("마우스 이동 오류:", error.message);
        }
    });

    // 절대적 마우스 이동 처리 (화면 내 클릭)
    socket.on('absoluteMouseMove', async ({ clientX, clientY, clientWidth, clientHeight }) => {
        try {
            const command = { 
                action: "mouseMoveTo", 
                x: Math.round(clientX * screenSize.width / clientWidth),
                y: Math.round(clientY * screenSize.height / clientHeight)
            };
            await sendToPython(command);
        } catch (error) {
            console.error("마우스 이동 오류:", error.message);
        }
    });

    // 마우스 클릭 처리
    socket.on('mouseClick', async ({ button, type }) => {
        try {
            const command = {
                action: type === "down" ? "mouseDown" : "mouseUp",
                button: button === 0 ? "left" : button === 1 ? "middle" : "right"
            };
            await sendToPython(command);
        } catch (error) {
            console.error("마우스 클릭 처리 오류:", error.message);
        }
    });

    // 마우스 휠 처리
    socket.on('mouseWheel', async ({ deltaY }) => {
        try {
            // 정규화된 값을 Python 서버로 전송
            const command = { action: "mouseScroll", deltaY: deltaY };
            await sendToPython(command);
        } catch (error) {
            console.error("마우스 휠 처리 오류:", error.message);
        }
    });

    // 게임 모드 키 입력 처리
    socket.on('keyPress', async ({ key, type }) => {
        try {
            const mappedKey = keyMapping[key.toLowerCase()] || key.toLowerCase();
            const command = { 
                action: type === "down" ? "keyDown" : "keyUp", 
                key: mappedKey, 
                mode: "game" 
            };
            console.log(`Python 서버로 전송 (게임 모드): ${JSON.stringify(command)}`);
            await sendToPython(command);
        } catch (error) {
            console.error("키 입력 처리 오류:", error.message);
        }
    });

    // 작업 모드 키 입력 처리
    socket.on('work_keyPress', async ({ key, type }) => {
        try {
            const mappedKey = keyMapping[key.toLowerCase()] || key.toLowerCase();
            const command = { 
                action: type === "down" ? "keyDown" : "keyUp", 
                key: mappedKey, 
                mode: "work" 
            };
            console.log(`Python 서버로 전송 (작업 모드): ${JSON.stringify(command)}`);
            await sendToPython(command);
        } catch (error) {
            console.error("키 입력 처리 오류:", error.message);
        }
    });
    
    // FPS 설정 변경 처리
    socket.on('change-fps', (data) => {
        const newFps = data.fps;
        console.log(`FPS 변경 요청: ${newFps}fps`);
        
        // 유효한 FPS 범위 내에서만 처리 (최소 10fps, 최대 120fps)
        if (newFps >= 10 && newFps <= 120) {
            fps = newFps;
            
            // 현재 스트리밍 중이라면 재시작하여 새 FPS 적용
            if (screenInterval) {
                stopServerStream();
                startServerStream();
            }
            
            // 모든 클라이언트에게 FPS 변경 알림
            io.emit('fps-changed', { fps: newFps });
            console.log(`FPS가 ${newFps}fps로 변경되었습니다.`);
        }
    });
});

server.listen(port, () => {
    console.log(`서버가 실행 중입니다. 포트: ${port}`);
    console.log(`원격 클라이언트는 http://SERVER_IP:${port} 로 접속할 수 있습니다.`);
});