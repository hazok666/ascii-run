// ---------- THE WORM (boss) ----------
// The worm hangs on the right of the screen; its body is a wave that steps in whole rows. Shots hit the head only
// while it is open (the CPU's SCAN finds the weak point). Phase 2 adds vanishing ground, phase 3 adds drones.
const BOSS_N = 13;
const HEAD_CLOSED = [' /^^\\', '<(@@)', ' \\vv/'], HEAD_OPEN = ['/^^^\\', '<{**}', '\\VVV/'];
const bossRow = i => BASE_ROW - 8 + Math.round(4 * Math.sin(t * 1.6 - i * 0.55));
function bossPickups(B) {
  const x = Math.floor(px() + 34);
  level.objs.push({ t: 'heart', x, top: BASE_ROW - 4, w: 2, h: 1 });
  level.objs.push({ t: 'auto', x: x + 10, top: BASE_ROW - 4, w: 3, h: 1 });
}
function bossHurt() {
  const B = level.boss;
  B.hp--; sfx('pop'); vibrate(15);
  burst('#%*', B.bx + 2, bossRow(0), 6); B.hit = 0.08;
  if (B.hp <= 0) {
    B.state = 'dying'; B.dead = 0; P.inv = 99; flash = 0.2; shake = 0.6; sfx('roar');
    level.objs = level.objs.filter(o => !o.enemy); B.pend = []; level.h.fill(BASE_ROW); bullets = [];
    sayLines(['end_1'], 0.2, 0.2);
  } else if (B.hp <= B.max / 3 && B.phase === 2) { B.phase = 3; sfx('roar'); shake = 0.4; sayLines(['boss_p3'], 0, 0.2); bossPickups(B); }
  else if (B.hp <= B.max * 2 / 3 && B.phase === 1) { B.phase = 2; sfx('roar'); shake = 0.4; sayLines(['boss_p2'], 0, 0.2); bossPickups(B); }
}
function bossUpdate(dt) {
  const B = level.boss; if (!B) return;
  B.bx = camX + COLS - 30;
  if (camX > 4000) {   // endless flat arena: wrap the world
    const d = 2000; camX -= d;
    for (const o of level.objs) { o.x -= d; if (o.x0 !== undefined) o.x0 -= d; }
    for (const b of bullets) b.x -= d;
    for (const q of B.pend) q.x -= d;
    B.bx = camX + COLS - 30;
  }
  if (B.state === 'dying') {
    B.dead += dt; if (Math.random() < 0.4) sfx('crackle');
    if (B.dead > 3.4 && !B.done) { B.done = true; startEnding(); }
    return;
  }
  if (!B.started && t > 1.2) { B.started = true; bossPickups(B); }
  const cyc = B.phase === 3 ? 3.4 : 4.2, win = B.phase === 3 ? 1.5 : 1.9, open = (t % cyc) < win;
  if (open && !B.open) { sfx('ping'); if (!B.openSaid) { B.openSaid = true; sayLines(['boss_open'], 0, 0.2); } }
  B.open = open;
  if (B.hit > 0) B.hit -= dt;
  const bx = B.bx;
  if (t >= B.nextBlock) {
    level.objs.push({ t: 'tumble', x: bx, x0: bx, top: BASE_ROW - 1, g: BASE_ROW, w: 3, h: 1, hazard: true, enemy: true, vx: -(8 + B.phase * 1.5), ph: t * 3 });
    B.nextBlock = t + (B.phase === 1 ? 2.4 : B.phase === 2 ? 2.0 : 1.5) + Math.random() * 0.8; sfx('throw');
  }
  if (B.phase >= 2 && t >= B.nextPit) { B.pend.push({ x: Math.floor(px() + 24), t0: t, on: false }); B.nextPit = t + (B.phase === 2 ? 5.5 : 4.2); }
  if (B.phase >= 3 && t >= B.nextDrone) {
    level.objs.push({ t: 'vulture', fly: true, x: bx, x0: bx, base: BASE_ROW - 4 - Math.random() * 6, top: 0, w: 5, h: 1, hazard: true, enemy: true, vx: -11, ph: t });
    B.nextDrone = t + 3.2;
  }
  for (const q of B.pend) {
    const age = t - q.t0;
    if (age >= 0.9 && age < 2.3 && !q.on) { q.on = true; for (let k = 0; k < 5; k++) level.h[q.x + k] = NONE; sfx('crackle'); }
    if (age >= 2.3 && !q.off) { q.off = true; for (let k = 0; k < 5; k++) level.h[q.x + k] = BASE_ROW; }
  }
  B.pend = B.pend.filter(q => !q.off);
  // shots: head (damage only while open), then the body segments (they block)
  const c0 = bossRow(0);
  for (const b of bullets) {
    if (b.hit) continue;
    if (b.x + 1 > bx && b.x < bx + 5 && Math.abs(b.y - (c0 + 0.5)) < 2.0) {
      b.hit = true;
      if (B.open) bossHurt(); else { burst('*+', b.x, b.y, 3); sfx('crackle'); }
      continue;
    }
    for (let i = 1; i <= BOSS_N; i++) {
      const sx = bx + 5 + 4 * (i - 1), r = bossRow(i);
      if (b.x + 1 > sx && b.x < sx + 3 && b.y >= r - 0.6 && b.y < r + 1.6) { b.hit = true; burst('*', b.x, b.y, 2); sfx('crackle'); break; }
    }
  }
}
function drawBoss() {
  const B = level.boss, bx = B.bx || (camX + COLS - 30);
  const BODY = ['(#)', '{#}', '(%)', '{%}'];
  const dead = B.state === 'dying' ? B.dead : -1;
  for (let i = BOSS_N; i >= 0; i--) {
    if (dead >= 0 && dead * 5 > i + 1) continue;           // dissolved, head first
    const bitsNow = dead >= 0 && dead * 5 > i - 2;
    const r = bossRow(i);
    if (i === 0) {
      const spr = B.open || bitsNow ? HEAD_OPEN : HEAD_CLOSED, c = r - 1;
      for (let k = 0; k < 3; k++) {
        let line = spr[k];
        if (bitsNow) line = line.split('').map((ch, j) => hash(j + k * 7, Math.floor(t * 20)) < 0.6 ? BITS[Math.floor(hash(j, Math.floor(t * 30) + k) * 3)] : ' ').join('');
        text(line, (bx - camX) * CW, (c + k) * CH, B.open || B.hit > 0 ? 1 : 0, false);
      }
      if (B.open && Math.floor(t * 6) % 2 === 0) { gtext('>>', Math.round(bx - camX) - 3, r, 1); }
      continue;
    }
    const sx = bx + 5 + 4 * (i - 1);
    let seg = i > BOSS_N - 3 ? ['(:)', '(.)', ' . '][i - (BOSS_N - 2)] : BODY[i % 4];
    if (bitsNow) seg = seg.split('').map((ch, j) => BITS[Math.floor(hash(j + i, Math.floor(t * 30)) * 3)]).join('');
    text(seg, (sx - camX) * CW, r * CH, i % 3 ? 1 : 0, false);
  }
}

