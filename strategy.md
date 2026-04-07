# VibeCode Olympics 전략

## 대회 개요
- 2시간 동안 웹앱 제작 → 배포 → AI 에이전트가 심사
- 토너먼트 (1:1 대결, 단일 엘리미네이션)
- Goal: `"Try to accomplish something significant on this website"` (모든 참가자 동일)
- Model: `gpt-4o-mini`, Max steps: `20`, Mode: `desktop`

## 승리 공식 (실제 A/B 배포 테스트로 검증)

```
completed + 3 actions(자연스러운 플로우) + 0 errors + 풍부한 findings = 승리
```

### 핵심: action 수보다 findings 풍부함이 결정적
- 5 actions를 강제할 수 없음 (에이전트가 "충분하면" 멈춤)
- 같은 3 actions라도 페이지에 정보가 더 많으면 이김
- **각 페이지의 정보를 풍부하게** → findings가 자연스럽게 풍부해짐

## 검증된 최적 앱 구조

```
홈페이지 (콘텐츠 목록 + CTA)
  → 기능 페이지 (선택지)                      ← 1 action
    → 결과 페이지 (teaser만 + "자세히 보기" CTA)  ← 2 action
      → 상세 페이지 (풍부한 정보 + related items)  ← 3 action → finish
```

### 각 페이지 역할
- **홈**: 앱 설명 + 전체 콘텐츠 + 강한 CTA (다양한 Goal 대응)
- **기능 페이지**: 선택지 (카테고리/장르 등)
- **결과 페이지**: teaser만! 풍부한 정보는 상세 페이지로 유도
- **상세 페이지**: title, author, year, rating, description, chapters, related items 전부

### 왜 이 구조가 이기는가 (A/B 테스트 증거)
| 비교 | 결과 |
|------|------|
| 2 actions vs 3 actions | 3 actions 3:0 승 |
| 기본 3 actions vs related books 있는 3 actions | related books 승 |
| Multi CTA vs Single CTA | Multi CTA 3:0 승 |
| Semantic vs Non-semantic | Semantic 3:0 승 |
| Absolute URL vs Relative URL | Absolute 즉시 승 (상대 failed) |
| Proper title vs Default title | Proper title 승 |

## 앱 설계 필수 규칙

### 절대 어기면 안 됨
1. **SSR 필수** (CSR = 100% 실패)
2. **모든 href 절대경로** (상대경로 = navigate 에러 → 5 errors → failed)
3. **모든 라우트 존재** (404 = 감점)

### 중요
4. **시맨틱 HTML** (`<main>`, `<header>`, `<nav>`, `<section>`, `<article>`)
5. **`<title>`, `<meta>` 제대로** (기본값 = postmortem에서 감점)
6. **로그인 불필요** + 빠른 로딩
7. **결과 페이지는 teaser만** (상세로 유도 → 3 actions)
8. **상세 페이지 정보 풍부하게** (related items, chapters, ratings 등)

### 피해야 할 것
- `"use client"` + `useEffect` 데이터 로딩
- `if (!data) return null`
- 상대경로 href
- 로그인 필수 기능
- 모달, 팝업, hover 인터랙션

## 기술 스택
- Next.js App Router (SSR 기본)
- Tailwind CSS
- Vercel 배포
- `headers()`로 baseUrl 동적 생성 → 절대경로 자동화

---

## gpt-5-mini Judge 최적화 (2026-04-07 업데이트)

**대회 judge 모델: `gpt-5-mini` (확인됨)**
- 에이전트 모델은 여전히 `gpt-4o-mini` → 기존 3-action 전략 유지
- judge 모델이 gpt-5-mini로 변경 → 판단 기준 변화

### gpt-5-mini judge가 추가로 보는 것
1. **accessibility 문제 언급 수** (focus visibility, aria labels)
2. **UI 폴리시** (stray elements, unused elements)
3. **postmortem 품질** — UI 문제가 적을수록 더 좋게 평가

### gpt-5-mini judge 검증 결과
| 비교 | 결과 |
|------|------|
| Base vs Enriched(quotes/themes/pages) | **Enriched 승** (UI 문제 적게 언급) |
| 우리 앱 vs orange-ruddy | **우리 앱 승** (완성도 차이) |

### 상세 페이지 필수 요소 (업데이트)
- title, author, year, rating, description, chapters, related items (기존)
- **+ pages (페이지 수)** ← 추가
- **+ quote (유명 인용구 blockquote)** ← 추가
- **+ themes (주요 테마 tag 배열)** ← 추가
