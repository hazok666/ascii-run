// DRIVE: spinning platters. BUS: lanes of flowing data blocks. CABLES: sagging wires with sparks. MEMORY: flipping bit cells.
// POWER: pylons with arcing current. CORE: die blocks with flashing cores.
function platterAt(tw, R, cy, sp) {
  return (wx, r) => {
    const tile = Math.floor(wx / tw), lx = wx - tile * tw, h = hash(tile, 77);
    if (h < 0.25) return 0;
    const cx = Math.floor(tw / 2) + Math.floor((h - 0.25) * 10);
    const dx = (lx - cx) / 1.7, dy = r - cy, rad = Math.sqrt(dx * dx + dy * dy);
    if (rad > R + 0.5) return 0;
    if (rad > R - 0.6) return Math.abs(dy) > Math.abs(dx) ? 45 : (dx < 0 ? 40 : 41);
    if (rad < 1.4) return rad < 0.7 ? 1079 : 111;
    if (Math.round(rad) % 3 === 0) {
      const a = Math.atan2(dy, dx) - t * sp, kk = ((a / (Math.PI * 2)) % 1 + 1) % 1;
      return kk < 0.07 ? 1035 : 46;
    }
    return 0;
  };
}
function busLanes(r0, step, nL, spd) {
  return (wx, r) => {
    const L = (r - r0) / step;
    if (L < 0 || L >= nL || L % 1) return 0;
    const dir = (L & 1) ? 1 : -1, sp = spd * (1 + (L % 3) * 0.6);
    const pos = wx + Math.floor(t * sp) * dir, blk = Math.floor(pos / 14), o = ((pos % 14) + 14) % 14;
    if (hash(blk, L + 900) > 0.6) return o === 0 ? 46 : 0;
    if (o === 0) return 91;
    if (o === 4) return 93;
    if (o > 0 && o < 4) return hash(blk * 3 + o, Math.floor(t * 2) + L) > 0.5 ? 49 : 48;
    if (o === 6 || o === 7) return dir > 0 ? 60 : 62;
    return 0;
  };
}
function cablesAt(bases, ampA, ampB) {
  const f = (x, i) => bases[i] + ampA * Math.sin(x / (7 + i * 1.7) + i * 2) + ampB * Math.sin(x / (3 + i) + i);
  return (wx, r) => {
    for (let i = 0; i < bases.length; i++) {
      const y = f(wx, i);
      if (Math.round(y) !== r) continue;
      if (hash(wx >> 2, i + Math.floor(t * 5)) < 0.03) return 1042;
      const dy = f(wx + 1, i) - f(wx - 1, i);
      return Math.abs(dy) < 0.6 ? 45 : (dy > 0 ? 92 : 47);
    }
    return 0;
  };
}
function memCells(rowOff) {
  return (wx, r) => {
    if ((r + rowOff) % 3 || r < 7) return 0;
    const lx = ((wx % 5) + 5) % 5, id = Math.floor(wx / 5), rid = (r + rowOff) / 3;
    if (lx > 2 || hash(id, rid + 300) > 0.38) return 0;
    if (lx === 0) return 91;
    if (lx === 2) return 93;
    const bit = hash(id * 7 + rid, Math.floor(t * (0.5 + hash(id, rid) * 2))) > 0.5;
    return (bit ? 49 : 48) + (hash(id, rid + 5) < 0.15 ? 1000 : 0);
  };
}
function psuArcs(wx, r) {
  const tile = Math.floor(wx / 60), lx = wx - tile * 60;
  const a = 8 + Math.floor(hash(tile, 31) * 6), b = a + 22 + Math.floor(hash(tile, 32) * 6), top = 10 + Math.floor(hash(tile, 33) * 4);
  if (lx === a || lx === b) return r === top ? 43 : (r > top ? 124 : 0);
  if (lx > a && lx < b && (Math.floor(t * 6) + tile) % 3 !== 0) {
    const y = top + Math.round(1.6 * Math.sin(lx * 0.9 + hash(Math.floor(t * 10), tile) * 6));
    if (r === y) return 1000 + ((lx & 1) ? 126 : 45);
  }
  return 0;
}
function coreBlocks(wx, r) {
  const tile = Math.floor(wx / 46), lx = wx - tile * 46, h = hash(tile, 41);
  if (h < 0.2) return 0;
  const x0 = 3 + Math.floor(h * 6), w = 26 + Math.floor(h * 8), top = 11 + Math.floor(hash(tile, 42) * 4), i = lx - x0, rr = r - top;
  if (i < 0 || i >= w || rr < 0 || rr > 9) return 0;
  if (i === 0 || i === w - 1 || rr === 0 || rr === 9) return 35;
  if ((i % 6) < 4 && (rr % 4 === 1 || rr % 4 === 2) && i > 1 && i < w - 2) return hash(i * 5 + rr, tile + Math.floor(t * 3)) < 0.45 ? 111 : 46;
  return 0;
}
function drawBG() {
  switch (level.sec.bg) {
    case 'board': bgLayer(0.18, boardTraces); bgLayer(0.45, boardChips); break;
    case 'fans': bgLayer(0.15, fansComb); bgLayer(0.28, fansFar); bgLayer(0.5, fansMid); bgLayer(0.85, fansDust); break;
    case 'drive': bgLayer(0.2, bgPlatterBig); bgLayer(0.45, bgPlatterSmall); break;
    case 'bus': bgLayer(0.25, bgBusFar); bgLayer(0.6, bgBusNear); break;
    case 'cables': bgLayer(0.25, bgCablesFar); bgLayer(0.55, bgCablesNear); break;
    case 'memory': bgLayer(0.22, bgMemFar); bgLayer(0.5, bgMemNear); break;
    case 'psu': bgLayer(0.3, psuArcs); bgLayer(0.5, boardChips); break;
    default: bgLayer(0.15, boardTraces); bgLayer(0.4, coreBlocks); break;
  }
}
const bgPlatterBig = platterAt(90, 9, 17, 1.4), bgPlatterSmall = platterAt(55, 5, 20, -2.2);
const bgBusFar = busLanes(8, 3, 6, 6), bgBusNear = busLanes(10, 4, 4, 12);
const bgCablesFar = cablesAt([9, 12, 15, 18, 21], 3, 1.5), bgCablesNear = cablesAt([11, 14, 17, 20], 2.5, 1.2);
const bgMemFar = memCells(0), bgMemNear = memCells(1);

function litCol(c) {
  if (!level.sec.dark) return true;
  if (c >= PCOL - 8 && c <= PCOL + 26) return true;
  if (ping) {
    const age = t - ping.t0, d = Math.abs(camX + c - ping.x), ring = age * 55;
    if (age < 2.0 && d <= ring + 3) return age < 1.4 || hash(c, Math.floor(t * 10)) < (2.0 - age) / 0.6;
  }
  return false;
}
