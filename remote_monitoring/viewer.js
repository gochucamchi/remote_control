const screenView = document.getElementById('screen-view');
const SERVER_URL = 'ws://gocam.p-e.kr:8080';
const socket = new WebSocket(SERVER_URL);

// 공유 PC의 실제 해상도를 저장할 변수
let nativeResolution = { width: 0, height: 0 };

socket.onopen = () => console.log('서버에 성공적으로 연결되었습니다.');
socket.onclose = () => {
    console.log('서버와의 연결이 끊어졌습니다.');
    screenView.alt = "서버 연결이 끊어졌습니다.";
};
socket.onerror = (error) => console.error('WebSocket 오류 발생:', error);

socket.onmessage = (event) => {
    // 1. 메시지가 문자열(string)이면 JSON 데이터로 간주 (해상도 정보 등)
    if (typeof event.data === 'string') {
        try {
            const data = JSON.parse(event.data);
            if (data.type === 'resolution') {
                nativeResolution = { width: data.width, height: data.height };
                console.log(`실제 해상도 수신: ${nativeResolution.width}x${nativeResolution.height}`);
            }
        } catch (e) {
            console.error('JSON 파싱 오류:', e);
        }
    } 
    // 2. 메시지가 Blob이면 이미지 데이터로 간주
    else if (event.data instanceof Blob) {
        const imageUrl = URL.createObjectURL(event.data);
        screenView.src = imageUrl;
    }
};

screenView.addEventListener('click', (event) => {
    // 실제 해상도 정보가 없으면 클릭 이벤트를 무시합니다.
    if (nativeResolution.width === 0) return;

    // 1. 현재 웹페이지에 표시된 이미지의 크기를 가져옵니다.
    const displayedWidth = screenView.clientWidth;
    const displayedHeight = screenView.clientHeight;

    // 2. 실제 해상도와 표시된 이미지 크기 사이의 비율을 계산합니다.
    const widthRatio = nativeResolution.width / displayedWidth;
    const heightRatio = nativeResolution.height / displayedHeight;

    // 3. 이미지 위에서 클릭된 로컬 좌표를 가져옵니다.
    const clickedX = event.offsetX;
    const clickedY = event.offsetY;

    // 4. 비율을 적용하여 실제 PC의 좌표를 계산합니다.
    const scaledX = Math.round(clickedX * widthRatio);
    const scaledY = Math.round(clickedY * heightRatio);
    
    const clickData = {
        type: 'click',
        x: scaledX,
        y: scaledY
    };

    socket.send(JSON.stringify(clickData));
    console.log(`클릭 좌표 전송 (계산됨): x=${scaledX}, y=${scaledY}`);
});
