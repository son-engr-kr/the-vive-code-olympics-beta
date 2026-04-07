# VibeCode Olympics — Winning Playbook

> 40+ 실험, 12회 심판 시뮬레이션, 9회 실제 A/B 배포 테스트, 소스코드 전체 분석에서 추출한 핵심만 정리.

---

## 대회 설정 (확정)

| 항목 | 값 |
|------|-----|
| Goal | `"Try to accomplish something significant on this website"` |
| Model | `gpt-4o-mini` |
| Max steps | `20` |
| Mode | `desktop` (1280×800) |
| 심판 temperature | `0.3` |
| **심판 모델** | **`gpt-5-mini` (주최측 확인)** |
| 에이전트 모델 | `gpt-4o-mini` |
| 에이전트 temperature | `0.2` |
| 형식 | 싱글 엘리미네이션 토너먼트 (1:1 대결) |

---

## 승리 공식

```
completed + 3 actions(자연스러운 플로우) + 0 errors + 풍부한 findings = 승리
```

### 핵심 발견: action 수보다 findings 풍부함이 결정적 (CF30)
- 5 actions를 강제할 수 없음 — 에이전트가 "충분한 정보"를 보면 멈춤
- 같은 3 actions라도 **페이지에 정보가 더 많으면** 이김 (Test 5b)
- related items, ratings, chapters 등 → findings가 자연스럽게 풍부해짐

**실제 A/B 배포 테스트로 확정:**
- 2 actions vs 3 actions(teaser→detail) → **3 actions 3:0 승리**
- 기본 3 actions vs related books 있는 3 actions → **related books 승** (더 풍부한 findings)
- 핵심 트릭: 결과 페이지에 **teaser만** → 상세 CTA로 유도 → 상세에 정보 최대한 채움

---

## 심판이 보는 것 (이것만 통제하면 됨)

```
=== Submission ===
App URL: [start_url]
Goal: [goal]                        ← 400자 제한
Status: [completed/failed/...]      ← completed 필수
Actions taken: [숫자]               ← 3이 최적
End reason: [에이전트가 쓴 요약]     ← 구체적일수록 유리
Run Analysis: [...]                 ← 800자 제한
Recommendations: [...]              ← 400자 제한, 가벼울수록 유리
Submitter note: [선택]
```

**심판이 안 보는 것:** 스크린샷, 상세 액션 로그, HTML 원문, 에이전트 메모리

---

## 패배 조건 (하나라도 해당하면 짐)

| 조건 | 원인 | 실험 근거 |
|------|------|-----------|
| CSR (React SPA, Vue SPA) | HTML이 `<div id="app"></div>` → 에이전트가 빈 페이지로 인식 | CF1: 주최자 사이트 7개 전부 CSR → 전패 |
| 상대경로 href | `navigate("/book/1")` → Playwright "invalid URL" 에러 → 루프 | CF2: 상대경로 → 4 errors + loop_detected |
| 404 존재 | 에이전트가 없는 URL 추측 (`/register`) → 에러 기록 | CF3 |
| `<title>` 기본값 | "Create Next App" → postmortem에 감점 추천 생성 | CF16 |
| 비시맨틱 HTML | postmortem "Use semantic HTML" 추천 → 감점 | CF6, CF10 |
| 로그인 필수 | 에이전트가 인증 못 함 → 실패 | CF20 |

---

## 검증된 최적 앱 구조 (실제 A/B 테스트로 확정)

```
홈페이지 (풍부한 콘텐츠 + 명확한 CTA)
│  ├── 앱 설명 (뭐하는 앱인지 한눈에)
│  ├── 주요 콘텐츠 목록 (title, author, rating, description)
│  ├── 강한 CTA 버튼 → 기능 페이지
│  ├── nav 링크 (about 등)
│  └── footer
│
├── 기능 페이지 (선택지 제공)                  ← 에이전트 1 action
│   └── 각 선택지 → 결과 페이지 링크
│
├── 결과 페이지 (⚠️ teaser만! + 강한 "자세히 보기" CTA)  ← 에이전트 2 action
│   └── 요약만 보여주고 상세 페이지로 유도
│
├── 상세 페이지 (풍부한 정보 전부)              ← 에이전트 3 action → finish
│   └── title, author, year, rating, description, chapters, quote(blockquote),
│       themes(tag 배열), pages(badge), "You Might Also Like" 등
│
└── about 페이지 (정보 탐색 Goal 대응)
```

에이전트 플로우: 홈 → CTA (1) → 선택 (2) → teaser에서 "자세히 보기" (3) → finish

