# 📦 쿠팡 순수익 계산기

실시간 환불 반영 + 순수익 자동 계산 대시보드

## 🚀 시작하기

```bash
npm install
npm run dev
```

http://localhost:3000 접속 → 설정 페이지에서 API 키 입력 후 사용

## ⚙️ API 키 설정

1. 쿠팡 Wing(wing.coupang.com) 로그인
2. 우측 상단 아이디 → **추가판매정보**
3. 하단 **OPEN API 키 발급** → 자체개발 선택 → Vendor ID / Access Key / Secret Key 발급
4. 앱 설정 페이지에서 입력 → 연동하기

> API 키 유효기간은 **180일**입니다. 만료 14일 전부터 앱에서 알림이 표시됩니다.

## 📁 프로젝트 구조

```
src/
├── app/
│   ├── api/
│   │   ├── auth/route.ts          # API 키 저장/검증 (httpOnly 쿠키)
│   │   ├── orders/route.ts        # 주문 조회 프록시
│   │   ├── returns/route.ts       # 환불 조회 프록시
│   │   ├── products/route.ts      # 상품 목록 프록시
│   │   └── settlement/route.ts    # 정산 내역 프록시
│   ├── dashboard/page.tsx         # 메인 대시보드 + 환불 실시간 모니터
│   ├── analytics/page.tsx         # 기간별 수익 분석 + 차트
│   ├── products/page.tsx          # 상품 원가 관리 (일괄 입력)
│   ├── settlement/page.tsx        # 월별 정산 내역
│   └── settings/page.tsx          # API 키 + 앱 설정
├── components/
│   └── NavBar.tsx                 # 공통 네비게이션 (다크모드 토글 포함)
├── lib/
│   ├── auth.ts                    # 서버사이드 쿠키 인증 헬퍼
│   ├── calculator.ts              # 순수익 계산 로직
│   ├── coupang-api.ts             # 쿠팡 API HMAC 인증
│   └── store.ts                   # Zustand 전역 상태
└── types/index.ts                 # TypeScript 타입 정의
```

## 🧮 계산 구조

```
판매가
- 쿠팡 수수료 (카테고리별 %, 자동 적용)
- 배송비 (판매자배송 / 로켓그로스 풀필먼트 / 로켓위탁)
- 광고비 (ROAS 역산 또는 건당 직접 입력)
+ 부가세 환급 (일반과세자)
- 원가 (매입가 + 포장재)
= 순수익 / 마진율 / ROI / 손익분기가
```

## 🔒 보안 구조

- API 키는 **httpOnly 쿠키**로만 저장 (JS 접근 불가, localStorage 저장 없음)
- 모든 쿠팡 API 호출은 서버사이드(Next.js API Route)에서만 실행
- URL 쿼리스트링에 API 키 노출 없음

## 🌐 Vercel 배포

1. GitHub에 코드 push
2. vercel.com → New Project → GitHub 저장소 선택
3. 배포 완료 후 URL 공유

```bash
# 또는 CLI로 배포
npm i -g vercel
vercel
```
