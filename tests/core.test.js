import test from 'node:test';
import assert from 'node:assert/strict';
import {newSet,normalizeStyle,normalizeSet,exportCSS,exportJSON,importSets,safeSource,fileName} from '../core.js';
test('CSS export includes every role and preserves inspected typography',()=>{
 const s=newSet();s.roles.heading=normalizeStyle({fontFamily:'"Editorial New", Georgia, serif',fontSize:'62px',fontWeight:'650',lineHeight:'68.2px',letterSpacing:'-2.5px'});
 const css=exportCSS(s);assert.match(css,/--type-heading-font-family: "Editorial New", Georgia, serif;/);assert.match(css,/--type-heading-font-weight: 650;/);assert.match(css,/--type-heading-letter-spacing: -2.5px;/);for(const role of ['heading','subheading','body','caption'])assert.ok(css.includes(`.type-${role} {`));
});
test('JSON backup round trip keeps roles and generates fresh import identities',()=>{
 const original=newSet();original.name='Editorial';const [copy]=importSets(exportJSON([original]));assert.equal(copy.name,original.name);assert.deepEqual(copy.roles,original.roles);assert.notEqual(copy.id,original.id);
});
test('imports reject unsupported versions, malformed content and oversized payloads',()=>{
 for(const s of ['{','{}','{"version":2,"sets":[]}','{"version":1,"sets":[null]}','{"version":1,"sets":[{"roles":{}}]}',' '.repeat(2000001)])assert.throws(()=>importSets(s));
 assert.throws(()=>importSets(JSON.stringify({version:1,sets:Array(201).fill(newSet())})));
});
test('untrusted imported CSS cannot escape a declaration or trigger a remote request',()=>{
 for(const fontFamily of ['serif; } body { display:none','url(https://bad.test/font)','Arial/*','Arial\\3b color:red','<script>','@import "x"']){
 const s=newSet();s.roles.heading={fontFamily};const css=exportCSS(s);assert.ok(!css.includes(fontFamily));assert.match(css,/--type-heading-font-family: system-ui, sans-serif;/);
 }
});
test('sensitive query strings and fragments are stripped from source URLs',()=>{
 assert.equal(safeSource('https://example.com/article?token=secret#private'),'https://example.com/article');assert.equal(safeSource('javascript:alert(1)'),'');assert.equal(safeSource('file:///Users/person/private'),'');assert.equal(safeSource('not a URL'),'');
});
test('invalid dimensions and roles are normalized without prototype pollution',()=>{
 const style=normalizeStyle({fontSize:'calc(1px);color:red',fontWeight:'500; x',letterSpacing:'-0.03em',lineHeight:'normal'});assert.equal(style.fontSize,'16px');assert.equal(style.fontWeight,'400');assert.equal(style.letterSpacing,'-0.03em');assert.equal(style.lineHeight,'normal');
 const set=normalizeSet(JSON.parse('{"roles":{"heading":{},"__proto__":{"polluted":true}}}'));assert.deepEqual(Object.keys(set.roles),['heading']);assert.equal({}.polluted,undefined);
});
test('filenames cannot escape download directory',()=>{assert.equal(fileName('../../Private/My Type'),'private-my-type');assert.equal(fileName(''),'font-pirate');});
