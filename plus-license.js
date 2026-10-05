export const PRODUCT = 'font_pirate_plus';
export const API = 'https://tvm-licensing-api-prod.optiflowzoffice.workers.dev';
const JWK = {kty:'EC',x:'AZpnxE_j3aaAUwUkzkVbagqa-j7HoVmCbsTLglwGvgs',y:'B9jdmU1uF6mSdkPwICYXfov8S5s3WeNQ_Y8susG6d9Y',crv:'P-256'};
const keys=['fpPlusInstallation','fpPlusKey','fpPlusEntitlement'];
const bytes = s => Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(s.length/4)*4,'=')),c=>c.charCodeAt(0));
export async function verifyEntitlement(entitlement,id,publicKey=JWK) {
  try {
    const parts=entitlement.token.split('.');if(parts.length!==3)return false;
    const [h,p,s]=parts,header=JSON.parse(new TextDecoder().decode(bytes(h))),payload=JSON.parse(new TextDecoder().decode(bytes(p))),now=Date.now()/1000;
    const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(id))),b=>b.toString(16).padStart(2,'0')).join('');
    if(header.alg!=='ES256'||header.typ!=='FPP-ENT'||payload.product!==PRODUCT||payload.plan!=='lifetime'||!Number.isFinite(payload.exp)||payload.exp<=now||!Number.isFinite(entitlement.expiresAt)||entitlement.expiresAt<=now||payload.installation!==hash)return false;
    const key=await crypto.subtle.importKey('jwk',publicKey,{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
    return crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},key,bytes(s),new TextEncoder().encode(`${h}.${p}`));
  } catch {return false;}
}
async function api(path,body){const response=await fetch(API+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({product:PRODUCT,...body}),signal:AbortSignal.timeout(12000)});const data=await response.json();if(!response.ok){const e=new Error(data.error?.message||'License service unavailable. Try again.');e.status=response.status;throw e;}return data;}
let pending;
export function licenseAction(action,key){const task=async()=>{
  const stored=await chrome.storage.local.get(keys);let id=stored.fpPlusInstallation;
  if(!id){id=crypto.randomUUID();await chrome.storage.local.set({fpPlusInstallation:id});}
  key=action==='activate'?String(key||'').trim().toUpperCase():stored.fpPlusKey;
  if(action==='status'&&!key)return {active:false};
  if(!/^FPP(?:-[A-Z0-9]{5}){5}$/.test(key||''))throw new Error('Enter your FPP license key.');
  const cached=await verifyEntitlement(stored.fpPlusEntitlement,id);
  try{
    const result=await api('/v1/license/'+(action==='status'?'validate':action),{licenseKey:key,installationId:id,extensionVersion:chrome.runtime.getManifest().version});
    if(action==='deactivate'){await chrome.storage.local.remove(['fpPlusKey','fpPlusEntitlement']);return {active:false};}
    if(!await verifyEntitlement(result.entitlement,id))throw new Error('License verification failed. Try again.');
    await chrome.storage.local.set({fpPlusKey:key,fpPlusEntitlement:result.entitlement});return {active:true,key};
  }catch(error){if(action==='status'&&cached&&(!error.status||error.status>=500))return {active:true,key,offline:true};if(action==='status'&&error.status>=400&&error.status<500)await chrome.storage.local.remove('fpPlusEntitlement');throw error;}
};const result=(pending||Promise.resolve()).then(task,task);pending=result.catch(()=>{});return result;}
export async function requirePlus(){const stored=await chrome.storage.local.get(keys);if(!await verifyEntitlement(stored.fpPlusEntitlement,stored.fpPlusInstallation))throw new Error('Activate Font Pirate Plus to use this feature.');}
