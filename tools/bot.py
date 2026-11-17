import asyncio, sys, json
from playwright.async_api import async_playwright
BOT = '''([sec, pa, ha, hold0]) => { const L=__lg; L.setSector(sec); L.newRun(); L.hurtLog.length=0; let st, hold=0;
  for (let i=0;i<60*120;i++){ st=L.S; if(st.state!=='play')break;
    const lv=L.level, x=st.camX+16; let need=false, enemy=false;
    for (let d=pa; d<pa+2; d++) if (lv.surf(x+d)===999) need=true;
    for (const c of lv.chunks) if (c.state!=='ok' && c.x0-x>pa-1 && c.x0-x<pa+3) need=true;
    for (const o of lv.objs){ if(o.dead) continue; const dx=o.x-x;
      if (o.enemy && dx>4 && dx<34) enemy=true;
      if (o.hazard && !o.enemy && dx>ha && dx<ha+1.8) need=true; }
    const falling = !st.P.ground && st.P.vy > 0 && st.P.airJumps > 0 && lv.surf(x+3)===999 && lv.surf(x+6)===999;
    if ((need && st.P.ground && hold<=0) || falling){ L.press('jump', false); L.press('jump',true); hold=hold0; } else { hold--; L.press('jump', hold>0); }
    L.press('shoot', enemy && i%8===0);
    L.step(1); }
  return [L.S.state, L.S.lives, Math.round(L.S.camX), L.hurtLog.map(h=>h[1]||h[0]+'@'+h[2]).join(',')]; }'''
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width':844,'height':390})
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///home/claude/ascii-run/index.html'); await pg.wait_for_timeout(800)
        await pg.evaluate('__lg.freeze(true)')
        for sec in [int(a) for a in sys.argv[1:]] or [0,1]:
            for pa,ha,hold in [(5,5,4),(5,6,8),(4,4,20),(6,7,4)]:
                print(sec, pa,ha,hold, await pg.evaluate(BOT,[sec,pa,ha,hold]))
        print('errors', errs); await b.close()
asyncio.run(main())