// ---------- the ending: the CPU halts the wipe and types RUN ----------
let ending = null;
const CMD_WORDS = ['BOOT', 'SCAN', 'LOAD', 'SAVE', 'LINK', 'COPY', 'LOCK', 'HALT'];
function startEnding() {
  const score = 2000 + P.lives * 200 + (P.hits === 0 ? 1000 : 0) + P.gems * 10;
  P.score = score;
  const prev = bestOf(9), newBest = score > prev;
  let hi = 0;
  try {
    if (newBest) localStorage.setItem('ar_best_9', score);
    const k = 'ar_stars_9', old = +(localStorage.getItem(k) || 0);
    localStorage.setItem(k, old | 1 | (P.hits === 0 ? 4 : 0));
    hi = +(localStorage.getItem('ar_hi') || 0);
  } catch (e) {}
  let total = 0;
  if (camp.active) total = camp.score + score; else for (const x of SECTORS) total += bestOf(x.id);
  const newHi = camp.active && total > hi;
  try { if (newHi) localStorage.setItem('ar_hi', total); } catch (e) {}
  ending = { t: 0, score, total, newHi, full: camp.active, cmds: CMD_WORDS.filter(w => cmdLevel(w) === 2).length, voice: false, rest: false,
             bw: bigWord('RUN', [true, true, true]) };
  camp.active = false;
  state = 'ending'; menuSel = 0; playSong(null);
}
function endingTick() {
  if (ending.t > 0.6 && !ending.voice) { ending.voice = true; sayLines(['end_2', 'end_3'], 0, 0.5); }
  if (ending.t > 7.4 && !ending.rest) { ending.rest = true; sfx('restored'); }
  if (Math.random() < 0.15 && ending.t < 7) sfx('tick');
}
function drawEnding() {
  const tt = ending.t;
  const L = [[0.3, '> HALT'], [1.6, '> WIPE PROCESS .......... STOPPED'], [3.0, '> DRIVE 0 ............... RESTORED'],
             [4.4, '> CPU .................... ONLINE'], [5.8, '> WORM ................... REMOVED']];
  if (tt < 10) {
    L.forEach(([t0, txt], i) => {
      if (tt < t0) return;
      const n = Math.min(txt.length, Math.floor((tt - t0) * 35));
      gtext(txt.slice(0, n) + (n < txt.length ? '_' : ''), 6, 3 + i * 2, 1);
    });
    if (tt > 7.4) drawBigWord(ending.bw, 14, tt - 7.4, false);
    return;
  }
  const end = drawBigWord(ending.bw, 2, 99, true);
  const l1 = '> RUN', l2 = 'THE MACHINE IS RUNNING AGAIN';
  gtext(l1 + (Math.floor(t * 2) % 2 ? '_' : ' '), center(l1), end + 1, 1);
  gtext(l2, center(l2), end + 3, 0);
  const l3 = (ending.full ? 'TOTAL SCORE ' : 'BEST COMBINED ') + pad(ending.total, 6) + (ending.newHi ? '   NEW HI-SCORE!' : '');
  gtext(l3, center(l3), end + 5, 1);
  const l4 = 'COMMANDS RESTORED ' + ending.cmds + '/8   BOSS SCORE ' + pad(ending.score, 5);
  gtext(l4, center(l4), end + 6, 0);
  drawMenu(['MENU'], end + 8);
}
function drawScores() {
  const rows = SECTORS.map(x => {
    let st = 0; try { st = +(localStorage.getItem('ar_stars_' + x.id) || 0); } catch (e) {}
    return (pad(x.id, 2) + ' ' + x.name).padEnd(16) + pad(bestOf(x.id), 5) + '  ' + (st & 1 ? '[*]' : '[ ]') + (st & 2 ? '[*]' : '[ ]') + (st & 4 ? '[*]' : '[ ]');
  });
  let sum = 0; for (const x of SECTORS) sum += bestOf(x.id);
  let hi = 0; try { hi = +(localStorage.getItem('ar_hi') || 0); } catch (e) {}
  const lines = ['HIGH SCORES', ''].concat(rows, ['', 'ALL SECTORS BEST ' + pad(sum, 6), 'FULL RUN BEST     ' + pad(hi, 6)]);
  const w = Math.max(...lines.map(s => s.length)) + 8, h = lines.length + 2;
  const col = Math.floor((COLS - w) / 2), row = 1;
  gbox(col, row, w, h, 0);
  lines.forEach((s, i) => gtext(s, col + 4, row + 1 + i, i === 0 ? 1 : 0));
  menuSel = 0;
  drawMenu(['BACK'], row + h + 1);
}
