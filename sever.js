const http = require("http");
const socketIo = require("socket.io");
const robot = require("robotjs");
const fs = require("fs");
const path = require("path");
const jsautogui = require("jsautogui");

const server = http.createServer((req, res) => {
    if (req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        fs.createReadStream(path.join(__dirname, 'index.html')).pipe(res);
    }
});


const io = socketIo(server);
const screenSize = robot.getScreenSize(); // 서버 컴퓨터의 화면 크기
server.listen(8080, () => {
    console.log("서버가 실행 중입니다. 포트: 8080");
});

io.on("connection", (socket) => {
    console.log("클라이언트 연결됨");
            // Pointer Lock 상태에서 상대 좌표 이동 처리
           // Pointer Lock 상태에서 상대 좌표 이동 처리
           socket.on('relativeMouseMove', ({ movementX, movementY }) => {
            try {
                console.log(`Received relative movement: ΔX=${movementX}, ΔY=${movementY}`);
        
                // 상대 이동 처리
                jsautogui.mouse.moveRel(movementX, movementY);
            } catch (error) {
                console.error("Pointer Lock 이동 중 오류:", error.message);
            }
        });

    socket.on('absoluteMouseMove', ({ clientX, clientY, clientWidth, clientHeight }) => {
        try {
            // 비율 계산
            const scaleX = screenSize.width / clientWidth;
            const scaleY = screenSize.height / clientHeight;

            // 클라이언트 좌표를 서버 절대 좌표로 변환
            const serverX = Math.round(clientX * scaleX);
            const serverY = Math.round(clientY * scaleY);

            // 마우스 이동
            robot.moveMouse(serverX, serverY);
        } catch (error) {
            console.error("마우스 이동 오류:", error.message);
        }
    });

    // 마우스 클릭 처리
    socket.on('mouseClick', ({ button, type }) => {
        if (type === 'down') {
            robot.mouseToggle('down', button === 2 ? 'right' : 'left'); // 오른쪽 버튼이면 'right', 아니면 'left'
        } else if (type === 'up') {
            robot.mouseToggle('up', button === 2 ? 'right' : 'left');
        }
    });

    const { mouse, up, down } = require("@nut-tree-fork/nut-js");
    const scrollspeed = 1;
    socket.on('mouseWheel', ({ deltaY }) => {
        try {
            if (deltaY > 0) {
                // 아래로 스크롤
                mouse.scrollDown(Math.abs(deltaY) *scrollspeed); // deltaY가 양수일 때 아래로 스크롤
            } else if (deltaY < 0) {
                // 위로 스크롤
                mouse.scrollUp(Math.abs(deltaY) * scrollspeed); // deltaY가 음수일 때 위로 스크롤
            }
        } catch (error) {
            console.error("마우스 휠 처리 중 오류:", error.message);
        }
});
const specialKeys = {
    Backspace: "backspace",
    Escape: "escape",
    Delete: "delete",
    Enter: "enter",
    Tab: "tab",
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
};
    // 키보드 입력 처리
    socket.on("keyPress", ({ key, type }) => {
        try {

                if (type === "down") {
                    if (specialKeys[key]) {
                        robot.keyToggle(specialKeys[key], "down");
                    } else {
                        robot.keyToggle(key.toLowerCase(), "down");
                    }
                } else if (type === "up") {
                    if (specialKeys[key]) {
                        robot.keyToggle(specialKeys[key], "up");
                    } else {
                        robot.keyToggle(key.toLowerCase(), "up");
                    }
                }
            }
        catch (error) {
            console.error("키 처리 중 오류 발생:", error.message);
        }
    });
    
});