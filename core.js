export const ROLES = ['heading', 'subheading', 'body', 'caption'];
export const LABELS = {heading:'Heading', subheading:'Subheading', body:'Body', caption:'Caption'};
export function safeSource(value) {
  try { const u = new URL(value); return /^https?:$/.test(u.protocol) ? u.origin + u.pathname : ''; } catch { return ''; }
}
const clean = (v, max = 240) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
function cssValue(value, fallback) {
  const s = clean(value);
  return s && !/[;{}<>\\]/.test(s) && !/\/\*|\*\/|url\s*\(|@/i.test(s) ? s : fallback;
}
export function normalizeStyle(value = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) value = {};
  const dimension = (v, fallback, negative = false) => {
    const s = clean(v, 30);
    return new RegExp(`^${negative ? '-?' : ''}\\d+(\\.\\d+)?(px|rem|em|%)$`).test(s) ? s : fallback;
  };
  return {
    fontFamily: cssValue(value.fontFamily, 'system-ui, sans-serif'),
    fontSize: dimension(value.fontSize, '16px'),
    fontWeight: /^(normal|bold|[1-9]\d{0,2}|1000)$/.test(String(value.fontWeight)) ? String(value.fontWeight) : '400',
    fontStyle: /^(normal|italic|oblique)$/.test(value.fontStyle) ? value.fontStyle : 'normal',
    lineHeight: value.lineHeight === 'normal' || /^(\d+(\.\d+)?)(px|rem|em|%)?$/.test(String(value.lineHeight)) ? String(value.lineHeight) : '1.5',
    letterSpacing: value.letterSpacing === 'normal' ? 'normal' : dimension(value.letterSpacing, '0px', true),
    textTransform: /^(none|uppercase|lowercase|capitalize)$/.test(value.textTransform) ? value.textTransform : 'none',
    sample: clean(value.sample, 500), source: safeSource(value.source),
    tag: clean(value.tag, 30)
  };
}
export function newSet() {
  return {id: crypto.randomUUID(), name: 'New pairing', updatedAt: new Date().toISOString(), roles: {
    heading: normalizeStyle({fontFamily:'Georgia, serif', fontSize:'48px', lineHeight:'1.1', letterSpacing:'-1.5px', sample:'A study in type.'}),
    subheading: normalizeStyle({fontFamily:'system-ui, sans-serif', fontSize:'24px', fontWeight:'500', lineHeight:'1.3', sample:'A clear point of view.'}),
    body: normalizeStyle({fontFamily:'system-ui, sans-serif', fontSize:'16px', lineHeight:'1.7', sample:'Good typography gives every word its place.'}),
    caption: normalizeStyle({fontFamily:'system-ui, sans-serif', fontSize:'11px', fontWeight:'600', letterSpacing:'1.5px', textTransform:'uppercase', sample:'Notes and details'})
  }};
}
export function normalizeSet(value) {
  if (!value || typeof value !== 'object' || !value.roles || !ROLES.some(r => value.roles[r])) throw new Error('This file does not contain a typography pairing.');
  return {id: crypto.randomUUID(), name: clean(value.name, 80) || 'Imported pairing', updatedAt: new Date().toISOString(), roles: Object.fromEntries(ROLES.filter(r => value.roles[r]).map(r => [r, normalizeStyle(value.roles[r])]))};
}
export function importSets(text) {
  if (text.length > 2_000_000) throw new Error('Choose a JSON file smaller than 2 MB.');
  const data = JSON.parse(text);
  if (data.version !== 1 || !Array.isArray(data.sets) || data.sets.length > 200 || !data.sets.length) throw new Error('Choose a Type Pilot v1 backup with 1–200 pairings.');
  return data.sets.map(normalizeSet);
}
export function exportJSON(sets) { return JSON.stringify({app:'Type Pilot',version:1,sets}, null, 2); }
export function exportCSS(set) {
  const lines = ['/* Typography pairing · Type Pilot */', ':root {'];
  const fields = {fontFamily:'font-family',fontSize:'font-size',fontWeight:'font-weight',fontStyle:'font-style',lineHeight:'line-height',letterSpacing:'letter-spacing',textTransform:'text-transform'};
  for (const role of ROLES) {
    if (!set.roles[role]) continue;
    const style = normalizeStyle(set.roles[role]);
    for (const [key, css] of Object.entries(fields)) lines.push(`  --type-${role}-${css}: ${style[key]};`);
  }
  lines.push('}', '');
  for (const role of ROLES) {
    if (!set.roles[role]) continue;
    lines.push(`.type-${role} {`);
    for (const css of Object.values(fields)) lines.push(`  ${css}: var(--type-${role}-${css});`);
    lines.push('}', '');
  }
  return lines.join('\n');
}
export function fileName(name) { return (String(name).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60) || 'type-pilot'); }
