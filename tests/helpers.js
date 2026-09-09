/* 테스트 헬퍼 — index.html 을 "그대로" jsdom 안에서 실행해 실제 앱 코드로 검사한다.
 *
 * scripts/check-*.js 는 정규식으로 함수 하나만 떼어 내 재구현을 검사하지만, 여기서는
 * index.html 전체를 파싱하고 인라인 <script> 두 개를 실제로 실행한다(runScripts:'dangerously').
 * 그래서 signed()·rateClass() 같은 함수뿐 아니라 render() 가 실제 DOM(#sum·#gauge·#mLeft)에
 * 무엇을 그리는지까지 앱이 하는 그대로 확인할 수 있다.
 *
 * 외부 리소스(cdnjs의 xlsx, Google Fonts)는 일부러 받아오지 않는다(resources 옵션을 비워 둠) —
 * 네트워크에 의존하면 CI가 느려지고 흔들린다. index.html 의 인라인 스크립트 두 개는 외부
 * 리소스 없이도 완결되므로(단일 파일 요구사항, CLAUDE.md 참고) 문제가 없다.
 *
 * ⚠ index.html 최상위의 `const`/`let`(M, D, BUDGET, MEET_MAX_RATIO …)은 스크립트 간에는
 * 공유되지만 `window`의 속성으로는 안 뜬다(클래식 스크립트의 스펙 동작 — 함수 선언만 window에
 * 붙는다). 그래서 그런 값을 읽거나 바꿀 때는 `win.eval('...')`을 쓴다.
 */
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const HTML_PATH = path.join(__dirname, '..', 'index.html');
const HTML = fs.readFileSync(HTML_PATH, 'utf8');

/** index.html 을 새 jsdom 창으로 띄운다. hash 를 주면 `#q=...` 상태로 진입한 것처럼 연다. */
function loadApp(hash) {
  const url = 'https://calc.edutogether.kr/' + (hash ? '#' + hash : '');
  return new JSDOM(HTML, { runScripts: 'dangerously', url, pretendToBeVisual: true }).window;
}

/** window 의 전역 렉시컬 스코프(M·D·BUDGET 등)에서 표현식을 읽거나 실행한다. */
function ev(win, expr) {
  return win.eval(expr);
}

/** D 의 항목을 모두 끄고(goods=0), 협의회 값을 직접 지정한 뒤 render() 를 한 번 돌린다.
 *  물품 값에 흔들리지 않고 협의회비 계산 경계값만 정확히 재려고 쓴다. */
function renderWithMeetOnly(win, { n, c, per }) {
  ev(win, `D.forEach(it=>it.on=false); M.auto=false; M.n=${n}; M.c=${c}; M.per=${per}; render();`);
}

module.exports = { loadApp, ev, renderWithMeetOnly };
