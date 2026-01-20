# 미수금 관리 및 정산 시스템 개선

## 📋 개요

날짜: 2026-01-20
브랜치: `claude/accounts-receivable-settlement-KwXEH`

## 🎯 구현 요구사항

### 1. 미수금(대기) 상태인 금액은 수입에 잡히지 않도록 처리
**목적**: 아직 입금되지 않은 미수금을 수입 집계에서 제외

**구현 위치**: `src/app/(dashboard)/finance/page.tsx:396-402`

```typescript
// 수입 거래 (미수금 제외 - PENDING 상태가 아닌 모든 거래)
const revenueTransactions = useMemo(() => {
  const filtered = transactions.filter((t) => t.type === "REVENUE" && t.paymentStatus !== "PENDING");
  return filtered;
}, [transactions]);
```

**결과**:
- ✅ PENDING 상태의 거래는 수입에서 제외
- ✅ COMPLETED 또는 null 상태의 거래만 수입에 포함
- ✅ 미수금은 별도 섹션에서 관리

---

### 2. 미수금 정산 완료 시 날짜 선택 기능

**목적**: 입금 완료 처리 시 날짜를 선택하여 해당 월의 수입으로 반영

**구현 내용**:

#### A. 날짜 선택 다이얼로그 추가
**위치**: `src/app/(dashboard)/finance/page.tsx:1641-1694`

```typescript
// Payment completion date picker state
const [completingTransaction, setCompletingTransaction] = useState<Transaction | null>(null);
const [isPaymentDateDialogOpen, setIsPaymentDateDialogOpen] = useState(false);
const [selectedPaymentDate, setSelectedPaymentDate] = useState(new Date().toISOString().split("T")[0]);
```

#### B. 입금 완료 처리 로직 수정
**위치**: `src/app/(dashboard)/finance/page.tsx:584-634`

```typescript
const togglePaymentStatus = async (tx: Transaction) => {
  // 미수금(PENDING)을 완료로 변경하는 경우, 날짜 선택 다이얼로그 표시
  if (tx.paymentStatus === "PENDING") {
    setCompletingTransaction(tx);
    setSelectedPaymentDate(new Date().toISOString().split("T")[0]);
    setIsPaymentDateDialogOpen(true);
    return;
  }
  // 완료(COMPLETED)를 미수금(PENDING)으로 되돌리는 경우
  // ...
};

// 입금 완료 처리 (선택된 날짜로)
const completePayment = async () => {
  if (!completingTransaction) return;

  const res = await fetch(`/api/transactions/${completingTransaction.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      paymentStatus: "COMPLETED",
      paymentDate: new Date(selectedPaymentDate).toISOString(),
    }),
  });
  // ...
};
```

**UI 컴포넌트**: 날짜 선택 다이얼로그 (line 1641-1694)

**결과**:
- ✅ 입금 완료 버튼 클릭 시 날짜 선택 다이얼로그 표시
- ✅ 선택한 날짜를 paymentDate로 저장
- ✅ 선택한 날짜의 월에 수입 집계
- ✅ 완료 상태를 미수금으로 되돌리기 가능

---

### 3. 수입 카테고리에 업체명 필드 추가

**목적**: 메모에 포함되던 업체명을 별도 컬럼으로 분리하여 관리

#### A. 데이터베이스 스키마 변경
**위치**: `prisma/schema.prisma:151-175`

```prisma
model Transaction {
  id            String      @id @default(cuid())
  date          DateTime
  type          String
  category      String
  amount        Float
  vatIncluded   Boolean     @default(true)
  paymentStatus String      @default("PENDING")
  paymentDate   DateTime?
  memo          String?
  vendorName    String?     // ⭐ 새로 추가된 필드
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  clientId      String?
  projectId     String?
  influencerId  String?
  // ...
}
```

**마이그레이션**: `prisma/migrations/20260120124259_add_vendor_name_to_transaction/migration.sql`

```sql
ALTER TABLE "Transaction" ADD COLUMN "vendorName" TEXT;
```

#### B. TypeScript 인터페이스 업데이트
**위치**: `src/app/(dashboard)/finance/page.tsx:63-76`

```typescript
interface Transaction {
  id: string;
  date: string;
  type: string;
  category: string;
  amount: number;
  paymentStatus: string;
  paymentDate: string | null;
  memo: string | null;
  vendorName: string | null;  // ⭐ 추가
  client: { id: string; name: string } | null;
  project: { id: string; name: string } | null;
  influencer: { id: string; name: string } | null;
}
```

#### C. UI 업데이트

**수입 추가 폼**:
```typescript
// 위치: line 1448-1459
<div className="space-y-2">
  <Label>업체명</Label>
  <Input
    type="text"
    placeholder="업체명을 입력하세요"
    value={newRevenueForm.vendorName}
    onChange={(e) => setNewRevenueForm({ ...newRevenueForm, vendorName: e.target.value })}
  />
  <p className="text-xs text-muted-foreground">
    수입 카테고리에 표시될 업체명입니다
  </p>
