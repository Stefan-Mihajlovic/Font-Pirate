import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyEntitlement} from '../plus-license.js';
import {glyphDistance,rankShapes} from '../font-matching.js';
const enc=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
test('Plus entitlement requires the right signature, product, installation and expiry',async()=>{
 const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']),jwk=await crypto.subtle.exportKey('jwk',pair.publicKey),id='fixture-installation';
 const installation=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(id))).toString('hex');
 async function token(changes={}){const header=enc({alg:'ES256',typ:'FPP-ENT'}),payload=enc({product:'font_pirate_plus',plan:'lifetime',exp:Math.floor(Date.now()/1000)+1000,installation,...changes}),signature=await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},pair.privateKey,new TextEncoder().encode(header+'.'+payload));return{token:header+'.'+payload+'.'+Buffer.from(signature).toString('base64url'),expiresAt:Date.now()/1000+1000};}
 const entitlement=await token();assert(await verifyEntitlement(entitlement,id,jwk));assert(!await verifyEntitlement(entitlement,'other-installation',jwk));assert(!await verifyEntitlement(await token({product:'palette_pilot_pro'}),id,jwk));assert(!await verifyEntitlement(await token({exp:1}),id,jwk));assert(!await verifyEntitlement(await token({exp:undefined}),id,jwk));assert(!await verifyEntitlement({...entitlement,token:entitlement.token.slice(0,-10)+'xxxxxxxxxx'},id,jwk));
});
test('shape ranking favors matching silhouettes and proportions, excluding the source',()=>{const a=[50,'f0'],b=[100,'0f'];assert.equal(glyphDistance(a,a),0);const index={chars:'a',fonts:{Same:{glyphs:[a]},Other:{glyphs:[b]}}};assert.equal(rankShapes([a],'a',index)[0].family,'Same');assert.equal(rankShapes([a],'a',index,'Same')[0].family,'Other');});
