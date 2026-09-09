# AGENTS.md — InKY Calculator

이 저장소를 고치는 **모든 도구/에이전트**(Claude Code, Codex 등)가 읽어야 하는 문서다.
클로드 코드 전용 맥락은 [CLAUDE.md](CLAUDE.md)에 더 있지만, **아래 내용은 도구와 무관하게 전부 적용된다.**

## 저장소 요약

- `index.html` **한 파일이 전부다.** 빌드·번들·의존성 설치 없음. 나머지 파일은 배포·검사 설정이다.
- 라이브: https://edutogether.github.io/inky-calculator/ (GitHub Pages, 현재 공식 주소)
- 이전 중: **Firebase Hosting**(프로젝트 `inky-calculator`) → https://inky-calculator.web.app
  최종 주소는 `calc.edutogether.kr`이 된다. 도메인이 붙기 전까지 두 주소가 같은 내용을 서빙한다.
- 외부 리소스는 cdnjs의 xlsx / html2canvas / jspdf + Google Fonts **뿐이어야 한다.**
  (과거 원본에 `lc.getunicorn.org` 스크립트가 섞여 있었다 — 기기의 VPN류 앱이 주입한 것으로 추정, 제거했다.
  **주입원은 아직 이 PC에서 동작 중이다** — 이 PC의 브라우저로 페이지를 열면 지금도 그 스크립트가
  DOM에 끼어든다. 서버가 주는 파일에는 없다. 브라우저로 검증할 때 이걸 앱의 문제로 착각하지 말 것.)
- **2026-11-15까지만 운영한다.** 그날 예약 작업이 저장소를 아카이브한다. Firebase로 옮긴 뒤에는
  **Hosting 사이트와 `calc.edutogether.kr` DNS 레코드까지 함께 정리해야 한다**(남기면 서브도메인 탈취 위험).

## 이 파일이 열리는 네 가지 경로 — 전부 다르게 동작한다

| 열리는 곳 | 자바스크립트 | 파일 저장 | 인쇄 |
|---|---|---|---|
| 호스팅 웹페이지(라이브 주소) | 정상 | 정상 | 정상 |
| 내려받은 HTML 파일 직접 열기 | 정상 | 정상 | 정상 |
| 클로드 아티팩트 사본 | 정상 | 정상 | **불가** |
| **카톡 파일 미리보기** | **실행 안 됨** | — | — |

---

# 반드시 지킬 것 — 1~5번은 전부 실제로 사고가 났던 지점이다

## 1. 카톡 파일 미리보기는 자바스크립트를 아예 실행하지 않는다

카톡으로 HTML 파일을 보내면 받는 사람은 보통 **다운로드 → 미리보기**로 연다.
그 화면에서는 JS가 한 줄도 돌지 않는다. 그래서:

- 계산기 본체는 `html:not(.js)` 규칙으로 숨기고, **정적 HTML만으로 된 안내 카드(`#nojs`)** 를 보여준다.
- 그 화면용 안내는 **JS로 만들면 절대 안 뜬다.** 실제로 안내를 JS 토스트로 만들었다가 아무것도 안 보이는 사고가 났다.
  앱이 없어 링크가 안 열릴 때의 안내조차 **CSS만으로**(`:hover/:focus/:active` + `@keyframes tipPop`) 구현돼 있다.
- JS가 도는 화면에서는 이 카드를 무조건 숨긴다 — 계산기가 정상 동작하므로 필요 없다.

## 2. `#nojs` 카드의 링크에 상대 경로를 쓰면 안 된다

카드의 Claude / Safari / Chrome 단추는 **순수 `<a href>`** 이고, 전부 **절대 주소**여야 한다
(아티팩트 주소, `x-safari-https://…`, `googlechromes://…`).
`./` 같은 **상대 경로를 쓰면 미리보기 화면에서는 갈 곳이 없어 아무 반응도 없다.** 실제로 있었던 버그다.

## 3. 캐시 버전 값(`?v=YYYYMMDDx`)을 배포할 때마다 올릴 것

GitHub Pages가 HTML에 `Cache-Control: max-age=600`을 준다. **Safari가 특히 옛 화면을 오래 붙잡는다.**
그래서 `#nojs` 카드의 Safari/Chrome 링크에 버전 값이 박혀 있다.

