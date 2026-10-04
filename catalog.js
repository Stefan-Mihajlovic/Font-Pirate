// Catalog is bundled. Only requested font files are fetched from Google Fonts.
export const catalog = await fetch(chrome.runtime.getURL('fonts.json')).then(r => r.json());
export const fonts = catalog.fonts;
export function filterFonts({query = '', category = '', favorites, sort = 'popular'} = {}) {
  const q = query.trim().toLocaleLowerCase();
  return fonts.filter(f => (!q || f.family.toLocaleLowerCase().includes(q)) && (!category || f.category === category) && (!favorites || favorites.has(f.family)))
    .sort(sort === 'alpha' ? (a,b) => a.family.localeCompare(b.family) : (a,b) => a.popularity - b.popularity);
}
export function familyOf(css) { return css.split(',')[0].trim().replace(/^['"]|['"]$/g, ''); }
export function fontCSSURL(font, weight = '400', italic = false) {
  const variants = font.weights.filter(w => w.endsWith('i') === italic);
  const available = variants.length ? variants : font.weights;
  const wanted = parseInt(weight) || 400;
  const variant = available.reduce((best,w) => Math.abs(parseInt(w)-wanted) < Math.abs(parseInt(best)-wanted) ? w : best, available[0]);
  return `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font.family)}:${variant.endsWith('i') ? 'ital,wght@1,' : 'wght@'}${parseInt(variant)}&display=swap`;
}
const pending = new Map();
export function loadFont(family, weight = '400', italic = false) {
  const font = fonts.find(f => f.family === familyOf(family));
  if (!font) return Promise.resolve(false);
  const url = fontCSSURL(font, weight, italic);
  if (pending.has(url)) return pending.get(url);
  const promise = new Promise((resolve,reject) => {
    const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = url; link.referrerPolicy = 'no-referrer';
    const timer = setTimeout(() => {link.remove(); reject(new Error('Font preview unavailable. Check your connection.'));},12000);
    link.onerror = () => {clearTimeout(timer);link.remove();reject(new Error('Font preview unavailable. Check your connection.'));};
    link.onload = async () => {
      try {
        const faces = await document.fonts.load(`${italic ? 'italic ' : ''}${parseInt(weight)||400} 28px "${font.family}"`);
        clearTimeout(timer);
        if (!faces.length) throw new Error('Font preview unavailable.');
        resolve(true);
      } catch(e) {clearTimeout(timer);link.remove();reject(e);}
    };
    document.head.append(link);
  }).catch(e => {pending.delete(url);throw e;});
  pending.set(url,promise); return promise;
}
