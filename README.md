# Agency ERP - 마케팅 에이전시 관리 시스템

인플루언서 마케팅 에이전시를 위한 통합 관리 시스템입니다.

## 주요 기능

### 📊 대시보드
- 이번 달 매출/비용/순이익 요약
- 미수금, 미정산, 세금계산서 미발행 알림
- 진행 중 캠페인 현황
- 최근 활동 로그

### 👥 클라이언트 관리
- 클라이언트 정보 CRUD
- 클라이언트별 프로젝트/재무/문서 통합 조회
- 상태 관리 (활성/휴면/종료)

### 📁 프로젝트/캠페인 관리
- 캠페인 정보 관리
- 인플루언서 배정 및 정산 연결
- 프로젝트 상태 추적 (견적중/진행중/완료/취소)
- 플랫폼 및 콘텐츠 유형 태깅

### 🎯 인플루언서 관리
- 인플루언서 DB 관리
- SNS 정보 및 팔로워 수 기록
- 단가 범위 및 협업 이력 관리
- 카테고리별 분류

### 💰 정산 관리
- 프로젝트별 인플루언서 정산 추적
- 정산 상태 관리 (대기/요청됨/완료)
- 미정산 금액 실시간 집계

### 📈 재무 관리
- 수익/비용 거래 내역 기록
- 카테고리별 분류
- 월별 손익 분석
- 미수금 관리

### 📄 문서 관리
- 견적서/세금계산서/계약서 관리
- 문서 번호 자동 생성
- 발행 상태 추적

### 📅 캘린더
- 프로젝트 일정 통합 뷰
- 정산/입금 예정일 표시
- 월별 일정 관리

## 기술 스택

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui + Radix UI
- **Database**: SQLite (개발) / PostgreSQL (프로덕션)
- **ORM**: Prisma
- **Authentication**: NextAuth.js
- **State Management**: TanStack Query
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts

## 시작하기

### 요구사항
- Node.js 18+
- npm or yarn

### 설치

```bash
# 저장소 클론
git clone <repository-url>
cd agency-erp

# 의존성 설치
npm install

# 데이터베이스 마이그레이션
npm run db:migrate

# 테스트 데이터 시드
npm run db:seed

# 개발 서버 실행
npm run dev
```

### 환경 변수

`.env` 파일을 생성하고 다음 변수를 설정하세요:

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"
```

### 테스트 계정

- **관리자**
  - 이메일: `admin@agency.com`
  - 비밀번호: `admin123`

- **팀원**
  - 이메일: `member@agency.com`
  - 비밀번호: `member123`

## 스크립트

```bash
npm run dev          # 개발 서버 실행
npm run build        # 프로덕션 빌드
npm run start        # 프로덕션 서버 실행
npm run lint         # ESLint 실행
npm run db:migrate   # 데이터베이스 마이그레이션
npm run db:seed      # 테스트 데이터 시드
npm run db:studio    # Prisma Studio 실행
npm run db:reset     # DB 초기화 후 시드
```

## 디렉토리 구조

```
src/
├── app/                    # Next.js App Router
│   ├── (dashboard)/       # 대시보드 라우트 그룹
│   │   ├── clients/       # 클라이언트 관리
│   │   ├── projects/      # 프로젝트 관리
│   │   ├── influencers/   # 인플루언서 관리
│   │   ├── settlements/   # 정산 관리
│   │   ├── finance/       # 재무 관리
│   │   ├── documents/     # 문서 관리
│   │   ├── calendar/      # 캘린더
│   │   └── settings/      # 설정
│   ├── api/               # API 라우트
│   └── login/             # 로그인 페이지
├── components/
│   ├── ui/                # shadcn/ui 컴포넌트
│   ├── layout/            # 레이아웃 컴포넌트
│   └── forms/             # 폼 컴포넌트
├── lib/                   # 유틸리티 함수
├── providers/             # React Context Providers
└── types/                 # TypeScript 타입 정의
```

## 라이선스

MIT License

## 문의

이 프로젝트에 대한 문의사항이 있으시면 이슈를 생성해주세요.
