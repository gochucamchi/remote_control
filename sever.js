const http = require("http");
const socketIo = require("socket.io");
const robot = require("robotjs");
const fs = require("fs");
const path = require("path");

const server = http.createServer((req, res) => {
    if (req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        fs.createReadStream(path.join(__dirname, 'index.html')).pipe(res);
    }
});

const io = socketIo(server);

server.listen(8080, () => {
    console.log("서버가 실행 중입니다. 포트: 8080");
});

io.on("connection", (socket) => {
    console.log("클라이언트 연결됨");

    // 마우스 이동 처리
    socket.on("moveMouse", ({ deltaX, deltaY }) => {
        const currentPos = robot.getMousePos();
        robot.moveMouse(currentPos.x + deltaX, currentPos.y + deltaY);
    });

    // 마우스 클릭 처리
    socket.on('mouseClick', ({ button, type }) => {
        if (type === 'down') {
            robot.mouseToggle('down', button === 2 ? 'right' : 'left'); // 오른쪽 버튼이면 'right', 아니면 'left'
        } else if (type === 'up') {
            robot.mouseToggle('up', button === 2 ? 'right' : 'left');
        }
    });

    // 키보드 입력 처리
    socket.on("keyPress", ({ key }) => {
        console.log(`키 입력: ${key}`);

        // 특수 키 매핑
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

        if (key === "Hangul" || key === "Hangul/English") {
            // 한영키 처리
            console.log("한영키 전환");
            robot.keyTap("hanja"); // 일부 시스템에서 "hanja"로 한영키 전환 가능
        } else if (specialKeys[key]) {
            // 특수 키 입력 처리
            robot.keyTap(specialKeys[key]);
        } else {
            // 일반 문자 키 입력 처리
            robot.keyTap(key.toLowerCase());
        }
    });
});
