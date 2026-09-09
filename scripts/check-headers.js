#!/usr/bin/env node
/* 배포된 주소가 실제로 보안 헤더를 실어 보내는지 확인한다.
 *
 * 이번 이전의 목적 자체가 "GitHub Pages 는 응답 헤더를 줄 수 없다"는 것이었으므로,
 * 헤더가 빠진 배포는 성공이 아니다. 배포 워크플로가 배포 직후 이 검사를 돌리고,
 * 하나라도 빠지면 배포를 실패로 표시한다.
 *
 * 실행: node scripts/check-headers.js https://inky-calculator.web.app/
 */
const url = process.argv[2];
if (!url) {
  console.error('사용법: node scripts/check-headers.js <검사할 주소>');
  process.exit(2);
}

const REQUIRED = [
  ['content-security-policy', v => (/(^|;)\s*default-src\s+'none'/.test(v) ? null : "default-src 'none' 이 없습니다")],
  ['x-frame-options', v => (v.toUpperCase() === 'DENY' ? null : 'DENY 여야 합니다')],
  ['x-content-type-options', v => (v.toLowerCase() === 'nosniff' ? null : 'nosniff 여야 합니다')],
  ['referrer-policy', () => null],
  ['permissions-policy', () => null],
  ['cache-control', v => (/no-cache|no-store/.test(v) ? null : `재방문자가 옛 화면을 받습니다 (지금: ${v})`)],
];

/* 배포 직후에는 DNS·Hosting 반영이 잠깐 늦을 수 있다. 그 일시적 실패와 "헤더가 없다"는
   진짜 실패를 구분해야 하므로, 몇 번 다시 시도해 보고 그래도 안 되면 그 사실을 밝히고 멈춘다. */
async function fetchWithRetry(target, attempts = 3) {
  let last;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fetch(target, { redirect: 'follow' });
    } catch (err) {
      last = err.cause?.code || err.message;
      if (i < attempts) {
        console.error(`  (${i}번째 연결 실패: ${last} — 3초 뒤 다시 시도)`);
        await new Promise(r => setTimeout(r, 3000));
      }
    }
  }
  console.error(`연결 실패 — ${target}\n\n  ${attempts}번 시도했지만 응답을 받지 못했습니다: ${last}`);
  console.error('  헤더가 빠진 것이 아니라 주소에 닿지 못한 것입니다. DNS·배포 반영을 확인하세요.');
  process.exitCode = 1;
  return null;
}

(async () => {
  const res = await fetchWithRetry(url);
  if (!res) return;
  const problems = [];

  if (!res.ok) problems.push(`HTTP ${res.status}`);

  for (const [name, check] of REQUIRED) {
    const value = res.headers.get(name);
    if (value === null) {
      problems.push(`${name} 헤더가 없습니다`);
      continue;
    }
    const why = check(value);
    if (why) problems.push(`${name}: ${why}`);
  }

  const csp = res.headers.get('content-security-policy') || '';
  if (/'unsafe-inline'|'unsafe-eval'/.test(csp)) {
    problems.push("CSP 에 'unsafe-inline' 또는 'unsafe-eval' 이 들어 있습니다");
  }

  if (problems.length) {
    console.error(`보안 헤더 검사 실패 — ${url}\n`);
    problems.forEach(p => console.error('  - ' + p));
    process.exitCode = 1;
    return;
  }

  console.log(`보안 헤더 검사 통과 — ${url}`);
  for (const [name] of REQUIRED) {
    console.log('  ' + name + ': ' + res.headers.get(name).slice(0, 110));
  }
})();
