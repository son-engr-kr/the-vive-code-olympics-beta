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

---

## 실제 배포 A/B 테스트 결과 (시뮬 아닌 진짜)

### Test 1: Semantic(A) vs Non-semantic(B)
- A: testlab-mu.vercel.app (semantic HTML)
- B: testlab-single-cta.vercel.app (div only)
- **A 에이전트**: completed, 2 actions, 0 errors
- **B 에이전트**: completed, 2 actions, 0 errors
- **심판 3회**: Semantic 3:0 승리
- 이유: "more comprehensive approach", "accessibility and SEO improvements"

### Test 2: Absolute URL(A) vs Relative URL(B)
- A: testlab-mu.vercel.app (절대경로)
- B: testlab-single-cta.vercel.app (상대경로 /recommend)
- **A 에이전트**: completed, 2 actions, 0 errors
- **B 에이전트**: failed, 5 actions, 5 errors (navigate 5번 전부 실패)
- **심판**: Absolute URL 즉시 승리
- 이유: "successful user experience" vs "failed completely with multiple errors"

### Test 3: Proper Title(A) vs Default Title "Create Next App"(B)
- A: testlab-mu.vercel.app (title="BookFinder — Discover Your Next Favorite Book")
- B: testlab-single-cta.vercel.app (title="Create Next App")
- **둘 다 에이전트**: completed, 2 actions, 0 errors (동일)
- **심판**: Proper Title 승리
- 이유: "more comprehensive testing with specific recommendations for accessibility and SEO"
- **insight**: title 태그 자체가 심판 결과에 간접 영향 (postmortem recommendations 품질 차이)

### Test 4: 2-action(A) vs 3-action with teaser(B) ⭐ CRITICAL
- A: testlab-mu.vercel.app (recommend 결과에 풍부한 정보 → 2 actions에서 종료)
- B: testlab-single-cta.vercel.app (recommend 결과에 teaser만 → book detail까지 3 actions)
- **A 에이전트**: completed, 2 actions, 0 errors
- **B 에이전트**: completed, 3 actions, 0 errors (recommend→genre→book detail)
- **심판 3회**: 3-action(B) 3:0 승리
- 이유: "more complex interaction", "accessing detailed information about a specific book"
- **CRITICAL INSIGHT**: recommend 결과에 정보를 줄이고 book detail CTA를 강하게 → 3 actions 유도 → 승리
- **이것이 최적 앱 구조다**: 홈(CTA) → genre 선택 → teaser + "자세히 보기" → book detail(풍부한 정보)

### Test 5: 3-action(A) vs 5-action flow with related books(B)
- B에 "You Might Also Like" related book 섹션 추가
- **결과**: 에이전트가 related book까지 안 감 → 둘 다 3 actions
- 에이전트는 "충분한 정보"를 보면 더 이상 navigate하지 않음
- **5 actions를 강제할 수 없음** - 에이전트가 멈추는 시점은 에이전트가 결정

### Test 5b: 같은 3 actions지만 related book 섹션 유무 차이
- A: book detail에 기본 정보만
- B: book detail에 기본 정보 + "You Might Also Like" 섹션
- **심판**: B 승리
- 이유: "more comprehensive experience", "additional context such as rating and thematic relevance"

### ⭐ CF30: action 수보다 findings 풍부함이 더 중요
- 5 actions를 강제할 수 없음 (에이전트가 "충분하면" 멈춤)
- 같은 3 actions라도 페이지에 정보가 더 많으면 이김
- **최적 전략 수정: action 수를 늘리려 하지 말고, 각 페이지의 정보를 풍부하게**
- related items, ratings, descriptions, chapters 등 → findings가 자연스럽게 풍부해짐

### Test 6: Full homepage(A) vs CTA-only homepage(B)
- A: 책 목록 + CTA + about 링크
- B: CTA만 + 간단한 설명
- **둘 다**: completed, 3 actions, 0 errors
- **심판**: Full homepage(A) 승리
- 이유: "more detailed analysis of user experience"
- **insight**: 홈에 콘텐츠가 많을수록 postmortem이 풍부해짐

### Test 7: No-nav subpages(A) vs Nav on all pages(B)
- B에 breadcrumb nav (`Home → Genres → dystopian`) 추가
- **둘 다**: completed, 3 actions, 0 errors
- **심판**: A(nav 없는) 승리
- 이유: "smoother user experience", "effective and intuitive navigation"
- **insight**: breadcrumb nav가 오히려 HTML을 복잡하게 만들어 불리할 수 있음
- **CF31: nav 추가가 반드시 유리하지 않음 — 간결한 구조가 이길 수 있음**

### Test 8: Link navigate(A) vs Form-based flow(B)
- B: select + input 폼으로 추천 받기
- **A**: completed, 3 actions, 0 errors (navigate x3)
- **B**: completed, 2 actions, 0 errors (navigate + execute_js form submit)
- **심판**: Link navigate(A) 승리
- 이유: "three successful navigations leading to full details" vs "only retrieved a recommendation"
- **CF32: 폼보다 링크 navigate가 유리** — 더 많은 페이지 방문 = 더 풍부한 findings

### Test 9: orange-ruddy.vercel.app
- **결과**: loop_detected, 3 actions, 0 errors
- 에이전트가 `#predictBtn` 3번 클릭 → 변화 없음 → 루프
- **원인**: 버튼 클릭 결과가 HTML에 반영 안 됨 (JS 동적 렌더링)
- **vs 우리 앱**: 우리 승
- **CF33: 버튼 클릭 후 결과가 HTML에 없으면 루프 판정**

