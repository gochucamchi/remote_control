const http = require("http");
const socketIo = require("socket.io");
const robot = require("robotjs");
const fs = require("fs");
const path = require("path");
const jsautogui = require("jsautogui");
const net = require("net");

const robotSpactial = {
    '_': '_',
    "/": "/",
    "?": "?",
    "{": "{",
    "}": "}",
    "[": "[",
    "]": "]",
    '=': '=',
    ":": ":",
    ';': ';',
    '\\': '\\',
    '~': '~',
    };
const specialKeys = {
    "₩": "₩",
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
    "_": "-",
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

const { spawn } = require('child_process');




const server = http.createServer((req, res) => {
    if (req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        fs.createReadStream(path.join(__dirname, 'index.html')).pipe(res);
    }
});


const io = socketIo(server);
const screenSize = robot.getScreenSize(); // 서버 컴퓨터의 화면 크기

function sendToPython(command) {
    return new Promise((resolve, reject) => {
        const client = net.createConnection({ port: 5000 }, () => {
            const data = JSON.stringify(command);
            //console.log(`Sending to Python: ${data}`);  // 전송 데이터 확인
            client.write(data);
        });

        client.on("data", (data) => {
            //console.log(`Python response: ${data.toString()}`);
            client.end();
            resolve();
        });

         client.on("error", (err) => {
             console.error("Python connection error:", err.message);
            reject(err);
         });
    });
}



server.listen(8080, () => {
    console.log("서버가 실행 중입니다. 포트: 8080");
});

io.on("connection", (socket) => {
    socket.on("relativeMouseMove", async ({ movementX, movementY }) => {
        try {
            const command = { action: "mouseMove", x: movementX, y: movementY };
            await sendToPython(command);
        } catch (error) {
            console.error("Mouse move error:", error.message);
        }
    });
});

io.on("connection", (socket) => {
    console.log("클라이언트 연결됨");
           // Pointer Lock 상태에서 상대 좌표 이동 처리
           socket.on('relativeMouseMove', async ({ movementX, movementY }) => {
            try {
                const command = {
                    action: "mouseMove",
                    x: movementX,
                    y: movementY
                };
                await sendToPython(command);
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

    socket.on('mouseClick', async ({ button, type }) => {
        try {
            const command = {
                action: type === "down" ? "mouseDown" : "mouseUp",
                button: button === 0 ? "left" : button === 1 ? "middle" : "right"
            };
            await sendToPython(command);
        } catch (error) {
            console.error("마우스 클릭 처리 중 오류:", error.message);
        }
    });
    

    const scrollspeed = -1;
    //socket.on('mouseWheel', async ({ deltaY }) => {
    //    try {
    //        const command = {
    //            action: "mouseScroll",
    //            scrollY: deltaY
    //        };
     //       await sendToPython(command);
    //    } catch (error) {
    //        console.error("마우스 휠 처리 중 오류:", error.message);
   //     }
   // });

    socket.on('mouseWheel', ({ deltaY }) => {
        try {
            jsautogui.mouse.scroll(0,deltaY * scrollspeed)
        } catch (error) {
            console.error("마우스 휠 처리 중 오류:", error.message);
        }
});
    

    // 키보드 입력 처리
    socket.on("keyPress", async ({ key, type }) => {
        try {
            const command = {
                action: type === "down" ? "keyDown" : "keyUp",
                key: key.toLowerCase()
            };
            await sendToPython(command);
        } catch (error) {
            console.error("키 처리 중 오류 발생:", error.message);
        }
    });

   // 키보드 입력 처리
   socket.on("work_keyPress", ({ key, type }) => {
    try {
            if (type === "down") {
                if (specialKeys[key]) {
                    jsautogui.keyboard.down(specialKeys[key]);
                }
                else if (robotSpactial[key]) {
                    robot.keyTap(robotSpactial[key]);
                }
                 else {
                    jsautogui.keyboard.down(key.toLowerCase());
                }
            } else if (type === "up") {
                if (specialKeys[key]) {
                    jsautogui.keyboard.up(specialKeys[key]);
                }
                 else {
                    jsautogui.keyboard.up(key.toLowerCase());
                }
            }
        }
    catch (error) {
        console.error("키 처리 중 오류 발생:", error.message);
    }
});
    
    
});