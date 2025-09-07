# YouTube Data Collector

YouTube 동영상 데이터를 수집하고 분석할 수 있는 웹 애플리케이션입니다. 마케팅 담당자와 콘텐츠 제작자가 YouTube 트렌드를 파악하고 경쟁사 분석을 수행하는데 도움을 줍니다.

## 주요 기능

### 🔍 강력한 검색 기능
- **키워드 검색**: 관련 동영상을 키워드로 검색
- **최대 100개 결과**: 한 번에 최대 100개의 동영상 정보 수집
- **실시간 데이터**: YouTube API를 통한 실시간 데이터 수집

### 📊 상세한 메트릭 정보
- **조회수, 좋아요, 댓글 수**: 핵심 성과 지표
- **게시일**: 동영상 업로드 시점 정보
- **동영상 길이**: 콘텐츠 유형 분석 가능
- **채널 정보**: 채널명과 구독자 수

### 🎯 고급 필터링
- **지역 필터**: 한국, 미국, 일본, 영국
- **업로드 기간**: 오늘/1주일/1개월/1년/전체
- **콘텐츠 타입**: 전체/쇼츠/일반 동영상
- **최소 조회수**: 인기 동영상만 필터링

### 📈 데이터 분석 및 내보내기
- **통계 대시보드**: 수집된 데이터의 시각적 분석
- **CSV 내보내기**: 엑셀 호환 형식으로 데이터 다운로드
- **차트 및 그래프**: 조회수, 좋아요 분포 시각화

## 기술 스택

- **Frontend**: Next.js 14, React 19, TypeScript
- **UI**: Tailwind CSS, shadcn/ui
- **State Management**: TanStack Query (React Query)
- **Form Handling**: React Hook Form + Zod 검증
- **Charts**: Recharts
- **Data Export**: PapaParse (CSV)
- **API**: YouTube Data API v3

## 시작하기

### 1. 환경 설정

먼저 YouTube API 키가 필요합니다:
1. [Google Cloud Console](https://console.cloud.google.com/)에서 프로젝트 생성
2. YouTube Data API v3 활성화
3. API 키 생성

### 2. 설치 및 실행

```bash
# 의존성 설치
npm install

# 환경 변수 설정
cp .env.local.example .env.local
# YOUTUBE_API_KEY를 실제 API 키로 수정

# 개발 서버 실행
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 애플리케이션을 확인하세요.

### 3. 환경 변수

`.env.local` 파일을 생성하고 다음 내용을 추가하세요:

```env
YOUTUBE_API_KEY=your_youtube_api_key_here
```

## 사용법

1. **검색어 입력**: 분석하고자 하는 키워드 입력
2. **필터 설정**: 지역, 업로드 기간, 콘텐츠 타입 등 설정
3. **검색 실행**: "데이터 수집" 버튼 클릭
4. **결과 분석**: 테이블과 차트로 결과 확인
5. **데이터 내보내기**: CSV 파일로 다운로드

## API 사용량

- **일일 할당량**: 10,000 units
- **검색당 소비**: 약 100 units
- **권장**: 하루 최대 100회 검색

## 배포

### Vercel (권장)
```bash
# Vercel CLI 설치
npm i -g vercel

# 배포
vercel
```

### 기타 플랫폼
- Netlify
- GitHub Pages (정적 내보내기 후)
- 자체 서버

## 개발

### 주요 명령어
```bash
npm run dev          # 개발 서버
npm run build        # 프로덕션 빌드
npm run start        # 프로덕션 서버
npm run lint         # 코드 검사
```

### 프로젝트 구조
```
src/
├── app/             # Next.js App Router
├── components/      # React 컴포넌트
├── hooks/           # 커스텀 훅
├── lib/             # 유틸리티 함수
└── types/           # TypeScript 타입 정의
```

## 라이선스

MIT License - 자유롭게 사용, 수정, 배포 가능합니다.

## 기여

Issue와 Pull Request는 언제든 환영합니다!

## 지원

문제가 있거나 기능 요청이 있으시면 GitHub Issue를 통해 알려주세요.