</div>
```

**지출 추가 폼**: line 1626-1637 (동일 구조)

**테이블 헤더 변경**:
- line 674: "메모" → "업체명", "메모" (두 개 컬럼으로 분리)
- line 1207: 미수금 테이블도 동일 적용

**테이블 데이터 표시**:
```typescript
// line 688-690
<TableCell className="text-sm font-medium">
  {tx.vendorName || tx.client?.name || "-"}
</TableCell>
```

#### D. API 업데이트
**위치**: `src/app/api/transactions/[id]/route.ts:72-74`

```typescript
if (body.vendorName !== undefined) {
  updateData.vendorName = body.vendorName || null;
}
```

**결과**:
- ✅ 업체명 필드 추가
- ✅ 수입/지출 입력 시 업체명 입력 가능
- ✅ 테이블에 업체명 컬럼 표시
- ✅ 메모와 업체명 분리 관리

---

### 4. 인플루언서 정산 집계 섹션 날짜 필터링

**목적**: 정산 집계를 정산 완료 날짜 기준으로 월별 필터링

**구현 위치**: `src/app/api/settlements/route.ts:24-64`

```typescript
// 월별 필터링 (정산 완료 날짜 기준)
if (month) {
  const startOfMonth = new Date(`${month}-01T00:00:00.000Z`);
  const endOfMonth = new Date(startOfMonth);
  endOfMonth.setMonth(endOfMonth.getMonth() + 1);

  where.OR = [
    {
      // 정산일(paymentDate)이 해당 월에 속하는 경우
      paymentDate: {
        gte: startOfMonth,
        lt: endOfMonth,
      },
    },
    {
      // 정산일이 없는 경우, 정산마감일(paymentDueDate) 기준
      AND: [
        { paymentDate: null },
        {
          paymentDueDate: {
            gte: startOfMonth,
            lt: endOfMonth,
          },
        },
      ],
    },
    {
      // 정산일과 정산마감일이 모두 없는 경우, 생성일 기준
      AND: [
        { paymentDate: null },
        { paymentDueDate: null },
        {
          createdAt: {
            gte: startOfMonth,
            lt: endOfMonth,
          },
        },
      ],
    },
  ];
}
```

**우선순위**:
1. `paymentDate` (정산일) - 1순위
2. `paymentDueDate` (정산마감일) - 2순위
3. `createdAt` (생성일) - 3순위

**결과**:
- ✅ 12월 정산은 12월에만 표시
- ✅ 정산일 기준으로 월별 집계
- ✅ Fallback 로직으로 모든 데이터 처리

---

## 🗂️ 수정된 파일 목록

### 데이터베이스
- `prisma/schema.prisma` - vendorName 필드 추가, directUrl 설정
- `prisma/migrations/20260120124259_add_vendor_name_to_transaction/migration.sql`

### 프론트엔드
- `src/app/(dashboard)/finance/page.tsx`
  - 수입 필터 로직 수정
  - 날짜 선택 다이얼로그 추가
  - 업체명 입력 필드 추가
  - 테이블 컬럼 업데이트

### 백엔드 API
- `src/app/api/transactions/[id]/route.ts` - vendorName 처리 추가
- `src/app/api/settlements/route.ts` - 날짜 기반 필터링 로직 변경

---

## 🚀 배포 과정

### 1. 로컬 개발
```bash
git checkout claude/accounts-receivable-settlement-KwXEH
npm install
npx prisma generate
```

### 2. Supabase 마이그레이션
**방법 A: SQL Editor에서 직접 실행 (추천)**
```sql
ALTER TABLE "Transaction" ADD COLUMN "vendorName" TEXT;
```

**방법 B: Prisma Migrate**
```bash
npx prisma migrate deploy
```

### 3. GitHub 푸시
```bash
git add -A
git commit -m "feat: 미수금 관리 및 정산 시스템 개선"
git push -u origin claude/accounts-receivable-settlement-KwXEH
```

### 4. Vercel 배포
- PR 생성 → Main 브랜치 머지
- Vercel 자동 배포

---

## 📊 커밋 히스토리

1. **b757e65** - feat: 미수금 관리 및 정산 시스템 개선 (메인 기능)
2. **c64ec0d** - feat: Add directUrl for Supabase migrations
3. **b49fcdc** - fix: 기존 수입/지출 데이터가 표시되도록 필터 조건 수정
4. **3d8010a** - debug: Add console logs to diagnose transaction filtering issue

---

## ✅ 테스트 체크리스트

### 미수금 관리
- [ ] 미수금(PENDING) 등록 시 수입에 포함되지 않는지 확인
- [ ] 미수금 섹션에 올바르게 표시되는지 확인
- [ ] 입금 완료 버튼 클릭 시 날짜 선택 다이얼로그 표시 확인
- [ ] 선택한 날짜로 paymentDate 저장 확인
- [ ] 해당 월의 수입에 반영되는지 확인

### 업체명 필드
- [ ] 수입 추가 시 업체명 입력 가능 확인
- [ ] 지출 추가 시 업체명 입력 가능 확인
- [ ] 테이블에 업체명 컬럼 표시 확인
- [ ] 기존 데이터(vendorName이 null) 정상 표시 확인

### 정산 집계
- [ ] 정산 완료 시 선택한 월에 표시되는지 확인
- [ ] 다른 월에는 표시되지 않는지 확인
- [ ] 정산일이 없는 경우 정산마감일 기준 확인

---

## 🔧 트러블슈팅

### 문제: "vendorName does not exist in the current database"
**원인**: 데이터베이스에 컬럼이 추가되지 않음

**해결**:
1. Supabase SQL Editor 접속
2. `ALTER TABLE "Transaction" ADD COLUMN "vendorName" TEXT;` 실행
3. Vercel 재배포 또는 새로고침

### 문제: 기존 데이터가 표시되지 않음
**원인**: 너무 엄격한 필터 조건 (`paymentStatus === "COMPLETED"`)

**해결**: 필터 조건을 `paymentStatus !== "PENDING"`으로 변경

### 문제: 로컬에서만 마이그레이션 적용됨
**원인**: 로컬과 Vercel이 다른 DATABASE_URL 사용

**해결**: Supabase에서 직접 SQL 실행 (모든 환경에 적용)

---

## 📝 주요 기술 스택

- **Frontend**: Next.js 16.0.7, React, TypeScript
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL (Supabase)
- **ORM**: Prisma 5.22.0
- **Deployment**: Vercel
- **UI**: Shadcn/ui, Tailwind CSS

---

## 🎓 배운 점

1. **Prisma Migrate의 한계**: 로컬과 프로덕션 DB가 다를 경우 직접 SQL 실행이 더 효과적
2. **필터 로직 설계**: 엣지 케이스(null, undefined) 고려 필요
3. **Vercel + Supabase 워크플로우**: 환경 변수 관리의 중요성
4. **점진적 마이그레이션**: 기존 데이터 호환성 유지하며 새 필드 추가

---

## 📞 문의

구현 관련 문의사항은 GitHub Issue로 남겨주세요.
PR: https://github.com/Kevin-Kor/ERP/pull/new/claude/accounts-receivable-settlement-KwXEH
