# AI 심판 시스템 분석

## 1. 에이전트 작동 방식

### 에이전트가 보는 것
- **HTML만 본다** (스크린샷 아님)
- 시스템 프롬프트: "Rely on the provided HTML/DOM, not screenshots."
- `images=[]` — 이미지를 LLM에 전달하지 않음
- 스크린샷은 UI 표시용으로만 촬영, 판단에 사용 안 됨

### HTML 전처리 (html_cleaner.py)
제거되는 태그: `<script>`, `<style>`, `<noscript>`, `<svg>`, `<canvas>`, `<img>`, `<picture>`, `<video>`, `<audio>`, `<iframe>`, `<object>`, `<embed>`, `<meta>`, `<link>`

유지되는 속성: `id`, `class`, `name`, `type`, `value`, `placeholder`, `href`, `role`, `for`, `title`, `alt`, `checked`, `disabled`, `required`, `readonly`, `method`, `action`, `aria-*`, `data-testid`, `data-test`, `data-qa`, `data-cy`

### 에이전트 LLM 설정
- Temperature: `0.2` (매우 결정적)
- Max tokens: `1024`
- 동일 Goal 3회 실행 → 완전히 동일한 결과 (일관성 검증됨)

### 에이전트 가능 액션
| 액션 | 설명 | 비고 |
|------|------|------|
| `execute_js` | JS 실행, JSON 결과 반환 | gpt-5-mini가 선호 |
| `navigate` | URL로 이동 | **절대경로만 가능** |
| `save_to_memory` | 정보 저장 | |
| `finish` | 성공 종료 (Verdict 포함) | |
| `fail` | 실패 | |
| `give_up` | 포기 | |

### 페이지 로딩 방식
```
초기 로드: page.goto(url, wait_until="domcontentloaded")
           → settle 없이 바로 HTML 캡처
액션 후:   domcontentloaded (10s) + networkidle (3s) + 600ms 대기
```
CSR이 실패하는 이유: domcontentloaded 시점에 JS가 아직 실행 안 됨

### 루프 감지 (자동 실패)
1. 같은 URL에서 같은 `execute_js` 3번 반복 → 루프
2. 동일 액션 4번 반복 (min 8 actions 후) → 루프
3. A,B,A,B 교대 패턴 3회 → 루프
4. 같은 URL에서 12번 액션 + 유니크 액션 ≤2개 → 루프
5. 폼 플로우 예외: `/register`, `/signup` URL + type+click 조합은 20 actions까지 허용

## 2. 심판 (Judge) 작동 방식

### 토너먼트 구조
- 단일 엘리미네이션 (1:1 대결)
- 홀수면 첫 매치 3-way, 나머지 2-way
- 최종 1명 남을 때까지

### 심판이 받는 입력
```
=== Submission N ===
App URL: [start_url]
Goal: [goal] (400자 제한)
Status: [completed/failed/loop_detected/stopped]
Actions taken: [action_count]
End reason: [에이전트가 작성한 요약]

Run Analysis:
[postmortem run_analysis] (800자 제한)

Recommendations:
[postmortem recommendations] (400자 제한)

Submitter note: [optional]
```

### 심판이 안 보는 것
- 스크린샷
- 상세 액션 히스토리 (어떤 URL을 방문했는지 등)
- 원본 HTML
- 에이전트 메모리
- 브라우저 인터랙션 상세

### 심판 프롬프트 (competition/judge.py 원문)
```
You are an impartial judge for the Vibecode Olympics, a competition where developers 
submit AI-generated UX test runs of their own web apps. 
Your job is to pick the winner of this match based on which APP has the best user experience — 
not which test run was most thorough. 
Award the win to the app whose testing reveals it works well: smooth user flows, 
features that complete successfully, intuitive navigation, and few or no critical errors. 
Penalize apps whose runs reveal broken flows, failed registrations, confusing UX, or hard errors. 
A test that found nothing wrong is evidence of a good app. 
A test that found many bugs is evidence of a bad app, even if the test itself was thorough. 
Be decisive. Pick one winner. Respond in JSON.
```

