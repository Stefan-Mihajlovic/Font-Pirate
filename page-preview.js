// Runs in the isolated extension world. Cleanup restores the page without a reload.
export async function previewPageFont(family,bytes,scope){
  globalThis.__fontPirateRestore?.();
  if(scope==='restore')return;
  const alias='FontPiratePreview',face=new FontFace(alias,new Uint8Array(bytes));await face.load();document.fonts.add(face);
  const targets=new Set(),previous=new Map(),selector=scope==='headings'?'h1,h2,h3,h4,h5,h6':scope==='body'?'p,li,blockquote,td,th,dd,dt':'body';
  const roots=[...document.querySelectorAll(selector)];
  for(const root of roots){const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);while(walker.nextNode()){const el=walker.currentNode.parentElement;if(!walker.currentNode.textContent.trim()||!el||el.closest('script,style,svg,canvas,code,pre,[aria-hidden="true"]'))continue;targets.add(el);}}
  for(const el of targets){previous.set(el,[el.style.getPropertyValue('font-family'),el.style.getPropertyPriority('font-family')]);el.style.setProperty('font-family',`"${alias}"`,'important');}
  const cleanup=()=>{for(const [el,[value,priority]] of previous){if(el.style.fontFamily.includes(alias)){if(value)el.style.setProperty('font-family',value,priority);else el.style.removeProperty('font-family');}}document.fonts.delete(face);window.removeEventListener('keydown',onKey,true);delete globalThis.__fontPirateRestore;};
  const onKey=e=>{if(e.key==='Escape')cleanup();};window.addEventListener('keydown',onKey,true);globalThis.__fontPirateRestore=cleanup;
  return targets.size;
}
