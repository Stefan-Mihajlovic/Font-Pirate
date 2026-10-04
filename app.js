import {ROLES, LABELS, newSet, normalizeStyle, exportCSS, exportJSON, fileName} from './core.js';

const $ = id => document.getElementById(id);
const isPanel = new URLSearchParams(location.search).get('surface') === 'sidepanel';
if (isPanel) {
  document.body.classList.add('sidepanel');
  $('panel').hidden = true;
}
let draft = newSet(), role = 'heading', library = [], toastTimer;
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
    el.classList.toggle('active', el.dataset.view === name);
    if (el.dataset.view === name) el.setAttribute('aria-current', 'page');
    else el.removeAttribute('aria-current');
  });
  if (name === 'pairing') renderEditor();
  if (name === 'library') renderLibrary();
  window.scrollTo(0, 0);
}
function applyStyle(el, style) {
  for (const key of fields) if (key !== 'sample') el.style[key] = style[key];
}
function applyPreview(el, style) {
  applyStyle(el, style);
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
  if (!result?.ok) throw new Error(result?.error || 'Reopen Type Pilot and try again.');
  return result;
}
async function action(fn) {
  try { await fn(); } catch (error) { toast(error.message || 'Reopen Type Pilot and try again.'); }
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
    throw new Error('Click the Type Pilot toolbar icon on this page, then retry.');
  }
}
$('pick').onclick = () => action(async () => {
  await runOnPage('inspect');
  if (!isPanel) window.close();
  else toast('Click text to capture. Esc to cancel.');
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
document.querySelectorAll('[data-role]').forEach(button => button.onclick = () => { role = button.dataset.role; renderEditor(); });
function fontName(family) { return family.split(',')[0].replace(/^['"]|['"]$/g, '').trim(); }
function shortValue(value) {
  return String(value).replace(/(-?\d+\.\d{2})\d+/g, '$1');
}
function renderCapture(style) {
  $('capture').hidden = false;
  $('welcome').hidden = true;
  const card = element('div', 'capture-card');
  const heading = element('div', 'capture-heading');
  heading.append(element('h2', '', fontName(style.fontFamily)), element('span', '', style.fontStyle === 'normal' ? 'Regular' : style.fontStyle));
  const sample = element('p', 'sample', style.sample || 'Aa Bb Cc');

  const metrics = element('dl', 'metrics');
  for (const [label, value] of [['Size', style.fontSize], ['Weight', style.fontWeight], ['Line height', style.lineHeight], ['Spacing', style.letterSpacing], ['Style', style.fontStyle], ['Case', style.textTransform]]) {
    const metric = element('div', 'metric');
    metric.append(element('dt', '', label), element('dd', '', shortValue(value)));
    metrics.append(metric);
  }
  const actions = element('div', 'capture-actions');
  const select = element('select');
  select.setAttribute('aria-label', 'Typography role');
  ROLES.forEach(r => {
    const option = element('option', '', LABELS[r]);
    option.value = r;
    select.append(option);
  });
  select.value = role;
  const add = element('button', 'primary', 'Add to pairing');
  add.onclick = () => {
    role = select.value;
    draft.roles[role] = normalizeStyle(style);
    remember();
    view('pairing');
  };
  actions.append(select, add);
  card.append(heading, sample, metrics, actions);
  if (style.source) {
    const source = element('div', 'source-row');
    source.title = style.source;
    source.append(element('span', '', new URL(style.source).hostname));
    card.append(source);
  }
  $('capture').replaceChildren(card);
  applyPreview(sample, style);
}
function renderScan(result) {
  $('page-styles').hidden = false;
  $('welcome').hidden = true;
  $('scan-count').textContent = `${result.styles.length}${result.limited ? ' · scan limit reached' : ''}`;
  const list = $('scan-results');
  list.replaceChildren();
  if (!result.styles.length) {
    list.append(element('p', 'empty', 'No text styles found on this page.'));
    return;
  }
  for (const style of result.styles) {
    const card = element('div', 'scan-card');
    const text = element('div', 'scan-text');
    text.append(element('h3', '', fontName(style.fontFamily)), element('p', '', `${shortValue(style.fontSize)} / ${style.fontWeight} / ${shortValue(style.lineHeight)}`));
    const choose = element('button', 'icon');
    choose.setAttribute('aria-label', `Select ${fontName(style.fontFamily)}, ${shortValue(style.fontSize)}`);
    choose.title = 'Inspect style';
    choose.append(icon('plus'));
    choose.onclick = () => { renderCapture(normalizeStyle(style)); window.scrollTo(0, 0); };
    card.append(text, choose);
    list.append(card);
  }
}
function renderEditor() {
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
    button.classList.toggle('active', button.dataset.role === role);
    button.setAttribute('aria-pressed', String(button.dataset.role === role));
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
    draft = newSet(); role = 'heading'; remember(); renderEditor();
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
  download(exportJSON(library), 'type-pilot-library.json', 'application/json');
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
        draft = structuredClone(set); remember(); view('pairing');
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
    document.body.dataset.theme = data.theme || 'dark';
    $('theme').value = document.body.dataset.theme;
    if (data.lastCapture) renderCapture(data.lastCapture);
    renderLibrary();
  } catch { toast('Storage unavailable. Reopen Type Pilot.'); }
})();