> **내용을 바꿔 배포할 때마다 이 값을 올려라.** 안 올리면 이미 공유된 파일에서 옛 화면이 열린다.
> 현재 값은 `index.html`에서 `?v=` 로 검색하면 나온다(예: `?v=20260908e` → 다음은 `20260908f`).

## 4. 아티팩트와 호스팅은 사본 두 개다

클로드 아티팩트 사본(주소는 CLAUDE.md 참고)과 호스팅 `index.html`은 **각각 따로 존재한다.**
호스팅 파일을 고쳤으면 `<body>`~`</body>` 사이를 잘라 아티팩트로 **다시 발행해야** 양쪽이 같아진다.
(아티팩트에는 `<html>/<head>/<body>` 태그를 넣으면 안 된다.)

## 5. 아티팩트에서 인쇄가 안 되는 건 코드 문제가 아니다

아티팩트 페이지는 claude.ai가 **샌드박스 iframe** 안에 띄운다. 그 iframe에 `allow-modals` 권한이 없어
`window.print()` 호출이 **브라우저 차원에서 무시된다.** 고치려 들지 말 것 —
안내창이 호스팅 주소로 유도하는 것이 정해진 해법이다.
**파일 내려받기는 정상 동작하므로** 안내 문구에 "저장이 막혀 있다"고 쓰지 않는다.

## 6. `index.html`을 고치면 `firebase.json`의 CSP 해시도 같이 고쳐야 한다

Firebase Hosting이 응답 헤더로 CSP를 준다. 이 앱은 CSS·JS를 밖으로 뺄 수 없어서(1번 참고 —
카톡으로 보낸 **파일 한 개**가 그대로 동작해야 한다) 인라인 블록마다 **sha256 해시**를
`firebase.json`에 적어 두는 방식을 쓴다. 그래서:

> **`index.html`의 인라인 `<style>`·`<script>` 안을 한 글자라도 고치면 해시가 달라진다.**
> 갱신하지 않고 배포하면 **호스팅된 화면이 통째로 죽는다**(스크립트가 전부 차단된다).

혼자 조용히 나지 않도록 검사를 붙여 뒀다. **고친 뒤 반드시 돌릴 것** — 배포 워크플로도 이걸
먼저 돌리고 실패하면 배포를 멈춘다. 새 해시 값을 이 명령이 그대로 알려 준다.

```
node scripts/check-csp.js
```

같은 이유로 **인라인 `style="…"` 속성과 `onclick=` 같은 인라인 핸들러를 새로 만들지 말 것.**
CSP가 차단한다. 스타일은 `<style>` 블록에 규칙으로 넣고, 핸들러는 JS에서 붙인다.
(자바스크립트가 `el.style.…`로 값을 넣는 것은 CSP 대상이 아니므로 그대로 써도 된다.)

---

## 그 밖의 주의

- **줄바꿈**: 줄바꿈은 `.gitattributes`가 **LF로 못박아** 둔다 — CSP 해시가 파일 바이트에
  걸려 있어 체크아웃 환경에 따라 CRLF가 되면 배포된 화면이 죽기 때문이다. 이 설정을 풀지 말 것.
- **견적 상태 공유**: `stateStr()` 이 현재 화면 상태(항목 on/off·선택 상품·수량·협의회 설정)를
  base64로 압축해 주소에 싣고, `applyState()` 가 `#q=…` 로 들어온 주소를 복원한다.
  항목 37개 기준 전체 주소 약 500자.

## 명령

- 빌드·번들·의존성 설치 **없음**(단일 정적 파일). 검사는 `node scripts/check-csp.js` 하나뿐이다.
- 배포: `main`에 push → **Firebase Hosting**(GitHub Actions, `.github/workflows/firebase-hosting.yml`)과
  **GitHub Pages**에 모두 반영된다. 이전 기간 동안 두 주소가 같은 내용을 서빙한다.
- 손으로 배포: `node scripts/check-csp.js && firebase deploy --only hosting --project inky-calculator`
- 배포 뒤 확인: `node scripts/check-headers.js https://inky-calculator.web.app/`
  보안 헤더 5종과 `Cache-Control: no-cache` 가 실제 응답에 있는지 본다. 워크플로도 배포 직후 이걸
  돌리고, 하나라도 빠지면 배포를 실패로 표시한다 — **헤더가 이번 이전의 목적이기 때문이다.**
- 커밋 메시지 형식: `type: 한글 설명 (승인 Bumm M/D)` — type은 feat/fix/docs/chore/refactor/test.
