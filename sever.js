const http = require("http");
const socketIo = require("socket.io");
const robot = require("robotjs");
const fs = require("fs");
const path = require("path");
const jsautogui = require("jsautogui");

const specialKeys = {
    "/": "divide",
    "?": "divide",
    "\\": "\\",
    "<": ",",
    ">": ".",
    '"': "'",
    "@": "2" ,
    "#": "3",
    "!": "1",
    "$": "7",
    "%": "5",
    "^": "6",
    "&": "7",
    "*": "8",
    ";": ";",
    "(": "9",
    ")": "0",
    "*": "multiply",
    Backspace: "backspace",
    Escape: "escape",
    Delete: "delete",
    Enter: "enter",
    Tab: "tab",
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
    Control: "ctrl", // 추가
    Alt: "alt",         // 추가
    Shift: "shift",     // 추가
    HangulMode: "hanguel",   // 한영키 추가
};

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
           socket.on('relativeMouseMove', ({ movementX, movementY }) => {
            try {
        
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
            jsautogui.mouse.moveTo(serverX, serverY, 0)
        } catch (error) {
            console.error("마우스 이동 오류:", error.message);
        }
    });

    socket.on('mouseClick', ({ button, type }) => {
        try {
            if (type === 'down') {
                if (button === 0) {
                    // 좌클릭 누름 상태
                    jsautogui.mouse.down("left", true);
                } else if (button === 1) {
                    // 가운데 버튼 누름 상태
                    jsautogui.mouse.down("middle", true);
                } else if (button === 2) {
                    // 우클릭 누름 상태
                    jsautogui.mouse.down("right", true);
                }
            } else if (type === 'up') {
                if (button === 0) {
                    // 좌클릭 뗌 상태
                    jsautogui.mouse.up("left", false);
                } else if (button === 1) {
                    // 가운데 버튼 뗌 상태
                    jsautogui.mouse.up("middle", false);
                } else if (button === 2) {
                    // 우클릭 뗌 상태
                    jsautogui.mouse.up("right", false);
                }
            }
        } catch (error) {
            console.error("마우스 클릭 처리 중 오류:", error.message);
        }
    });

    const scrollspeed = -1;
    socket.on('mouseWheel', ({ deltaY }) => {
        try {
            jsautogui.mouse.scroll(0,deltaY * scrollspeed)
        } catch (error) {
            console.error("마우스 휠 처리 중 오류:", error.message);
        }
});

    // 키보드 입력 처리
    socket.on("keyPress", ({ key, type }) => {
        try {
                console.log(key);
                if (type === "down") {
                    if (specialKeys[key]) {
                        jsautogui.keyboard.down(specialKeys[key]);
                    } else {
                        jsautogui.keyboard.down(key.toLowerCase());
                    }
                } else if (type === "up") {
                    if (specialKeys[key]) {
                        jsautogui.keyboard.up(specialKeys[key]);
                    } else {
                        jsautogui.keyboard.up(key.toLowerCase());
                    }
                }
            }
        catch (error) {
            console.error("키 처리 중 오류 발생:", error.message);
        }
    });
    
});