### 심판 LLM 설정
- Temperature: `0.3`
- Provider/Model: 대회 주최측이 결정
- **확인된 대회 judge 모델: `gpt-5-mini`** (주최측 확인)

### 심판 판단 기준 (프롬프트에서 추출)
| 긍정 | 부정 |
|------|------|
| smooth user flows | broken flows |
| features that complete successfully | failed registrations |
| intuitive navigation | confusing UX |
| few or no critical errors | hard errors |
| "found nothing wrong" = good app | "found many bugs" = bad app |

## 3. Postmortem 분석

### 2단계 분석
1. **Run Analysis**: run facts (goal, status, actions, errors, URLs) 기반 분석
2. **HTML Analysis**: 방문한 페이지 HTML 기반 UX/기술 리뷰

### 심판에 영향 주는 postmortem 요소
| 항목 | 좋은 예 | 나쁜 예 |
|------|---------|---------|
| Status | completed | failed |
| Error Count | 0 | 4 |
| Recommendations | "Improve SEO" (가벼움) | "Add SSR, fix rendering" (심각) |
| HTML Analysis | "well-organized, semantic" | "empty app div, no content" |

### 시맨틱 HTML vs 비시맨틱 HTML postmortem 차이
- 시맨틱: "well-organized and follows semantic practices" → 긍정
- 비시맨틱: "Use semantic HTML elements" 추천 발생 → 감점

## 4. 모델별 행동 차이

### gpt-4o-mini (대회 기본 모델)
- 첫 HTML에 답 있으면 → 0 actions 즉시 finish
- 막히면 → 1번 시도 후 give_up
- UX 평가 시 → 짧고 긍정적 ("good user experience")
- navigate 사용 선호

### gpt-5-mini
- 막히면 → execute_js로 DOM 탐색, 우회 경로 찾기
- 없는 기능도 → "completed" (JS 탐색 후 "없다" 보고)
- UX 평가 시 → 상세하고 비판적 ("lacks discoverability")
- execute_js로 클릭 시뮬레이션 (`querySelector('a').click()`)

## 5. competition_seed.py 정보 (대회 시뮬 설정)

```python
GOAL = "Try to accomplish something significant on this website"
model = "gpt-4o-mini"     # 에이전트 모델 (세션 실행)
max_steps = 20
mode = "desktop"
# judge 모델은 Run Competition 시 선택 → gpt-5-mini (주최측 확인)
```

## 6. gpt-5-mini judge 특성 (실제 대회 심판 모델)

### gpt-4o-mini judge vs gpt-5-mini judge 차이
| 항목 | gpt-4o-mini judge | gpt-5-mini judge |
|------|-------------------|------------------|
| 판단 기준 | action 수, 기능 완료 여부 | UX 품질, 세부 설명 품질 |
| 승패 요인 | 에러 없이 많은 actions | postmortem에서 발견된 UI 문제 수 |
| 차이 민감도 | 큰 차이(CSR vs SSR)에 민감 | 작은 차이(accessibility, polish)에도 민감 |
| 추가 감점 | broken flow, 많은 errors | focus visibility 부재, stray elements |

### gpt-5-mini judge가 중요시하는 것
- **UI 문제 적을수록** 유리 (postmortem에 UI 문제가 적게 언급됨)
- **접근성(focus visibility, aria labels)** 부재 언급되면 감점
- **기능 풍부함** 여전히 중요 (completed + 좋은 flows)
- postmortem의 Recommendations에 "Fix accessibility"가 나오면 불리

### 실험 결과 (gpt-5-mini 세션 + gpt-5-mini judge)
| 대결 | 승자 | 이유 |
|------|------|------|
| A(base) vs B(enriched: quotes/themes/pages) | **B 승** | "fewer UI/accessibility concerns" |
| 우리 앱 vs orange-ruddy.vercel.app | **우리 앱 승** | BookFinder 완성도 vs competitor UX issues |

테스트 대상 사이트 (주최자 사이트들 — 대부분 CSR):
- alcivartech.com
- publicdatawatch.com
- mypetfreelancer.alcivartech.com
- aisurvivalmag.com
- literary-essays.fly.dev
- alcivartech-course-creator.fly.dev
- life-agent.fly.dev
