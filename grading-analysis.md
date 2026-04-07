# AIUXTester Grading Mechanism — Technical Deep Dive

## Overview

The VibeCode Olympics is a hackathon judged entirely by AI. No pitches — just a live URL and an AI UX testing agent.

- **Event:** 2026-04-07, 5:30–9:00 PM (2h coding, 1h judging)
- **Tool:** [AIUXTester](https://github.com/mindfulcoder49/AIUXTester)
- **Stack:** FastAPI + LangGraph + Playwright + Vue 3 + SQLite/MariaDB

---

## Architecture Overview

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

## 1. Agent Execution Graph (`agent/test_graph.py`)

LangGraph state machine with 6 nodes:

```
initialize ──▶ think ──▶ execute ──▶ capture ──▶ check_status ──┐
                 ▲                                               │
                 └────────── (status == "running") ──────────────┘
                                                                 │
                              (status != "running") ─▶ teardown ─▶ END
```

### Node Details

#### 1.1 `initialize`
- Launches headless Chromium via Playwright (stealth plugin applied)
- Browser args: `--no-sandbox, --disable-setuid-sandbox, --disable-dev-shm-usage, --disable-gpu, --no-zygote, --single-process`
- Navigates to `start_url`, captures initial screenshot (full-page PNG) + sanitized HTML
- Sets `current_step = 0`

#### 1.2 `think` — LLM Decision
- Checks for user stop requests from DB
- Hard fail-safe: `current_step >= max_steps` → stop
- Fetches memory from DB, builds system + user prompt
- **LLM call: `temperature=0.2`**, schema=`AgentAction`
- Stores `next_action` in state
- Fallback: if LLM fails → `fail` action

#### 1.3 `execute` — Browser Action
Routes `next_action.action` to handler:

| Action | Handler | Post-action |
|--------|---------|-------------|
| `execute_js` | `browser_actions.execute_javascript(page, script)` | `settle_page_after_action()` |
| `navigate` | `browser_actions.navigate(page, url)` | `settle_page_after_action()` |
| `save_to_memory` | Updates `memory_update` dict | — |
| `finish` | Sets `status="completed"`, `end_reason=summary` | — |
| `fail` | Sets `status="failed"`, `end_reason=reason` | — |
| `give_up` | Sets `status="failed"`, `end_reason` (default: "Agent gave up due to repeated lack of progress") | — |

**`settle_page_after_action()`**: Wait `domcontentloaded` (10s) → `networkidle` (3s) → sleep 600ms

#### 1.4 `capture` — State Snapshot
- Takes screenshot (PNG) + sanitized HTML
- Inserts screenshot, HTML capture, action record to DB
- Updates memory if `memory_update` present
- Increments `current_step`
- **Loop detection**: Computes action fingerprint, maintains rolling window of `recent_action_fingerprints`
- Appends URL to `pages_visited`

#### 1.5 `check_status` — Continue or Stop
Checks in order:
1. User stop request from DB
2. `stop_on_first_error` config: last action failed → stop
3. **Loop detection** (if enabled):
   - `repeat_single: 4` — same action 4 times
   - `repeat_alternating: 3` — two actions alternating 3 times
   - `min_actions_before_loop: 8` — minimum actions before detection kicks in
   - `passive_actions` (scroll/swipe): `repeat_single: 10`, `repeat_alternating: 5`
   - `stale_url_actions: 12` — 12 actions on same URL without progress
4. Hard fail-safe: `current_step >= max_steps`

**Recursion limit**: `max(50, max_steps * 6 + 20)`

---

## 2. Agent Prompt System (`agent/prompts.py`)

### 2.1 System Prompt (regenerated every step)

Components injected:
- **Goal**
- **Mode + Viewport**: Desktop (1280×800) or Mobile (390×844, device_scale_factor=3, touch enabled)
- **Memory** (formatted as bullet list)
- **Action History** (last N steps with: step, URL, action, params, success, intent, reasoning, outcome)

**Rules (exact wording from source):**
```
- Rely on the provided HTML/DOM, not screenshots.
- If you see a login/registration form and have credentials in memory, use them.
- If stuck or repeating actions without progress, use give_up() with a concrete reason.
- If the task is complete, use finish() with a clear summary.
- Always include a short reasoning for the chosen action.
- Always include last_action_result: concise description of what happened after previous action.
- Use save_to_memory for any credentials or facts needed later.
- Prefer execute_js probes that return concise JSON-serializable results.
- Do not repeat substantially the same execute_js inspection on same URL if previous succeeded.
- After one or two successful inspections, either move to a new question or finish.
- Do not probe for CSRF tokens, auth headers, API keys, or security tokens.
- When a form submission succeeds or fails, report the user-visible result, not HTTP mechanism.
```

**Available Actions:**
```
execute_js {script}, navigate {url}, save_to_memory {key,value},
finish {summary}, fail {reason}, give_up {reason}
```

**Required Output Format (JSON):**
```json
{
  "action": "<one of allowed actions>",
  "params": {"script": "<JS code when action is execute_js>"},
  "intent": "<what you are trying to accomplish next>",
  "reasoning": "<why this action is best now>",
  "last_action_result": "<what happened after previous action>",
  "memory_update": null
}
```

**`finish` action must include structured summary:**
```
Verdict: <one sentence>
Findings:
- <issue or confirmation>
- <issue or confirmation>
Next step: <one concrete recommendation>
```

### 2.2 User Prompt
```
Current URL: {url}
Step: {step}
--- Current page HTML ---
{html}
---
Return only the JSON object.
```

### 2.3 Key Observation
- Agent decides **all** interactions via `execute_js` — clicks, inputs, scrolls are all JS scripts
- `navigate` is separate for direct URL changes
- Agent does NOT receive raw screenshot pixels for decision-making (prompt says "rely on HTML/DOM, not screenshots") — screenshots are for postmortem/DB only

---

## 3. Browser Layer (`browser/manager.py`, `browser/actions.py`)

### 3.1 Browser Configuration

| Setting | Desktop | Mobile |
|---------|---------|--------|
| Viewport | 1280×800 | 390×844 |
| Scale Factor | 1 | 3 |
| is_mobile | false | true |
| has_touch | — | true |
| User-Agent | Chrome 120 / Win10 | iPhone / iOS 17 |

- Stealth plugin: `playwright_stealth.stealth_async()` applied to avoid bot detection
- Launch timeout: 45,000ms
- Page timeout: 60,000ms

### 3.2 `execute_javascript` — Two-Stage Execution
1. **Try as expression**: handles `(() => ({ok: true}))()`, `document.title` style
2. **If SyntaxError** → wrap as `AsyncFunction` body and execute as statement
3. Result normalization: `undefined`/`null` → `null`, objects → `JSON.stringify`
4. Error detection keywords: `syntaxerror`, `illegal return`, `unexpected token`, `unexpected identifier`, `missing`, `unterminated`

### 3.3 Screenshot System
- Full-page PNG (`full_page=True, type="png"`)
- SVG overlay capability: colored rings (24px, 3px border), center dots (8px), labels (monospace 12px), connecting dashed lines
- Stored as BLOB in `screenshots` table

---

## 4. HTML Sanitization

HTML is sanitized in two modes before being fed to the agent:
- **"agent" mode**: Stripped for LLM consumption (reduce tokens)
- **"postmortem" mode**: Preserved differently for analysis

This is critical — the agent sees **sanitized HTML**, not raw page source.

---

## 5. Postmortem Analysis Pipeline (`agent/postmortem_graph.py`)

Runs automatically after session ends. LangGraph: `pm_analyze_run → pm_analyze_html → save → END`

### 5.1 Phase 1: Run Analysis

**RUN_FACTS dict structure:**
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
  "recent_errors": list,       # last 5 errors with step number
  "log_tail": list             # last 20 run logs
}
```

**LLM Call:**
- System: `"You are a post-mortem analyst for a web testing agent. Analyze the run outcome, highlight success/failure points, and produce actionable recommendations. You MUST ground analysis in the provided RUN_FACTS and should not contradict them. Return JSON: {run_analysis: string, recommendations: string}."`
- User: JSON of `{"RUN_FACTS": run_facts, "memory": state.memory, "actions": state.action_history}`
- Temperature: **0.2**
- Schema: `PostmortemRunOutput { run_analysis: str, recommendations: str }`

**Heuristic Fallback** (if LLM fails):
- Counts total/success actions, unique URLs, recent path
- Hardcoded 4 recommendations (navigation targeting, recovery heuristics, coordinate logging, token reduction)

### 5.2 Phase 2: HTML Analysis

**LLM Call:**
- System: `"You are a UX + technical reviewer. Analyze each page's HTML in order and provide detailed design and technical recommendations. Return JSON: {html_analysis: string, recommendations: string}."`
- User: JSON of `{"goal": goal, "pages": [{"url": u, "html": h}, ...]}`
- Temperature: **0.2**
- Schema: `PostmortemHtmlOutput { html_analysis: str, recommendations: str }`

**Heuristic Fallback** (if LLM fails):
- Scans for `<header>`, `<nav>`, `<main>` tags (case-insensitive)
- Reports HTML length per URL (first 10 pages)

### 5.3 Storage
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

## 6. Competition & Judging System

### 6.1 Bracket Generation (`competition/bracket.py`)

```python
def build_bracket(entry_ids: list[int]) -> list[list[list[int]]]:
    # Randomly shuffles entries
    # Returns: rounds → matches → entry_ids
