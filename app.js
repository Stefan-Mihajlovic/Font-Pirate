import {setupPlus} from './plus-ui.js';
import {ROLES, LABELS, newSet, normalizeStyle, exportCSS as baseExportCSS, exportJSON, fileName} from './core.js';
import {fonts, filterFonts, familyOf, loadFont, fontCSSURL} from './catalog.js';

function exportCSS(set) {
  const imports=[...new Set(Object.values(set.roles).flatMap(style=>{
    const font=fonts.find(f=>f.family===familyOf(style.fontFamily));
    return font ? ["@import url('"+fontCSSURL(font,style.fontWeight,style.fontStyle==='italic')+"');"] : [];
  }))];
  return (imports.length ? imports.join('\n')+'\n\n' : '')+baseExportCSS(set);
}

const $ = id => document.getElementById(id);
const isPanel = new URLSearchParams(location.search).get('surface') === 'sidepanel';
if (isPanel) {
  document.body.classList.add('sidepanel');
  $('panel').hidden = true;
}
let draft = newSet(), role = 'heading', library = [], toastTimer, overview = true;
const fields = ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'fontStyle', 'textTransform', 'sample'];
const element = (tag, cls, text) => {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text !== undefined) el.textContent = text;
  return el;
};
function icon(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', `#i-${name}`);
  svg.setAttribute('aria-hidden', 'true');
  svg.append(use);
  return svg;
}
function toast(text) {
  $('status').textContent = text;
  $('status').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('status').hidden = true, 2500);
}
function view(name) {
  document.querySelectorAll('.view').forEach(el => el.hidden = el.id !== name);
  document.querySelectorAll('[data-view]').forEach(el => {
    el.classList.toggle('active', el.dataset.view === (name === 'pairing' ? 'library' : name === 'plus-tools' ? 'catalog' : name));
    if (el.dataset.view === (name === 'pairing' ? 'library' : name === 'plus-tools' ? 'catalog' : name)) el.setAttribute('aria-current', 'page');
    else el.removeAttribute('aria-current');
  });
  if (name === 'pairing') renderEditor();
  if (name === 'library') renderLibrary();
  if (name === 'inspect' && !$('capture').hasChildNodes()) $('scan').click();
  window.scrollTo(0, 0);
}
function applyStyle(el, style) {
  for (const key of fields) if (key !== 'sample') el.style[key] = style[key];
}
function applyPreview(el, style) {
  applyStyle(el, style);
  loadFont(style.fontFamily, style.fontWeight, style.fontStyle === 'italic').catch(() => {});
  const computed = getComputedStyle(el);
  const size = parseFloat(computed.fontSize) || 24;
  const line = parseFloat(computed.lineHeight);
  const spacing = parseFloat(computed.letterSpacing);
  const scale = Math.min(1, 34 / size);
  el.style.fontSize = `${size * scale}px`;
  if (Number.isFinite(line)) el.style.lineHeight = `${line * scale}px`;
  if (Number.isFinite(spacing)) el.style.letterSpacing = `${spacing * scale}px`;
}
function remember() {
  chrome.storage.local.set({draft: structuredClone(draft)}).catch(() => toast('Storage full. Back up your library and remove a pairing.'));
}
async function request(message) {
  const result = await chrome.runtime.sendMessage(message);
  if (!result?.ok) throw new Error(result?.error || 'Reopen Font Pirate and try again.');
  return result;
}
async function action(fn) {
  try { await fn(); } catch (error) { toast(error.message || 'Reopen Font Pirate and try again.'); }
}
async function confirmChange(title, copy) {
  $('confirm-title').textContent = title;
  $('confirm-copy').textContent = copy;
  $('confirm').showModal();
  return new Promise(resolve => $('confirm').addEventListener('close', () => resolve($('confirm').returnValue === 'ok'), {once: true}));
}
function hasUnsavedChanges() {
  const saved = library.find(set => set.id === draft.id);
  return !saved || saved.name !== draft.name || JSON.stringify(saved.roles) !== JSON.stringify(draft.roles);
}
async function runOnPage(mode) {
  const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
  if (!tab?.id || (tab.url && !/^https?:/.test(tab.url))) throw new Error('Open a website to inspect its fonts.');
  try {
    await chrome.scripting.executeScript({target: {tabId: tab.id}, files: ['content.js']});
    return await chrome.scripting.executeScript({target: {tabId: tab.id}, func: m => globalThis.__typePilot[m](), args: [mode]});
  } catch {
    throw new Error('Click the Font Pirate toolbar icon on this page, then retry.');
  }
}
$('pick').onclick = () => action(async () => {
  await runOnPage('inspect');
  if (!isPanel) {
    const win = await chrome.windows.getCurrent();
    await chrome.sidePanel.open({windowId: win.id});
    window.close();
  }
});
$('scan').onclick = () => action(async () => {
  $('scan').disabled = true;
  try {
    const results = await runOnPage('scan');
    const result = results[0]?.result;
    if (!result) throw new Error('No text styles found.');
    renderScan(result);
  } finally { $('scan').disabled = false; }
});
$('panel').onclick = () => action(async () => {
  const win = await chrome.windows.getCurrent();
  await chrome.sidePanel.open({windowId: win.id});
  window.close();
});
$('settings').onclick = () => $('settings-dialog').showModal();
$('close-settings').onclick = () => $('settings-dialog').close();
$('theme').onchange = () => {
  document.body.dataset.theme = $('theme').value;
  chrome.storage.local.set({theme: $('theme').value}).catch(() => toast('Could not save appearance.'));
};
document.querySelectorAll('[data-view]').forEach(button => button.onclick = () => view(button.dataset.view));
document.querySelectorAll('[data-role]').forEach(button => button.onclick = () => { overview = false; role = button.dataset.role; renderEditor(); });
$('preview-pairing').onclick = () => { overview = true; renderEditor(); };
$('back-library').onclick = () => view('library');
$('create-pairing').onclick = () => $('new-set').click();
$('browse-role').onclick = () => {$('detail-role').value=role; view('catalog'); $('catalog-browser').hidden=false; $('font-detail').hidden=true; $('font-search').focus();};
function fontName(family) { const name = family.split(',')[0].replace(/^['"]|['"]$/g, '').trim(); return ['-apple-system','system-ui','BlinkMacSystemFont'].includes(name) ? 'System UI' : name; }
function shortValue(value) {
  return String(value).replace(/(-?\d+\.\d{2})\d+/g, '$1');
}
function renderCapture(style) {
  if (style.source) $('page-host').textContent = new URL(style.source).hostname;
  $('capture').hidden = false;
  $('welcome').hidden = true;
  $('page-styles').hidden = true;
  const card = element('div', 'capture-card');
  const back = element('button', 'text-button', '‹ Page fonts');
  back.onclick = () => { $('capture').hidden = true; $('page-styles').hidden = false; };
  const heading = element('div', 'capture-heading');
  heading.append(element('h2', '', fontName(style.fontFamily)), element('span', '', style.fontStyle === 'normal' ? style.fontWeight : style.fontStyle));
  const sample = element('p', 'sample', style.sample || 'Aa Bb Cc');
  const metrics = element('dl', 'metrics');
  for (const [label, value] of [['Size', style.fontSize], ['Weight', style.fontWeight], ['Line height', style.lineHeight], ['Spacing', style.letterSpacing]]) {
    const metric = element('div', 'metric');
    metric.append(element('dt', '', label), element('dd', '', shortValue(value)));
    metrics.append(metric);
  }
  const actions = element('div', 'capture-actions');
  const select = element('select'); select.setAttribute('aria-label', 'Use font for');
  ROLES.forEach(r => { const option = element('option', '', LABELS[r]); option.value = r; select.append(option); });
  select.value = role;
  const add = element('button', 'primary', 'Use in pairing');
  add.onclick = () => { role = select.value; draft.roles[role] = normalizeStyle(style); overview = true; remember(); view('pairing'); };
  const copy = element('button', 'text-button', 'Copy CSS');
  copy.onclick = () => action(async () => {
    const values = {fontFamily:'font-family',fontSize:'font-size',fontWeight:'font-weight',lineHeight:'line-height',letterSpacing:'letter-spacing',fontStyle:'font-style',textTransform:'text-transform'};
    await navigator.clipboard.writeText(Object.entries(values).map(([key,css]) => `${css}: ${style[key]};`).join('\n'));
    toast('CSS copied.');
  });
  actions.append(select, add);
  card.append(back, heading, sample, metrics, actions, copy);
  $('capture').replaceChildren(card);
  applyPreview(sample, style);
}
function renderScan(result) {
  $('capture').hidden = true;
  $('page-styles').hidden = false;
  $('welcome').hidden = true;
  const groups = new Map();
  for (const style of result.styles) {
    if (!groups.has(style.fontFamily)) groups.set(style.fontFamily, []);
    groups.get(style.fontFamily).push(style);
  }
  $('font-total').textContent = `${groups.size} font${groups.size === 1 ? '' : 's'}`;
  $('scan-count').textContent = result.limited ? 'Scan limit reached' : '';
  const list = $('scan-results'); list.replaceChildren();
  if (!groups.size) { list.append(element('p', 'empty', 'No fonts found. Try picking text on the page.')); return; }
  for (const [family, styles] of groups) {
    const group = element('details', 'font-group');
    const summary = element('summary', 'font-row');
    const name = element('span', 'font-name', fontName(family));
    name.style.fontFamily = family;
    const meta = element('span', 'font-meta', `${styles.length} style${styles.length === 1 ? '' : 's'}`);
    summary.append(name, meta, element('span', 'chevron', '›'));
    const list = element('div', 'style-list');
    for (const style of styles) {
      const button = element('button', 'style-row');
      button.append(element('span', '', `${shortValue(style.fontSize)} · ${style.fontWeight}${style.fontStyle === 'normal' ? '' : ' '+style.fontStyle}`), element('span', 'style-sample', style.sample.slice(0,55)));
      button.title = 'Inspect this style';
      button.onclick = () => renderCapture(normalizeStyle(style));
      list.append(button);
    }
    group.append(summary, list); $('scan-results').append(group);
  }
}
function renderSpecimen() {
  const specimen = $('pairing-specimen'); specimen.replaceChildren();
  for (const key of ROLES) {
    const style = draft.roles[key]; if (!style) continue;
    const button = element('button', `specimen-${key}`, style.sample || LABELS[key]);
    button.title = `Edit ${LABELS[key].toLowerCase()}`;
    button.setAttribute('aria-label', `Edit ${LABELS[key]}: ${style.sample}`);
    applyStyle(button, style);
    specimen.append(button);
    applyPreview(button, style);
    button.onclick = () => { role = key; overview = false; renderEditor(); };
  }
}
function renderEditor() {
  $('pairing-specimen').hidden = !overview;
  $('role-editor').hidden = overview;
  $('preview-pairing').classList.toggle('active', overview);
  $('preview-pairing').setAttribute('aria-pressed', String(overview));
  renderSpecimen();
  $('set-name').value = draft.name;
  if (!draft.roles[role]) draft.roles[role] = normalizeStyle();
  const style = draft.roles[role];
  // Variable fonts can use weights between the usual 100-step options.
  const weight = $('fontWeight');
  weight.querySelectorAll('[data-custom]').forEach(option => option.remove());
  if (![...weight.options].some(option => option.value === style.fontWeight)) {
    const option = element('option', '', style.fontWeight);
    option.dataset.custom = 'true';
    weight.append(option);
  }
  fields.forEach(key => $(key).value = style[key]);
  document.querySelectorAll('[data-role]').forEach(button => {
    button.classList.toggle('active', !overview && button.dataset.role === role);
    button.setAttribute('aria-pressed', String(!overview && button.dataset.role === role));
  });
  $('source').textContent = style.source || '';
  $('source').hidden = !style.source;
  renderPreview();
}
function renderPreview() {
  const style = draft.roles[role];
  applyPreview($('sample'), style);
  $('preview-label').textContent = `${LABELS[role]} preview`;
}
fields.forEach(key => $(key).addEventListener('change', () => {
  const raw = {...draft.roles[role]};
  fields.forEach(field => raw[field] = $(field).value);
  const normalized = normalizeStyle(raw);
  draft.roles[role] = normalized;
  fields.forEach(field => $(field).value = normalized[field]);
  if (normalized[key] !== raw[key]) toast('Enter a CSS value, such as 24px, 1.5 or normal.');
  remember();
  renderPreview();
}));
$('sample').addEventListener('input', () => { draft.roles[role].sample = $('sample').value; remember(); });
$('set-name').addEventListener('input', () => { draft.name = $('set-name').value; remember(); });
$('new-set').onclick = () => action(async () => {
  if (!hasUnsavedChanges() || await confirmChange('Start a new pairing?', 'Your unsaved draft will be replaced.')) {
    draft = newSet(); role = 'heading'; overview = true; remember(); view('pairing');
  }
});
$('save').onclick = () => action(async () => {
  const result = await request({type: 'SAVE_SET', set: draft});
  draft = result.set; remember(); $('set-name').value = draft.name; toast('Pairing saved.');
});
$('copy-css').onclick = () => action(async () => { await navigator.clipboard.writeText(exportCSS(draft)); toast('CSS copied.'); });
function download(text, name, type) {
  const url = URL.createObjectURL(new Blob([text], {type}));
  const a = element('a');
  a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  document.querySelectorAll('.export-menu').forEach(menu => menu.open = false);
}
$('export-css').onclick = () => download(exportCSS(draft), `${fileName(draft.name)}.css`, 'text/css');
$('export-json').onclick = () => download(exportJSON([draft]), `${fileName(draft.name)}.json`, 'application/json');
$('backup').onclick = () => {
  if (!library.length) return toast('Save a pairing first.');
  download(exportJSON(library), 'font-pirate-library.json', 'application/json');
};
$('import').onclick = () => $('import-file').click();
$('import-file').onchange = () => action(async () => {
  const file = $('import-file').files[0]; $('import-file').value = '';
  if (!file) return;
  if (file.size > 2_000_000) throw new Error('Choose a JSON file smaller than 2 MB.');
  const result = await request({type: 'IMPORT_SETS', text: await file.text()});
  toast(`Imported ${result.count} pairing${result.count === 1 ? '' : 's'}.`);
});
$('search').oninput = renderLibrary;
function renderLibrary() {
  $('count').textContent = library.length;
  const list = $('library-list'); list.replaceChildren();
  const query = $('search').value.toLowerCase();
  const matches = library.filter(set => (set.name + ' ' + Object.values(set.roles).map(style => style.fontFamily).join(' ')).toLowerCase().includes(query));
  if (!matches.length) {
    list.append(element('p', 'empty', library.length ? 'No matching pairings.' : 'Your saved pairings will appear here.'));
    return;
  }
  for (const set of matches) {
    const card = element('article', 'library-card');
    card.append(element('h2', '', set.name), element('p', '', [...new Set(Object.values(set.roles).map(style => fontName(style.fontFamily)))].join(' + ')));
    const sample = element('div', 'library-sample', set.roles.heading?.sample || set.name);
    sample.style.fontFamily = set.roles.heading?.fontFamily || 'system-ui'; card.append(sample);
    const actions = element('div', 'library-actions');
    const open = element('button', 'secondary', 'Open pairing');
    open.onclick = () => action(async () => {
      if (!hasUnsavedChanges() || await confirmChange('Open this pairing?', 'Your unsaved draft will be replaced.')) {
        draft = structuredClone(set); overview = true; remember(); view('pairing');
      }
    });
    const more = element('details'); const summary = element('summary', '', '⋯');
    summary.setAttribute('aria-label', `Options for ${set.name}`);
    const menu = element('div', 'menu-items');
    const duplicate = element('button', '', 'Duplicate');
    duplicate.onclick = () => action(async () => { await request({type: 'SAVE_SET', set: {...set, id: crypto.randomUUID(), name: set.name + ' copy'}}); toast('Pairing duplicated.'); });
    const remove = element('button', 'delete', 'Delete');
    remove.onclick = () => action(async () => {
      more.open = false;
      if (await confirmChange('Delete pairing?', `“${set.name}” will be removed from this device.`)) {
        await request({type: 'DELETE_SET', id: set.id}); toast('Pairing deleted.');
      }
    });
    menu.append(duplicate, remove); more.append(summary, menu); actions.append(open, more); card.append(actions); list.append(card);
  }
}
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes.inspectorError?.newValue) toast(changes.inspectorError.newValue);
  if (changes.lastCapture?.newValue) { renderCapture(changes.lastCapture.newValue); view('inspect'); }
  if (changes.library) { library = changes.library.newValue || []; renderLibrary(); }
  if (changes.draft?.newValue) {
    draft = changes.draft.newValue;
    if (!$('pairing').hidden && !document.activeElement?.matches('input,textarea,select')) renderEditor();
  }
});
(async () => {
  try {
    const data = await chrome.storage.local.get(['draft', 'library', 'lastCapture', 'theme']);
    if (data.draft?.roles) draft = data.draft;
    library = data.library || [];
    document.body.dataset.theme = data.theme || 'light';
    $('theme').value = document.body.dataset.theme;
    renderLibrary();
    const [tab] = await chrome.tabs.query({active:true,currentWindow:true});
    if (tab?.url && /^https?:/.test(tab.url)) $('page-host').textContent = new URL(tab.url).hostname;
    try {
      const results = await runOnPage('scan');
      if (results[0]?.result) renderScan(results[0].result);
      if (data.lastCapture?.source === tab?.url?.split(/[?#]/)[0] && Date.now()-data.lastCapture.capturedAt < 15000) { renderCapture(data.lastCapture); view('inspect'); }
    } catch (error) {
      $('welcome').querySelector('p').textContent = error.message;
    }
  } catch { toast('Storage unavailable. Reopen Font Pirate.'); }
})();

// Google Fonts browser: all families, with small batches and lazy font previews.
let favorites = new Set(), favoriteOnly = false, matches = [], shown = 0, selectedFont;
const fontObserver = new IntersectionObserver(entries => {
  for (const entry of entries) if (entry.isIntersecting) {
    const row = entry.target; fontObserver.unobserve(row);
    loadFont(row.dataset.family).then(() => row.classList.add('font-loaded')).catch(() => {row.title = 'Preview unavailable — check your connection'; row.classList.add('font-unavailable');});
  }
}, {root: $('font-list'), rootMargin: '50px'});
function saveFavorites() {chrome.storage.local.set({fontFavorites:[...favorites]}).catch(() => toast('Could not save favorites.'));}
function favoriteButton(name) {
  const button = element('button', 'icon font-star', favorites.has(name) ? '★' : '☆');
  button.setAttribute('aria-label', `Favorite ${name}`); button.setAttribute('aria-pressed', String(favorites.has(name)));
  button.onclick = () => {favorites.has(name) ? favorites.delete(name) : favorites.add(name); saveFavorites(); button.textContent=favorites.has(name)?'★':'☆'; button.setAttribute('aria-pressed',String(favorites.has(name))); if(favoriteOnly) renderFonts();};
  return button;
}
function appendFonts() {
  for (const font of matches.slice(shown,shown+30)) {
    const row = element('div','catalog-row'); row.dataset.family=font.family;
    const choose = element('button','catalog-font');
    choose.setAttribute('aria-label', `Preview ${font.family}`);
    const sample=element('span','catalog-font-sample',$('catalog-sample').value || font.family); sample.style.fontFamily=`"${font.family}"`;
    choose.append(sample);
    if ($('catalog-sample').value) choose.append(element('span','catalog-family-name',font.family));
    choose.onclick=()=>openFont(font);row.append(choose,favoriteButton(font.family));$('font-rows').append(row);fontObserver.observe(row);
  }
  shown = Math.min(shown+30,matches.length);
  $('font-sentinel').hidden = shown >= matches.length;
}
function renderFonts() {
  fontObserver.disconnect();
  matches=filterFonts({query:$('font-search').value,category:$('font-category').value,sort:$('font-sort').value,favorites:favoriteOnly?favorites:undefined});shown=0;
  $('font-rows').replaceChildren();$('font-list').scrollTop=0;
  $('catalog-count').textContent=`${matches.length.toLocaleString()} fonts`;
  if(!matches.length) $('font-rows').append(element('p','empty',favoriteOnly?'Star a font to save it here.':'No matching fonts.'));
  appendFonts();
}
$('font-list').onscroll=()=>{const el=$('font-list'); if(el.scrollTop+el.clientHeight>el.scrollHeight-180 && shown<matches.length)appendFonts();};
$('font-list').onkeydown=event=>{if(event.key==='End'){while(shown<matches.length)appendFonts();}};
$('font-search').oninput=renderFonts;$('font-category').onchange=renderFonts;$('font-sort').onchange=renderFonts;
$('font-favorites').onclick=()=>{favoriteOnly=!favoriteOnly;$('font-favorites').setAttribute('aria-pressed',String(favoriteOnly));renderFonts();};
$('custom-preview').onclick=()=>{$('catalog-sample').hidden=!$('catalog-sample').hidden;if(!$('catalog-sample').hidden)$('catalog-sample').focus();};
$('catalog-sample').oninput=renderFonts;
$('back-fonts').onclick=()=>{$('catalog-browser').hidden=false;$('font-detail').hidden=true;};
function detailStyle() {const variant=$('detail-weight').value;return normalizeStyle({fontFamily:`"${selectedFont.family}"`,fontSize:`${$('detail-size').value}px`,fontWeight:String(parseInt(variant)),fontStyle:variant.endsWith('i')?'italic':'normal',lineHeight:'1.3',sample:$('detail-sample').value});}
function updateFontDetail() {
  const style=detailStyle();applyStyle($('detail-sample'),style);$('detail-size-value').textContent=$('detail-size').value;
  const family=selectedFont.family;$('font-load-status').hidden=true;
  loadFont(family,style.fontWeight,style.fontStyle==='italic').catch(error=>{if(selectedFont.family===family){$('font-load-status').hidden=false;$('font-load-status').textContent=error.message;}});
}
function openFont(font) {
  selectedFont=font;$('catalog-browser').hidden=true;$('font-detail').hidden=false;$('detail-name').textContent=font.family;
  $('detail-sample').value=$('catalog-sample').value||'The quick brown fox jumps over the lazy dog.';
  $('detail-weight').replaceChildren();
  for(const w of font.weights){const option=element('option','',`${parseInt(w)}${w.endsWith('i')?' Italic':''}`);option.value=w;$('detail-weight').append(option);}
  $('detail-weight').value=font.weights.includes('400')?'400':font.weights[0];
  $('detail-favorite').textContent=favorites.has(font.family)?'★':'☆';$('detail-favorite').setAttribute('aria-pressed',String(favorites.has(font.family)));
  $('google-font-link').href=`https://fonts.google.com/specimen/${encodeURIComponent(font.family)}`;updateFontDetail();
}
$('detail-favorite').onclick=()=>{const name=selectedFont.family;favorites.has(name)?favorites.delete(name):favorites.add(name);saveFavorites();$('detail-favorite').textContent=favorites.has(name)?'★':'☆';$('detail-favorite').setAttribute('aria-pressed',String(favorites.has(name)));renderFonts();};
$('detail-weight').onchange=updateFontDetail;$('detail-size').oninput=updateFontDetail;
$('use-font').onclick=()=>{role=$('detail-role').value;const chosen=detailStyle();draft.roles[role]={...draft.roles[role],fontFamily:chosen.fontFamily,fontWeight:chosen.fontWeight,fontStyle:chosen.fontStyle};overview=true;remember();view('pairing');};
$('copy-font').onclick=()=>action(async()=>{const s=detailStyle();await navigator.clipboard.writeText(`@import url('${fontCSSURLForSelected()}');\n\nfont-family: ${s.fontFamily};\nfont-weight: ${s.fontWeight};\nfont-style: ${s.fontStyle};`);toast('CSS copied.');});
function fontCSSURLForSelected(){const w=$('detail-weight').value;return `https://fonts.googleapis.com/css2?family=${encodeURIComponent(selectedFont.family)}:${w.endsWith('i')?'ital,wght@1,':'wght@'}${parseInt(w)}&display=swap`;}
chrome.storage.local.get('fontFavorites').then(data=>{favorites=new Set((data.fontFavorites||[]).filter(name=>fonts.some(f=>f.family===name)));renderFonts();});

setupPlus({$,fonts,loadFont,view,openFont,request,toast,getSelectedFont:()=>selectedFont});
