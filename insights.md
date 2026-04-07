# 실험 인사이트 (40+ 실험 결과)

## 확인된 패턴 (CF1~CF20)

### 치명적 (이것만 틀려도 실패)

**CF1: SSR 필수, CSR 금지**
- CSR 앱 (React SPA, Vue SPA): HTML이 `<div id="app"></div>` → 에이전트가 빈 페이지로 인식 → 실패
- SSR/정적 HTML: 첫 로드에 콘텐츠 있음 → 성공
- 실험: booky.ink(CSR) 실패, alcivartech.com(CSR) 실패, publicdatawatch.com(CSR) 실패
- 실험: shinhunjun.github.io(정적) 성공, testlab-mu.vercel.app(SSR) 성공

**CF2: 모든 href 절대경로 필수**
- 상대경로 `/book/dune` → Playwright가 "Cannot navigate to invalid URL" 에러
- 절대경로 `https://domain.com/book/dune` → 정상 navigate
- 실험: 상대경로 → 4 errors + loop_detected, 절대경로 → 0 errors 완료
- Next.js에서 `headers()`로 baseUrl 동적 생성 → 자동 해결

**CF3: 모든 라우트 존재 필수**
- 에이전트가 없는 URL 추측 (`/register`, `/contact`, `/guitars`) → 404 → 실패/감점
- 모든 링크가 실제 페이지로 연결되어야 함

### 매우 중요 (승패 결정)

**CF4: 2-3 actions + 0 errors = 최적 결과**
- 심판 시뮬 6회: 인터랙티브 앱(2-3 actions) > 정적 앱(0 actions)
- 0 actions = 심판이 "기능 부족" 판단
- 2-3 actions 성공 = "기능이 잘 작동" 판단
- 에러는 무조건 0개여야 함

**CF5: 풍부한 기능 > 단순한 기능**
- 심판 시뮬: Multi CTA(풍부) vs Single CTA(단순) = Multi CTA 6전 6승
- 심판: "more comprehensive functionality" 선호
- 대회 설명의 "single CTA"와 실제 심판 판단이 다름!

**CF6: 시맨틱 HTML이 postmortem에서 차이 만듦**
- 기능적 차이: 없음
- postmortem 차이: 비시맨틱 → "Use semantic HTML" 추천 → 감점
- `<main>`, `<header>`, `<nav>`, `<section>`, `<article>` 필수

**CF7: `<title>`, `<meta>` 태그 제대로 설정**
- 기본값 "Create Next App" → postmortem에 "Set meaningful title" 추천 → 감점
- 의미있는 title과 description 필수

### 알면 유리 (미세한 차이)

**CF8: HTML 전체를 읽으므로 fold/스크롤 무관**
- 에이전트는 DOM 전체를 LLM에 전달
- 페이지 하단 콘텐츠도 즉시 인식
- viewport/스크롤 위치 무관

**CF9: 에이전트는 단축 경로를 찾음**
- 3단계 Goal이어도 홈 HTML에서 답 찾으면 1 action으로 끝냄
- 첫 페이지에 충분한 정보 = 다양한 Goal에 대응 가능

**CF10: 폼 제출은 execute_js 한 방으로 가능**
- 에이전트가 JS로 input 값 넣고 form.submit() 호출 = 1 action
- form에 id, name, placeholder 속성 필수

**CF11: 외부 링크는 따라가지 않음**
- "Buy this book" Goal → "purchasing options not available" finish
- 에이전트는 사이트 밖으로 나가지 않음

**CF12: 모바일 모드도 동일 작동**
- 390x844 viewport에서도 결과 동일 (HTML 기반이라)

**CF13: 동일 Goal 반복 실행 → 완전히 일관된 결과**
- temperature 0.2 → 매우 결정적

### 모델 관련

**CF14: gpt-4o-mini vs gpt-5-mini 행동 차이**
- 4o-mini: 간단하고 직접적, 막히면 포기, UX 평가 짧고 긍정적
- 5-mini: 창의적 우회, JS 탐색, UX 평가 상세하고 비판적
- 대회 기본 모델은 gpt-4o-mini

**CF15: gpt-4o-mini "없는 기능" → failed, gpt-5-mini → completed**
- 4o-mini: 기능 없으면 즉시 give_up → failed
- 5-mini: JS로 탐색 → "기능이 없다" 보고 → completed

### 심판 관련

**CF16: 심판은 end_reason의 구체성으로 판단**
- "retrieved a recommendation in the dystopian genre" > "recommendation retrieved"
- 에이전트가 작성하는 거라 직접 제어 불가, 앱의 기능 풍부함이 간접 영향

**CF17: Recommendations가 가벼울수록 유리**
- 좋은 예: "Add search feature", "Improve SEO"
- 나쁜 예: "Add SSR", "Fix broken links", "Use semantic HTML"

## 실험 전체 결과 테이블

### CSR vs SSR (실패 패턴 확인)
| 사이트 | 렌더링 | 모델 | Status | Actions | Errors |
|--------|--------|------|--------|---------|--------|
| shinhunjun.github.io | Static | 4o-mini | completed | 0 | 0 |
| testlab-mu.vercel.app | SSR | 4o-mini | completed | 0~2 | 0 |
| booky.ink/planet | CSR | 5-mini | completed* | 6 | 0 |
| alcivartech.com | CSR | 4o-mini | failed | 1 | 1 |
| publicdatawatch.com | CSR | 4o-mini | failed | 0 | 0 |
*API 해킹으로 우회 성공

