const express = require("express");
const fs = require("fs");
const https = require("https");
const socketIo = require("socket.io");
const path = require("path");

const app = express();

// ✅ ZeroSSL SSL 인증서 적용
const httpsOptions = {
    key: fs.readFileSync("./private.key"),      // 개인 키
    cert: fs.readFileSync("./certificate.crt"), // SSL 인증서
    ca: fs.readFileSync("./ca_bundle.crt")      // 중간 인증서 (CA 인증서)
};

// ✅ HTTPS 서버 생성
const server = https.createServer(httpsOptions, app);
const io = socketIo(server, { cors: { origin: "*" } });

// ✅ 정적 파일 서빙 (view.html, share.html 제공)
app.use(express.static(path.join(__dirname)));

let broadcaster = null;
let viewer = null;

// ✅ Xirsys TURN 서버 정보를 가져오는 함수
function getXirsysIceServers(callback) {
    const options = {
        host: "global.xirsys.net",
        path: "/_turn/gocham.zapto.org",  // 사용자의 Xirsys 도메인
        method: "PUT",
        headers: {
            "Authorization": "Basic " + Buffer.from("gocham:f44a125a-e122-11ef-9b2c-0242ac130003").toString("base64"),
            "Content-Type": "application/json"
        }
    };

    const request = https.request(options, (response) => {
        let data = "";
        response.on("data", (chunk) => { data += chunk; });
        response.on("end", () => {
            try {
                const result = JSON.parse(data);
                if (result.s === "ok") {
                    console.log("✅ Xirsys ICE 서버 정보 갱신됨:", result.v.iceServers);
                    callback(result.v.iceServers);
                } else {
                    console.error("❌ Xirsys 응답 오류:", result);
                    callback([]);
                }
            } catch (error) {
                console.error("❌ Xirsys JSON 파싱 오류:", error);
                callback([]);
            }
        });
    });

    request.on("error", (error) => {
        console.error("❌ Xirsys 요청 오류:", error);
        callback([]);
    });

    request.end();
}

// ✅ ICE 서버 정보를 저장할 변수
let iceServers = [];

// ✅ 서버 시작 시 Xirsys에서 TURN 서버 정보 가져오기
getXirsysIceServers((servers) => {
    iceServers = servers;
});

// ✅ 클라이언트가 ICE 서버 정보를 요청하면 전달
app.get("/iceservers", (req, res) => {
    res.json({ iceServers });
});

// ✅ WebRTC 시그널링
io.on("connection", (socket) => {
    
    console.log(`✅ 클라이언트 연결됨: ${socket.id}`);

    socket.on("broadcaster-ready", () => {
        broadcaster = socket.id;
        console.log(`📡 Broadcaster 등록: ${broadcaster}`);
        if (viewer) {
            io.to(viewer).emit("broadcaster-available", broadcaster);
        }
    });

    socket.on("watcher-ready", () => {
        if (viewer) {
            console.log("❌ 새로운 Viewer 접속 시도 (이미 시청 중인 Viewer가 있음)");
            io.to(socket.id).emit("viewer-denied", "이미 누군가 시청 중입니다.");
            return; // 기존 Viewer가 있으면 새로운 Viewer 차단
        }

        viewer = socket.id;
        console.log(`👀 Viewer 등록: ${viewer}`);
        if (broadcaster) {
            io.to(viewer).emit("broadcaster-available", broadcaster);
            io.to(broadcaster).emit("viewer-available", viewer);
        }
    });

    socket.on("offer", (targetId, offer) => {
        io.to(targetId).emit("offer", socket.id, offer);
    });

    socket.on("answer", (targetId, answer) => {
        io.to(targetId).emit("answer", socket.id, answer);
    });

    socket.on("candidate", (targetId, candidate) => {
        io.to(targetId).emit("candidate", socket.id, candidate);
    });

    socket.on("disconnect", () => {
        console.log(`❌ 클라이언트 연결 해제: ${socket.id}`);
        if (socket.id === broadcaster) {
            broadcaster = null;
            io.emit("broadcaster-disconnected");
        }
        if (socket.id === viewer) {
            viewer = null; // Viewer가 나가면 새로운 Viewer가 들어올 수 있도록 허용
        }
    });
});

// ✅ HTTPS 서버 실행 (443 포트)
const PORT = 443;
server.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 HTTPS WebRTC P2P 서버 실행 중: https://gocham.zapto.org`);
});
