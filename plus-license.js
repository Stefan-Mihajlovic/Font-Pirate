export const PRODUCT = 'font_pirate_plus';
export const API = 'https://tvm-licensing-api-prod.optiflowzoffice.workers.dev';
const JWK = {kty:'EC',x:'AZpnxE_j3aaAUwUkzkVbagqa-j7HoVmCbsTLglwGvgs',y:'B9jdmU1uF6mSdkPwICYXfov8S5s3WeNQ_Y8susG6d9Y',crv:'P-256'};
const keys=['fpPlusInstallation','fpPlusKey','fpPlusEntitlement','fpPlusTrial'];
const bytes = s => Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(s.length/4)*4,'=')),c=>c.charCodeAt(0));
async function verify(entitlement,id,trial,publicKey) {
  try {
    if(typeof id!=='string'||!id||typeof entitlement?.token!=='string')return null;
    const parts=entitlement.token.split('.');if(parts.length!==3)return null;
    const [h,p,s]=parts,header=JSON.parse(new TextDecoder().decode(bytes(h))),payload=JSON.parse(new TextDecoder().decode(bytes(p))),now=Date.now()/1000;
    const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(id))),b=>b.toString(16).padStart(2,'0')).join('');
    if(header.alg!=='ES256'||header.typ!==(trial?'EXT-TRIAL':'FPP-ENT')||payload.product!==PRODUCT||payload.plan!==(trial?'trial':'lifetime')||!Number.isFinite(payload.exp)||payload.exp<=now||!Number.isFinite(entitlement.expiresAt)||entitlement.expiresAt<=now||payload.installation!==hash)return null;
    if(trial&&(!Number.isFinite(payload.startedAt)||payload.startedAt>=payload.exp))return null;
    const key=await crypto.subtle.importKey('jwk',publicKey,{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
    return await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},key,bytes(s),new TextEncoder().encode(`${h}.${p}`))?{...payload,exp:Math.min(payload.exp,entitlement.expiresAt)}:null;
  } catch {return null;}
}
export async function verifyEntitlement(entitlement,id,publicKey=JWK) {return !!await verify(entitlement,id,false,publicKey);}
export async function verifyTrialEntitlement(entitlement,id,publicKey=JWK) {return verify(entitlement,id,true,publicKey);}
async function api(path,body){
  const response=await fetch(API+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({product:PRODUCT,...body}),signal:AbortSignal.timeout(12000)});
  const data=await response.json();
  if(!response.ok){const e=new Error(data.error?.message||'License service unavailable. Try again.');e.status=response.status;throw e;}return data;
}
// All mutations run in the service worker queue, including installation creation.
let pending=Promise.resolve();
const serial=task=>{const result=pending.then(task,task);pending=result.catch(()=>{});return result;};
async function installation(){
  const stored=await chrome.storage.local.get(keys);
  if(!stored.fpPlusInstallation){stored.fpPlusInstallation=crypto.randomUUID();await chrome.storage.local.set({fpPlusInstallation:stored.fpPlusInstallation});}
  return stored;
}
export async function accessState(){
  const stored=await chrome.storage.local.get(keys),id=stored.fpPlusInstallation;
  const paid=await verify(stored.fpPlusEntitlement,id,false,JWK);
  const cached=stored.fpPlusTrial;
  const signed=cached?.trial?.status==='active'?await verifyTrialEntitlement(cached.entitlement,id):null;
  const trial=signed?{...cached.trial,startedAt:signed.startedAt,expiresAt:signed.exp}:cached?.trial?{...cached.trial,status:cached.trial.status==='active'?'expired':cached.trial.status}:null;
  return {active:!!(paid||signed),plan:paid?'lifetime':signed?'trial':'free',key:paid?stored.fpPlusKey||'':'',expiresAt:paid?.exp||signed?.exp||null,trial};
}
async function syncTrial(action,stored){
  const result=await api('/v1/trial/'+action,{installationId:stored.fpPlusInstallation});
  if(result?.trial?.product!==PRODUCT||!['eligible','active','expired','cancelled'].includes(result.trial.status))throw new Error('Trial verification failed. Try again.');
  const payload=result.trial.status==='active'?await verifyTrialEntitlement(result.entitlement,stored.fpPlusInstallation):null;
  if(result.trial.status==='active'&&!payload||result.trial.status!=='active'&&result.entitlement)throw new Error('Trial verification failed. Try again.');
  if(action==='cancel'&&result.trial.status!=='cancelled')throw new Error('Could not end your trial. Try again.');
  await chrome.storage.local.set({fpPlusTrial:{trial:payload?{...result.trial,startedAt:payload.startedAt,expiresAt:payload.exp}:result.trial,entitlement:result.entitlement}});
}
export function trialAction(action){return serial(async()=>{
  if(!['status','start','cancel'].includes(action))throw new Error('Invalid trial action.');
  const stored=await installation();
  if(await verifyEntitlement(stored.fpPlusEntitlement,stored.fpPlusInstallation))return accessState();
  try{await syncTrial(action,stored);return await accessState();}
  catch(error){if(action!=='status')throw error;return {...await accessState(),error:error.message};}
});}
export function licenseAction(action,key){return serial(async()=>{
  if(!['status','activate','deactivate'].includes(action))throw new Error('Invalid license action.');
  const stored=await installation(),id=stored.fpPlusInstallation;
  key=action==='activate'?String(key||'').trim().toUpperCase():stored.fpPlusKey;
  let message='';
  if(key||action!=='status'){
    if(!/^FPP(?:-[A-Z0-9]{5}){5}$/.test(key||'')){
      if(action!=='status')throw new Error('Enter your FPP license key.');
      message='Enter your FPP license key.';
    }else try{
      const result=await api('/v1/license/'+(action==='status'?'validate':action),{licenseKey:key,installationId:id,extensionVersion:chrome.runtime.getManifest().version});
      if(action==='deactivate')await chrome.storage.local.remove(['fpPlusKey','fpPlusEntitlement']);
      else{
        if(!await verifyEntitlement(result.entitlement,id))throw new Error('License verification failed. Try again.');
        await chrome.storage.local.set({fpPlusKey:key,fpPlusEntitlement:result.entitlement});
      }
    }catch(error){
      if(action!=='status')throw error;
      if(error.status>=400&&error.status<500)await chrome.storage.local.remove('fpPlusEntitlement');
      message=error.message;
    }
  }
  if((await accessState()).plan!=='lifetime'){
    try{await syncTrial('status',stored);}catch(error){message=message||error.message;}
  }
  return {...await accessState(),error:message};
});}
export async function requirePlus(){if(!(await accessState()).active)throw new Error('Start your free trial or activate Font Pirate Plus to use this feature.');}
