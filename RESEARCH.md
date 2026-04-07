# VibeCode Olympics - AI Judge Research

## Test Lab URL
https://testlab-lokzy6d28-shinhunjuns-projects.vercel.app

---

## Judge System Deep Dive

### 핵심: 에이전트는 HTML을 본다 (스크린샷 아님!)
시스템 프롬프트에 명시: **"Rely on the provided HTML/DOM, not screenshots."**
- HTML은 `html_cleaner.py`로 sanitize됨
- 제거되는 것: `<script>`, `<style>`, `<img>`, `<svg>`, `<video>`, `<iframe>` 등
- 유지되는 것: `id`, `class`, `href`, `role`, `aria-*`, `data-testid` 등
- **즉 에이전트가 보는 건 텍스트 콘텐츠 + 링크 + 폼 구조**

### LLM 설정
- Temperature: 0.2 (낮음, 결정적 행동)
- Max tokens: 1024
- 사용 가능 모델: gpt-4o-mini, gpt-5-mini, gpt-4o, etc.

### Agent Actions
- `execute_js {script}` - JS 실행, 결과 JSON으로 반환
- `navigate {url}` - URL 직접 이동
- `save_to_memory {key, value}` - 정보 저장
- `finish {summary}` - 성공 종료 (Verdict 포함)
- `fail {reason}` - 실패
- `give_up {reason}` - 포기

### Agent 판단 흐름
```
initialize → think(LLM에 HTML 전달) → execute(액션 실행) → capture(스크린샷+HTML) → check_status → 반복 or 종료
```

### 루프 감지 (자동 실패 트리거)
1. 같은 URL에서 같은 execute_js 3번 반복 → 루프
2. 동일 액션 4번 반복 → 루프
3. A,B,A,B 교대 패턴 3회 → 루프
4. 같은 URL에서 12번 액션 + 2개 이하 유니크 → 루프

---

## 대회 심사 방식

### 토너먼트 구조
- **단일 엘리미네이션 (1:1 대결)**
- 홀수면 첫 매치만 3-way
- 최종 1명 남을 때까지

### 심판이 보는 것
1. App URL + Goal
2. Status (completed / failed / loop_detected)
3. 액션 수
4. 종료 이유 (에이전트가 쓴 요약)
5. Postmortem 분석 + 추천사항

### 심판이 안 보는 것
- 스크린샷, 상세 액션 히스토리, HTML, 메모리

### 심판 프롬프트 (핵심!)
> "Award the win to the app whose testing reveals it **works well**: smooth user flows, features that complete successfully, intuitive navigation, and few or no critical errors."
> "A test that **found nothing wrong** is evidence of a **good app**."
> "A test that **found many bugs** is evidence of a **bad app**."

### 승리 공식
```
에이전트가 빠르게 목표 달성 + 문제점 0개 = 최고 점수
에이전트가 목표 달성 + 약간의 문제 = 보통
에이전트가 실패/포기 = 패배
```

---

## Experiment Results

### Exp 1: Static HTML Portfolio (shinhunjun.github.io/Jun/)
- **Goal**: "Find his most interesting paper"
- **Model**: gpt-4o-mini
- **Result**: COMPLETED (0 actions!)
- **Why**: 정적 HTML, 모든 콘텐츠가 첫 HTML에 있음
- **Lesson**: 에이전트가 HTML 읽고 바로 finish → 최고의 결과

### Exp 2: CSR Next.js App (booky.ink/planet)
- **Goal**: "Find an interesting book"
- **Model**: gpt-5-mini
- **Result**: COMPLETED (6 actions, API 해킹)
- **Why**: CSR HTML이 `<!--$--><!--/$-->` (빈 상태)
- **Lesson**: CSR 앱은 HTML이 비어서 에이전트가 JS로 우회해야 함

### Exp 3: CSR Vue SPA (alcivartech.com)
- **Goal**: "Navigate to the contact page"
- **Model**: gpt-4o-mini
- **Result**: FAILED
- **Why**: 빈 div, URL 추측 → 404 → 포기