---

## gpt-5-mini Judge 재검증 (대회 실제 심판 모델)

> **대회 judge 모델이 gpt-5-mini로 확인됨** → 기존 gpt-4o-mini judge 기준 결과들 재검증 필요

### CF34: gpt-5-mini judge는 UI 세부 품질에 더 민감
- gpt-4o-mini judge: action 수, 기능 완료 여부 위주
- gpt-5-mini judge: postmortem에 UI 문제(accessibility, focus visibility, stray elements) 언급 수가 승패 결정
- **같은 기능이라도 postmortem UI 문제 언급 적은 쪽이 이김**
- 대응: 깔끔한 semantic HTML, accessibility 요소 신경 쓰기

### CF35: enriched book detail = gpt-5-mini judge에서도 승리 ✅
- A(base): title, author, year, rating, description, chapters, related
- B(enriched): A + 유명 인용구(blockquote) + 주요 테마 태그 + 페이지 수 badge
- **gpt-5-mini judge: B 승**
- 이유: "cleaner, more intuitive surface-level UX", "fewer immediate UI/accessibility concerns"
- **결론: enriched 버전을 A 사이트(testlab-mu)에 적용 완료**

### CF36: gpt-5-mini agent는 gpt-4o-mini agent보다 훨씬 많이 탐색
- gpt-4o-mini: 2-3 actions (일관)
- gpt-5-mini: 7-10 actions (related books 따라가기, 여러 장르 탐색)
- gpt-5-mini는 execute_js를 navigate보다 선호
- **agent 모델은 대회에서 여전히 gpt-4o-mini → 기존 3-action 전략 유효**

### CF37: 우리 앱 vs orange-ruddy → gpt-5-mini judge에서도 우리 승
- orange-ruddy: loop_detected
- 우리 앱: completed, 6 actions, 0 errors
- judge 이유: "BookFinder core flows worked end-to-end"

### CF38: focus visibility 부재 = gpt-5-mini judge 감점 요소
- judge가 A 사이트 약점으로 지목: "missing focus visibility", "stray/unused elements"
- **향후 개선 후보**: CSS `focus:outline` 스타일 추가

### A 사이트 업데이트 완료 (2026-04-07)
- `testlab/src/app/book/[id]/page.tsx`: enriched 버전으로 업데이트
  - 추가: `pages` (페이지 수 badge), `quote` (blockquote), `themes` (green tag 배열)
  - 배포: testlab-mu.vercel.app 완료

---

## RecipeBox (팀원 앱) 실험 결과 (2026-04-07)

> 팀원이 제작한 정적 HTML RecipeBox (GitHub Pages 배포)
> - **Original**: 계산기 없는 기본 버전
> - **Advanced**: serving size 계산기 포함 버전

### CF39: 구버전 calculator → loop_detected (팀원 fix로 해결됨) ✅ FIXED
- **구버전** (data-base 속성 방식): 버튼 클릭 → DOM fingerprint 거의 동일 → **loop_detected**
- **신버전** (readyState check + JS 배열 방식): execute_js 1회로 servings 변경 → ingredient 숫자 업데이트 → DOM fingerprint 변화 → **loop 없이 완료**
- 팀원의 `fix(calculator): use readyState check and JS array` 커밋이 실제로 문제 해결
- **결론: 고쳐진 calculator는 안전 — execute_js 1 action으로 정상 작동**

### CF40: Advanced RecipeBox > Original ✅ REVERSED (3:0)
- **재테스트 결과 (Vercel 배포, gpt-4o-mini agent + gpt-5-mini judge)**:
  - Default goal: 둘 다 3 actions completed, **Advanced 2:0 승리**
  - Calculator goal: Advanced 4 actions (navigate×3 + execute_js), Original 3 actions → **Advanced 승리**
- **Advanced가 이기는 이유**:
  1. Calculator execute_js(1회) = 인터랙티브 기능 실연 → judge가 "working interactive feature" 평가
  2. aria-label 추가 (`aria-label="Number of servings"`, `aria-label="Calculate ingredient quantities"`) → accessibility 점수
  3. Calculator goal에서 실제로 기능을 증명 (Original은 "이미 8인분 레시피" 찾아서 얼버무림)
- **결론: 팀원의 Advanced 버전이 최고 제출 앱**

### CF41: RecipeBox calculator goal에서 Advanced가 유일하게 기능 증명 가능
- Calculator goal: "Find a recipe and use the serving size calculator to adjust for 8 people"
  - Advanced: completed, **4 actions** — execute_js로 servings=8 설정, 재료 수량 업데이트 확인 ✅
  - Original: completed, 3 actions — "Tiramisu는 원래 8인분이라 조정 불필요"라고 얼버무림 ❌
- 대회 default goal에서도 Advanced가 이김 (interactive feature 증명 가능 구조)
- **결론: 기능 실연 가능한 앱 > 기능만 있는 앱**

### CF42: Advanced RecipeBox 최종 권장 제출 앱
| 앱 | Actions | 특징 | 권고 |
|----|---------|------|------|
| **RecipeBox Advanced** | **3-4** | 계산기 실연 가능, aria-labels, 풍부한 콘텐츠 | ✅ **최고 선택** |
| RecipeBox Original | 3 | 계산기 없음, 탐색만 | ✅ 좋음 (백업) |
| BookFinder (testlab-mu) | 3 | enriched detail page | ✅ 좋음 (백업) |
