import asyncio
from playwright.async_api import async_playwright
BOT='''([pa,ha,hold0]) => { const L=__lg; L.setSector(8); L.newRun(); L.hurtLog.length=0; let st, hold=0, conts=0, log=[];
  for (let i=0;i<60*400;i++){ st=L.S;
    if (st.state==='over'){ conts++; if(conts>6) break; L.continueRun(); continue; }
    if (st.state!=='play') break;
    const lv=L.level, x=st.camX+16; let need=false;
    for (let d=pa; d<pa+2; d++) if (lv.surf(x+d)===999) need=true;
    for (const o of lv.objs){ if(o.dead) continue; const dx=o.x-x;
      if (o.enemy && o.t==='tumble' && dx>ha+3 && dx<ha+6) need=true;
      if (o.enemy && o.t==='vulture' && dx>ha+4 && dx<ha+8 && o.top>st.P.y-6) need=true; }
    if ((need && st.P.ground && hold<=0)){ L.press('jump', false); L.press('jump',true); hold=hold0; } else { hold--; L.press('jump', hold>0); }
    L.press('shoot', true);
    L.step(1);
    if (i%600===0) log.push(Math.round(i/60)+'s hp='+L.level.boss.hp+' ph='+L.level.boss.phase+' lives='+st.P.lives);
  }
  return [L.S.state, L.level.boss.hp, conts, Math.round(L.S.t), log.join(' | ')]; }'''
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width':844,'height':390})
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.add_init_script("for (let i=1;i<=9;i++) localStorage.setItem('ar_stars_'+i,'7'); localStorage.setItem('ar_unlocked','8')")
        await pg.goto('file:///home/claude/ascii-run/index.html'); await pg.wait_for_timeout(800)
        await pg.evaluate('__lg.freeze(true)')
        for prof in [(5,5,4),(5,6,8),(4,4,20)]:
            print(prof, await pg.evaluate(BOT,list(prof)))
        print('errors',errs); await b.close()
asyncio.run(main())
