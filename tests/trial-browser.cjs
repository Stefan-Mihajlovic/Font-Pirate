const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync('/tmp/font-pirate-trial-');
 const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']),jwk=await crypto.subtle.exportKey('jwk',pair.publicKey);
 const now=()=>Math.floor(Date.now()/1000);let status='eligible',expiry,offline=false;const requests=[],errors=[];
 async function sign(id,plan='trial'){
  const exp=plan==='trial'?expiry:now()+86400;
  const h=Buffer.from(JSON.stringify({alg:'ES256',typ:plan==='trial'?'EXT-TRIAL':'FPP-ENT'})).toString('base64url'),p=Buffer.from(JSON.stringify({product:'font_pirate_plus',plan,startedAt:now()-100,exp,installation:Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(id))).toString('hex')})).toString('base64url');
  return {token:h+'.'+p+'.'+Buffer.from(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},pair.privateKey,Buffer.from(h+'.'+p))).toString('base64url'),expiresAt:exp};
 }
 const server=http.createServer(async(req,res)=>{
  let raw='';for await(const chunk of req)raw+=chunk;
  if(offline){res.destroy();return}
  const body=JSON.parse(raw);requests.push(req.url);let data;
  if(req.url.includes('/license/'))data={entitlement:await sign(body.installationId,'lifetime')};
  else{
   if(req.url.endsWith('/start')&&status==='eligible'){status='active';expiry=now()+7*86400;}
   if(req.url.endsWith('/cancel'))status='cancelled';
   if(status==='active'&&expiry<=now())status='expired';
   data={trial:{product:'font_pirate_plus',days:7,status,startedAt:now()-100,expiresAt:expiry},entitlement:status==='active'?await sign(body.installationId):null};
  }
  res.writeHead(200,{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'});res.end(JSON.stringify(data));
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const api='http://127.0.0.1:'+server.address().port;
 for(const file of fs.readdirSync(root)){if(/\.(js|html|css|json)$/.test(file))fs.copyFileSync(path.join(root,file),path.join(dir,file));}
 fs.cpSync(path.join(root,'icons'),path.join(dir,'icons'),{recursive:true});
 fs.writeFileSync(path.join(dir,'plus-license.js'),fs.readFileSync(path.join(dir,'plus-license.js'),'utf8').replace(/const JWK = .*?;/,`const JWK = ${JSON.stringify(jwk)};`).replace(/export const API = .*?;/,`export const API = '${api}';`));
 const manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json')));manifest.host_permissions.push('http://127.0.0.1/*');fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(manifest));
 const browser=await chromium.launchPersistentContext('',{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,channel:'chromium',headless:true,args:[`--disable-extensions-except=${dir}`,`--load-extension=${dir}`],viewport:{width:410,height:590}});
 try{
  await browser.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//,route=>route.abort());
  const worker=browser.serviceWorkers()[0]||await browser.waitForEvent('serviceworker'),id=worker.url().split('/')[2];
  const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('dialog',dialog=>dialog.accept());
  await page.goto(`chrome-extension://${id}/index.html`);await page.locator('#plus-home').click();await page.waitForFunction(()=>!document.querySelector('#start-trial').disabled);
  assert.deepEqual(requests,['/v1/trial/status']);await page.evaluate(()=>document.body.dataset.theme='dark');await page.screenshot({path:'/tmp/font-pirate-trial-eligible.png'});
  await page.locator('#start-trial').click();await page.waitForFunction(()=>document.querySelector('#plus-home').textContent==='Trial');
  assert.equal((await page.evaluate(()=>chrome.runtime.sendMessage({type:'PLUS_ACCESS'}))).ok,true);
  const side=await browser.newPage();side.on('pageerror',e=>errors.push(e.message));await side.goto(`chrome-extension://${id}/index.html?surface=sidepanel`);await side.waitForFunction(()=>document.querySelector('#plus-home').textContent==='Trial');
  await page.screenshot({path:'/tmp/font-pirate-trial-active.png'});
  offline=true;await side.reload();await side.waitForFunction(()=>document.querySelector('#plus-home').textContent==='Trial');offline=false;
  await page.locator('#cancel-trial').click();await page.waitForFunction(()=>document.querySelector('#trial-title').textContent==='Your trial is cancelled.');await side.waitForFunction(()=>document.querySelector('#plus-home').textContent==='Plus');
  assert.equal((await page.evaluate(()=>chrome.runtime.sendMessage({type:'PLUS_ACCESS'}))).ok,false);
  await page.screenshot({path:'/tmp/font-pirate-trial-cancelled.png'});
  status='active';expiry=now()+3;await page.evaluate(()=>chrome.runtime.sendMessage({type:'PLUS_TRIAL',action:'status'}));await page.waitForFunction(()=>document.querySelector('#plus-home').textContent==='Trial');
  await worker.evaluate(()=>chrome.storage.local.set({library:[{id:'saved',name:'Keep this'}],favorites:['Inter']}));
  await page.waitForFunction(()=>document.querySelector('#plus-home').textContent==='Plus',{},{timeout:6000});await side.waitForFunction(()=>document.querySelector('#plus-home').textContent==='Plus');
  assert.equal((await page.evaluate(()=>chrome.runtime.sendMessage({type:'PLUS_ACCESS'}))).ok,false);
  const saved=await worker.evaluate(()=>chrome.storage.local.get(['library','favorites']));assert.equal(saved.library[0].name,'Keep this');assert.deepEqual(saved.favorites,['Inter']);
  status='active';expiry=now()+86400;await page.evaluate(()=>chrome.runtime.sendMessage({type:'PLUS_TRIAL',action:'status'}));
  await page.locator('#license-entry summary').click();await page.locator('#plus-key').fill('FPP-ABCDE-ABCDE-ABCDE-ABCDE-ABCDE');await page.locator('#activate-plus').click();await page.waitForFunction(()=>document.querySelector('#plus-home').textContent==='Plus ✓');await side.waitForFunction(()=>document.querySelector('#plus-home').textContent==='Plus ✓');
  assert.equal(await page.locator('#plus-trial').isVisible(),false);assert.equal((await page.evaluate(()=>chrome.runtime.sendMessage({type:'PLUS_ACCESS'}))).ok,true);
  await worker.evaluate(()=>chrome.storage.local.remove(['fpPlusKey','fpPlusEntitlement','fpPlusTrial']));status='eligible';await page.evaluate(()=>chrome.runtime.sendMessage({type:'PLUS_TRIAL',action:'status'}));
  await page.evaluate(()=>document.body.dataset.theme='light');await page.locator('#license-entry').evaluate(e=>e.open=false);await page.screenshot({path:'/tmp/font-pirate-trial-light.png'});
  await side.setViewportSize({width:320,height:700});await side.locator('#plus-home').click();await side.screenshot({path:'/tmp/font-pirate-trial-narrow.png'});
  for(const p of [page,side])assert.equal(await p.locator('#plus-dialog').evaluate(e=>e.scrollWidth<=e.clientWidth),true);
  assert.deepEqual(errors,[]);console.log('PASS: opt-in, signed trial, worker access, popup/side-panel sync, offline reopen, cancellation, open-view expiry, saved-data retention, paid upgrade, light/dark/narrow layouts.');
 }finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));fs.rmSync(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exit(1)});
