#!/usr/bin/env python3
"""Turn a video clip into ASCII frames for ASCII RUN (cutscenes, the WORM intro, the ending).

Brightness -> characters, one character per grid cell, black and white only.
Output: a JSON file {cols, rows, fps, frames:[...strings]} that the game (or preview.html) plays back.

  python3 video2ascii.py clip.mp4 out.json --cols 100 --rows 32 --fps 12 [--ramp " .:-=+*#%@"] [--invert]
"""
import argparse, json, subprocess, numpy as np

p = argparse.ArgumentParser()
p.add_argument('src'); p.add_argument('out')
p.add_argument('--cols', type=int, default=100); p.add_argument('--rows', type=int, default=32)
p.add_argument('--fps', type=float, default=12)
p.add_argument('--ramp', default=' .:-=+*#%@')        # dark -> bright
p.add_argument('--invert', action='store_true')
p.add_argument('--gamma', type=float, default=1.0)
p.add_argument('--contrast', type=float, default=1.3)
p.add_argument('--max-seconds', type=float, default=0)
a = p.parse_args()

# sample each cell's average brightness: scale straight to the character grid
vf = f"fps={a.fps},scale={a.cols}:{a.rows}:flags=area,format=gray"
cmd = ['ffmpeg', '-loglevel', 'error', '-i', a.src]
if a.max_seconds: cmd += ['-t', str(a.max_seconds)]
cmd += ['-vf', vf, '-f', 'rawvideo', '-']
raw = subprocess.run(cmd, check=True, capture_output=True).stdout
n = len(raw) // (a.cols * a.rows)
frames = np.frombuffer(raw[: n * a.cols * a.rows], np.uint8).reshape(n, a.rows, a.cols).astype(np.float32) / 255

ramp = a.ramp
out = []
for f in frames:
    if a.invert: f = 1 - f
    f = np.clip((f - 0.5) * a.contrast + 0.5, 0, 1) ** a.gamma
    idx = np.minimum((f * len(ramp)).astype(int), len(ramp) - 1)
    out.append('\n'.join(''.join(ramp[i] for i in row) for row in idx))
json.dump({'cols': a.cols, 'rows': a.rows, 'fps': a.fps, 'frames': out}, open(a.out, 'w'))
print(f'{len(out)} frames, {a.cols}x{a.rows}, {a.fps} fps -> {a.out}')
