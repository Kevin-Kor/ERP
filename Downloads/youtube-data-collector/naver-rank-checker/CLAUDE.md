# CLAUDE.md

이 파일은 Claude Code가 YouTube Data Collector 프로젝트에서 작업할 때 필요한 가이드라인을 제공합니다.

## 프로젝트 개요

YouTube Data API v3를 활용한 동영상 데이터 수집 및 분석 웹 애플리케이션입니다. 마케팅 담당자와 콘텐츠 제작자가 YouTube 트렌드 분석과 경쟁사 조사를 수행할 수 있도록 도와줍니다.

## 기술 스택

- **Frontend Framework**: Next.js 14 (App Router)
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS 4.x
- **UI Components**: shadcn/ui
- **State Management**: TanStack Query (React Query) v5
- **Form Management**: React Hook Form + Zod
- **HTTP Client**: Axios
- **Charts**: Recharts
- **Data Export**: PapaParse
- **Date Handling**: date-fns
- **Icons**: Lucide React

## 프로젝트 구조

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # 루트 레이아웃
│   ├── page.tsx           # 홈페이지
│   └── api/               # API 라우트
│       ├── youtube/       # YouTube API 엔드포인트
│       │   ├── search/    # 동영상 검색
│       │   └── videos/    # 동영상 상세정보
├── components/            # React 컴포넌트
│   ├── ui/               # shadcn/ui 기본 컴포넌트
│   ├── search-form.tsx   # 검색 폼
│   ├── results-table.tsx # 결과 테이블
│   ├── stats-dashboard.tsx # 통계 대시보드
│   ├── export-button.tsx # CSV 내보내기 버튼
│   └── video-card.tsx    # 동영상 카드
├── hooks/                # 커스텀 훅
│   └── use-youtube-api.tsx # YouTube API 훅
├── lib/                  # 유틸리티 함수
│   ├── utils.ts          # 일반 유틸리티
│   ├── youtube-client.ts # YouTube API 클라이언트
│   └── validations.ts    # Zod 스키마
└── types/                # TypeScript 타입 정의
    └── youtube.ts        # YouTube API 타입
