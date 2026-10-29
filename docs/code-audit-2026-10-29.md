# ERP 저장소 코드 점검 보고서 (2026-10-29)

- 대상 커밋: `48261c5` (main 기준, PR #42 머지 이후)
- 범위: `src/` 전체(API 32개 라우트, 페이지, 컴포넌트, lib), `prisma/`, 루트 설정·정적 파일
- 방법: 전 API 라우트 정독, 페이지·컴포넌트 패턴 검색, `tsc --noEmit`(임시 설정으로 실행), `eslint` 실행
- **코드는 수정하지 않았습니다.** 이 문서만 추가했습니다.

> 표기: `파일:라인`. 심각도는 🔴 치명 / 🟠 높음 / 🟡 중간 / ⚪ 낮음.

---

## 0. 요약 (먼저 읽을 것)

| # | 내용 | 심각도 |
|---|------|--------|
| 1 | **API 인증이 사실상 없음.** `middleware.ts`가 없고, 32개 라우트 중 `google/*` 4개 외에는 세션 확인을 하지 않음. URL만 알면 누구나 거래·고객·인플루언서(계좌번호 포함) 데이터를 조회·수정·삭제할 수 있음 | 🔴 |
| 2 | **정산 상태값(`paymentStatus`) 대소문자 혼용.** 화면마다 `pending`(소문자)과 `PENDING`(대문자)을 따로 저장하고, 조회 쪽은 한쪽만 비교함 → 대시보드·Slack 알림·정산 합계·인플루언서 상세 금액이 틀리게 나옴 | 🔴 |
| 3 | 문서 삭제 API의 경로 조작(Path Traversal)으로 서버 파일 삭제 가능, 업로드 파일은 공개 URL로 노출됨 | 🔴 |
| 4 | Google OAuth `state`에 서명 없는 userId를 그대로 넣음 + `/api/users`가 userId를 공개 → 남의 ERP 계정에 공격자 구글 캘린더를 연결할 수 있음 | 🟠 |
| 5 | `tsconfig.json`의 `exclude: ["../**/*"]` 때문에 타입체크가 사실상 꺼져 있음(타입 오류 15건이 숨어 있음). `npm run lint`는 실행 즉시 크래시남 | 🟠 |
| 6 | Prisma 마이그레이션 누락: `ClientVisit/ClientPayment/ClientVideo/ClientMemo/TeamTodo*` 7개 테이블의 마이그레이션이 없음 → 새 DB에 `migrate deploy`를 하면 해당 기능이 동작하지 않음 | 🟠 |

---

## 1. 프로젝트 구조와 주요 모듈

**스택**: Next.js 16 (App Router) · React 19 · TypeScript · Prisma 5 + PostgreSQL(Supabase) · NextAuth v4(Credentials/JWT) · TanStack Query · Tailwind 4 + Radix UI · Supabase Storage · Slack Web API · OpenAI(gpt-4o-mini) · Google Calendar API · Vercel Cron

```
prisma/              schema.prisma(16 모델), migrations(3개), seed.ts, reset.ts, dev.db(SQLite, 잔재)
src/lib/             auth.ts(NextAuth), prisma.ts, supabase.ts, slack.ts(서명검증/메시지 포맷),
                     ai-parser.ts(자연어→intent), google-calendar.ts, utils.ts(카테고리 상수 등)
src/app/api/         REST 라우트 (아래 표)
src/app/(dashboard)/ 클라이언트 컴포넌트 페이지 (layout.tsx에서 useSession으로만 로그인 확인)
src/components/      ui(shadcn), forms(client/project/transaction), layout(sidebar/header), modals
루트 정적 파일        index.html, script.js, style.css, team-todo.{html,js,css}, dev.db  ← ERP와 무관한 잔재
```

| 도메인 | API | 화면 | 비고 |
|---|---|---|---|
| 대시보드 | `api/dashboard` | `(dashboard)/page.tsx` | 이번 달 매출/비용, 미수금, 미정산, 세금계산서 미발행 |
| 클라이언트 | `api/clients`, `clients/[id]`, `clients/[id]/management` | `clients/*` | 고정업체(월정액), 방문/입금/영상/메모 관리 |
| 프로젝트 | `api/projects`, `projects/[id]`, `projects/[id]/influencers` | `projects/*` | 협업 인플루언서(정산) 일괄 저장 |
| 인플루언서 | `api/influencers`, `influencers/[id]` | `influencers/*` | 프로젝트 배정 동시 저장 |
| 정산 | `api/settlements`, `settlements/[id]`, `settlements/summary` | `settlements/page.tsx` | `ProjectInfluencer`를 정산 단위로 사용 |
| 재무 | `api/transactions`, `transactions/[id]`, `transactions/migrate-month` | `finance/page.tsx`, `finance/bulk` | 매출/지출, 미수금, 월 이동 |
| 문서 | `api/documents`, `documents/[id]`, `documents/upload` | `documents/*`, 견적서 생성기(정적 HTML) | Supabase Storage 업로드 |
| 캘린더 | `api/calendar`, `calendar/[id]`, `api/google/*` | `calendar/page.tsx` | Google 양방향 동기화, 푸시 웹훅 |
| 팀 To-Do | `api/team-todo` | `todo/page.tsx`, `team-todo/page.tsx`(중복) | 담당자×컬럼 매트릭스 |
| Slack 봇 | `api/slack/webhook` | - | 채널 메시지 → OpenAI로 intent 파싱 → DB 생성/조회/수정 |
| Cron | `api/cron/{daily-alerts,weekly-report,monthly-report}` | - | `vercel.json`, `CRON_SECRET` 인증(정상) |

---

## 2. 버그 / 버그 가능성이 높은 부분

### 🔴 B1. 정산 상태값 대소문자 혼용 → 집계·알림·버튼 동작 오류
저장하는 쪽이 둘로 나뉨:
- **소문자로 저장**: `api/projects/[id]/influencers/route.ts:13-18, 35`(normalizeStatus), `api/influencers/route.ts:75`(`.toLowerCase()`), `api/influencers/[id]/route.ts:81`
- **대문자로 저장**: `settlements/page.tsx:473-475, 732-734`(PENDING/REQUESTED/COMPLETED), Slack 봇, 스키마 기본값 `"PENDING"`

읽는 쪽 문제:
- `api/dashboard/route.ts:87`, `api/cron/daily-alerts/route.ts:139`, `weekly-report/route.ts:187`, `monthly-report/route.ts:245,253`이 `["PENDING","REQUESTED"]`만 조회함 → 프로젝트/인플루언서 화면에서 등록한 정산은 **대시보드 미정산과 Slack 마감 알림에서 빠짐**
- `api/settlements/route.ts:97`은 응답을 소문자로 바꿔서 내려주는데, `settlements/page.tsx:725,732`는 `"COMPLETED"`/`"PENDING"`과 비교함 → 완료된 건에도 처리 버튼이 계속 보이고, "요청됨" 단계를 건너뛰고 바로 완료 처리됨
- `api/settlements/route.ts:108-127` 합계는 원본 값을 대문자와 비교함 → 소문자 레코드는 pending/completed 합계에서 빠짐
- `api/settlements/route.ts:21` 필터 `in: [in_progress, IN_PROGRESS]`에는 `REQUESTED`가 들어가지 않음 → "요청됨" 필터에서 대문자 레코드가 누락됨
- `influencers/[id]/page.tsx:185,189`: API(`influencers/[id]/route.ts:45`)가 소문자로 정규화해 내려주는데 화면은 `"COMPLETED"`와 비교함 → **정산 완료액이 항상 0원, 미정산액이 전체 금액으로 표시됨**
- `influencers/page.tsx:165`도 같은 문제(소문자로 저장된 레코드는 완료 합계에서 빠짐)

**작업 지시**: 상태값을 `PENDING | REQUESTED | COMPLETED`(대문자) 하나로 통일하고 Prisma `enum`으로 바꿈 → 기존 데이터 정규화 마이그레이션(`UPDATE "ProjectInfluencer" SET "paymentStatus"=UPPER(...)`, `in_progress`→`REQUESTED`) → 5곳에 복붙된 `normalizeStatus`를 `lib/constants.ts` 하나로 모음.

### 🔴 B2. Slack에서 정산 완료 처리가 항상 실패함
`api/slack/webhook/route.ts:937` — 스키마에 없는 `paidAt` 필드를 씀(tsc 오류 TS2353으로 확인). 실제 필드는 `paymentDate`. "OOO 정산 완료" 명령이 매번 "상태 업데이트 실패"로 끝남.

### 🟠 B3. 클라이언트 수정 시 이메일이 지워짐
`api/clients/[id]/route.ts:108` — `email: validatedData.email || null`. 요청 본문에 email이 없는 부분 수정(예: 상태만 변경)도 이메일을 `null`로 덮어씀.
**수정**: `...(validatedData.email !== undefined && { email: validatedData.email || null })`

### 🟠 B4. 캘린더 일정 수정 시 종료일이 지워짐
`api/calendar/[id]/route.ts:52` — `endDate: body.endDate ? ... : null`. 드래그로 날짜만 옮기는 것처럼 endDate를 보내지 않는 요청에서도 종료일이 `null`이 됨. `undefined`일 때는 필드를 건드리지 말아야 함.

### 🟠 B5. 문서번호 중복 → 생성 실패(500)
`api/documents/route.ts:56-63` — `count + 1`로 번호를 매김. ① 같은 달 문서를 하나라도 지우면 다음 번호가 기존 번호와 겹쳐 `@unique` 위반이 나고, ② 동시 생성 시에도 충돌함. 해당 prefix의 최대 번호를 조회해 +1 하거나, 연월별 시퀀스 테이블을 두고 재시도 로직을 추가해야 함.

### 🟠 B6. 타임존 처리 불일치 (KST vs UTC)
- 클라이언트 기본 날짜를 `new Date().toISOString().split("T")[0]`으로 잡음(23곳). 한국 시간 오전 0~9시에 열면 **어제 날짜**가 기본값으로 들어감. 예: `components/modals/quick-transaction-modal.tsx:41,49`, `components/forms/transaction-form.tsx:59`, `finance/page.tsx`, `documents/new/page.tsx`
- 서버는 `new Date(y, m-1, 1)`처럼 서버 로컬 시간(Vercel은 UTC)으로 월 범위를 계산함: `api/transactions/route.ts:18-19`, `api/dashboard/route.ts:7-8`, `api/calendar/route.ts`, cron 3종. 로컬(KST) 개발 환경과 운영 환경의 결과가 서로 다름
- `api/settlements/route.ts:26`, `settlements/summary/route.ts:23`은 UTC 월초 기준인데, 정산완료 시각은 `settlements/page.tsx:208`에서 실제 타임스탬프로 저장함 → **11/1 오전 9시(KST) 이전에 완료한 정산이 10월로 집계됨**
- `lib/google-calendar.ts:95,99`: UTC 날짜로 구글 종일 일정을 만듦 → 시간이 들어간 KST 오전 일정이 하루 앞당겨질 수 있음

**작업 지시**: `lib/date.ts`에 `todayKST()`, `monthRangeKST(yyyyMM)` 같은 유틸을 만들어 날짜 계산을 한곳으로 모음(`date-fns-tz` 또는 `Intl` 사용).

### 🟠 B7. 대량 등록 시 실패해도 "저장됨"으로 표시
`finance/bulk/page.tsx:366-401` — `fetch` 결과의 `res.ok`를 확인하지 않고 `savedCount++`함. 일부만 저장돼도 성공으로 안내되고, 사용자가 다시 저장하면 중복 거래가 생김. 서버에 일괄 저장 API(`prisma.$transaction`)를 만들어 전부 성공하거나 전부 실패하도록 바꿔야 함.

### 🟠 B8. Slack 이벤트 중복 처리 → 거래가 이중으로 등록됨
`api/slack/webhook/route.ts:9-31, 1315` — 중복 방지 캐시가 인스턴스 메모리(`Set`)라서 서버리스 환경에서는 인스턴스 간에 공유되지 않음. 게다가 OpenAI 호출을 포함한 전체 처리를 동기로 끝낸 뒤 응답하므로, 3초를 넘기면 Slack이 재전송함. `X-Slack-Retry-Num` 헤더도 확인하지 않음.
**수정**: 즉시 200을 반환하고 `after()`(Next 15+)로 비동기 처리, `event_id`는 DB 유니크 테이블로 중복 차단.

### 🟡 B9. Slack으로 등록한 인플루언서의 카테고리 형식이 다름
`api/slack/webhook/route.ts:187`은 `JSON.stringify(["뷰티"])`로 저장하고, 화면(`influencers/new/page.tsx:118`, `influencers/page.tsx:72`)은 콤마 구분 문자열로 처리함 → 화면에 `["뷰티"]`가 그대로 깨져 보임.

### 🟡 B10. 월 이동(migrate-month)이 원자적이지 않음
`api/transactions/migrate-month/route.ts:59` — 개별 update를 `Promise.all`로 실행함. 중간에 실패하면 일부만 이동된 채로 남음. `prisma.$transaction([...])`로 감싸야 함. (인증도 없어서 외부에서 한 달 치 거래 전체를 옮길 수 있음)

### 🟡 B11. 팀 To-Do 경쟁 조건 / 비원자적 처리
- `api/team-todo/route.ts:22-29` — **GET 요청이 기본 컬럼을 생성**함. 대시보드와 To-Do 화면이 동시에 GET을 보내면 기본 컬럼이 두 번 생길 수 있음(대시보드 `page.tsx:130`도 같은 API를 호출함)
- `:260-287` — 컬럼 삭제가 태스크 삭제 → 컬럼 삭제 → index 당기기 → order 재정렬의 4단계로 나뉘어 있고 트랜잭션이 없음. 태스크가 컬럼 ID가 아니라 **배열 인덱스**(`columnIndex`)로 컬럼을 참조해서, 중간에 실패하면 태스크가 엉뚱한 컬럼으로 옮겨감

### 🟡 B12. Google 동기화 누락·불일치
- 구글에서 삭제한 일정이 ERP에서는 지워지지 않음(webhook/sync 모두 삭제를 처리하지 않음)
- 자동 동기화를 꺼도 구글 watch 채널이 해제되지 않음(`api/google/sync/route.ts:338-343`). 연결 해제(DELETE)도 토큰 revoke나 채널 stop을 하지 않음
- push는 `userId = 본인`인 일정만 대상(`sync/route.ts:171-178`). `/api/calendar` POST가 userId를 강제하지 않으므로 화면에서 만든 일정이 동기화되지 않을 가능성이 있음(확인 필요)
- `googleEventId`가 전역 `@unique`라서, 두 사용자가 같은 공유 캘린더를 연결하면 두 번째 사용자의 create가 실패함

### 🟡 B13. 문서를 삭제해도 저장소 파일이 남음
`api/documents/[id]/route.ts:91-99` — `filePath`가 Supabase 공개 URL인데 로컬 `public/` 경로로 `fs.unlink`를 시도함 → 항상 실패하고 Supabase에는 파일이 계속 쌓임(보안 이슈는 S3 참고).

### ⚪ 기타
- 설정 화면의 비밀번호 변경·저장·백업·내보내기 버튼은 핸들러도 API도 없는 껍데기임(`settings/page.tsx:52-59` 등). 사용자는 비밀번호를 바꿀 방법이 없음
- 검색이 Postgres에서 대소문자를 구분함(`api/clients/route.ts:67-72`, `projects`, `influencers`) — `mode: "insensitive"` 누락
- Prisma `P2025`(레코드 없음)가 모두 500으로 응답됨 → 404로 매핑해야 함
- 클라이언트를 삭제하면 프로젝트·문서·정산(ProjectInfluencer)이 **CASCADE로 함께 삭제**되고 거래는 clientId가 null로 고아가 됨(`migration.sql:164,170,176,182`). 재무 데이터 보존이 필요하면 soft delete(`status=TERMINATED`)로 바꾸는 것이 안전함
- tsc로 드러난 타입 오류 15건: `clients/[id]/edit/page.tsx:44`, `projects/[id]/page.tsx:299`, `cron/monthly-report/route.ts:100-101`, `slack/webhook/route.ts:937,950,951,1376`, `components/forms/client-form.tsx:56,104`, `lib/slack.ts:244-268`

---

## 3. 보안 문제

### 🔴 S1. 서버 측 인증·인가 부재
- `src/middleware.ts`가 없음. 로그인 확인은 `(dashboard)/layout.tsx`의 클라이언트 측 `useSession`뿐이라 API는 그대로 열려 있음
- 세션을 확인하는 라우트는 `api/google/{auth,calendars,sync}`뿐임. 나머지 `clients, projects, influencers, settlements, transactions, documents, calendar, team-todo, dashboard, users, migrate-month`는 **인증 없이 조회·수정·삭제가 가능**함
- `api/users/route.ts:4` — 전 사용자의 이메일·ID·역할을 공개함
- `User.role`(ADMIN/MEMBER)은 저장만 되고 어디서도 권한 검사에 쓰이지 않음

**작업 지시**
1. `src/middleware.ts`(Next 16에서는 `proxy.ts`) 추가: `next-auth/middleware`의 `withAuth`로 `/api/:path*`를 보호하되, 예외는 `api/auth/*`, `api/slack/webhook`, `api/google/{callback,webhook}`, `api/cron/*`(각자 시크릿으로 인증)
2. 라우트 안에서도 `requireSession()` 헬퍼로 이중 확인(미들웨어 matcher 누락 대비)
3. 삭제·월 이동·사용자 목록은 `role === "ADMIN"`으로 제한

### 🔴 S2. 경로 조작(Path Traversal)으로 서버 파일 삭제 가능
`api/documents/[id]/route.ts:56`(PATCH로 `filePath`를 임의 값으로 설정 가능) + `:93-94`(`path.join(cwd,"public",filePath)` 후 `unlink`). 인증이 없으므로 `filePath="../../.env"`로 바꾼 뒤 DELETE하면 서버 파일이 삭제됨(Vercel은 읽기 전용 FS라 영향이 제한되지만 자체 호스팅 시에는 치명적). PATCH에서 `filePath`를 받지 않도록 하고, 삭제는 Supabase `storage.remove()`로 처리해야 함.

### 🔴 S3. 업로드 파일이 공개 URL로 노출됨
`api/documents/upload/route.ts:112` — `getPublicUrl` 사용. 세금계산서·계약서처럼 사업자번호와 금액이 담긴 파일이 URL만 알면 누구나 열람 가능함. 파일명도 `문서번호_타임스탬프`라 추측하기 쉬움. 버킷을 private으로 바꾸고 `createSignedUrl`(짧은 만료)로 내려줘야 함. 또한 `:54`는 `file.type`이 비어 있으면 형식 검사를 건너뛰고, 확장자도 원본 파일명에서 그대로 가져옴 → 확장자 화이트리스트를 무조건 적용해야 함.

### 🟠 S4. Google OAuth state 위조 (계정 연결 CSRF)
`api/google/auth/route.ts:21`이 `state=userId`를 쓰고, `api/google/callback/route.ts:13,45`는 세션 확인 없이 state의 userId에 토큰을 저장함. userId는 S1의 `/api/users`로 얻을 수 있음 → 공격자가 자기 구글 계정의 `code`와 피해자 userId로 콜백을 호출하면 **피해자 ERP 일정이 공격자 캘린더로 동기화됨**.
**수정**: state에 랜덤 nonce를 넣어 httpOnly 쿠키와 대조하고, 콜백에서도 `getServerSession`의 userId를 사용.

### 🟠 S5. Google 웹훅 무인증
`api/google/webhook/route.ts:13-35` — `X-Goog-Channel-Token`을 검증하지 않음. 아무 POST 요청으로 **모든 사용자의 전체 동기화**(구글 API 호출 + DB 쓰기 수백 건)를 일으킬 수 있음(DoS·쿼터 소진). watch 등록 시 `token`을 넣고 채널ID→사용자 매핑을 DB에 저장해 해당 사용자만 동기화하도록 해야 함.

### 🟠 S6. 대량 할당(Mass Assignment) / 입력 검증 부재
요청 본문을 그대로 Prisma에 넘기는 곳이 있음: `api/transactions/route.ts:60`, `api/calendar/route.ts:48`, `api/calendar/[id]/route.ts:50`, `api/documents/route.ts:68`, `api/influencers/route.ts:66`, `api/influencers/[id]/route.ts:72`. `id`, `createdAt`, `googleEventId`, 다른 사용자의 `userId` 등을 마음대로 넣을 수 있음. PATCH 계열(`transactions/[id]`, `settlements/[id]`, `documents/[id]`, `team-todo`, `clients/[id]/management`)도 타입·범위 검증이 없음(금액에 음수나 문자열 입력 가능). → 모든 쓰기 API에 zod 스키마를 적용해야 함.

### 🟠 S7. 기본 계정·자격증명 노출
- `prisma/seed.ts:10,26` — `admin@agency.com / admin123`, `member@agency.com / member123`. 커밋 `e125ce4`에서 README에서는 지웠지만 **git 히스토리와 seed에 남아 있음**
- `prisma/dev.db`(SQLite)가 커밋되어 있고, 위 두 계정의 bcrypt 해시가 들어 있음
- 운영 DB를 seed로 초기화했다면 **해당 계정의 비밀번호를 즉시 변경**해야 함. seed 비밀번호는 환경변수(`SEED_ADMIN_PASSWORD`)로 받도록 바꾸고, `*.db` 파일은 삭제한 뒤 `.gitignore`에 추가할 것

### 🟡 S8. 로그인 관련
- `lib/auth.ts:24,32` — "등록되지 않은 이메일"과 "비밀번호 불일치"를 구분해서 알려줌 → 계정 존재 여부가 노출됨. 메시지를 하나로 통일해야 함
- 로그인 시도 횟수 제한(rate limit)이 없음 → 무차별 대입이 가능함(Upstash Ratelimit 등)
- `login/page.tsx:15,37` — `callbackUrl`을 검증 없이 `router.push`함 → 오픈 리다이렉트. `/`로 시작하고 `//`로 시작하지 않는 경로만 허용해야 함
- JWT 세션이 30일이고, 역할이 바뀌거나 사용자가 삭제돼도 토큰이 계속 유효함

### 🟡 S9. Slack 웹훅
- `lib/slack.ts:40` — 서명 길이가 다르면 `timingSafeEqual`이 예외를 던져 401이 아니라 500이 남. 길이 비교를 먼저 해야 함
- `lib/slack.ts:30` — 타임스탬프가 비어 있으면 `NaN`이 되어 만료 검사를 통과함. 미래 시각도 막지 않음
- `api/slack/webhook/route.ts:1291` — 요청 본문 전체(재무 메시지)를 로그로 남김
- `url_verification`을 서명 검증 전에 처리함(`:1294`). 큰 문제는 아니지만 순서를 바꾸는 것이 좋음
- 채널 멤버 누구나 Slack으로 상태 변경·생성을 할 수 있음(의도된 동작인지 확인 필요)

### ⚪ S10. 기타
- Google access/refresh 토큰이 DB에 평문으로 저장됨(`schema.prisma:184-185`) → 애플리케이션 레벨 암호화를 권장
- 인플루언서 계좌번호·연락처(개인정보)가 인증 없는 `GET /api/settlements`에 그대로 포함됨(S1을 해결하면 함께 완화됨)
- `vercel.json`의 보안 헤더는 양호함. CSP와 `Strict-Transport-Security`는 아직 없음

---

## 4. 성능 및 데이터 로딩

| # | 위치 | 문제 | 개선 |
|---|---|---|---|
| P1 | `api/transactions/route.ts`(month가 없을 때), `api/documents/route.ts`, `api/projects/route.ts`, `api/influencers/route.ts`, `api/settlements/route.ts` | **페이지네이션이 없어 전체 테이블을 반환**함. 인플루언서 목록은 인플루언서마다 모든 `ProjectInfluencer`를 include함 | `take/cursor` 페이지네이션을 도입하고, 목록 합계는 `groupBy`/`aggregate`로 계산 |
| P2 | `api/clients/[id]/route.ts:27-46` | 클라이언트 상세가 모든 거래·문서·프로젝트를 include한 뒤 합계를 JS로 계산함 | 합계는 `aggregate`로, 목록은 탭별 API로 나누고 페이지네이션 적용 |
| P3 | `api/dashboard/route.ts:54-109` | 미수금·미정산을 **전부** 가져와서 개수와 합계만 씀 | `count`+`aggregate`로 바꾸고, 목록은 `take: 10` |
| P4 | `components/layout/header.tsx:46` | 알림용으로 무거운 `/api/dashboard`를 별도로 호출함(대시보드 화면에서는 같은 쿼리를 두 번 실행) | `useQuery(["dashboard"])`로 캐시를 공유하거나, 가벼운 `/api/notifications`로 분리 |
| P5 | 페이지 전반 | React Query는 대시보드에서만 쓰고, 나머지 25개 파일은 `useEffect + fetch`를 씀. 캐시·중복 제거·취소가 없음. `finance/page.tsx:216-262`는 월을 빠르게 바꾸면 이전 응답이 나중에 도착해 화면을 덮어씀(race) | 도메인별 `useXxxQuery` 훅으로 통일하고, 변경 후에는 `invalidateQueries` 사용 |
| P6 | `(dashboard)/page.tsx:108` | 클라이언트 컴포넌트에서 `fetch(..., { next: { revalidate: 30 } })`를 씀. 이 옵션은 클라이언트에서 무시됨 | 제거 |
| P7 | `api/google/webhook/route.ts:156-233`, `sync/route.ts:184-270` | 알림 1건마다 **모든 사용자 × 최대 500개 이벤트**에 대해 `findFirst`+`update`를 하나씩 실행(N+1). Vercel 함수 타임아웃 위험 | `googleEventId IN (...)`로 한 번에 조회하고, 쓰기는 `$transaction` 배치로 처리. `syncToken` 기반 증분 동기화 적용 |
| P8 | `api/slack/webhook/route.ts:1286-` | OpenAI 호출과 DB 처리를 동기로 수행해 Slack 3초 제한을 넘김(B8과 연결) | 즉시 ack하고 `after()`로 처리 |
| P9 | `api/cron/monthly-report/route.ts:229-240` | 상위 인플루언서 이름을 하나씩 조회함(N+1) | `findMany({ where: { id: { in } } })` |
| P10 | `finance/bulk/page.tsx:366` | 항목마다 POST를 순차 호출함 | 서버 일괄 API 1회 호출(B7) |
| P11 | 스키마 인덱스 | 월별 정산 필터에 쓰는 `ProjectInfluencer.paymentDate`, `Document(type, issueDate)`, `Activity.createdAt`, `Client(isFixedVendor, status)` 인덱스가 없음 | 인덱스 추가 마이그레이션 |
| P12 | 금액 타입 | `Float`으로 금액을 저장함(합계 시 부동소수점 오차) | 원 단위 `Int`(또는 `Decimal`)로 전환 |

---

## 5. 코드 품질 / 유지보수성

1. **빌드 안전장치가 꺼져 있음**
   - `tsconfig.json`의 `"exclude": ["node_modules", "../**/*"]` 중 `../**/*`가 프로젝트 자신까지 제외시켜 `tsc` 결과가 "No inputs were found"가 됨 → 타입 오류 15건이 빌드에서 걸러지지 않음. 이 항목을 지워야 함
   - `eslint.config.mjs`가 `FlatCompat`으로 `eslint-config-next@16`을 불러오다 크래시남(`Converting circular structure to JSON`). Next 16 방식대로 `import next from "eslint-config-next"` 플랫 설정으로 바꿔야 함
   - 테스트와 CI가 없음 → GitHub Actions에 `tsc --noEmit`, `eslint`, `prisma validate`, `next build`를 추가
2. **마이그레이션 드리프트**: 스키마의 `ClientVisit, ClientPayment, ClientVideo, ClientMemo, TeamTodoColumn, TeamTodoMember, TeamTodoTask`에 해당하는 마이그레이션이 없음(`db push`로 운영에 반영된 것으로 추정). 운영 DB와 비교해 `prisma migrate diff`로 베이스라인 마이그레이션을 만들어야 함
3. **거대 파일**: `finance/page.tsx`(1,781줄), `slack/webhook/route.ts`(1,395줄), `clients/[id]/page.tsx`(1,159줄), `settlements/page.tsx`(921줄). 탭/다이얼로그 컴포넌트와 intent 핸들러별로 파일을 나눌 것
4. **상태값·도메인 상수 중복**: `normalizeStatus`가 5곳 이상에 복붙되어 있음. 문자열 상태(`status`, `type`, `paymentStatus`, `category`)를 Prisma `enum` 또는 `as const` 상수 + zod enum으로 통일
5. **응답 변환 보일러플레이트**: 모든 라우트가 `Client→client`, `User→manager`처럼 수동으로 매핑함. 스키마의 관계 필드명을 소문자로 바꾸거나 `lib/mappers.ts`로 일원화
6. **메모 문자열에 메타데이터를 저장**: `[선금]`, `[잔금]`, `[착수금]`, `[광고업체: X]`를 memo에 넣고 정규식으로 다시 파싱함(`finance/page.tsx:295-305`, 대시보드 `extractAdvertiserInfo`). 특히 `BALANCE`를 `[착수금]`으로 표기하는 등 용어도 섞여 있음 → `paymentType` 컬럼을 별도로 추가
7. **API 계층 패턴 불일치**: zod 검증이 있는 라우트(clients, projects)와 없는 라우트가 섞여 있음. 에러 처리도 제각각 → `withAuth(withValidation(schema, handler))` 같은 공통 래퍼를 만들고 에러를 공통으로 매핑
8. **잔재·중복 파일**: 루트의 `index.html`, `script.js`(127.0.0.1:5001을 호출하는 순위 체크 도구), `style.css`, `team-todo.{html,js,css}`, `dev.db`, `prisma/dev.db`. `/team-todo` 페이지는 사이드바에 없고 `/todo`와 기능이 겹침 → 삭제
9. **로깅**: 운영 코드에 디버그용 `console.log`가 남아 있음(Slack 9곳, 메시지 본문 포함). 레벨이 있는 로거로 바꾸고 개인정보는 마스킹
10. `any`/`eslint-disable` 15곳 이상. `.env.example`에 `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` 항목이 빠져 있음

---

## 6. 다음 작업 목록

난이도: S(반나절 이하) / M(1~2일) / L(3일 이상)

### 우선순위 높음
| # | 작업 | 관련 | 난이도 |
|---|---|---|---|
| H1 | API 인증 미들웨어 추가 + 라우트별 `requireSession()` + 관리자 전용 작업 제한, `/api/users`는 관리자 전용으로 | S1 | M |
| H2 | 운영 계정 비밀번호 즉시 변경, `*.db` 삭제 후 `.gitignore`에 추가, seed 비밀번호를 환경변수로 | S7 | S |
| H3 | 문서 API: PATCH에서 `filePath` 제거, 삭제는 Supabase `remove()`로, 버킷 private 전환 + signed URL, 확장자 화이트리스트 강제 | S2, S3, B13 | M |
| H4 | 정산 상태값 통일(enum + 데이터 마이그레이션) 후 대시보드·cron·정산·인플루언서 화면 비교 로직 수정 | B1 | M |
| H5 | Slack `paidAt`→`paymentDate` 수정, 즉시 ack + 비동기 처리 + event_id DB 중복 차단 | B2, B8, P8 | M |
| H6 | `tsconfig` exclude 수정 → 타입 오류 15건 해결, ESLint 플랫 설정 복구, CI(tsc/lint/build) 추가 | 5-1 | M |
| H7 | 누락된 7개 테이블의 베이스라인 마이그레이션 생성(운영 DB와 diff 비교) | 5-2 | S |
| H8 | Google OAuth state nonce 도입, 콜백에서 세션 확인, 웹훅 채널 토큰 검증 | S4, S5 | M |

### 우선순위 중간
| # | 작업 | 관련 | 난이도 |
|---|---|---|---|
| M1 | 모든 쓰기 API에 zod 스키마 적용(본문 spread 제거) | S6 | M |
| M2 | 클라이언트 PATCH 이메일 덮어쓰기, 캘린더 PATCH endDate 덮어쓰기 수정 | B3, B4 | S |
| M3 | 문서번호 생성 로직 수정(최대값 기반 + 재시도) | B5 | S |
| M4 | KST 날짜 유틸 도입 후 23곳의 `toISOString().split` 및 서버 월 범위 계산 교체 | B6 | M |
| M5 | 일괄 거래 저장 API(트랜잭션) + bulk 화면 교체, migrate-month `$transaction` 적용 | B7, B10, P10 | M |
| M6 | 목록 API 페이지네이션 + 대시보드/클라이언트 상세 집계 쿼리화 | P1~P3 | M |
| M7 | 로그인 메시지 통일, rate limit 추가, `callbackUrl` 검증 | S8 | S |
| M8 | 페이지 데이터 로딩을 React Query 훅으로 통일(재무·정산·클라이언트부터) | P4, P5 | L |
| M9 | Google 동기화 배치화 + syncToken 증분 동기화 + 삭제 반영 + watch 채널 관리 | B12, P7 | L |
| M10 | 팀 To-Do: GET에서 생성 로직 제거(seed로 이동), 컬럼 참조를 ID 기반으로, 삭제는 트랜잭션으로 | B11 | M |

### 우선순위 낮음
| # | 작업 | 관련 | 난이도 |
|---|---|---|---|
| L1 | 비밀번호 변경 API + 설정 화면 연결(나머지 껍데기 버튼은 숨김) | 2-기타 | S |
| L2 | 금액 `Float`→`Int` 전환, 누락 인덱스 추가 | P11, P12 | M |
| L3 | memo 메타데이터를 `paymentType`/`advertiser` 컬럼으로 분리 | 5-6 | M |
| L4 | 대형 파일 분리(finance, slack webhook, client detail) | 5-3 | L |
| L5 | 상태/카테고리 상수 일원화, 응답 매퍼 공통화, Slack 카테고리 저장 형식 통일 | 5-4, 5-5, B9 | M |
| L6 | 잔재 파일 및 `/team-todo` 중복 페이지 삭제, `.env.example` 보완 | 5-8, 5-10 | S |
| L7 | 클라이언트 삭제를 soft delete로 전환(재무 데이터 보존) | 2-기타 | S |
| L8 | 검색 `mode: "insensitive"`, P2025→404 매핑, 디버그 로그 정리 | 2-기타, 5-9 | S |
| L9 | Google 토큰 암호화 저장, CSP/HSTS 헤더 추가 | S10 | M |

**권장 진행 순서**: H2 → H1 → H3 → H6 → H7 → H4 → H5 → H8 → 중간 순위(M2·M3·M7처럼 작은 것부터)
