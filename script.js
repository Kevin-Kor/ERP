// script.js 내 checkRankBtn 이벤트 리스너 안쪽

// ... (이전 코드: targetUrl, keywords 변수 할당 후)

resultsSection.style.display = 'block';
resultsTableContainer.innerHTML = ''; // 이전 결과 지우기
loadingMessage.style.display = 'block';

try {
    const response = await fetch('http://127.0.0.1:5001/api/check-rank', { // 백엔드 API 주소
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ targetUrl, keywords })
    });

    if (!response.ok) {
        // 서버 응답이 ok가 아닐 경우 (예: 400, 500 에러)
        const errorData = await response.json().catch(() => ({ detail: "서버 응답 분석 중 오류 발생" }));
        throw new Error(errorData.error || `서버 오류: ${response.status}`);
    }

    const data = await response.json();
    displayResults(data); // 기존 결과 표시 함수 호출

} catch (error) {
    console.error('API 호출 중 오류 발생:', error);
    loadingMessage.style.display = 'none';
    resultsTableContainer.innerHTML = `<p>오류가 발생했습니다: ${error.message}</p>`;
}

// --- 데모용 임시 결과 (setTimeout 부분)은 삭제하거나 주석 처리 ---
// setTimeout(() => { ... }, 2000); // 이 부분 삭제 또는 주석 처리