/* 2026-09-09 라이브에서 손으로 눌러 통과시킨 7가지 상황을 여기 고정한다.
 *
 * 그날 실제로 있었던 결함(app.md 사고 기록)과, 팀장이 이번에 반드시 넣으라고 지시한 항목
 * (부호 양쪽·0원 경계값·견적서 출력까지·자동 계산 보정)을 겹쳐서 7개로 추렸다 — 어제 대화
 * 기록에 시나리오 번호가 못박혀 있지 않아 지금 화면 기준으로 다시 정의했다(팀장 지시 원문:
 * "없으면 없는 대로 지금 화면에서 다시 정의해서 적어두세요").
 *
 * scripts/check-signs.js·check-recommended.js 는 소스 코드를 정규식으로 떼어 내 재구현을
 * 검사하지만, 여기서는 index.html 을 jsdom 에 그대로 실행시켜 render() 가 실제로 그리는
 * DOM(#sum·#gauge·#mLeft)까지 함께 본다 — "표시되는 숫자"를 검사 대상으로 삼는다.
 *
 * §21-1(빈 게이트 금지): 아래 모든 검사는 값이 최소 1개 이상 나온 것을 먼저 확인하고 판정한다
 * (`expect(...).not.toHaveLength(0)` 또는 개수 자체를 단언). 대상을 못 찾으면 실패해야 한다.
 */
import { describe, it, expect } from 'vitest';
import { loadApp, ev, renderWithMeetOnly } from './helpers.js';

describe('시나리오 1 — 남는 예산: 부호(+)와 색(ok)', () => {
  it('기본 화면(권장 구성)은 예산이 남고, 화면에 +부호·ok색으로 뜬다', () => {
    const win = loadApp();
    const goods = ev(win, "D.reduce((t,it)=>t+(it.on?it.o[it.sel].p*it.qty:0),0)");
    const meet = ev(win, "Math.max(0,M.per)*Math.max(0,M.n)*Math.max(0,M.c)");
    const tot = goods + meet;
    expect(tot).toBeLessThan(1500000); // 이 검사가 의미 있으려면 실제로 남아야 한다
    const rest = 1500000 - tot;
    const sum = win.document.getElementById('sum');
    expect(sum.innerHTML).toContain('남는 예산');
    expect(sum.innerHTML).toContain(`<span class="v ok">+${rest.toLocaleString('ko-KR')}원</span>`);
    expect(sum.innerHTML).not.toContain('예산 초과');
  });
});

describe('시나리오 2 — 예산 초과: 부호(−)와 색(no)', () => {
  it('물품 수량을 크게 늘려 예산을 넘기면 화면에 −부호·no색으로 뜬다', () => {
    const win = loadApp();
    // 포켓 Wi-Fi(D[0]) 수량을 크게 올려 확실히 예산을 넘긴다.
    ev(win, "D[0].qty=1000; render();");
    const goods = ev(win, "D.reduce((t,it)=>t+(it.on?it.o[it.sel].p*it.qty:0),0)");
    const meet = ev(win, "Math.max(0,M.per)*Math.max(0,M.n)*Math.max(0,M.c)");
    const tot = goods + meet;
    expect(tot).toBeGreaterThan(1500000); // 실제로 넘겨야 의미 있는 검사다
    const over = tot - 1500000;
    const sum = win.document.getElementById('sum');
    expect(sum.innerHTML).toContain('예산 초과');
    expect(sum.innerHTML).toContain(`<span class="v no">−${over.toLocaleString('ko-KR')}원</span>`);
    expect(sum.innerHTML).not.toContain('남는 예산');
  });
});

describe('시나리오 3 — 경계값: 예산과 정확히 같을 때(0원)', () => {
  it('합계가 예산과 정확히 같으면 부호 없이 0원, ok색, 초과 문구 없음', () => {
    const win = loadApp();
    // 물품을 전부 끄고 협의회비만으로 예산을 정확히 맞춘다: 1명×1회×1,500,000원 = 1,500,000원.
    renderWithMeetOnly(win, { n: 1, c: 1, per: 1500000 });
    const sum = win.document.getElementById('sum');
    expect(sum.innerHTML).toContain('<span class="v ok">0원</span>');
    expect(sum.innerHTML).not.toContain('예산 초과');
    const mLeft = win.document.getElementById('mLeft');
    expect(mLeft.textContent).toBe('0원');
    expect(mLeft.style.color).toBe('var(--good)');
  });
});

describe('시나리오 4 — 집행률 색 경계값(화면 표시값 기준)', () => {
  it('정확히 100%는 초록, 100.1%는 빨강, 89.95~90%는 초록으로 이어진다', () => {
    const win = loadApp();
    const rateClass = expr => ev(win, `rateClass(${expr})`);
    expect(rateClass(100)).toBe(' r-good');
    expect(rateClass(100.05)).toBe(' r-good'); // 화면엔 100.0%로 보인다 — 아직 빨강이면 안 됨
    expect(rateClass(100.1)).toBe(' r-over');
    expect(rateClass(89.94)).toBe(' r-warn');  // 화면엔 89.9%
    expect(rateClass(89.95)).toBe(' r-good');  // 화면엔 90.0%로 반올림 — 여기부터 초록
  });

  it('실제 render() 결과도 같은 경계를 따른다 — 정확히 예산과 같을 때 집행률 100.0%는 초록', () => {
    const win = loadApp();
    renderWithMeetOnly(win, { n: 1, c: 1, per: 1500000 });
    const sum = win.document.getElementById('sum');
    expect(sum.innerHTML).toContain('<span class="v rate r-good">100.0%</span>');
  });
});