```

**Rules:**
- N even → all pairs `[a,b]`
- N odd → first match is trio `[a,b,c]`, rest paired
- Round count: iterative `n = (n-3)//2 + 1 if odd else n//2`
- Winners advance recursively until 1 remains

### 6.2 Match Execution (`competition/runner.py`)

Per match:
1. Fetch `session`, `postmortem`, `actions` for each entry
2. Inject `action_count = len(actions)` into entry dict
3. Call `judge_match()`
4. Bounds-check winner_index: `max(0, min(result.winner_index, len(match_entry_ids) - 1))`
5. Store `winner_entry_id` + `judge_reasoning`

**Bye logic**: 1-entry match → auto-advance with `"Advanced automatically (only entry in match)."`
**Error fallback**: Judge fails → first entry advances with `"Judge unavailable ({exc}); first entry advanced by default."`

### 6.3 Judge Mechanism (`competition/judge.py`)

#### Entry Summary (what the judge sees per submission):
```python
def _entry_summary(entry, session, postmortem) -> str:
    # App URL:          session["start_url"]
    # Goal:             session["goal"][:400]
    # Session status:   session["status"]
    # Action count:     entry["action_count"]       # injected by runner
    # End reason:       session["end_reason"]
    # Run Analysis:     postmortem["run_analysis"][:800]
    # Recommendations:  postmortem["recommendations"][:400]
    # Note:             entry["note"]                # optional submitter note
```

