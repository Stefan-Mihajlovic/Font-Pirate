import {ROLES,LABELS,newSet,normalizeStyle,exportCSS,exportJSON,fileName} from './core.js';
const $ = id => document.getElementById(id);
const isPanel = new URLSearchParams(location.search).get('surface') === 'sidepanel';
if(isPanel) {document.body.classList.add('sidepanel');$('panel').hidden=true;}
let draft=newSet(), role='heading', library=[], capture=null, toastTimer;
const fields=['fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','fontStyle','textTransform','sample'];
const element=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
function toast(text){$('status').textContent=text;$('status').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('status').hidden=true,5000);}
function view(name){document.querySelectorAll('.view').forEach(e=>e.hidden=e.id!==name);document.querySelectorAll('[data-view]').forEach(e=>{e.classList.toggle('active',e.dataset.view===name);if(e.dataset.view===name)e.setAttribute('aria-current','page');else e.removeAttribute('aria-current');});if(name==='pairing')renderEditor();if(name==='library')renderLibrary();window.scrollTo(0,0);}
function applyStyle(el,s){for(const key of fields){if(key!=='sample')el.style[key]=s[key];}}
function remember(){chrome.storage.local.set({draft:structuredClone(draft)}).catch(()=>toast('Could not save draft. Export a backup and free some storage.'));}
async function request(message){const result=await chrome.runtime.sendMessage(message);if(!result?.ok)throw new Error(result?.error || 'Please reopen Type Pilot and try again.');return result;}
async function action(fn){try{await fn();}catch(e){toast(e.message || 'Something went wrong. Please try again.');}}
async function confirmChange(title,copy){$('confirm-title').textContent=title;$('confirm-copy').textContent=copy;$('confirm').showModal();return new Promise(resolve=>$('confirm').addEventListener('close',()=>resolve($('confirm').returnValue==='ok'),{once:true}));}
async function currentTab(){const [tab]=await chrome.tabs.query({active:true,currentWindow:true});if(!tab?.id)throw new Error('Open a website, then try again.');if(tab.url && !/^https?:/.test(tab.url))throw new Error('Open a regular website. Browser pages, PDFs and extension stores cannot be inspected.');return tab;}
async function runOnPage(mode){
 const tab=await currentTab();
 try{await chrome.scripting.executeScript({target:{tabId:tab.id},files:['content.js']});return await chrome.scripting.executeScript({target:{tabId:tab.id},func:m=>globalThis.__typePilot[m](),args:[mode]});}
 catch{throw new Error('This page cannot be inspected. Open a website and click the Type Pilot toolbar icon to grant access, then retry.');}
}
$('pick').onclick=()=>action(async()=>{await runOnPage('inspect');if(!isPanel)window.close();else toast('Click text on the page to capture it. Esc cancels.');});
$('scan').onclick=()=>action(async()=>{const button=$('scan');button.disabled=true;try{const results=await runOnPage('scan');const result=results[0]?.result;if(!result)throw new Error('No text styles found on this page.');renderScan(result);toast(`${result.styles.length} styles collected${result.limited?' (scan limit reached)':''}.`);}finally{button.disabled=false;}});
$('panel').onclick=()=>action(async()=>{const win=await chrome.windows.getCurrent();await chrome.sidePanel.open({windowId:win.id});window.close();});
$('theme').onclick=()=>{document.body.dataset.theme=document.body.dataset.theme==='dark'?'light':'dark';chrome.storage.local.set({theme:document.body.dataset.theme}).catch(()=>toast('Could not save appearance.'));};
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>view(b.dataset.view));
document.querySelectorAll('[data-role]').forEach(b=>b.onclick=()=>{role=b.dataset.role;renderEditor();});
$('try-pairing').onclick=()=>view('pairing');
function renderCapture(s){
 capture=s;$('capture').hidden=false;$('welcome').hidden=true;const card=element('div','capture-card');
 card.append(element('span','eyebrow','CAPTURED TYPE'),element('h2','',s.fontFamily));
 const sample=element('p','sample',s.sample||'The quick brown fox.');applyStyle(sample,s);sample.style.fontSize=`${Math.min(parseFloat(s.fontSize)||24,42)}px`;card.append(sample);
 const metrics=element('div','metrics');[s.fontSize,`${s.fontWeight} weight`,`${s.lineHeight} line`,`${s.letterSpacing} spacing`].forEach(x=>metrics.append(element('span','',x)));card.append(metrics);
 if(s.source)card.append(element('p','footnote',new URL(s.source).hostname));
 const actions=element('div','capture-actions');const select=element('select');select.setAttribute('aria-label','Assign captured type to role');ROLES.forEach(r=>{const o=element('option','',LABELS[r]);o.value=r;select.append(o);});select.value=role;
 const add=element('button','primary','Use in pairing');add.onclick=()=>{role=select.value;draft.roles[role]=normalizeStyle(s);remember();view('pairing');toast(`Added to ${LABELS[role].toLowerCase()}.`);};actions.append(select,add);card.append(actions);$('capture').replaceChildren(card);
}
function renderScan(result){
 $('scan-count').textContent=`${result.styles.length} styles${result.limited?' · limited scan':''}`;const list=$('scan-results');list.replaceChildren();
 if(!result.styles.length){list.append(element('p','empty','No readable text found on this page.'));return;}
 for(const s of result.styles){const card=element('div','scan-card'),row=element('div','card-row'),choose=element('button','small','Select');choose.onclick=()=>{renderCapture(normalizeStyle(s));window.scrollTo(0,0);};row.append(element('h3','',s.fontFamily),choose);card.append(row,element('p','',s.sample));const metrics=element('div','metrics');[s.fontSize,s.fontWeight,`${s.count}×`].forEach(v=>metrics.append(element('span','',v)));card.append(metrics);list.append(card);}
}
function renderEditor(){
 $('set-name').value=draft.name;
 if(!draft.roles[role])draft.roles[role]=normalizeStyle();
 const s=draft.roles[role];fields.forEach(k=>$(k).value=s[k]);
 document.querySelectorAll('[data-role]').forEach(b=>{b.classList.toggle('active',b.dataset.role===role);b.setAttribute('aria-pressed',String(b.dataset.role===role));});
 $('source').textContent=s.source?`Captured from ${s.source}`:'A starting point. Make it yours.';renderPreview();
}
function renderPreview(){const target=$('pair-preview');target.replaceChildren();for(const r of ['caption','heading','subheading','body']){const s=draft.roles[r];if(!s)continue;const e=element('p','',s.sample||LABELS[r]);applyStyle(e,s);e.title=LABELS[r];target.append(e);}}
fields.forEach(k=>$(k).addEventListener('change',()=>{const raw={...draft.roles[role]};fields.forEach(f=>raw[f]=$(f).value);const normalized=normalizeStyle(raw);draft.roles[role]=normalized;fields.forEach(f=>$(f).value=normalized[f]);if(normalized[k]!==raw[k])toast('Use a valid CSS value, such as 24px, 1.5 or normal.');remember();renderPreview();}));
$('sample').addEventListener('input',()=>{draft.roles[role].sample=$('sample').value;remember();renderPreview();});
$('set-name').addEventListener('input',()=>{draft.name=$('set-name').value;remember();});
$('new-set').onclick=()=>action(async()=>{if(await confirmChange('Start a new pairing?','Your current draft will be replaced. Saved pairings stay in your library.')){draft=newSet();role='heading';remember();renderEditor();}});
$('save').onclick=()=>action(async()=>{const result=await request({type:'SAVE_SET',set:draft});draft=result.set;remember();$('set-name').value=draft.name;toast('Pairing saved to your library.');});
$('copy-css').onclick=()=>action(async()=>{await navigator.clipboard.writeText(exportCSS(draft));toast('CSS copied.');});
function download(text,name,type){const blob=new Blob([text],{type}),url=URL.createObjectURL(blob),a=element('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
$('export-css').onclick=()=>download(exportCSS(draft),`${fileName(draft.name)}.css`,'text/css');
$('export-json').onclick=()=>download(exportJSON([draft]),`${fileName(draft.name)}.json`,'application/json');
$('backup').onclick=()=>{if(!library.length)return toast('Save a pairing first.');download(exportJSON(library),'type-pilot-library.json','application/json');};
$('import').onclick=()=>$('import-file').click();
$('import-file').onchange=()=>action(async()=>{const file=$('import-file').files[0];$('import-file').value='';if(!file)return;if(file.size>2_000_000)throw new Error('Choose a JSON file smaller than 2 MB.');const result=await request({type:'IMPORT_SETS',text:await file.text()});toast(`Imported ${result.count} pairing${result.count===1?'':'s'}.`);});
$('search').oninput=renderLibrary;
function renderLibrary(){
 $('count').textContent=library.length;$('library-total').textContent=`${library.length} pairing${library.length===1?'':'s'}`;const list=$('library-list');list.replaceChildren();
 const q=$('search').value.toLowerCase();const matches=library.filter(s=>(s.name+' '+Object.values(s.roles).map(x=>x.fontFamily).join(' ')).toLowerCase().includes(q));
 if(!matches.length){list.append(element('p','empty',library.length?'No matching pairings. Try another name or font.':'Your collection starts with one good pairing. Capture some type or save the starter pairing.'));return;}
 for(const set of matches){const card=element('article','library-card');card.append(element('h2','',set.name),element('p','',Object.values(set.roles).map(s=>s.fontFamily.split(',')[0]).filter((v,i,a)=>a.indexOf(v)===i).join(' + ')));const sample=element('div','library-sample','Aa. In good company.');sample.style.fontFamily=set.roles.heading?.fontFamily||'Georgia, serif';card.append(sample);const actions=element('div','library-actions');const open=element('button','small','Open pairing');open.onclick=()=>action(async()=>{if(await confirmChange('Open this pairing?','This replaces your current draft. Saved pairings will stay in your library.')){draft=structuredClone(set);remember();view('pairing');}});const duplicate=element('button','text-button','Duplicate');duplicate.onclick=()=>action(async()=>{await request({type:'SAVE_SET',set:{...set,id:crypto.randomUUID(),name:set.name+' copy'}});toast('Pairing duplicated.');});const remove=element('button','text-button','Delete');remove.onclick=()=>action(async()=>{if(await confirmChange('Delete this pairing?',`Remove “${set.name}” from the local library? Export a backup first if you want to keep it.`)){await request({type:'DELETE_SET',id:set.id});toast('Pairing deleted.');}});actions.append(open,duplicate,remove);card.append(actions);list.append(card);}
}
chrome.storage.onChanged.addListener((changes,area)=>{if(area!=='local')return;if(changes.lastCapture?.newValue){renderCapture(changes.lastCapture.newValue);view('inspect');toast('Typography captured. Choose its role in your pairing.');}if(changes.library){library=changes.library.newValue||[];renderLibrary();}if(changes.draft?.newValue){draft=changes.draft.newValue;if(!$('pairing').hidden && !document.activeElement?.matches('input,textarea,select'))renderEditor();}});
(async()=>{try{const data=await chrome.storage.local.get(['draft','library','lastCapture','theme']);if(data.draft?.roles)draft=data.draft;library=data.library||[];document.body.dataset.theme=data.theme||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');if(data.lastCapture)renderCapture(data.lastCapture);renderLibrary();}catch{toast('Local storage could not be loaded. Please reopen Type Pilot.');}})();
