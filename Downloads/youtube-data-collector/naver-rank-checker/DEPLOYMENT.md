# 🚀 YouTube 데이터 수집기 - Vercel 배포 가이드

## 📋 사전 준비사항

### 1. YouTube Data API v3 키 발급
1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택
3. **YouTube Data API v3** 활성화
4. **사용자 인증 정보** → **API 키** 생성
5. API 키 복사 (나중에 사용)

### 2. GitHub 저장소 준비
```bash
# 로컬 저장소 초기화 (아직 안했다면)
git init
git add .
git commit -m "feat: 초기 YouTube 데이터 수집기 구현"

# GitHub 저장소에 푸시
git remote add origin https://github.com/username/youtube-data-collector.git
git push -u origin main
```

## 🌐 Vercel 배포 단계별 가이드

### Step 1: Vercel 계정 연결
1. [Vercel](https://vercel.com/) 접속
2. GitHub 계정으로 로그인
3. **New Project** 클릭
4. YouTube 데이터 수집기 저장소 선택

### Step 2: 프로젝트 설정
```bash
Project Name: youtube-data-collector
Framework Preset: Next.js
Root Directory: ./
```

### Step 3: 환경 변수 설정
**Environment Variables 섹션에서 추가:**

| Name | Value | Description |
|------|--------|-------------|
| `YOUTUBE_API_KEY` | `여러분의_API_키` | YouTube Data API v3 키 |
| `NODE_ENV` | `production` | 운영 환경 설정 |
| `API_RATE_LIMIT` | `60` | API 요청 제한 (분당) |

### Step 4: 배포 실행
1. **Deploy** 버튼 클릭
2. 빌드 과정 모니터링
3. 배포 완료 후 도메인 확인

## 🔧 고급 설정

### 커스텀 도메인 연결
1. Vercel 대시보드 → **Domains** 탭
2. **Add** → 도메인 입력
3. DNS 설정 (A 레코드 또는 CNAME)

### 성능 모니터링
- **Analytics** 탭에서 성능 지표 확인
- **Speed Insights** 활성화
- **Web Vitals** 점수 모니터링

## 🛡️ 보안 설정 확인

### 환경 변수 보안
✅ API 키가 클라이언트에 노출되지 않음  
✅ 프로덕션에서 서버사이드 전용 API 키 사용  
✅ Rate limiting 활성화 (분당 60회)  
✅ CORS 헤더 적절히 설정  

### 추가 보안 헤더
```typescript
// next.config.ts에서 자동 설정됨
X-Frame-Options: DENY
X-Content-Type-Options: nosniff  
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```

## 📊 성능 최적화

### 이미지 최적화
- YouTube 썸네일 WebP/AVIF 변환
- 24시간 캐싱 설정
- Lazy loading 적용

### 코드 최적화
- 프로덕션 빌드시 console.log 제거
- CSS 최적화 활성화
- Gzip 압축 적용

## 🔍 배포 후 확인 사항

### 기능 테스트
- [ ] API 키 입력 기능 동작
- [ ] YouTube 검색 기능 정상 작동
- [ ] 검색 결과 표시 확인
- [ ] CSV 내보내기 기능 테스트
- [ ] 필터링 옵션 동작 확인

### 성능 테스트
```bash
# Lighthouse 점수 확인
- Performance: 90+ 목표
- Accessibility: 95+ 목표  
- Best Practices: 90+ 목표
- SEO: 90+ 목표
```

## 🚨 문제 해결

### 일반적인 오류

#### Build 에러
```bash
Error: Cannot resolve module 'xyz'
→ package.json 의존성 확인
→ npm install 재실행
```

#### API 키 에러
```bash
Error: YouTube API key is not configured
→ Vercel 환경변수에 YOUTUBE_API_KEY 추가
→ 대소문자 정확히 입력 확인
```

#### 이미지 로딩 에러
```bash
Error: Invalid src prop on next/image
→ next.config.ts에 이미지 도메인 추가
→ YouTube 썸네일 URL 확인
```

### 디버깅 도구
```bash
# Vercel 로그 확인
vercel logs

# 로컬 프로덕션 테스트
npm run build
npm start
```

## 📈 모니터링 & 분석

### Vercel Analytics
- 페이지 뷰 추적
- 사용자 위치 분석
- 성능 메트릭 모니터링

### Error Tracking (선택사항)
```bash
# Sentry 통합
SENTRY_DSN=https://your-sentry-dsn-here
```

## 🔄 업데이트 배포

### 자동 배포
```bash
# main 브랜치에 푸시하면 자동 배포
git add .
git commit -m "feat: 새로운 기능 추가"
git push origin main
```

### 수동 배포
1. Vercel 대시보드 → **Deployments**
2. **Redeploy** 버튼 클릭

## 📱 도메인 예시
```
https://youtube-data-collector.vercel.app
https://your-custom-domain.com
```

## 💡 추가 팁

### SEO 최적화
- 메타 태그 설정 확인
- 구조화된 데이터 추가
- sitemap.xml 생성

### 사용자 경험 개선
- 로딩 스피너 추가
- 에러 페이지 커스터마이징
- 다국어 지원 고려

---

🎉 **배포 완료!** 이제 전 세계 어디서나 YouTube 데이터 수집기를 사용할 수 있습니다!