### Exp 4: CSR Vue SPA (publicdatawatch.com)
- **Goal**: "Find and click on a dataset"
- **Model**: gpt-4o-mini
- **Result**: FAILED (0 actions, 즉시 포기)
- **Why**: HTML에 `<div id="app"></div>`만 있음

### Exp 5-1: SSR testlab (gpt-4o-mini)
- **Goal**: "Find a sci-fi book and read its description"
- **Model**: gpt-4o-mini
- **Result**: COMPLETED (4 actions, 전부 실패)
- **Why**: 첫 HTML에 Dune 설명이 다 있어서 finish 가능했음
- **Problem**: `<a href="/book/dune">` 상대경로 → navigate 실패 (Playwright는 절대URL만 허용)
- **Postmortem**: Error Count 4 → 심판한테 불리
- **Critical Lesson 1**: href에 절대경로 써야 함! (`https://domain.com/book/dune`)
- **Critical Lesson 2**: 첫 페이지에 정보가 다 있으면 navigate 실패해도 "completed" 가능
- **Critical Lesson 3**: Error가 많으면 postmortem에 기록됨 → 심판한테 감점

### Exp 5-2: SSR testlab 절대URL + 풍부한 설명 (gpt-4o-mini)
- **Goal**: "Find a sci-fi book and read its description"
- **URL**: https://testlab-mu.vercel.app (절대경로 href + 상세 설명)
- **Model**: gpt-4o-mini
- **Result**: COMPLETED (0 actions!)
- **Why**: 첫 HTML에 풍부한 설명이 있어서 navigate 필요 없음
- **Postmortem**: Error 0, Action 0 → 심판한테 최고 점수
- **Critical Lesson**: 첫 페이지에 충분한 정보 + 에러 0개 = 이상적인 결과

### Exp 6: alcivartech-guitar.fly.dev
- **Goal**: "Browse guitars and find the most expensive one"
- **gpt-5-mini**: COMPLETED (Reverb 사이트로 이동해서 해결)
- **gpt-4o-mini**: FAILED (URL 추측 → 404 → 포기)

---

## Key Findings

### Finding 1: HTML 콘텐츠가 전부
| 렌더링 | 에이전트가 보는 HTML | 결과 |
|--------|---------------------|------|
| 정적 HTML | 전체 콘텐츠 | 0 actions, 즉시 완료 |
| SSR (Next.js SSG/SSR) | 전체 콘텐츠 | 빠르게 완료 |
| CSR (React/Vue SPA) | `<div id="app"></div>` | 실패 or JS 해킹 |

### Finding 2: gpt-4o-mini vs gpt-5-mini
| Model | 행동 | 창의성 |
|-------|------|--------|
| gpt-5-mini | 막히면 우회, JS 추출 | 높음 |
| gpt-4o-mini | 1번 실패 → 즉시 포기 | 낮음 |

### Finding 3: 에이전트 행동 패턴
- HTML에 정보 있으면 → 바로 finish (0 actions, 최고)
- HTML 부족하면 → execute_js로 DOM 탐색
- 링크 보이면 → navigate로 이동 (click보다 navigate 선호)
- 아무것도 없으면 → URL 추측 or give_up

### Finding 4: 심판 최적화 = "문제 없는 앱"
- 에이전트가 쉽게 완료 = 좋은 앱
- 에이전트가 버그 발견 = 나쁜 앱
- 에이전트가 실패 = 최악

---

## Winning Strategy

### 필수 조건
- [x] SSR or 정적 HTML (에이전트가 첫 HTML에서 콘텐츠 읽을 수 있어야)
- [ ] 의미있는 텍스트 콘텐츠 (href, heading, paragraph)
- [ ] 명확한 네비게이션 링크 (`<a href="...">` 태그)
- [ ] 시맨틱 HTML (`<header>`, `<main>`, `<nav>`, `<section>`)
- [ ] 404 없는 완전한 라우팅
- [ ] 로그인 불필요
- [ ] 빠른 로딩
- [ ] 1-2 단계로 목표 달성 가능