**Truncation limits are critical** — run_analysis maxes at 800 chars, recommendations at 400, goal at 400.

#### Judge System Prompt (verbatim):
```
You are an impartial judge for the Vibecode Olympics, a competition where developers
submit AI-generated UX test runs of their own web apps.
Your job is to pick the winner of this match based on which APP has the best user
experience — not which test run was most thorough.
Award the win to the app whose testing reveals it works well: smooth user flows,
features that complete successfully, intuitive navigation, and few or no critical errors.
Penalize apps whose runs reveal broken flows, failed registrations, confusing UX, or hard errors.
A test that found nothing wrong is evidence of a good app.
A test that found many bugs is evidence of a bad app, even if the test itself was thorough.
Be decisive. Pick one winner. Respond in JSON.
```

#### Judge User Prompt:
```
Compare the following {n} competition submissions and pick the best one.

{entry_summary_1}
{entry_summary_2}
...

Respond with JSON: {"winner_index": <0 to {n-1}>, "reasoning": "<paragraph>"}
```

#### Judge LLM Parameters:
- **Temperature: 0.3**
- Schema: `JudgeOutput { winner_index: int, reasoning: str }`
- Default model: `gpt-5-mini` (OpenAI)
- Uses same `generate_action()` interface as agent

---

## 7. LLM Provider Implementations

