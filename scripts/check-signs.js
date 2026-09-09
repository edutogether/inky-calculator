#!/usr/bin/env node
/* 돈의 부호가 뒤집히지 않았는지 배포 전에 검사한다.
 *
 * 2026-09-09에 '남는 예산'이 **돈이 남는데도 마이너스**로 나왔다. 계산은 맞았고
 * (남는 예산 = 배정 예산 − 견적 합계) **표시할 때 `-`를 하드코딩**해 둔 것이 원인이었다.
 * 한 번만 눈으로 봤으면 보였을 값이라, 다시는 그렇게 나가지 않도록 여기서 막는다.
 *
 * index.html 의 signed() 를 그대로 떼어 내 세 경우를 확인한다:
 *   남을 때 +, 딱 맞을 때 부호 없음, 넘칠 때 −.
 *
 * 실행: node scripts/check-signs.js
 */
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

const m = html.match(/function signed\(v\)\{[\s\S]*?\}/);
if (!m) {
  console.error('index.html 에서 signed() 를 찾지 못했습니다 — 부호를 정하는 곳이 바뀌었습니다.');
  console.error('  돈 표기를 다른 방식으로 바꿨다면 이 검사도 그에 맞게 고치세요. 지우지는 마세요.');
  process.exit(1);
}
const F = n => n.toLocaleString('ko-KR');
const signed = new Function('F', 'return ' + m[0])(F);

const cases = [
  ['남을 때는 +',        15988,  '+15,988원'],
  ['딱 맞으면 부호 없음',    0,  '0원'],
  ['넘치면 −',          -15988, '−15,988원'],
  ['큰 금액도 자릿점',  1500000, '+1,500,000원'],
];

const problems = [];
console.log('돈 부호 검사 — signed()');
for (const [what, input, want] of cases) {
  const got = signed(input);
  console.log('  ' + String(input).padStart(9) + ' → ' + got.padEnd(14) + '  ' + what);
  if (got !== want) problems.push(what + ': ' + input + ' → "' + got + '" (기대 "' + want + '")');
}

/* 화면 쪽도 함께 본다 — 남는 쪽에 경고색(.no)이 붙어 있으면 돈이 남는 정상 상태가
   빨간 경고로 보인다. 그것도 이번에 고친 것이라 다시 들어오지 않게 막는다. */
const sum = html.match(/남는 예산<\/span><span class="v ([a-z]+)"/);
if (!sum) problems.push("'남는 예산' 줄을 찾지 못했습니다 — 합계 표시가 바뀌었습니다.");
else if (sum[1] !== 'ok') problems.push("'남는 예산'에 경고색이 붙어 있습니다 (class=\"v " + sum[1] + '"). 남는 것은 정상 상태입니다.');

const over = html.match(/예산 초과<\/span><span class="v ([a-z]+)"/);
if (!over) problems.push("'예산 초과' 줄을 찾지 못했습니다.");
else if (over[1] !== 'no') problems.push("'예산 초과'에 경고색이 없습니다 (class=\"v " + over[1] + '").');

if (problems.length) {
  console.error('\n부호 검사 실패\n');
  problems.forEach(p => console.error('  - ' + p));
  process.exitCode = 1;
  return;
}
console.log('\n부호 검사 통과 — 남으면 +, 넘치면 −, 색도 상태를 따라갑니다.');
