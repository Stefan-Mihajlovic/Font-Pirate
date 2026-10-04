(() => {
  if (globalThis.__typePilot) return;
  const read = el => {
    const s = getComputedStyle(el);
    return {fontFamily:s.fontFamily,fontSize:s.fontSize,fontWeight:s.fontWeight,fontStyle:s.fontStyle,lineHeight:s.lineHeight,letterSpacing:s.letterSpacing,textTransform:s.textTransform,sample:(el.innerText || el.textContent || '').trim().replace(/\s+/g,' ').slice(0,500),source:location.origin+location.pathname,tag:el.tagName.toLowerCase()};
  };
  let cleanup = () => {};
  function inspect() {
    cleanup();
    const host = document.createElement('div');
    host.style.cssText = 'all:initial!important;position:fixed!important;inset:0!important;z-index:2147483647!important;pointer-events:none!important;';
    const root = host.attachShadow({mode:'closed'});
    const style = document.createElement('style');
    style.textContent = ':host{all:initial}.box{position:fixed;border:2px solid #a78bfa;background:#a78bfa18;border-radius:3px;box-sizing:border-box;pointer-events:none}.tip{position:fixed;left:16px;bottom:16px;max-width:calc(100vw - 32px);padding:14px 18px;border:1px solid #665186;border-radius:12px;background:#211a2d;color:#fff;font:13px/1.5 system-ui;box-shadow:0 8px 32px #0003}.detail{color:#d3c2f3;font-size:11px}';
    const box = document.createElement('div'); box.className='box'; box.hidden=true;
    const tip = document.createElement('div'); tip.className='tip';
    const title = document.createElement('div'); title.textContent='Type Pilot · Point at text, then click to capture';
    const detail = document.createElement('div'); detail.className='detail'; detail.textContent='Esc to cancel · Page links stay put while inspecting';
    tip.append(title,detail); root.append(style,box,tip); document.documentElement.append(host);
    let target = null;
    const locate = event => {
      const el = event.composedPath().find(n => n instanceof Element && n !== host);
      return el && !el.closest('input,textarea,select,[contenteditable="true"]') ? el : null;
    };
    const move = event => {
      target = locate(event);
      if (!target) {box.hidden=true; return;}
      const rect = target.getBoundingClientRect();
      box.hidden=false;
      Object.assign(box.style,{left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',height:rect.height+'px'});
      const s = read(target);
      title.textContent = s.fontFamily;
      detail.textContent = `${s.fontSize} / ${s.lineHeight} · ${s.fontWeight} · Click to capture · Esc to cancel`;
    };
    const click = async event => {
      event.preventDefault(); event.stopImmediatePropagation();
      const el = locate(event);
      if (!el || !(el.innerText || el.textContent || '').trim()) {title.textContent='Choose an element containing text'; return;}
      try {
        const result = await chrome.runtime.sendMessage({type:'CAPTURE',style:read(el)});
        if (!result?.ok) throw new Error(result?.error || 'Capture failed');
        cleanup();
      } catch {title.textContent='Please reopen Type Pilot and try again.';}
    };
    const key = event => {if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();cleanup();}};
    const block = event => {event.preventDefault();event.stopImmediatePropagation();};
    document.addEventListener('pointermove',move,true);
    document.addEventListener('click',click,true);
    document.addEventListener('pointerdown',block,true);
    document.addEventListener('keydown',key,true);
    const timeout = setTimeout(() => cleanup(), 120000);
    cleanup = () => {clearTimeout(timeout);host.remove();document.removeEventListener('pointermove',move,true);document.removeEventListener('click',click,true);document.removeEventListener('pointerdown',block,true);document.removeEventListener('keydown',key,true);};
  }
  function scan() {
    cleanup();
    const styles = new Map();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
    let el, visited=0;
    while ((el=walker.nextNode()) && visited++<10000) {
      if (el.matches('script,style,noscript,input,textarea,select') || el.closest('[hidden],[aria-hidden="true"]')) continue;
      if (![...el.childNodes].some(n=>n.nodeType===Node.TEXT_NODE && n.textContent.trim())) continue;
      const rect=el.getBoundingClientRect();
      if (!rect.width || !rect.height) continue;
      const computed=getComputedStyle(el);
      if(computed.visibility==='hidden' || computed.opacity==='0') continue;
      const s=read(el);
      const key=JSON.stringify([s.fontFamily,s.fontSize,s.fontWeight,s.fontStyle,s.lineHeight,s.letterSpacing,s.textTransform]);
      if(styles.has(key)) styles.get(key).count++;
      else if(styles.size<100) styles.set(key,{...s,count:1});
    }
    return {styles:[...styles.values()].sort((a,b)=>b.count-a.count), limited:visited>=10000 || styles.size>=100};
  }
  globalThis.__typePilot = {inspect,scan,stop:()=>cleanup()};
})();
