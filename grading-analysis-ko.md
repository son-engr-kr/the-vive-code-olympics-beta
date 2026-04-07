# AIUXTester 채점 메커니즘 — 기술 상세 분석

## 개요

VibeCode Olympics는 AI가 전적으로 심사하는 해커톤이다. 발표 없이 — 라이브 URL과 AI UX 테스팅 에이전트만으로 평가한다.

- **일시:** 2026-04-07, 오후 5:30–9:00 (코딩 2시간, 심사 1시간)
- **도구:** [AIUXTester](https://github.com/mindfulcoder49/AIUXTester)
- **기술 스택:** FastAPI + LangGraph + Playwright + Vue 3 + SQLite/MariaDB

---

## 아키텍처 개요

```
┌─────────────────────────────────────────────────────────────┐
│                      AIUXTester                              │
│                                                              │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐               │
│  │ Vue 3 UI │───▶│ FastAPI  │───▶│ LangGraph│               │
│  │          │    │ (app.py) │    │  Agent   │               │
│  └──────────┘    └────┬─────┘    └────┬─────┘               │
│                       │               │                      │
│               ┌───────┴───────┐  ┌────┴─────┐               │
│               │  SQLite/Maria │  │Playwright│               │
│               │  (11 tables)  │  │ Browser  │               │
│               └───────────────┘  └──────────┘               │
│                                                              │
│  ┌──────────────────────────────────────────┐               │
│  │ LLM Providers                            │               │
│  │  OpenAI (retry+repair) │ Gemini │ Claude │               │
│  └──────────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. Agent 실행 그래프 (`agent/test_graph.py`)

LangGraph 상태 머신, 6개 노드로 구성:

```
initialize ──▶ think ──▶ execute ──▶ capture ──▶ check_status ──┐
                 ▲                                               │
                 └────────── (status == "running") ──────────────┘
                                                                 │
                              (status != "running") ─▶ teardown ─▶ END
```

### 노드 상세

#### 1.1 `initialize` — 초기화
- Playwright를 통해 headless Chromium 실행 (stealth 플러그인 적용)
- 브라우저 인자: `--no-sandbox, --disable-setuid-sandbox, --disable-dev-shm-usage, --disable-gpu, --no-zygote, --single-process`
- `start_url`로 이동, 초기 스크린샷 (전체 페이지 PNG) + 정제된 HTML 캡처
- `current_step = 0` 설정

#### 1.2 `think` — LLM 판단
- DB에서 사용자 중지 요청 확인
- 하드 안전장치: `current_step >= max_steps` → 중지
- DB에서 메모리 조회, system + user 프롬프트 생성
- **LLM 호출: `temperature=0.2`**, schema=`AgentAction`
- `next_action`을 state에 저장
- 폴백: LLM 실패 시 → `fail` 액션

#### 1.3 `execute` — 브라우저 액션 실행
`next_action.action`에 따라 핸들러로 라우팅:

| 액션 | 핸들러 | 후처리 |
|------|--------|--------|
| `execute_js` | `browser_actions.execute_javascript(page, script)` | `settle_page_after_action()` |
| `navigate` | `browser_actions.navigate(page, url)` | `settle_page_after_action()` |
| `save_to_memory` | `memory_update` dict 업데이트 | — |
| `finish` | `status="completed"`, `end_reason=summary` 설정 | — |
| `fail` | `status="failed"`, `end_reason=reason` 설정 | — |
| `give_up` | `status="failed"`, `end_reason` (기본값: "Agent gave up due to repeated lack of progress") | — |

**`settle_page_after_action()`**: `domcontentloaded` 대기(10초) → `networkidle` 대기(3초) → sleep 600ms

#### 1.4 `capture` — 상태 스냅샷
- 스크린샷(PNG) + 정제된 HTML 캡처
- 스크린샷, HTML 캡처, 액션 레코드를 DB에 삽입
- `memory_update` 존재 시 메모리 갱신
- `current_step` 증가
- **루프 탐지**: 액션 fingerprint 계산, `recent_action_fingerprints`의 rolling window 유지
- URL을 `pages_visited`에 추가

#### 1.5 `check_status` — 계속 진행 or 중지
확인 순서:
1. DB에서 사용자 중지 요청 확인
2. `stop_on_first_error` 설정: 마지막 액션 실패 시 → 중지
3. **루프 탐지** (활성화된 경우):
   - `repeat_single: 4` — 동일 액션 4회 반복
   - `repeat_alternating: 3` — 두 액션이 교대로 3회 반복
   - `min_actions_before_loop: 8` — 탐지 시작 최소 액션 수
   - `passive_actions` (scroll/swipe): `repeat_single: 10`, `repeat_alternating: 5`
   - `stale_url_actions: 12` — 같은 URL에서 진전 없이 12회 액션
4. 하드 안전장치: `current_step >= max_steps`

**Recursion limit**: `max(50, max_steps * 6 + 20)`

---

## 2. Agent 프롬프트 시스템 (`agent/prompts.py`)

### 2.1 System Prompt (매 step마다 재생성)

주입되는 구성 요소:
- **Goal** (목표)
- **Mode + Viewport**: Desktop (1280×800) 또는 Mobile (390×844, device_scale_factor=3, 터치 활성화)
- **Memory** (bullet list 형태)
- **Action History** (최근 N step: step, URL, action, params, success, intent, reasoning, outcome)

**규칙 (소스 원문):**
```
- HTML/DOM에 의존하라, 스크린샷에 의존하지 마라.
- 로그인/회원가입 폼이 보이고 메모리에 인증정보가 있으면 사용하라.
- 막히거나 진전 없이 같은 액션을 반복하면 give_up()을 구체적 이유와 함께 사용하라.
- 작업 완료 시 finish()를 명확한 요약과 함께 사용하라.
- 선택한 액션에 대해 항상 짧은 reasoning을 포함하라.
- 항상 last_action_result를 포함하라: 이전 액션 후 일어난 일의 간결한 설명.
- 나중에 필요한 인증정보나 사실은 save_to_memory로 저장하라.
- 간결한 JSON 직렬화 가능 결과를 반환하는 execute_js 프로브를 선호하라.
- 이전에 성공한 동일 URL에서 실질적으로 같은 execute_js 검사를 반복하지 마라.
- 1~2번의 성공적 검사 후, 새 질문으로 이동하거나 finish하라.
- CSRF 토큰, 인증 헤더, API 키, 보안 토큰을 탐색하지 마라.
- 폼 제출 성공/실패 시 HTTP 메커니즘이 아닌 사용자에게 보이는 결과를 보고하라.
```

**사용 가능한 액션:**
```
execute_js {script}, navigate {url}, save_to_memory {key,value},
finish {summary}, fail {reason}, give_up {reason}
```

**필수 출력 형식 (JSON):**
```json
{
  "action": "<허용된 액션 중 하나>",
  "params": {"script": "<execute_js일 때 JS 코드>"},
  "intent": "<다음에 달성하려는 것>",
  "reasoning": "<이 액션이 지금 최선인 이유>",
  "last_action_result": "<이전 액션 후 일어난 일>",
  "memory_update": null
}
```

**`finish` 액션은 구조화된 요약 필수:**
```
Verdict: <한 문장>
Findings:
- <이슈 또는 확인 사항>
- <이슈 또는 확인 사항>
Next step: <구체적 권장 사항 하나>
```

### 2.2 User Prompt
```
Current URL: {url}
Step: {step}
--- Current page HTML ---
{html}
---
JSON 객체만 반환하라.
```

### 2.3 핵심 관찰 사항
- Agent는 **모든** 상호작용을 `execute_js`로 결정 — 클릭, 입력, 스크롤 모두 JS 스크립트
- `navigate`는 직접 URL 변경 전용
- Agent는 판단에 스크린샷 픽셀을 사용하지 않음 (프롬프트: "HTML/DOM에 의존하라, 스크린샷 아님") — 스크린샷은 postmortem/DB 기록용

---

## 3. 브라우저 레이어 (`browser/manager.py`, `browser/actions.py`)

### 3.1 브라우저 설정

| 설정 | Desktop | Mobile |
|------|---------|--------|
| Viewport | 1280×800 | 390×844 |
| Scale Factor | 1 | 3 |
| is_mobile | false | true |
| has_touch | — | true |
| User-Agent | Chrome 120 / Win10 | iPhone / iOS 17 |

- Stealth 플러그인: `playwright_stealth.stealth_async()` 적용 (봇 탐지 우회)
- 실행 timeout: 45,000ms
- 페이지 timeout: 60,000ms

### 3.2 `execute_javascript` — 2단계 실행
1. **표현식으로 시도**: `(() => ({ok: true}))()`, `document.title` 스타일 처리
2. **SyntaxError 발생 시** → `AsyncFunction` 본문으로 래핑하여 구문(statement)으로 실행
3. 결과 정규화: `undefined`/`null` → `null`, 객체 → `JSON.stringify`
4. 에러 감지 키워드: `syntaxerror`, `illegal return`, `unexpected token`, `unexpected identifier`, `missing`, `unterminated`

### 3.3 스크린샷 시스템
- 전체 페이지 PNG (`full_page=True, type="png"`)
- SVG 오버레이 기능: 색상 링(24px, 3px 테두리), 중심 도트(8px), 라벨(monospace 12px), 점선 연결선
- `screenshots` 테이블에 BLOB으로 저장

---

## 4. HTML 정제 (Sanitization)

HTML은 agent에 전달되기 전 두 가지 모드로 정제됨:
- **"agent" 모드**: LLM 토큰 소비를 줄이기 위해 스트리핑
- **"postmortem" 모드**: 분석용으로 다르게 보존

핵심 — agent는 **정제된 HTML**을 보며, 원본 페이지 소스를 보지 않는다.

---

## 5. Postmortem 분석 파이프라인 (`agent/postmortem_graph.py`)

세션 종료 후 자동 실행. LangGraph: `pm_analyze_run → pm_analyze_html → save → END`

### 5.1 Phase 1: 실행 분석

**RUN_FACTS dict 구조:**
```python
{
  "goal": str,
  "final_status": str,         # completed/failed/stopped/loop_detected
  "end_reason": str,
  "total_actions": int,
  "action_counts": dict,       # {"execute_js": 12, "navigate": 3, ...}
  "status_counts": dict,       # {"success": 10, "failed": 2}
  "unique_urls_visited": list,
  "error_count": int,
  "recent_errors": list,       # 마지막 5개 에러 (step 번호 포함)
  "log_tail": list             # 마지막 20개 실행 로그
}
```

**LLM 호출:**
- System: `"당신은 웹 테스팅 에이전트의 사후 분석가입니다. 실행 결과를 분석하고, 성공/실패 지점을 강조하고, 실행 가능한 권장 사항을 작성하세요. 제공된 RUN_FACTS에 기반해야 하며 이를 모순하면 안 됩니다. JSON으로 반환: {run_analysis: string, recommendations: string}."`
- User: `{"RUN_FACTS": run_facts, "memory": state.memory, "actions": state.action_history}`의 JSON
- Temperature: **0.2**
- Schema: `PostmortemRunOutput { run_analysis: str, recommendations: str }`

**휴리스틱 폴백** (LLM 실패 시):
- 총/성공 액션 수, 고유 URL, 최근 경로 계산
- 하드코딩된 4개 권장 사항 (내비게이션 타겟팅, 복구 휴리스틱, 좌표 로깅, 토큰 절감)

### 5.2 Phase 2: HTML 분석

**LLM 호출:**
- System: `"당신은 UX + 기술 리뷰어입니다. 각 페이지의 HTML을 순서대로 분석하고 상세한 디자인 및 기술 권장 사항을 제공하세요. JSON으로 반환: {html_analysis: string, recommendations: string}."`
- User: `{"goal": goal, "pages": [{"url": u, "html": h}, ...]}`의 JSON
- Temperature: **0.2**
- Schema: `PostmortemHtmlOutput { html_analysis: str, recommendations: str }`

**휴리스틱 폴백** (LLM 실패 시):
- `<header>`, `<nav>`, `<main>` 태그 존재 여부 스캔 (대소문자 무시)
- URL별 HTML 길이 보고 (첫 10개 페이지)

### 5.3 저장
```sql
postmortem_reports (
  id, session_id,
  run_analysis TEXT,
  html_analysis TEXT,
  recommendations TEXT,
  created_at
)
```

---

## 6. 대회 및 심사 시스템

### 6.1 대진표 생성 (`competition/bracket.py`)

```python
def build_bracket(entry_ids: list[int]) -> list[list[list[int]]]:
    # 참가작을 무작위로 섞음
    # 반환: rounds → matches → entry_ids
```

**규칙:**
- N이 짝수 → 모두 2인 매치 `[a,b]`
- N이 홀수 → 첫 매치만 3인 `[a,b,c]`, 나머지는 2인
- 라운드 수: 반복 계산 `n = (n-3)//2 + 1 if 홀수 else n//2`
- 승자가 재귀적으로 다음 라운드 진출, 1명 남을 때까지

### 6.2 매치 실행 (`competition/runner.py`)

매치별 처리:
1. 각 참가작의 `session`, `postmortem`, `actions` 조회
2. `action_count = len(actions)`를 entry dict에 주입
3. `judge_match()` 호출
4. winner_index 범위 검증: `max(0, min(result.winner_index, len(match_entry_ids) - 1))`
5. `winner_entry_id` + `judge_reasoning` 저장

**부전승 로직**: 1개 참가작 매치 → 자동 진출, 사유: `"Advanced automatically (only entry in match)."`
**에러 폴백**: 심판 실패 시 → 첫 번째 참가작이 진출, 사유: `"Judge unavailable ({exc}); first entry advanced by default."`

### 6.3 심판 메커니즘 (`competition/judge.py`)

#### Entry Summary (심판이 참가작별로 보는 데이터):
```python
def _entry_summary(entry, session, postmortem) -> str:
    # App URL:          session["start_url"]
    # Goal:             session["goal"][:400]
    # Session status:   session["status"]
    # Action count:     entry["action_count"]       # runner가 주입
    # End reason:       session["end_reason"]
    # Run Analysis:     postmortem["run_analysis"][:800]
    # Recommendations:  postmortem["recommendations"][:400]
    # Note:             entry["note"]                # 선택적 제출자 메모
```

**잘림(truncation) 한도가 핵심** — run_analysis 최대 800자, recommendations 400자, goal 400자.

#### 심판 System Prompt (원문):
```
당신은 Vibecode Olympics의 공정한 심판입니다. 이 대회에서 개발자들은
자신의 웹 앱에 대한 AI 생성 UX 테스트 실행을 제출합니다.
당신의 임무는 어떤 APP이 최고의 사용자 경험을 제공하는지를 기준으로
승자를 선택하는 것입니다 — 어떤 테스트가 가장 철저했는지가 아닙니다.
테스트 결과 잘 작동하는 앱에 승리를 부여하세요: 매끄러운 사용자 흐름,
성공적으로 완료되는 기능, 직관적 내비게이션, 치명적 오류 거의 없음.
깨진 흐름, 실패한 회원가입, 혼란스러운 UX, 하드 에러가 드러나는 앱은 감점하세요.
아무 문제도 발견하지 못한 테스트는 좋은 앱의 증거입니다.
많은 버그를 발견한 테스트는 (테스트 자체가 철저했더라도) 나쁜 앱의 증거입니다.
결단력 있게. 한 명의 승자를 선택하세요. JSON으로 응답하세요.
```

#### 심판 User Prompt:
```
다음 {n}개의 대회 제출물을 비교하고 최고를 선택하세요.

{entry_summary_1}
{entry_summary_2}
...

JSON으로 응답: {"winner_index": <0 ~ {n-1}>, "reasoning": "<문단>"}
```

#### 심판 LLM 파라미터:
- **Temperature: 0.3**
- Schema: `JudgeOutput { winner_index: int, reasoning: str }`
- 기본 모델: `gpt-5-mini` (OpenAI)
- agent와 동일한 `generate_action()` 인터페이스 사용

---

## 7. LLM Provider 구현체

### 7.1 OpenAI (`llm/openai_client.py`) — 가장 견고함

- `response_format={"type": "json_object"}`로 구조화된 출력
- **3단계 에러 복구:**
  1. JSON 파싱 실패 → `_repair_payload` (원본 텍스트를 LLM에 재전송하여 교정)
  2. Schema 검증 실패 → `_repair_payload` 재시도
  3. 최종 실패 → `_coerce_action_like_payload` (안전한 기본값으로 하드코딩된 폴백)
- **재시도 로직:** Rate limit에 대해 최대 4회 재시도
  - 감지: 텍스트에 "rate limit", "rate_limit_exceeded", `RateLimitError`
  - 에러 메시지에서 retry-after 추출 (`Xms` 또는 `Xs`)
  - Exponential backoff: `min(0.5 * 2^attempt, 5.0)` + jitter `uniform(0.05, 0.2)`, 최대 6초
- **Temperature 예외:** `gpt-5*` 모델은 temperature를 지원하지 않음 → 에러 시 자동 제거

### 7.2 Gemini (`llm/gemini_client.py`) — 최소 구현
- `google.generativeai.types.Part.from_data()`로 이미지 처리
- 재시도 로직 없음, 에러 복구 없음
- `response.text`에서 직접 JSON 추출

### 7.3 Claude (`llm/claude_client.py`) — 최소 구현
- `max_tokens=1024` (고정, 하드코딩)
- 재시도 로직 없음, 에러 복구 없음
- Base64 이미지 인코딩

**시사점: OpenAI가 agent 실행과 심사 모두에서 가장 신뢰성 높은 provider이다.**

---

## 8. 데이터베이스 스키마 (11개 테이블)

```
users ─────────┐
               ├── sessions ──┬── screenshots (BLOB)
refresh_tokens─┘              ├── html_captures
                              ├── actions (step, type, params, success, error)
                              ├── agent_memory (key-value, upsert)
                              ├── postmortem_reports
                              └── run_logs
               
competitions ──┬── competition_entries (사용자당 대회당 UNIQUE)
               └── competition_matches (round, match, winner, reasoning)
```

주요 제약 조건:
- `UNIQUE(competition_id, user_id)` — 대회당 사용자당 1개 참가작
- 세션 종료 상태: `completed`, `failed`, `stopped`, `loop_detected`
- 대회 상태: `open` → `closed` → `running` → `complete`

---

## 9. 설정 및 티어 시스템 (`config.py`)

### 티어 제한
| 설정 | Free | Basic | Pro |
|------|------|-------|-----|
| `max_steps` | 50 | 150 | 500 |
| `max_history_actions` | 5 | 10 | 20 |
| `loop_detection_window` | 8 | 12 | 15 |
| `postmortem_depth` | standard | standard | deep |

### 루프 탐지 기본값
```python
loop_detection_rules = {
    "repeat_single": 4,            # 동일 액션 4회 → 루프
    "repeat_alternating": 3,       # A-B-A-B-A-B → 루프
    "min_actions_before_loop": 8,  # 8개 액션 이후부터 탐지 시작
    "passive_actions": ["scroll_down", "scroll_up", "swipe_left", "swipe_right"],
    "passive_repeat_single": 10,   # 수동적 액션은 더 높은 임계값
    "passive_repeat_alternating": 5,
    "stale_url_actions": 12        # 같은 URL에서 12회 액션 → 루프
}
```

### 티어별 설정 키 접근 권한
| 티어 | 허용 키 |
|------|---------|
| Free | `mode`, `max_steps`, `stop_on_first_error` |
| Basic | Free + `max_history_actions`, `loop_detection_enabled`, `loop_detection_window` |
| Pro | Basic + `loop_detection_rules`, `memory_injection_format`, `screenshot_quality`, `action_retry_policy`, `postmortem_depth`, `custom_system_prompt_preamble` |

### 모델 레지스트리
| Provider | Free | Basic | Pro |
|----------|------|-------|-----|
| OpenAI | gpt-5-mini, gpt-4o-mini | gpt-4o-mini, gpt-4o | gpt-4o-mini, gpt-4o, gpt-4.1, gpt-5-mini, gpt-5 |
| Gemini | gemini-1.5-flash | + gemini-1.5-pro | + gemini-2.0-pro |
| Claude | claude-3-haiku | + claude-3-sonnet | + claude-3-opus |

---

## 10. 채점 파이프라인 요약

**수치 점수는 없다.** 전체 평가가 정성적이며 LLM 기반이다:

```
                    ┌─────────────────────────────────┐
                    │       심판에게 전달되는 데이터     │
                    └─────────────────────────────────┘

세션 실행                      Postmortem (LLM, t=0.2)        심판 입력 (잘림 적용)
──────────                     ──────────────────────         ─────────────────────
start_url           ─────────────────────────────────────▶   App URL
goal                ─────────────────────────────────────▶   Goal [:400]
status              ─────────────────────────────────────▶   Session status
len(actions)        ─────────────────────────────────────▶   Action count
end_reason          ─────────────────────────────────────▶   End reason
action_history  ──▶ RUN_FACTS ──▶ run_analysis       ───▶   Run Analysis [:800]
html_captures   ──▶ pages     ──▶ recommendations    ───▶   Recommendations [:400]
                                                             Submitter Note (선택)

                              심판 (LLM, t=0.3)
                              ────────────────
                              출력: winner_index + reasoning
                              점수 없음. 이진 승/패.
```

---

## 11. 기술적 최적화 벡터

### Agent가 "보는" 것
- **정제된 HTML** (원본 소스 아님) — 시맨틱 구조가 중요
- **스크린샷 기반 판단 없음** — 프롬프트에서 명시적으로 "HTML/DOM에 의존"
- 현재 URL과 step 번호

### 심판이 "보는" 것
- 잘린 요약 (분석 최대 800자)
- 액션 수 (적을수록 = 더 단순한 UX = 더 좋은 신호)
- 세션 상태 (completed >> failed)
- 제출자 메모 (자유 텍스트, 선택 — 앱을 프레이밍할 기회)

### 최적화 시사점
1. **시맨틱 HTML**: `<header>`, `<nav>`, `<main>`, `<form>`, `<button>` 사용 — agent가 DOM을 파싱함
2. **단순한 DOM 구조**: Agent는 모든 상호작용에 `execute_js` 사용. Shadow DOM이나 무거운 CSR이 있는 복잡한 JS 프레임워크는 혼란을 줄 수 있음
3. **명시적 label/placeholder**: Agent는 HTML 텍스트 콘텐츠를 읽고 무엇을 클릭/입력할지 결정
4. **빠른 페이지 로드**: `settle_page_after_action()`은 domcontentloaded(10초) + networkidle(3초) + 600ms 대기. 느린 페이지는 step을 낭비함
5. **설정 없는 인증 벽 금지**: Agent는 `save_to_memory`로 인증정보를 저장할 수 있지만, 흐름이 명확해야 함
6. **Goal 설계**: 설정한 goal이 agent가 시도하는 것을 결정. 단순하고 달성 가능한 goal → `completed` 상태 → 강한 심판 신호
7. **액션 수 = UX 대리 지표**: 심판은 action_count를 봄. 5개 액션으로 goal을 완료하는 앱이 30개 걸리는 앱을 이김
8. **제출자 메모**: 심판에게 보여지는 자유 텍스트. 앱의 강점을 프레이밍하는 데 활용
9. **루프 회피**: Agent가 루프에 빠지면 (동일 액션 4회, 같은 URL 12회) → `loop_detected` 상태, 감점됨
10. **Agent용 Provider 선택**: OpenAI만 retry + repair 로직 있음. Gemini/Claude는 없음. 신뢰성을 위해 OpenAI 사용

---

## 12. 주요 파일 빠른 참조

| 파일 | 줄 수 | 역할 |
|------|-------|------|
| `agent/test_graph.py` | 447 | 메인 agent 상태 머신 (6개 노드) |
| `agent/prompts.py` | 98 | System/user 프롬프트 및 전체 규칙 |
| `agent/state.py` | 82 | AgentState, AgentAction, ActionRecord 스키마 |
| `agent/postmortem_graph.py` | 260 | 2단계 postmortem 파이프라인 |
| `competition/judge.py` | 82 | 시스템 프롬프트 포함 LLM 심판 |
| `competition/bracket.py` | 61 | 싱글 엘리미네이션 대진표 빌더 |
| `competition/runner.py` | 126 | 비동기 대진표 실행기 |
| `browser/manager.py` | 197 | Playwright 생명주기 + 스크린샷 |
| `browser/actions.py` | 130 | 8개 브라우저 원시 동작 + JS 실행기 |
| `llm/openai_client.py` | 210 | OpenAI (3단계 복구 + 재시도) |
| `llm/gemini_client.py` | 43 | Gemini (최소 구현, 재시도 없음) |
| `llm/claude_client.py` | 56 | Claude (최소 구현, max_tokens=1024) |
| `config.py` | 135 | 티어, 모델, 뷰포트, 루프 탐지 |
| `llm/registry.py` | 52 | Provider/모델 검증 + 설정 병합 |
| `database/schema.sql` | 133 | 11개 테이블 |
| `database/queries.py` | 455 | 전체 DB 연산 |
| `ui/app.py` | 700+ | FastAPI 엔드포인트 (대회: 555-699) |
