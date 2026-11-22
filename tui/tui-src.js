#!/usr/bin/env node
// ASCII RUN – terminal edition. Runs the real game (same code as the web version) headless and draws its
// character grid with ANSI codes. Needs a terminal of at least 100 x 26 characters.
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), vm = require('vm');

const COLS = 100, CELL_W = 6, CELL_H = 10, MIN_ROWS = 26, MAX_ROWS = 32;
const GAME_SRC = (() => { try { return require('./game_src.js'); } catch (e) { return fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8'); } })();

// ---------------------------------------------------------------- cell canvas (stands in for <canvas>)
// a cell: 0 = transparent, 1 = opaque blank, >=2 = glyph  (2 + (code << 2 | mode))
class CellCanvas {
  constructor() { this._w = 0; this._h = 0; this.g = null; this.isAtlas = false; this._ctx = null; }
  get width() { return this._w; } set width(v) { this._w = v; this.g = null; }
  get height() { return this._h; } set height(v) { this._h = v; this.g = null; }
  ensure() {
    if (!this.g) { this.cw = Math.ceil(this._w / CELL_W) + 2; this.ch = Math.ceil(this._h / CELL_H) + 2; this.g = new Uint16Array(this.cw * this.ch); }
    return this.g;
  }
  getContext() { return this._ctx || (this._ctx = new Ctx2D(this)); }
  addEventListener() {}
}
class Ctx2D {
  constructor(cv) { this.canvas = cv; this.fillStyle = '#000'; this.globalAlpha = 1; this.globalCompositeOperation = 'source-over'; this.tx = 0; this.ty = 0; this.stack = []; }
  save() { this.stack.push([this.tx, this.ty, this.globalAlpha, this.fillStyle, this.globalCompositeOperation]); }
  restore() { const s = this.stack.pop(); if (s) [this.tx, this.ty, this.globalAlpha, this.fillStyle, this.globalCompositeOperation] = s; }
  translate(x, y) { this.tx += x; this.ty += y; }
  setTransform() { this.tx = 0; this.ty = 0; }
  fillText() { this.canvas.isAtlas = true; }
  drawImage(src, ...a) {
    const dst = this.canvas; if (dst.isAtlas) return;
    const g = dst.ensure();
    if (src.isAtlas) {                                   // a glyph from the atlas
      const [sx, sy, , , dx, dy] = a;
      const code = 32 + Math.round(sx / CELL_W), mode = Math.round(sy / CELL_H);
      const c = Math.round((dx + this.tx) / CELL_W), r = Math.round((dy + this.ty) / CELL_H);
      if (c >= 0 && r >= 0 && c < dst.cw && r < dst.ch) g[r * dst.cw + c] = 2 + ((code << 2) | (mode & 3));
      return;
    }
    const [dx, dy] = a, sg = src.ensure();
    const c0 = Math.round((dx + this.tx) / CELL_W), r0 = Math.round((dy + this.ty) / CELL_H);
    for (let r = 0; r < src.ch; r++) {
      const rr = r0 + r; if (rr < 0 || rr >= dst.ch) continue;
      for (let c = 0; c < src.cw; c++) {
        const v = sg[r * src.cw + c]; if (!v) continue;
        const cc = c0 + c; if (cc < 0 || cc >= dst.cw) continue;
        g[rr * dst.cw + cc] = v;
      }
    }
  }
  fillRect(x, y, w, h) {
    const dst = this.canvas; if (dst.isAtlas) return;
    const g = dst.ensure();
    if (this.globalCompositeOperation === 'difference') {   // hit flash: invert every glyph
      for (let i = 0; i < g.length; i++) if (g[i] >= 2) { const v = g[i] - 2; g[i] = 2 + ((v & ~3) | ((v & 3) ^ 2)); }
      return;
    }
    if (this.fillStyle !== '#000') return;
    const c0 = Math.max(0, Math.round((x + this.tx) / CELL_W)), c1 = Math.min(dst.cw, Math.round((x + w + this.tx) / CELL_W));
    const r0 = Math.max(0, Math.round((y + this.ty) / CELL_H)), r1 = Math.min(dst.ch, Math.round((y + h + this.ty) / CELL_H));
    const al = this.globalAlpha;
    for (let r = r0; r < r1; r++) for (let c = c0; c < c1; c++) {
      if (al < 1 && (((c * 73856093) ^ (r * 19349663)) >>> 0) % 1000 / 1000 >= al) continue;   // fades dissolve cell by cell
      g[r * dst.cw + c] = 1;
    }
  }
}

// ---------------------------------------------------------------- sandbox
const SAVE = path.join(os.homedir(), '.ascii-run.json');
let store = {}; try { store = JSON.parse(fs.readFileSync(SAVE, 'utf8')); } catch (e) {}
let dirty = false;
const localStorage = {
  getItem: k => (k in store ? String(store[k]) : null),
  setItem: (k, v) => { store[k] = String(v); dirty = true; },
  removeItem: k => { delete store[k]; dirty = true; },
};
const listeners = {};
const mainCanvas = new CellCanvas();
let rafCb = null;
const sandbox = {
  console, setTimeout, clearTimeout, setInterval, clearInterval, atob: s => Buffer.from(s, 'base64').toString('binary'), btoa: s => Buffer.from(s, 'binary').toString('base64'),
  performance, localStorage, navigator: { vibrate() {}, userAgent: 'terminal' },
  innerWidth: COLS * CELL_W, innerHeight: MAX_ROWS * CELL_H, devicePixelRatio: 1,
  addEventListener(t, f) { (listeners[t] = listeners[t] || []).push(f); },
  removeEventListener() {},
  requestAnimationFrame(f) { rafCb = f; return 1; }, cancelAnimationFrame() {},
  FontFace: class { load() { return Promise.resolve(this); } },
  document: {
    getElementById: () => mainCanvas, createElement: t => (t === 'canvas' ? new CellCanvas() : { style: {}, remove() {}, appendChild() {} }),
    fonts: { add() {} }, body: { appendChild() {} }, documentElement: {}, addEventListener() {}, hidden: false, fullscreenEnabled: false,
  },
};
sandbox.__NO_BIG = true; sandbox.window = sandbox; sandbox.self = sandbox; sandbox.globalThis = sandbox;
// keyboard wording instead of touch wording
const SRC = GAME_SRC.split("'JUMP', input.jump").join("'SPACE', input.jump").split("'THROW', input.shoot").join("'X', input.shoot").split('TAP TO ').join('SPACE: ');
vm.createContext(sandbox);
let bootErr = null;
try { vm.runInContext(SRC, sandbox, { filename: 'game.js' }); } catch (e) { bootErr = e; }

// ---------------------------------------------------------------- terminal
const out = process.stdout;
let termCols = out.columns || 100, termRows = out.rows || 32, rowsUsed = MAX_ROWS, prev = null, tooSmall = false, quitting = false;
function layout() {
  termCols = out.columns || 100; termRows = out.rows || 32;
  tooSmall = termCols < COLS || termRows < MIN_ROWS;
  rowsUsed = Math.max(MIN_ROWS, Math.min(MAX_ROWS, termRows));
  sandbox.innerWidth = COLS * CELL_W; sandbox.innerHeight = rowsUsed * CELL_H;
  for (const f of listeners.resize || []) f({});
  prev = null; out.write('\x1b[2J');
}
function emit(grid) {
  const xo = Math.max(0, Math.floor((termCols - COLS) / 2)), yo = Math.max(0, Math.floor((termRows - rowsUsed) / 2));
  let s = '', mode = -1;
  const cur = new Uint16Array(COLS * rowsUsed);
  for (let r = 0; r < rowsUsed; r++) for (let c = 0; c < COLS; c++) {
    const v = c < mainCanvas.cw && r < mainCanvas.ch ? grid[r * mainCanvas.cw + c] : 0;
    cur[r * COLS + c] = v >= 2 ? v : 0;
  }
  for (let r = 0; r < rowsUsed; r++) {
    let c = 0;
    while (c < COLS) {
      if (prev && prev[r * COLS + c] === cur[r * COLS + c]) { c++; continue; }
      s += `\x1b[${yo + r + 1};${xo + c + 1}H`;
      while (c < COLS && !(prev && prev[r * COLS + c] === cur[r * COLS + c] && c + 3 < COLS && prev[r * COLS + c + 1] === cur[r * COLS + c + 1] && prev[r * COLS + c + 2] === cur[r * COLS + c + 2])) {
        const v = cur[r * COLS + c]; let ch = ' ', m = 0;
        if (v >= 2) { const q = v - 2; ch = String.fromCharCode(q >> 2); m = q & 3; }
        if (m !== mode) { s += '\x1b[0m' + (m & 1 ? '\x1b[1m' : '') + (m & 2 ? '\x1b[7m' : ''); mode = m; }
        s += ch; c++;
      }
    }
  }
  prev = cur;
  if (s) out.write(s + '\x1b[0m');
}
function notice(lines) {
  let s = '\x1b[2J\x1b[H'; lines.forEach((l, i) => { s += `\x1b[${3 + i};3H${l}`; }); out.write(s); prev = null;
}

// ---------------------------------------------------------------- input (terminals only report key *down*, so key-up is faked)
const HOLD = { ' ': 170, ArrowUp: 170, w: 170, z: 170, x: 130, f: 130, Enter: 130, ArrowRight: 130 };
const timers = new Map();
function fire(type, key) { for (const f of listeners[type] || []) f({ key, repeat: false, preventDefault() {} }); }
function keyDown(key) {
  if (timers.has(key)) { clearTimeout(timers.get(key)); }
  else fire('keydown', key);
  timers.set(key, setTimeout(() => { timers.delete(key); fire('keyup', key); }, HOLD[key] || 90));
}
function onData(buf) {
  const s = buf.toString('latin1');
  if (s === '\x03' || s === 'q' || s === 'Q') return quit();
  const map = { '\x1b[A': 'ArrowUp', '\x1b[B': 'ArrowDown', '\x1b[C': 'ArrowRight', '\x1b[D': 'ArrowLeft', '\x1bOA': 'ArrowUp', '\x1bOB': 'ArrowDown', '\x1bOC': 'ArrowRight', '\r': 'Enter', '\n': 'Enter', '\x1b': 'Escape', ' ': ' ' };
  if (map[s]) return keyDown(map[s]);
  for (const ch of s) { if (ch >= ' ' && ch <= '~') keyDown(ch.toLowerCase()); }
}
function quit() {
  if (quitting) return; quitting = true;
  try { if (dirty) fs.writeFileSync(SAVE, JSON.stringify(store)); } catch (e) {}
  out.write('\x1b[0m\x1b[?25h\x1b[?1049l');
  try { process.stdin.setRawMode(false); } catch (e) {}
  process.exit(0);
}

// ---------------------------------------------------------------- run
if (bootErr) { console.error('Game failed to start:', bootErr); process.exit(1); }
if (!process.stdin.isTTY) { console.error('ASCII RUN needs an interactive terminal.'); process.exit(1); }
process.stdin.setRawMode(true); process.stdin.resume(); process.stdin.on('data', onData);
out.write('\x1b[?1049h\x1b[?25l');
process.on('exit', () => { try { out.write('\x1b[0m\x1b[?25h\x1b[?1049l'); } catch (e) {} });
process.on('SIGINT', quit); process.on('SIGTERM', quit);
out.on('resize', layout);
setTimeout(() => {
  layout();
  let n = 0, lastSave = Date.now();
  setInterval(() => {
    if (tooSmall) { notice(['ASCII RUN needs a terminal of at least ' + COLS + ' x ' + MIN_ROWS + ' characters.', 'Now: ' + termCols + ' x ' + termRows + '. Make the window bigger.']); return; }
    const cb = rafCb; if (!cb) return;
    try { cb(performance.now()); } catch (e) { notice(['ERROR', String(e && e.stack || e)]); return; }
    if ((++n & 1) === 0 && mainCanvas.g) emit(mainCanvas.g);
    if (dirty && Date.now() - lastSave > 3000) { dirty = false; lastSave = Date.now(); try { fs.writeFileSync(SAVE, JSON.stringify(store)); } catch (e) {} }
  }, 1000 / 60);
}, 300);