describe('시나리오 5 — 게이지 막대 색이 집행률 색과 같다', () => {
  it('네 구간(over/good/warn/low) 모두에서 #gauge 클래스가 rateClass()와 일치한다', () => {
    const win = loadApp();
    const cases = [
      { n: 1, c: 1, per: 1600000, want: ' r-over' }, // 넘침 (perFit 우회 위해 M.per 직접 지정)
      { n: 1, c: 1, per: 1450000, want: ' r-good' }, // 96.7%
      { n: 1, c: 1, per: 1050000, want: ' r-warn' }, // 70%
      { n: 1, c: 1, per: 600000, want: ' r-low' },   // 40%
    ];
    let checked = 0;
    for (const c of cases) {
      renderWithMeetOnly(win, c);
      const gauge = win.document.getElementById('gauge');
      expect(gauge.className).toBe('gauge' + c.want);
      const sum = win.document.getElementById('sum');
      expect(sum.innerHTML).toContain(`rate${c.want}`);
      checked++;
    }
    expect(checked).toBe(4); // §21-1 — 대상 0건이면 이 줄에서 먼저 걸린다
  });
});

describe('시나리오 6 — 구분 번호 ⓪①②③④⑤가 끊기지 않고 이어진다', () => {
  it('SECS 순서 그대로 CIRC 번호가 매겨지고, 번호가 이미 있는 부스 이름은 겹치지 않는다', () => {
    const win = loadApp();
    const secs = ev(win, 'SECS');
    expect(secs.length).toBeGreaterThan(0); // 빈 목록이면 이 검사는 아무것도 안 본 것과 같다
    const nums = secs.map((_, i) => ev(win, `NO[SECS[${i}]]`));
    expect(nums.slice(0, 6)).toEqual(['⓪', '①', '②', '③', '④', '⑤']);
    // 부스 이름엔 이미 번호가 있다 — withNo()가 다시 붙여 "① ① AI Poster Studio"가 되면 안 된다.
    const boothName = ev(win, "D.find(it=>it.g.startsWith('①')).g");
    expect(ev(win, `withNo(${JSON.stringify(boothName)})`)).toBe(boothName);
  });
});

describe('시나리오 7 — 자동 계산이 어긋난 값을 바로잡고, 그 결과가 주소로 그대로 왕복된다', () => {
  it('말이 안 되는 인원·지급액을 「자동 계산」이 목표선 이상 · 상한 이내로 고쳐 준다', () => {
    const win = loadApp();
    // 인원을 100명으로 터무니없이 늘려 두면, 지금 조합(n=100,c=1)의 인당은 남는 돈을
    // 그대로 나눠 10,000원(목표선) 아래로 떨어진다 — "지금 조합을 가장 먼저 본다"는
    // 규칙 때문에 목표선 필터가 없으면 이 값이 그대로 최종값이 된다(남는 돈이 0이라
    // 다른 조합이 더 알뜰해 보이지 않기 때문). 그래서 이 시나리오는 목표선 필터가
    // 실제로 걸러내는지를 있는 그대로 검사한다.
    ev(win, "M.auto=false; M.n=100; M.c=1; M.per=100; render();");
    const before = ev(win, 'M.per');
    expect(before).toBe(100);
    const naive = ev(win, 'perFit(D.reduce((t,it)=>t+(it.on?it.o[it.sel].p*it.qty:0),0),100,1)');
    expect(naive).toBeLessThan(10000); // 이 검사가 실제로 목표선 아래를 건드리는지 먼저 확인
    const result = ev(win, 'autoFit()');
    expect(result.ok).toBe(true);
    const after = ev(win, 'M.per');
    expect(after).toBeGreaterThanOrEqual(10000); // PER_GOAL_LOW
    expect(after).toBeLessThanOrEqual(40000);    // PER_MAX / M.cap
    expect(ev(win, 'M.auto')).toBe(false); // 자동 계산은 누른 그 순간만 맞추고, 다시 뒤에서 안 따라온다
  });

  it('인쇄 안내창이 여는 "견적 그대로 열기" 주소(#q=)가 지금 화면 상태를 그대로 복원한다', () => {
    const win = loadApp();
    ev(win, "D[2].on=false; D[2].qty=D[2].qty+3; M.auto=false; M.n=9; M.c=3; M.per=22500; render();");
    const q = ev(win, 'stateStr()');
    expect(q.length).toBeGreaterThan(0);

    const win2 = loadApp('q=' + q);
    expect(ev(win2, 'D[2].on')).toBe(false);
    expect(ev(win2, 'D[2].qty')).toBe(ev(win, 'D[2].qty'));
    expect(ev(win2, 'M.n')).toBe(9);
    expect(ev(win2, 'M.c')).toBe(3);
    expect(ev(win2, 'M.per')).toBe(22500);
    expect(ev(win2, 'M.auto')).toBe(false);
    // 화면 숫자(#tot)까지 원본과 같아야 "그대로 열기"라고 부를 수 있다.
    expect(win2.document.getElementById('tot').textContent)
      .toBe(win.document.getElementById('tot').textContent);
  });
});