### Goal 유형별 (testlab-mu.vercel.app, gpt-4o-mini)
| Goal 유형 | 예시 | Status | Actions | Errors |
|-----------|------|--------|---------|--------|
| 사이트 파악 | "What is this website?" | completed | 0 | 0 |
| UX 평가 | "Evaluate the UX" | completed | 0 | 0 |
| 정보 찾기 | "Find the most popular book" | completed | 0 | 0 |
| 신규유저 | "Use as a new user" | completed | 2 | 0 |
| 풀 플로우 | "Complete main user flow" | completed | 3 | 0 |
| 기능 사용 | "Get a recommendation" | completed | 2 | 0 |
| 대회 Goal | "Accomplish something significant" | completed | 2 | 0 |
| 없는 기능 | "Search by typing" | failed | 0 | 0 |
| 없는 기능 | "Create account" | failed | 1 | 0 |

### 심판 시뮬레이션 결과
| 대결 | 승자 | 이유 |
|------|------|------|
| 우리 앱 vs CSR 실패 앱 | 우리 앱 | completed vs failed |
| 우리 앱(2 actions) vs 포트폴리오(0 actions) | 우리 앱 | 더 많은 기능 |
| 인터랙티브(3 actions) vs 정적(0 actions) | 인터랙티브 | 기능 작동 증명 |
| Multi CTA vs Single CTA (6회) | Multi CTA 6:0 | comprehensive functionality |
| 우리 앱 vs 주최자 사이트 5개 | 우리 앱 5:0 | 주최자 사이트 전부 CSR → 전패 |
| 4o-mini 결과(2 actions) vs 5-mini 결과(5 actions) | 5-mini 3:0 | 더 풍부한 findings |
| **2 vs 3 vs 5 actions 라운드로빈** | **3 actions 최적** | 2보다 풍부, 5보다 효율적 |

### CF18 수정: 최적 action 수 = 3
- 라운드로빈 결과: 2→3 (3승), 2→5 (5승), 3→5 (3승)
- **3 actions + 풍부한 findings + 0 errors = 최강**
- 앱 구조: 홈 → 기능페이지 → 결과 → book detail (3 navigate)

### CF19: end_reason의 구체성이 승패 결정
- 5-mini가 이긴 이유: findings에 title, author, year, rating, chapters 모두 명시
- 4o-mini는 "Successfully retrieved a recommendation" (짧음)
- **앱 페이지에 풍부한 정보 = 에이전트가 더 상세한 findings 작성 가능**

### CF20: 주최자 사이트 전부 CSR → 전패
- alcivartech.com, publicdatawatch.com, aisurvivalmag.com, life-agent.fly.dev, mypetfreelancer.alcivartech.com: 전부 failed
- literary-essays.fly.dev: loop_detected
- alcivartech-course-creator.fly.dev: failed (5 errors, login 필요)
- **대회 참가자도 CSR 쓰면 우리한테 무조건 짐**

### CF21: postmortem HTML analysis에서 nav 태그 체크됨
- `semantic header/nav/main present=True/True/True` → 긍정
- nav 없는 서브페이지 → `nav present=False` → 개선 필요

### CF22: 우리가 지는 조건 = 상대가 더 풍부한 기능 플로우
- 풀 e-commerce (4 actions, 풍부한 findings) vs 우리 (2 actions) → 우리 패배
- 심판: "comprehensive set of features including catalog, filtering, checkout"
- **대회 앱은 기능이 풍부하고 플로우가 깊을수록 유리**
- 단순 정보 전달 < 실제 작동하는 인터랙티브 기능

### CF23: 최적 action 수 확정 = 3 (라운드로빈 검증)
- 2 actions vs 3 actions → 3 승
- 2 actions vs 5 actions → 5 승
- 3 actions vs 5 actions → 3 승
- **3 actions = 풍부함과 효율성의 균형**

### CF24: 우리 앱 vs 주최자 사이트 = 5전 5승
- 주최자 사이트 전부 CSR → 대회 Goal로 전패

### CF25: 우리 앱 vs 현실적 경쟁자 = 3전 3승
- Todo App (2 actions), Recipe App (3 actions), Weather App (4 actions + 1 error) 전부 이김
- 에러 0이 핵심, 3 actions + 풍부한 findings가 결정타

### CF26: 3 actions는 자연스럽게 유도 가능
- Goal "Find and interact with the main feature" → 홈→recommend→genre→book detail = 3 actions
- 에이전트가 스스로 3단계 플로우를 탐
- findings: "book is well-presented with summary and chapter list" (풍부)
- **앱 구조만 잘 만들면 에이전트가 알아서 최적 패턴을 따름**

### CF27: about/contact 페이지도 잘 작동
- "Find who made this and how to contact" → 1 action (about 페이지) → 성공
- 다양한 Goal 유형에 대응 가능한 구조 확인됨

### CF28: 실제 배포 3-URL 라운드로빈 결과 (시뮬 아닌 실데이터)
| 대결 | 승자 | 이유 |
|------|------|------|
| Multi-CTA vs Single-CTA | Multi-CTA | "broader capability", 장르 선택 가능 |
| Multi-CTA vs Minimal-Result | Multi-CTA | "more detailed analysis", 접근성/SEO 언급 |
| Single-CTA vs Minimal-Result | Single-CTA | "specific genre context", 더 상세한 결과 |

**순위: Multi-CTA(2승) > Single-CTA(1승1패) > Minimal-Result(2패)**
- 시뮬레이션 결과와 실제 결과 일치 확인됨
- **풍부한 홈 + 풍부한 결과 = 최강**

### CF29: "secret message" 같은 트릭 Goal도 대응됨
- 에이전트가 첫 페이지에서 책 제목/설명으로 "secret message" 해석 → 완료
- 이상한 Goal이 와도 기존 콘텐츠로 대응 가능
- `semantic header/nav/main present=True/True/True` → 긍정
- nav 없는 서브페이지 → `nav present=False` → 개선 필요
- **모든 페이지에 nav 포함시켜야 함**