### 이상적인 앱
1. 에이전트가 첫 HTML에서 답을 찾을 수 있으면 0 actions → 최고 결과
2. 링크 따라가서 1-2 actions로 완료 → 좋은 결과
3. Postmortem에서 "nothing wrong" → 심판한테 유리

---

### Exp 7-11: Batch 2 (testlab-mu.vercel.app, gpt-4o-mini)
| # | Goal | Status | Actions | Errors | Key Finding |
|---|------|--------|---------|--------|-------------|
| 7 | "Figure out what this product is" | completed | 0 | 0 | 주최측 스타일 Goal도 0 actions 완료 |
| 8 | "Judge whether navigation is intuitive" | completed | 0 | 0 | 평가형 Goal도 즉시 완료 |
| 9 | "Get recommendation by choosing genre" | loop_detected | 10 | 9 | 서브페이지 상대URL → 루프! |
| 10 | "Find classic book" (mobile) | completed | 0 | 0 | 모바일 모드도 문제없음 |

### Exp 12-16: Batch 3 (절대URL 수정 후)
| # | Goal | Status | Actions | Errors | Key Finding |
|---|------|--------|---------|--------|-------------|
| 12 | "Get recommendation by choosing genre" | completed | 2 | 0 | 절대URL로 수정 → 성공! |
| 13 | "3단계: recommend→dystopian→book" | completed | 1 | 0 | 에이전트가 단축 경로 찾음 |
| 14 | "Create account + wishlist" (없는 기능) | failed | 1 | 0 | /register 추측 → 404 |
| 15 | "What is this website?" | completed | 0 | 0 | 초단순 Goal 즉시 완료 |

---

## Confirmed Findings

### CF1: 절대URL은 필수
- 상대경로 → Playwright navigate 에러 → 루프 감지 → 실패
- 절대경로 → 정상 navigate → 성공

### CF2: 에이전트는 단축 경로를 찾는다
- 3단계 플로우 Goal이어도 홈 HTML에서 직접 답 찾으면 1 action으로 끝냄
- 첫 페이지에 충분한 정보 = 최소 액션

### CF3: 어떤 Goal이든 첫 페이지 HTML이 풍부하면 유리
- "이 사이트 뭔지", "네비게이션 평가", "책 찾기" 전부 0 actions
- 단, "특정 기능 수행" Goal은 navigate 필요할 수 있음

### CF4: 없는 기능 요청은 방어 불가
- 에이전트가 `/register` 같은 URL 추측 → 404 → 실패
- 대회 Goal이 앱에 없는 기능이면 무조건 실패

### CF5: 모바일 모드도 동일하게 작동
- 모바일 viewport (390x844)에서도 결과 동일

### CF6: 동시 실행 시 SQLite lock 주의
- 5개 이상 동시 실행 → "database is locked" 에러

### Exp 17-22: 대회 Goal 유형 테스트 (절대URL 적용 후)
| # | Goal 유형 | Goal | Status | Actions | Errors |
|---|-----------|------|--------|---------|--------|
| 17 | 신규유저 시뮬 | "Try to use this website as a new user would" | completed | 2 | 0 |
| 18 | UX 평가 | "Evaluate the user experience of this website" | completed | 0 | 0 |
| 19 | 정보 찾기 | "Find the most popular book and learn about it" | completed | 0 | 0 |
| 20 | 없는 기능 | "Search for a book by typing in a search box" | failed | 0 | 0 |
| 21 | 풀 플로우 | "Complete the main user flow start to finish" | completed | 3 | 0 |

### Postmortem 분석 (Exp 21 - 풀 플로우)
- Run Analysis: "successfully completed the main user flow"
- Recommendations: 접근성, SEO, meta descriptions 등 일반적 개선사항
- Error Count: 0 → 심판한테 유리