**핵심 트릭:** 결과 페이지에 정보를 **일부러 줄이고** 상세 CTA를 강하게 → 에이전트가 3 action까지 자연스럽게 진행
**상세 페이지에 정보를 최대한 풍부하게** — related items 섹션 추가만으로도 심판에서 이김 (CF30, Test 5b)

---

## 에이전트 행동 패턴 (gpt-4o-mini)

| 상황 | 행동 |
|------|------|
| 첫 HTML에 답 있음 | 0 actions 즉시 finish |
| 링크 보임 | navigate로 이동 (절대URL만) |
| 폼 있음 | execute_js로 input 값 + submit = 1 action |
| 막힘 | 1번 시도 후 give_up → failed |
| DOM 전체 접근 | fold/스크롤 무관, 페이지 하단도 즉시 인식 |
| "충분한 정보" 확보 | 더 이상 navigate 안 하고 finish (CF30) |
| 버튼 클릭 후 HTML 변화 없음 | 같은 버튼 재클릭 → 루프 판정 (CF33) |

**CF32: 폼보다 링크 navigate가 유리** — 더 많은 페이지 방문 = 더 풍부한 findings

**중요:** 에이전트는 HTML/DOM만 읽고 판단. 스크린샷은 DB 기록용일 뿐 판단에 사용 안 됨. `images=[]`로 LLM 호출.

---

## HTML 전처리 규칙 (에이전트가 보는 것)

**제거되는 태그:** `<script>`, `<style>`, `<noscript>`, `<svg>`, `<canvas>`, `<img>`, `<picture>`, `<video>`, `<audio>`, `<iframe>`, `<object>`, `<embed>`, `<meta>`, `<link>`

**유지되는 속성:** `id`, `class`, `name`, `type`, `value`, `placeholder`, `href`, `role`, `for`, `title`, `alt`, `checked`, `disabled`, `required`, `readonly`, `method`, `action`, `aria-*`, `data-testid`

→ 텍스트 콘텐츠 + 링크 구조 + 폼 구조만 남음. 시각적 디자인은 완전히 무의미.

---

## 검증 결과 요약

### 실제 A/B 배포 테스트 (시뮬이 아닌 진짜)

| 테스트 | A | B | 결과 |
|--------|---|---|------|
| Semantic vs Non-semantic | 시맨틱 HTML | div only | **Semantic 3:0** ("comprehensive approach") |
| Absolute vs Relative URL | 절대경로 | 상대경로 | **Absolute 즉시 승** (B: 5 errors, failed) |
| Proper Title vs Default | 의미있는 title | "Create Next App" | **Proper Title 승** (postmortem 품질 차이) |
| 2-action vs 3-action | 결과에 풍부한 정보 | 결과에 teaser→상세 | **3-action 3:0** ("more complex interaction") |
| 3-action vs 3-action+related | 기본 정보만 | +related books 섹션 | **related 승** ("more comprehensive experience") |
| Full homepage vs CTA-only | 책 목록+CTA | CTA만 | **Full homepage 승** ("more detailed analysis") |
| Nav breadcrumb vs No-nav | +breadcrumb nav | nav 없음 | **No-nav 승** ("smoother experience") |
| Link navigate vs Form flow | 링크 3 actions | 폼 2 actions | **Link 승** ("full details" vs "only recommendation") |
| 버튼 클릭 앱 (orange-ruddy) | — | JS 동적 렌더링 | **loop_detected** (HTML 변화 없어서) |
| Base vs Enriched(quote/themes/pages) | 기본 상세 페이지 | +blockquote+tags+badge | **Enriched 승** ("fewer UI/accessibility concerns") |

### 심판 시뮬레이션 (gpt-5-mini judge)

| 대결 | 승자 | 이유 |
|------|------|------|
| SSR 앱 vs CSR 앱 | SSR | completed vs failed |
| 인터랙티브(3 actions) vs 정적(0 actions) | 인터랙티브 | "기능 작동 증명" |
| Multi CTA vs Single CTA (6회) | Multi CTA **6:0** | "comprehensive functionality" |
| 우리 앱 vs 주최자 사이트 5개 | 우리 앱 **5:0** | 주최자 사이트 전부 CSR |
| 3 actions vs 현실적 경쟁자 3개 | 우리 앱 **3:0** | 에러 0 + 풍부한 findings |

---

## 기술 체크리스트

