const http = require("http");
const socketIo = require("socket.io");
const jsautogui = require("jsautogui");
const robot = require("robotjs");
const fs = require("fs");
const path = require("path");
const net = require("net");

const server = http.createServer((req, res) => {
    if (req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        fs.createReadStream(path.join(__dirname, 'index.html')).pipe(res);
    }
});

const io = socketIo(server);
const screenSize = robot.getScreenSize();

// 방향키 매핑
const keyMapping = {
    "arrowup": "up",
    "arrowdown": "down",
    "arrowleft": "left",
    "arrowright": "right",
    "control": "ctrl",  // 이미 잘 작동 중
    "hangulmode": "hanguel"  // 이미 잘 작동 중
};

function sendToPython(command) {
    return new Promise((resolve, reject) => {
        const client = net.createConnection({ port: 5000 }, () => {
            client.write(JSON.stringify(command));
        });
        client.on("error", (err) => {
            console.error("Python connection error:", err.message);
            reject(err);
        });
        client.on("close", () => resolve());
    });
}

server.listen(8081, () => {
    console.log("서버가 실행 중입니다. 포트: 8081");
});

io.on("connection", (socket) => {
    console.log("클라이언트 연결됨");

    socket.on("relativeMouseMove", async ({ movementX, movementY }) => {
        try {
            const command = { action: "mouseMove", x: movementX, y: movementY };
            await sendToPython(command);
        } catch (error) {
            console.error("Mouse move error:", error.message);
        }
    });

    socket.on("absoluteMouseMove", ({ clientX, clientY, clientWidth, clientHeight }) => {
        try {
            const scaleX = screenSize.width / clientWidth;
            const scaleY = screenSize.height / clientHeight;
            const serverX = Math.round(clientX * scaleX);
            const serverY = Math.round(clientY * scaleY);
            jsautogui.mouse.moveTo(serverX, serverY, 0);
        } catch (error) {
            console.error("마우스 이동 오류:", error.message);
        }
    });

    socket.on("mouseClick", async ({ button, type }) => {
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

    socket.on("mouseWheel", ({ deltaY }) => {
        try {
            jsautogui.mouse.scroll(0, deltaY * -1);
        } catch (error) {
            console.error("마우스 휠 처리 중 오류:", error.message);
        }
    });

    socket.on("keyPress", async ({ key, type }) => {
        try {
            const mappedKey = keyMapping[key.toLowerCase()] || key.toLowerCase();
            const command = { action: type === "down" ? "keyDown" : "keyUp", key: mappedKey, mode: "game" };
            console.log(`Sending to Python (game): ${JSON.stringify(command)}`);
            await sendToPython(command);
        } catch (error) {
            console.error("키 처리 중 오류 발생:", error.message);
        }
    });

    socket.on("work_keyPress", async ({ key, type }) => {
        try {
            const mappedKey = keyMapping[key.toLowerCase()] || key.toLowerCase();
            const command = { action: type === "down" ? "keyDown" : "keyUp", key: mappedKey, mode: "work" };
            console.log(`Sending to Python (work): ${JSON.stringify(command)}`);
            await sendToPython(command);
        } catch (error) {
            console.error("키 처리 중 오류 발생:", error.message);
        }
    });
});