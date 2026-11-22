# ASCII RUN – terminalversion

Samma spel som webbversionen, ritat med ANSI-tecken i terminalen. Ingen ljud.

Kör (kräver Node 18+):

    node ascii-run.js

Mac: Terminal.app eller iTerm. Windows: PowerShell i Windows Terminal (PowerShell 7 rekommenderas).
Terminalen måste vara minst 100 x 26 tecken, helst 100 x 32.

Tangenter: SPACE / ↑ / W / Z = hoppa · X / F / Enter / → = kasta · P / Esc = paus · Q / Ctrl-C = avsluta.
Meny: ↑ ↓ + Enter. Sparas i ~/.ascii-run.json.

`tui-src.js` är körarens källkod. `ascii-run.js` är den + spelet i en fil.

Byggs tillsammans med webbversionen (samma spelkod) av build.py – de kan inte hamna olika.