### 필수 (하나라도 빠지면 실패/감점)
- [ ] SSR or 정적 HTML (CSR 절대 금지)
- [ ] 모든 `<a href>` 절대경로 (`https://domain.com/path`)
- [ ] 모든 링크 → 실제 존재하는 페이지 (404 없음)
- [ ] 시맨틱 HTML: `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`
- [ ] 의미있는 `<title>` + `<meta description>`
- [ ] 로그인 불필요
- [ ] 빠른 로딩 (domcontentloaded 시점에 콘텐츠 있어야 함)
### 유리 (승패 결정)
- [ ] 3단계 기능 플로우 (홈 → 기능 → teaser → 상세)
- [ ] 결과 페이지는 **teaser만** (상세로 유도 → 3 actions)
- [ ] 상세 페이지에 정보 최대한 풍부 (related items, chapters, ratings, **quote, themes, pages** 등)
- [ ] 홈에 앱 설명 + 주요 콘텐츠 목록 (정보 찾기 Goal 대응)
- [ ] 폼보다 링크 navigate 선호 (CF32: 더 많은 페이지 방문 = 더 풍부한 findings)
- [ ] about 페이지 (다양한 Goal 유형 대응)

### gpt-5-mini judge 추가 감점 요소 (CF34, CF38)
- [ ] CSS `focus:outline` 없음 → postmortem에 "missing focus visibility" 언급 → 감점
- [ ] 불필요한 stray elements, unused HTML 요소 → "stray elements" 지적
- [ ] accessibility 미흡 (aria-label 부재 등) → Recommendations에 기록 → 감점

### 금지
- [ ] `"use client"` + `useEffect` 데이터 로딩
- [ ] `if (!data) return null`
- [ ] 상대경로 href
- [ ] 로그인/회원가입 필수 기능
- [ ] 모달, 팝업, hover-only 인터랙션
- [ ] JS-only 네비게이션 (href 없는 onClick)
- [ ] 외부 링크 의존 (에이전트는 사이트 밖으로 안 나감)
- [ ] 버튼 클릭 후 HTML이 안 바뀌는 JS 동적 렌더링 (CF33: 루프 판정)
- [ ] 불필요한 breadcrumb nav (CF31: 오히려 HTML 복잡화 → 불리)

---

## 기술 스택

- **Next.js App Router** (SSR 기본)
- **Tailwind CSS** (빠른 스타일링, DOM에 영향 없음)
- **Vercel** (즉시 배포)
- `headers()`로 baseUrl 동적 생성 → 절대경로 자동화

```tsx
const headersList = await headers();
const host = headersList.get("host") || "localhost:3000";
const protocol = host.includes("localhost") ? "http" : "https";
const baseUrl = `${protocol}://${host}`;
```

---

## 타임라인 (2시간)

| 시간 | 작업 |
|------|------|
| 0–30분 | 핵심 기능 완성 + 첫 배포 |
| 30–60분 | AIUXTester로 테스트, 에러 수정 |
| 60–90분 | 기능 플로우 깊이 추가, 콘텐츠 풍부화 |
| 90–120분 | 반복 테스트, 0 errors 확인, submitter note 작성 |

---

## 우리가 지는 유일한 시나리오

상대가 **SSR + 절대경로 + 0 errors + 더 풍부한 기능 플로우**를 만들어낼 때.

대응: 상세 페이지의 정보 밀도를 최대한 높여서 에이전트 findings를 풍부하게 만든다. (title, author, year, rating, description, chapters, quote, themes, pages, "You Might Also Like" related items 등)

**CF30이 핵심:** action 수를 늘리려 하지 말고, 각 페이지의 정보를 풍부하게. 에이전트는 충분하면 멈추므로 5 actions 강제는 불가능.

---

## gpt-5-mini Judge 특성 (실제 대회 심판 모델)

gpt-4o-mini judge와 판단 기준이 다르다.

| 항목 | gpt-4o-mini judge | gpt-5-mini judge |
|------|-------------------|------------------|
| 주요 판단 기준 | action 수, 기능 완료 여부 | UX 품질, UI polish, accessibility |
| 감점 트리거 | broken flow, 많은 errors | focus visibility 부재, stray elements, aria 미흡 |
| 차이 민감도 | 큰 차이(CSR vs SSR)에 민감 | 작은 차이(polish)에도 민감 |

### gpt-5-mini judge가 추가로 중요시하는 것
1. **postmortem Recommendations에 UI 문제 언급 수** — 적을수록 유리
2. **focus visibility** (`focus:outline` CSS 없으면 지적됨, CF38)
3. **stray/unused elements** — 깔끔한 HTML이 유리
4. **콘텐츠 풍부함** — quote, themes, pages badge 등 정보 추가 → "fewer concerns" 평가 (CF35)

### 에이전트(gpt-4o-mini) vs 심판(gpt-5-mini) 혼동 주의
- **에이전트** = `gpt-4o-mini` → 기존 3-action 전략 그대로 유효 (CF36)
- **심판** = `gpt-5-mini` → UI polish, accessibility까지 postmortem을 통해 간접 평가
- gpt-5-mini 에이전트로 테스트하면 7-10 actions까지 탐색하지만, 대회 에이전트는 4o-mini