---

## Confirmed Findings

### CF1: 절대URL은 필수
- 상대경로 → Playwright navigate 에러 → 루프 감지 → 실패
- 절대경로 → 정상 navigate → 성공

### CF2: 에이전트는 단축 경로를 찾는다
- 3단계 플로우 Goal이어도 홈 HTML에서 직접 답 찾으면 1 action으로 끝냄
- 첫 페이지에 충분한 정보 = 최소 액션

### CF3: 어떤 Goal이든 첫 페이지 HTML이 풍부하면 유리
- "이 사이트 뭔지", "네비게이션 평가", "책 찾기" 전부 0 actions
- 단, "특정 기능 수행" Goal은 navigate 필요할 수 있음

### CF4: 없는 기능 요청은 방어 불가 (but 감점 최소화 가능)
- "검색 박스로 검색" → 검색 박스 없어서 실패
- "회원가입" → /register 추측 → 404 → 실패
- **대응**: 앱의 기능 범위를 HTML에 명시하면 에이전트가 빨리 포기 (에러 0)

### CF5: 모바일 모드도 동일하게 작동
- 모바일 viewport (390x844)에서도 결과 동일

### CF6: 동시 실행 시 SQLite lock 주의
- 5개 이상 동시 실행 → "database is locked" 에러

### CF7: 풀 플로우도 3 actions + 0 errors 가능
- 홈 → recommend → genre → book detail 전체 플로우 성공
- 에이전트가 절대URL로 자연스럽게 navigate

### CF8: "없는 기능" 실패 시 Error 0이 중요
- 검색 기능 없어서 실패해도 error 0개
- 에이전트가 "기능이 없다"고 명확히 판단 → 깔끔한 실패

### CF9: HTML 전체를 읽으므로 fold/스크롤 무관
- 에이전트는 HTML DOM 전체를 LLM에 보냄
- 페이지 하단 콘텐츠도 즉시 인지
- viewport/스크롤과 무관하게 정보 접근 가능

### CF10: 시맨틱 HTML은 postmortem에서 차이 만든다
- 기능적 차이: 없음 (둘 다 0 actions 완료)
- postmortem 차이: 비시맨틱은 "Use semantic HTML" 추천 생성
- 심판이 recommendations 비교 시 비시맨틱 앱이 불리

### CF11: 폼 제출은 execute_js 한 방으로 가능
- 에이전트가 JS로 input에 값 넣고 form.submit() 호출
- gpt-4o-mini, gpt-5-mini 둘 다 1 action으로 성공
- form에 id, name, placeholder 속성 필수 (에이전트가 찾을 수 있도록)

### CF12: gpt-5-mini는 navigate 대신 execute_js로 클릭
- "Click the button" Goal → JS로 `querySelector('a').click()`
- navigate를 안 쓰고 JS 클릭 사용
- 결과는 동일하게 성공

### CF13: gpt-5-mini는 UX 평가 시 더 비판적
- 4o-mini: "good user experience" (짧고 긍정적)
- 5-mini: "lacks discoverability, accessibility" (단점 상세 언급)
- 심판한테는 4o-mini 결과가 더 유리할 수 있음

### CF14: 복잡한 멀티페이지 플로우도 성공 가능
- 4페이지 왕복 (홈→recommend→genre→book→about) = 4 actions, 0 errors
- 절대URL이면 아무리 복잡해도 navigate 성공

### CF15: 외부 링크는 따라가지 않음
- "Buy this book" Goal → 0 actions, "purchasing options not available" finish
- 에이전트는 사이트 밖으로 나가지 않음

### CF16: <title> 태그가 "Create Next App" (기본값) → 수정 필요
- postmortem에서 "Set a meaningful title" 추천 발생
- 심판이 보는 정보에 포함 → 감점 요소

