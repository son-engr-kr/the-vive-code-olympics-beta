@AGENTS.md

# VibeCode Olympics - AI Judge 최적화 프로젝트

## 참고 문서
- [strategy.md](../strategy.md) — 대회 전략 (승리 공식, 앱 설계 원칙, 기술 스택)
- [judge_analysis.md](../judge_analysis.md) — AI 심판 시스템 상세 분석 (에이전트 작동, 심판 프롬프트, postmortem, 모델 차이)
- [insights.md](../insights.md) — 40+ 실험 결과 및 확인된 패턴 CF1~CF17
- [RESEARCH.md](../RESEARCH.md) — 전체 실험 로그 및 가설 기록

## 대회 실제 설정 (competition_seed.py)
- **Goal**: `"Try to accomplish something significant on this website"`
- **Model**: `gpt-4o-mini`
- **Max steps**: `20`
- **Mode**: `desktop` (1280x800)

## 배포
- URL: https://testlab-mu.vercel.app
- Vercel + Next.js App Router

---

## 핵심 규칙 (절대 어기면 안 됨)

### 1. SSR 필수 (CSR 금지)
- `"use client"` + `useEffect` 데이터 로딩 → 에이전트가 빈 HTML만 봄 → 실패
- `if (!data) return null` → 전체 페이지 사라짐 → 실패
- **서버 컴포넌트로 데이터를 HTML에 포함시켜야 함**

### 2. 모든 href 절대경로
```tsx
// ❌ 이러면 navigate 에러
<a href="/book/1984">
// ✅ 이렇게 해야 함
<a href={`${baseUrl}/book/1984`}>
```
Next.js에서 `headers()`로 baseUrl 생성:
```tsx
const headersList = await headers();
const host = headersList.get("host") || "localhost:3000";
const protocol = host.includes("localhost") ? "http" : "https";
const baseUrl = `${protocol}://${host}`;
```

### 3. 모든 라우트 존재
- 404 나면 에러로 기록 → 심판 감점
- 링크된 모든 페이지가 실제로 존재해야 함

### 4. 시맨틱 HTML
- `<main>`, `<header>`, `<nav>`, `<section>`, `<article>`, `<footer>` 사용
- 안 쓰면 postmortem에 "Use semantic HTML" 추천 → 감점

### 5. title/meta 설정
```tsx
export const metadata: Metadata = {
  title: "앱이름 — 한 줄 설명",
  description: "앱 상세 설명",
};
```

### 6. 로그인 불필요, 빠른 로딩

---

## 승리 공식 (40+ 실험, 심판 시뮬 12회로 검증)

```
최고: completed + 2-3 actions(성공적 기능 플로우) + 0 errors
```

| 결과 | 심판 판단 |
|------|-----------|
| completed + 2-3 actions + 0 errors | "기능이 잘 작동하는 앱" → **승리** |
| completed + 0 actions + 0 errors | "문제 없지만 기능 부족" → 패배 가능 |
| completed + 많은 actions + 에러 | "헤맸고 문제 있음" → 불리 |
| failed / loop_detected | **즉시 패배** |

## 검증된 앱 구조

```
홈페이지 (풍부한 콘텐츠 + 명확한 CTA)
  → 기능 페이지 (선택지)          ← 1 action
    → 결과 페이지 (구체적 결과)    ← 2 action
                                   → finish (completed, 0 errors)
```

- 풍부한 기능 > 단순한 기능 (Multi CTA 6:0 Single CTA)
- 에이전트가 실제로 기능을 사용하고 성공하는 모습을 보여줘야 함

## 심판이 보는 것 / 안 보는 것

**보는 것**: Status, Action 수, End reason, Postmortem 분석/추천
**안 보는 것**: 스크린샷, 상세 액션 로그, HTML 원문, 메모리

## 에이전트 특성 (gpt-4o-mini)
- HTML만 읽음 (스크린샷 안 봄, `images=[]`)
- navigate는 절대URL만 가능
- 첫 HTML에 답 있으면 0 actions 즉시 finish
- 막히면 1번 시도 후 give_up
- temperature 0.2 → 동일 입력이면 동일 결과
