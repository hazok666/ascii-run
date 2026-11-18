// ---------- living parallax backgrounds (computer interiors) ----------
// every layer is a function of (world column, row, time) -> glyph code (+1000 = bold) or 0. All motion steps in whole cells.
const bgCache = {};
function bgLayer(p, fn) {
  const cx = camX * p, off = (cx % 1) * CW, w0 = Math.floor(cx);
  const r0 = Math.max(0, Math.floor(OY / CH) - 1);
  for (let c = -1; c <= COLS; c++) {
    const wx = w0 + c, sx = c * CW - off;
    const fg = Math.min(ROWS, level.surf(Math.floor(camX + (sx + CW / 2) / CW)));
    for (let r = r0; r < fg; r++) {
      let ch = fn(wx, r);
      if (!ch) continue;
      let m = 0; if (ch >= 1000) { ch -= 1000; m = 1; }
      glyph(ch, sx, r * CH, m);
    }
  }
}
// BOARD: far = routed traces with data pulses, mid = chips with blinking LEDs and capacitors
function boardTile(tile) {
  const k = 'bt' + tile; if (bgCache[k]) return bgCache[k];
  const slots = [];
  for (let i = 0; i < 5; i++) {
    const h = q => hash(tile * 7 + i, q);
    const y0 = 8 + Math.floor(h(1) * 14), xs = Math.floor(h(2) * 8), len1 = 8 + Math.floor(h(3) * 12), len2 = 8 + Math.floor(h(6) * 12);
    let dy = (h(4) < 0.5 ? -1 : 1) * (3 + Math.floor(h(5) * 4));
    if (y0 + dy < 5 || y0 + dy > 24) dy = -dy;
    slots.push({ y0, xs, len1, len2, dy, sp: 6 + Math.floor(h(7) * 7), ph: h(8) * 100, total: len1 + Math.abs(dy) + len2 });
  }
  return bgCache[k] = slots;
}
function boardTraces(wx, r) {
  const tile = Math.floor(wx / 56), lx = wx - tile * 56;
  for (const s of boardTile(tile)) {
    const ye = s.y0 + s.dy, xc = s.xs + s.len1, xe = xc + s.len2;
    let idx = -1, ch = 0;
    if (r === s.y0 && lx >= s.xs && lx <= xc) { idx = lx - s.xs; ch = lx === s.xs ? 111 : (lx === xc ? 43 : (lx & 1 ? 46 : 45)); }
    else if (lx === xc && (s.dy > 0 ? (r > s.y0 && r < ye) : (r < s.y0 && r > ye))) { idx = s.len1 + Math.abs(r - s.y0); ch = r & 1 ? 58 : 124; }
    else if (r === ye && lx >= xc && lx <= xe) { idx = s.len1 + Math.abs(s.dy) + (lx - xc); ch = lx === xc ? 43 : (lx === xe ? 111 : (lx & 1 ? 46 : 45)); }
    if (idx < 0) continue;
    const pos = Math.floor(t * s.sp + s.ph) % (s.total + 14);
    if (idx === pos) return 1042;
    if (idx === pos - 1) return 43;
    return ch;
  }
  return 0;
}
const CHIP_NAMES = ['CPU', 'RAM', 'ROM', 'I/O', 'GPU', 'BIOS', 'NAND', 'PLL'];
function chipTile(tile) {
  const k = 'ct' + tile; if (bgCache[k]) return bgCache[k];
  const h = q => hash(tile, q + 500), kind = h(1);
  const o = { kind: kind < 0.15 ? 0 : (kind < 0.7 ? 1 : 2), x0: 2 + Math.floor(h(2) * 8), b: 20 + Math.floor(h(3) * 5) };
  o.w = 14 + 2 * Math.floor(h(4) * 5); o.label = CHIP_NAMES[Math.floor(h(5) * CHIP_NAMES.length)]; o.rate = 1 + h(6) * 3;
  o.caps = [{ x: o.x0, w: 5, h: 5 + Math.floor(h(7) * 4) }, { x: o.x0 + 8, w: 4, h: 4 + Math.floor(h(8) * 3) }, { x: o.x0 + 14, w: 5, h: 5 + Math.floor(h(9) * 3) }];
  return bgCache[k] = o;
}
function boardChips(wx, r) {
  const tile = Math.floor(wx / 40), lx = wx - tile * 40, o = chipTile(tile);
  if (o.kind === 1) {
    const i = lx - o.x0, w = o.w, rr = r - (o.b - 5);
    if (i < 0 || i >= w || rr < 0 || rr > 5) return 0;
    if (rr === 0 || rr === 5) return i > 0 && i < w - 1 && (i & 1) ? 124 : 0;
    if (rr === 1 || rr === 4) return i === 0 || i === w - 1 ? 43 : 45;
    if (i === 0 || i === w - 1) return 124;
    if (rr === 2) { const st = Math.floor((w - o.label.length) / 2), j = i - st; return j >= 0 && j < o.label.length ? o.label.charCodeAt(j) : 0; }
    if (i === w - 3) return Math.floor(t * o.rate + tile) % 2 ? 1042 : 111;
    return i % 3 === 0 ? 46 : 0;
  }
  if (o.kind === 2) {
    for (const c of o.caps) {
      const i = lx - c.x, rr = r - (o.b - c.h + 1);
      if (i < 0 || i >= c.w || rr < 0 || rr >= c.h) continue;
      if (rr === 0) return i === 0 || i === c.w - 1 ? 0 : 95;
      if (i === 0 || i === c.w - 1) return 124;
      return rr % 3 === 1 ? 61 : 0;
    }
  }
  return 0;
}
// FANS: far = heatsink comb, mid = spinning fans (blades step in whole cells), near = rising dust
function fanTile(tile, tw, rmin, rmax) {
  const k = 'ft' + tw + ':' + tile; if (bgCache[k]) return bgCache[k];
  const h = q => hash(tile, q + tw * 3);
  return bgCache[k] = { cx: 14 + Math.floor(h(1) * (tw - 28)), R: rmin + Math.floor(h(2) * (rmax - rmin + 1)), sp: (1.6 + h(3) * 3) * (h(4) < 0.5 ? -1 : 1), gap: h(5) < 0.2 };
}
function fansAt(tw, rmin, rmax, cy) {
  return (wx, r) => {
    const tile = Math.floor(wx / tw), lx = wx - tile * tw, f = fanTile(tile, tw, rmin, rmax);
    if (f.gap) return 0;
    const dx = (lx - f.cx) / 1.7, dy = r - cy, rad = Math.sqrt(dx * dx + dy * dy);
    if (rad > f.R + 0.5) return 0;
    if (rad > f.R - 0.7) return Math.abs(dy) > Math.abs(dx) ? 45 : (dx < 0 ? 40 : 41);
    if (rad < 1.3) return rad < 0.6 ? 1079 : 111;
    const a = Math.atan2(dy, dx) + rad * 0.35 - t * f.sp;
    const kk = ((a / (Math.PI * 2 / 5)) % 1 + 1) % 1;
    return kk < 0.2 ? 58 : (kk < 0.3 ? 46 : 0);
  };
}
const fansFar = fansAt(40, 3, 4, 17), fansMid = fansAt(70, 6, 7, 19);
function fansComb(wx, r) {
  if (wx % 6) return 0;
  const top = 16 + Math.round(2 * Math.sin(wx / 17) + 2 * Math.sin(wx / 5.3));
  return r < top ? 0 : (r === top ? 46 : (r & 1 ? 58 : 0));
}
function fansDust(wx, r) {
  if (hash(wx, 9) > 0.06) return 0;
  const sp = 2 + hash(wx, 10) * 3, y0 = hash(wx, 11) * 40;
  return 26 - Math.floor((t * sp + y0) % 24) === r ? 46 : 0;
}
function drawBG() {
  if (level.sec.bg === 'board') { bgLayer(0.18, boardTraces); bgLayer(0.45, boardChips); }
  else { bgLayer(0.15, fansComb); bgLayer(0.28, fansFar); bgLayer(0.5, fansMid); bgLayer(0.85, fansDust); }
}