### CF17: 동일 Goal 3회 실행 → 완전히 일관된 결과
- "Evaluate UX" 3번 → 3번 모두 completed, 0 actions
- temperature 0.2라 결과 매우 안정적

### ⚠️ CF18: 0 actions가 항상 최고가 아니다! (중요)
- **실제 심판 시뮬에서 인터랙션 있는 앱이 이김**
- 심판: "0 actions = lack of engagement or functionality"
- 심판: "navigated complete user flow = superior user experience"
- **최적: completed + 2-3 actions(성공적 플로우) + 0 errors**
- 앱이 실제로 작동하는 기능을 보여줘야 함

### CF19: 실제 judge 시뮬레이션 결과
- 우리 앱 vs CSR 실패 → **우리 승**
- 우리 앱 (2 actions) vs 포트폴리오 (0 actions) → **우리 승** (기능이 더 많아서)
- 0 actions 앱 vs 인터랙티브 앱 → **인터랙티브 승**
- 검색 기능 없어서 실패해도 error 0개
- 에이전트가 "기능이 없다"고 명확히 판단 → 깔끔한 실패
- 심판이 보기에 "앱 문제"가 아닌 "Goal 미스매치"

---

## Model별 행동 차이 (중요)

### gpt-4o-mini
- 없는 기능 요청 시 → **failed** (즉시 포기)
- 막히면 1번 시도 후 포기
- 첫 HTML에 답 있으면 → 0 actions 완료 (최고)

### gpt-5-mini
- 없는 기능 요청 시 → **completed** (JS로 탐색 → "없다"고 보고)
- 막히면 우회 경로 탐색
- execute_js 적극 사용

### 대회 전략 시사점
- 대회에서 어떤 모델을 쓸지 모르므로 **양쪽 다 대비**
- gpt-4o-mini용: 첫 페이지에 정보 최대한 노출
- gpt-5-mini용: JS 탐색해도 문제 없는 깨끗한 DOM

---

## Postmortem이 심판에게 미치는 영향

### 좋은 Postmortem 예시 (우리 앱)
```
Status: completed
Actions: 2, Errors: 0
"The book recommendation process successfully provided a suggestion"
Recommendations: SEO, meta description 등 일반적 개선사항
```

### 나쁜 Postmortem 예시 (CSR 앱)
```
Status: failed
Actions: 0, Errors: 0
"Page only contains empty app div"
Recommendations: "Add SSR, fix navigation..."
```

**심판은 이 두 요약을 비교해서 승자를 고름.**

---

## 최종 전략 요약

### 대회 당일 앱 요구사항
1. SSR/정적 HTML (절대 CSR 안 됨)
2. 모든 href 절대경로
3. 첫 페이지에 앱 설명 + 주요 콘텐츠 + 네비게이션 전부
4. 모든 라우트 존재 (404 없음)
5. 시맨틱 HTML + 명확한 heading 계층
6. 로그인 불필요
7. 다양한 Goal에 대응 가능한 구조

### Goal을 모를 때 가장 안전한 앱 구조
- **홈페이지**: 앱 설명 + 전체 콘텐츠 요약 + 네비게이션 링크
- **서브페이지 2-3개**: 각각 독립적으로 완결된 콘텐츠
- **모든 페이지**: 뒤로가기 링크 + 다른 페이지 링크 (절대URL)

### 앱 아이디어 선택 기준
- 인터랙티브 기능보다 **정보 전달형** 앱이 유리
- 폼 입력도 가능 (execute_js로 1 action 완료)
- 단순하지만 완결된 플로우가 있는 앱
- 시맨틱 HTML 필수 (postmortem에서 차이)

### 총 실험 횟수: 30+회
### 확인된 패턴: 14개 (CF1~CF14)

---

## Notes
- 대회: 2026-04-07 (화), 18:00-20:00 코딩, 20:00-21:00 심사
- 장소: Microsoft NERD Center, Cambridge MA
- Vercel testlab 배포됨, 실험 시작 가능