```

## 환경 설정

### 필수 환경 변수
```env
YOUTUBE_API_KEY=your_api_key_here
```

### 개발 명령어
- `npm run dev`: 개발 서버 실행 (포트 3000)
- `npm run build`: 프로덕션 빌드
- `npm run start`: 프로덕션 서버 실행
- `npm run lint`: ESLint 검사
- `npm run type-check`: TypeScript 타입 검사

## YouTube API 통합

### API 엔드포인트
1. **Search API** (`/api/youtube/search`)
   - 키워드로 동영상 검색
   - 지역, 기간, 콘텐츠 타입 필터 지원
   - 최대 100개 결과 반환

2. **Videos API** (`/api/youtube/videos`)
   - 동영상 ID로 상세 정보 조회
   - 조회수, 좋아요, 댓글 수 등 메트릭 포함

### API 사용량 관리
- 일일 할당량: 10,000 units
- 검색 1회당 약 100 units 소비
- 에러 핸들링: 할당량 초과, 네트워크 오류 등

## 코딩 컨벤션

### TypeScript
- 모든 컴포넌트와 함수에 적절한 타입 정의
- 인터페이스보다 타입 별칭 선호 (type vs interface)
- 유니온 타입과 제네릭 적극 활용

### React 컴포넌트
- 함수형 컴포넌트 사용
- 커스텀 훅으로 로직 분리
- Props 인터페이스는 컴포넌트명 + Props 형식
- forwardRef 필요시에만 사용

### 스타일링
- Tailwind CSS 클래스 우선 사용
- 복잡한 스타일은 CSS 변수 활용
- 반응형 디자인 (`sm:`, `md:`, `lg:` 등)
- 다크모드 지원 (`dark:`)

### 상태 관리
- 서버 상태: TanStack Query
- 클라이언트 상태: React useState/useReducer
- 전역 상태 필요시 Context API 사용

## 컴포넌트 가이드라인

### 폼 컴포넌트 (`search-form.tsx`)
- React Hook Form + Zod 검증 패턴
- 에러 메시지 표시
- 로딩 상태 처리
- 접근성 고려 (aria-label, htmlFor 등)

### 데이터 테이블 (`results-table.tsx`)
- 정렬 기능
- 페이지네이션 (필요시)
- 반응형 디자인
- CSV 내보내기 연동

### 차트 컴포넌트 (`stats-dashboard.tsx`)
- Recharts 라이브러리 사용
- 반응형 차트
- 툴팁 및 범례 포함
- 데이터 없음 상태 처리

## API 클라이언트 패턴

### YouTube API 클라이언트 (`lib/youtube-client.ts`)
```typescript
export class YouTubeClient {
  private apiKey: string;
  private baseURL = 'https://www.googleapis.com/youtube/v3';
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  async search(params: SearchParams): Promise<SearchResponse> {
    // 구현
  }
}
```

### React Query 훅 (`hooks/use-youtube-api.tsx`)
```typescript
export const useYouTubeSearch = () => {
  return useMutation({
    mutationFn: (params: SearchParams) => youtubeClient.search(params),
    onError: (error) => {
      // 에러 처리
    }
  });
};
```

## 에러 처리

### API 에러
- 네트워크 오류
- API 키 invalid/missing
- 할당량 초과
- 잘못된 요청 파라미터

### UI 에러 표시
- Toast 알림 (성공/에러)
- 폼 검증 에러
- 로딩/에러 상태 표시

## 성능 최적화

### React Query 캐싱
- 검색 결과 캐싱 (5분)
- Background refetch 비활성화
- Optimistic updates

### 컴포넌트 최적화
- React.memo 선택적 사용
- useMemo/useCallback 적절히 활용
- 큰 데이터셋 가상화 (react-window)

## 테스트 전략

### 단위 테스트
- 유틸리티 함수
- 커스텀 훅
- 순수 컴포넌트

### 통합 테스트
- API 엔드포인트
- 폼 제출 플로우
- 데이터 변환 로직

## 배포 및 환경

### 개발 환경
- Next.js 개발 서버
- 핫 리로드 지원
- TypeScript 실시간 타입 체크

### 프로덕션 배포
- Vercel (권장)
- 환경 변수 안전한 관리
- 성능 모니터링

## 보안 고려사항

### API 키 보안
- 서버 사이드에서만 API 키 사용
- 환경 변수로 관리
- 클라이언트에 노출 금지

### 사용자 입력 검증
- Zod 스키마 검증
- XSS 방지
- SQL 인젝션 방지 (해당없음)

## 접근성 (A11y)

### 키보드 내비게이션
- Tab 순서 적절히 설정
- Focus indicator 표시
- Skip navigation 링크

### 스크린 리더 지원
- aria-label, aria-describedby
- semantic HTML 사용
- alt 텍스트 제공

## 국제화 (i18n)

현재는 한국어만 지원하지만, 향후 다국어 지원을 위한 준비:
- 하드코딩된 텍스트 최소화
- next-i18next 라이브러리 검토
- 날짜/숫자 포맷팅 고려

## 개발 워크플로우

1. **기능 개발 시작**
   - 관련 타입 정의 먼저 작성
   - API 스키마 확인
   - 컴포넌트 인터페이스 설계

2. **구현**
   - TypeScript strict mode 준수
   - 에러 처리 포함
   - 로딩 상태 고려

3. **테스트**
   - 기본 동작 확인
   - 에지 케이스 테스트
   - 반응형 디자인 확인

4. **리뷰**
   - 코드 품질 확인
   - 성능 이슈 점검
   - 접근성 검증

## 문제 해결

### 일반적인 이슈
- API 할당량 초과: 사용량 모니터링 필요
- CORS 에러: Next.js API 라우트 통해 프록시
- 느린 응답: 결과 수 제한, 캐싱 활용

### 디버깅 도구
- React Developer Tools
- TanStack Query Devtools
- Network tab (API 요청 확인)
- TypeScript 컴파일러 출력

## 참고 문서

- [YouTube Data API v3](https://developers.google.com/youtube/v3)
- [Next.js 14 Documentation](https://nextjs.org/docs)
- [TanStack Query](https://tanstack.com/query)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)