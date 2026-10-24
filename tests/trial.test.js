import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
const jwk=await crypto.subtle.exportKey('jwk',pair.publicKey);
// Substitute a disposable key in memory; production sources never accept key overrides.
const source=(await readFile(new URL('../plus-license.js',import.meta.url),'utf8')).replace(/const JWK = .*?;/,`const JWK = ${JSON.stringify(jwk)};`);
const licensing=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const stored={},requests=[];let status='eligible',expiresAt,offline=false,invalid=false,http=200;
globalThis.chrome={runtime:{getManifest:()=>({version:'2.2.0'})},storage:{local:{
 async get(keys){return Object.fromEntries(keys.map(k=>[k,structuredClone(stored[k])]))},
 async set(value){await new Promise(r=>setTimeout(r,1));Object.assign(stored,structuredClone(value))},
 async remove(keys){for(const k of [].concat(keys))delete stored[k]}
}}};
const now=()=>Math.floor(Date.now()/1000);
async function sign(id,{plan='trial',product='font_pirate_plus',exp=expiresAt,startedAt=now()-1,typ=plan==='trial'?'EXT-TRIAL':'FPP-ENT'}={}){
 const h=Buffer.from(JSON.stringify({alg:'ES256',typ})).toString('base64url');
 const p=Buffer.from(JSON.stringify({product,plan,exp,startedAt,installation:Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(id))).toString('hex')})).toString('base64url');
 const s=Buffer.from(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},pair.privateKey,new TextEncoder().encode(h+'.'+p))).toString('base64url');
 return {token:`${h}.${p}.${s}`,expiresAt:exp};
}
globalThis.fetch=async(url,options)=>{
 const body=JSON.parse(options.body),path=new URL(url).pathname;requests.push({path,body});
 if(offline)throw new Error('Offline');
 if(http!==200)return new Response(JSON.stringify({error:{message:'Not authorized'}}),{status:http});
 if(path.includes('/license/'))return Response.json({entitlement:await sign(body.installationId,{plan:'lifetime',exp:now()+86400})});
 if(path.endsWith('/start')&&status==='eligible'){status='active';expiresAt=now()+7*86400;}
 if(path.endsWith('/cancel'))status='cancelled';
 return Response.json({trial:{product:'font_pirate_plus',days:7,status,startedAt:now()-1,expiresAt},entitlement:status==='active'?await sign(body.installationId,{product:invalid?'wrong-product':'font_pirate_plus'}):null});
};
test('trial signatures bind product, plan, type, installation and deadline',async()=>{
 expiresAt=now()+100;const entitlement=await sign('one');
 assert.equal((await licensing.verifyTrialEntitlement(entitlement,'one')).plan,'trial');
 assert.equal(await licensing.verifyTrialEntitlement(entitlement,'two'),null);
 for(const changes of [{product:'palette_pilot_pro'},{plan:'lifetime'},{typ:'FPP-ENT'},{exp:now()-1},{startedAt:expiresAt}])assert.equal(await licensing.verifyTrialEntitlement(await sign('one',changes),'one'),null);
 assert.equal(await licensing.verifyEntitlement(entitlement,'one'),false);
 assert.equal(await licensing.verifyTrialEntitlement({...entitlement,expiresAt:1},'one'),null);
 assert.equal(await licensing.verifyTrialEntitlement({...entitlement,token:entitlement.token.slice(0,-12)+'xxxxxxxxxxxx'},'one'),null);
 assert.equal((await licensing.verifyTrialEntitlement({...entitlement,expiresAt:now()+10},'one')).exp,now()+10);
});
test('status is opt-in; concurrent starts share one installation and deadline',async()=>{
 const initial=await licensing.licenseAction('status');assert.equal(initial.active,false);assert.equal(initial.trial.status,'eligible');
 assert.equal(requests.filter(r=>r.path.endsWith('/start')).length,0);
 const [a,b]=await Promise.all([licensing.trialAction('start'),licensing.trialAction('start')]);
 assert.equal(a.plan,'trial');assert.equal(a.expiresAt,b.expiresAt);assert.equal(new Set(requests.map(r=>r.body.installationId)).size,1);
 await licensing.requirePlus();
});
test('offline access stops at the signed deadline and preserves user data',async()=>{
 stored.library=[{name:'Keep this pairing'}];stored.favorites=['Inter'];offline=true;
 assert.equal((await licensing.licenseAction('status')).plan,'trial');
 stored.fpPlusTrial.entitlement=await sign(stored.fpPlusInstallation,{exp:now()-1});
 await assert.rejects(licensing.requirePlus());assert.equal((await licensing.accessState()).trial.status,'expired');
 assert.equal(stored.library[0].name,'Keep this pairing');assert.deepEqual(stored.favorites,['Inter']);offline=false;
});
test('unverified trial responses cannot grant access',async()=>{
 delete stored.fpPlusTrial;invalid=true;await assert.rejects(licensing.trialAction('start'),/verification/);
 assert.equal((await licensing.accessState()).active,false);invalid=false;
});
test('cancellation is permanent and does not remove pairings',async()=>{
 await licensing.trialAction('status');const ended=await licensing.trialAction('cancel');assert.equal(ended.active,false);assert.equal(ended.trial.status,'cancelled');
 assert.equal((await licensing.trialAction('start')).active,false);await assert.rejects(licensing.requirePlus());assert.equal(stored.library.length,1);
});
test('paid upgrade wins over trials, propagates offline and rejects revoked access',async()=>{
 status='active';expiresAt=now()+86400;await licensing.trialAction('status');
 const paid=await licensing.licenseAction('activate','FPP-ABCDE-ABCDE-ABCDE-ABCDE-ABCDE');assert.equal(paid.plan,'lifetime');
 const count=requests.length;assert.equal((await licensing.trialAction('cancel')).plan,'lifetime');assert.equal(requests.length,count);
 offline=true;assert.equal((await licensing.licenseAction('status')).plan,'lifetime');offline=false;
 status='cancelled';http=403;await licensing.licenseAction('status');http=200;
 await licensing.trialAction('status');assert.equal((await licensing.accessState()).active,false);
});