### 7.1 OpenAI (`llm/openai_client.py`) — Most Robust

- `response_format={"type": "json_object"}` for structured output
- **Three-tier error recovery:**
  1. JSON parse fails → `_repair_payload` (sends raw text back to LLM for correction)
  2. Schema validation fails → `_repair_payload` again
  3. Final fail → `_coerce_action_like_payload` (hardcoded fallback with safe defaults)
- **Retry logic:** Max 4 retries for rate limits
  - Detects: "rate limit" in text, "rate_limit_exceeded", `RateLimitError`
  - Retry-after extraction from error messages (`Xms` or `Xs`)
  - Exponential backoff: `min(0.5 * 2^attempt, 5.0)` + jitter `uniform(0.05, 0.2)`, capped 6s
- **Temperature edge case:** `gpt-5*` models don't support temperature → auto-removes on error

### 7.2 Gemini (`llm/gemini_client.py`) — Minimal
- `google.generativeai.types.Part.from_data()` for images
- No retry logic, no error recovery
- Direct JSON extraction from `response.text`

### 7.3 Claude (`llm/claude_client.py`) — Minimal
- `max_tokens=1024` (fixed, hardcoded)
- No retry logic, no error recovery
- Base64 image encoding

**Implication: OpenAI is the most reliable provider for both agent runs and judging.**

---

## 8. Database Schema (11 Tables)

```
users ─────────┐
               ├── sessions ──┬── screenshots (BLOB)
refresh_tokens─┘              ├── html_captures
                              ├── actions (step, type, params, success, error)
                              ├── agent_memory (key-value, upsert)
                              ├── postmortem_reports
                              └── run_logs
               
competitions ──┬── competition_entries (UNIQUE per user per competition)
               └── competition_matches (round, match, winner, reasoning)
```

Key constraints:
- `UNIQUE(competition_id, user_id)` — one entry per user per competition
- Terminal session statuses: `completed`, `failed`, `stopped`, `loop_detected`
- Competition statuses: `open` → `closed` → `running` → `complete`

---

## 9. Configuration & Tier System (`config.py`)

### Tier Limits
| Setting | Free | Basic | Pro |
|---------|------|-------|-----|
| `max_steps` | 50 | 150 | 500 |
| `max_history_actions` | 5 | 10 | 20 |
| `loop_detection_window` | 8 | 12 | 15 |
| `postmortem_depth` | standard | standard | deep |

### Loop Detection Defaults
```python
loop_detection_rules = {
    "repeat_single": 4,            # same action 4x → loop
    "repeat_alternating": 3,       # A-B-A-B-A-B → loop
    "min_actions_before_loop": 8,  # detection starts after 8 actions
    "passive_actions": ["scroll_down", "scroll_up", "swipe_left", "swipe_right"],
    "passive_repeat_single": 10,   # passive actions get higher threshold
    "passive_repeat_alternating": 5,
    "stale_url_actions": 12        # 12 actions on same URL → loop
}
```

### Config Key Access by Tier
| Tier | Allowed Keys |
|------|-------------|
| Free | `mode`, `max_steps`, `stop_on_first_error` |
| Basic | Free + `max_history_actions`, `loop_detection_enabled`, `loop_detection_window` |
| Pro | Basic + `loop_detection_rules`, `memory_injection_format`, `screenshot_quality`, `action_retry_policy`, `postmortem_depth`, `custom_system_prompt_preamble` |

### Model Registry
| Provider | Free | Basic | Pro |
|----------|------|-------|-----|
| OpenAI | gpt-5-mini, gpt-4o-mini | gpt-4o-mini, gpt-4o | gpt-4o-mini, gpt-4o, gpt-4.1, gpt-5-mini, gpt-5 |
| Gemini | gemini-1.5-flash | + gemini-1.5-pro | + gemini-2.0-pro |
| Claude | claude-3-haiku | + claude-3-sonnet | + claude-3-opus |

---

## 10. Scoring Pipeline Summary

