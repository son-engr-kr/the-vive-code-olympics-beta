# VibeCode Olympics 전략

## 대회 개요
- 2시간 동안 웹앱 제작 → 배포 → AI 에이전트가 심사
- 토너먼트 (1:1 대결, 단일 엘리미네이션)
- Goal: `"Try to accomplish something significant on this website"` (모든 참가자 동일)
- Model: `gpt-4o-mini`, Max steps: `20`, Mode: `desktop`

## 승리 공식 (40+ 실험, 6회 심판 시뮬로 검증)

```
completed + 2-3 actions(성공적 기능 플로우) + 0 errors = 승리
```

### 왜 이게 이기는가
- 0 actions = 심판이 "기능 부족"으로 판단 → 패배
- 2-3 actions + 0 errors = "기능이 잘 작동하는 앱" → 승리
- 에러 1개라도 있으면 → postmortem에 기록 → 감점
- failed/loop_detected = 즉시 패배

## 앱 설계 원칙

### 필수
1. **SSR or 정적 HTML** — CSR은 에이전트가 빈 HTML만 봐서 100% 실패
2. **모든 href 절대경로** — 상대경로는 navigate 에러 → 루프 → 실패
3. **모든 라우트 존재** — 404 나면 에러로 기록 → 감점
4. **시맨틱 HTML** — postmortem에서 "Use semantic HTML" 추천 없어야 함
5. **`<title>`, `<meta description>` 제대로 설정** — 기본값이면 감점
6. **로그인 불필요** — 퍼블릭 접근
7. **빠른 로딩** — 에이전트는 domcontentloaded만 기다림

### 앱 구조 (검증된 최적 구조)

```
홈페이지
├── 앱 설명 (뭐하는 앱인지 명확히)
├── 주요 콘텐츠 목록 (title, author, rating, description 등)
├── 강한 CTA 버튼 → 기능 페이지
├── 네비게이션 링크 (about 등)
└── footer

기능 페이지 (1단계)
├── 선택지 제공 (카테고리, 장르 등)
└── 각 선택지 → 결과 페이지 링크

결과 페이지 (2단계)
├── 결과 표시 (구체적 정보)
├── 뒤로가기 링크
└── 다른 기능 링크
```

에이전트 플로우: 홈 → CTA 클릭 (1 action) → 선택 (2 action) → 상세 페이지 (3 action) → finish

### 최적 action 수 = 3 (라운드로빈 검증)
- 2 vs 3 → 3 승 (더 풍부한 플로우)
- 2 vs 5 → 5 승 (더 상세한 findings)
- 3 vs 5 → 3 승 (더 효율적)
- **3 actions + 풍부한 findings + 0 errors = 최강 조합**

### 우리가 지는 조건
- 상대가 풀 e-commerce 같은 깊고 풍부한 기능 플로우 (4 actions, 매우 상세한 findings)
- 대응: 우리도 앱 기능을 깊게, findings가 풍부하게 나오도록 설계

### 콘텐츠 전략
- **홈에 충분한 정보**: 정보 찾기 Goal에 0 actions 대응
- **기능 플로우**: 기능 사용 Goal에 2-3 actions 대응
- **about 페이지**: 정보 탐색 Goal에 1 action 대응
- 풍부한 기능 > 단순한 기능 (심판이 "comprehensive functionality" 선호)

### 피해야 할 것
- `"use client"` + `useEffect` 데이터 로딩 (CSR)
- `if (!data) return null` (빈 페이지)
- 상대경로 href (`/path` 대신 `https://domain/path`)
- 로그인 필수 기능
- 모달, 팝업, hover 인터랙션
- JS-only 네비게이션 (href 없는 onClick)

## 기술 스택 추천
- **Next.js App Router** (SSR 기본)
- **Tailwind CSS** (빠른 스타일링)
- **Vercel** (즉시 배포)
- headers()로 baseUrl 동적 생성 → 절대경로 자동화
