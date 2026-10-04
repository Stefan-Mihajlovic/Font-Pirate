import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const data=JSON.parse(await readFile(new URL('../fonts.json',import.meta.url),'utf8'));
globalThis.chrome={runtime:{getURL:path=>path}};
globalThis.fetch=async()=>({json:async()=>data});
const {filterFonts,fontCSSURL,familyOf,fonts}=await import('../catalog.js');
test('catalog covers all bundled families, including the final alphabetic entry',()=>{
 assert.ok(fonts.length>=1950);assert.equal(new Set(fonts.map(f=>f.family)).size,fonts.length);
 const sorted=filterFonts({sort:'alpha'});assert.equal(sorted.length,fonts.length);
 const last=sorted.at(-1);assert.ok(filterFonts({query:last.family}).some(f=>f.family===last.family));
});
test('search, category and favorites combine without discarding families',()=>{
 const found=filterFonts({query:' instrument ',category:'Serif',favorites:new Set(['Instrument Serif'])});
 assert.equal(found.length,1);assert.equal(found[0].family,'Instrument Serif');
 assert.equal(filterFonts({query:'nonexistent pirate typeface 123'}).length,0);
});
test('CSS requests select supported weights and never send preview text',()=>{
 const font={family:'A & B',weights:['400','700','400i']};
 assert.match(fontCSSURL(font,'600'),/wght@700/);
 assert.match(fontCSSURL(font,'400',true),/ital,wght@1,400/);
 assert.match(fontCSSURL(font),/A%20%26%20B/);assert.ok(!fontCSSURL(font).includes('text='));
 assert.equal(familyOf('"Instrument Serif", serif'),'Instrument Serif');
});