There are **no numerical scores**. The entire evaluation is qualitative and LLM-driven:

```
                    ┌─────────────────────────────────┐
                    │        DATA FLOW TO JUDGE       │
                    └─────────────────────────────────┘

Session Run                    Postmortem (LLM, t=0.2)        Judge Input (truncated)
─────────────                  ──────────────────────         ─────────────────────
start_url           ─────────────────────────────────────▶   App URL
goal                ─────────────────────────────────────▶   Goal [:400]
status              ─────────────────────────────────────▶   Session status
len(actions)        ─────────────────────────────────────▶   Action count
end_reason          ─────────────────────────────────────▶   End reason
action_history  ──▶ RUN_FACTS ──▶ run_analysis       ───▶   Run Analysis [:800]
html_captures   ──▶ pages     ──▶ recommendations    ───▶   Recommendations [:400]
                                                             Submitter Note (optional)

                              Judge (LLM, t=0.3)
                              ────────────────
                              Output: winner_index + reasoning
                              No scores. Binary win/loss.
```

---

## 11. Technical Attack Surface / Optimization Vectors

### What the agent "sees"
- **Sanitized HTML** (not raw source) — semantic structure matters
- **No screenshot-based decisions** — prompt explicitly says "rely on HTML/DOM"
- Current URL and step number

### What the judge "sees"
- Truncated summaries (800 chars max for analysis)
- Action count (fewer = simpler UX = better signal)
- Session status (completed >> failed)
- Submitter note (free text, optional — opportunity to frame your app)

### Optimization implications
1. **Semantic HTML**: Use `<header>`, `<nav>`, `<main>`, `<form>`, `<button>` — the agent parses DOM
2. **Simple DOM structure**: Agent uses `execute_js` for all interactions. Complex JS frameworks with shadow DOM or heavy CSR may confuse it
3. **Explicit labels/placeholders**: Agent reads HTML text content to decide what to click/type
4. **Fast page loads**: `settle_page_after_action()` waits domcontentloaded(10s) + networkidle(3s) + 600ms. Slow pages waste steps
5. **No auth walls without setup**: Agent can `save_to_memory` credentials, but the flow must be clear
6. **Goal crafting**: The goal you set determines what the agent tries to do. A simple, achievable goal → `completed` status → strong judge signal
7. **Action count as UX proxy**: Judge sees action_count. App that takes 5 actions to complete goal beats one that takes 30
8. **Submitter note**: Free text field shown to judge. Use it to frame what your app does well
9. **Loop avoidance**: If agent loops (same action 4x, same URL 12 actions) → `loop_detected` status, which is penalized
10. **Provider choice for agent**: OpenAI has retry + repair logic. Gemini/Claude have none. Use OpenAI for reliability

---

## 12. Key Files Quick Reference

| File | Lines | Role |
|------|-------|------|
| `agent/test_graph.py` | 447 | Main agent state machine (6 nodes) |
| `agent/prompts.py` | 98 | System/user prompts with all rules |
| `agent/state.py` | 82 | AgentState, AgentAction, ActionRecord schemas |
| `agent/postmortem_graph.py` | 260 | 2-phase postmortem pipeline |
| `competition/judge.py` | 82 | LLM judge with system prompt |
| `competition/bracket.py` | 61 | Single-elimination bracket builder |
| `competition/runner.py` | 126 | Async bracket orchestrator |
| `browser/manager.py` | 197 | Playwright lifecycle + screenshots |
| `browser/actions.py` | 130 | 8 browser primitives + JS executor |
| `llm/openai_client.py` | 210 | OpenAI with 3-tier recovery + retry |
| `llm/gemini_client.py` | 43 | Gemini (minimal, no retry) |
| `llm/claude_client.py` | 56 | Claude (minimal, max_tokens=1024) |
| `config.py` | 135 | Tiers, models, viewports, loop detection |
| `llm/registry.py` | 52 | Provider/model validation + config merge |
| `database/schema.sql` | 133 | 11 tables |
| `database/queries.py` | 455 | All DB operations |
| `ui/app.py` | 700+ | FastAPI endpoints (competition: 555-699) |
