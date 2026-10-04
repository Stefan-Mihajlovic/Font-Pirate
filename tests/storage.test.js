import test from 'node:test';
import assert from 'node:assert/strict';
import {newSet,exportJSON} from '../core.js';
const state={};let listener;
globalThis.chrome={runtime:{id:'type-pilot-test',onMessage:{addListener(fn){listener=fn;}}},storage:{local:{async get(key){await new Promise(r=>setTimeout(r,2));return {[key]:structuredClone(state[key])};},async set(patch){Object.assign(state,structuredClone(patch));}}}};
await import('../background.js');
const send=(message,sender={id:'type-pilot-test'})=>new Promise(resolve=>{const accepted=listener(message,sender,resolve);if(!accepted)resolve(undefined);});
test('concurrent saves preserve both pairings, updates keep identity, deletion keeps the other',async()=>{
 state.library=[];const a=newSet(),b=newSet();a.name='First';b.name='Second';const [ra,rb]=await Promise.all([send({type:'SAVE_SET',set:a}),send({type:'SAVE_SET',set:b})]);assert.equal(ra.ok,true);assert.equal(rb.ok,true);assert.equal(state.library.length,2);
 const updated=await send({type:'SAVE_SET',set:{...ra.set,name:'Updated'}});assert.equal(updated.set.id,ra.set.id);assert.equal(state.library.length,2);assert.equal(state.library.find(x=>x.id===ra.set.id).name,'Updated');
 await send({type:'DELETE_SET',id:ra.set.id});assert.equal(state.library.length,1);assert.equal(state.library[0].id,rb.set.id);
});
test('invalid imports fail atomically and the queue recovers for subsequent valid imports',async()=>{
 state.library=[];const invalid=JSON.stringify({version:1,sets:[newSet(),null]});assert.equal((await send({type:'IMPORT_SETS',text:invalid})).ok,false);assert.equal(state.library.length,0);const result=await send({type:'IMPORT_SETS',text:exportJSON([newSet()])});assert.equal(result.ok,true);assert.equal(state.library.length,1);
});
test('page scripts can capture but cannot mutate the saved library',async()=>{
 const sender={id:'type-pilot-test',tab:{id:7,url:'https://example.com/type?secret=token#fragment'}};const result=await send({type:'CAPTURE',style:{fontFamily:'Georgia',sample:'A title',source:'https://forged.test/'}},sender);assert.equal(result.ok,true);assert.equal(state.lastCapture.source,'https://example.com/type');assert.equal(await send({type:'DELETE_SET',id:state.library[0].id},sender),undefined);assert.equal(state.library.length,1);
});
test('library capacity rejects a new save but allows updates',async()=>{
 state.library=Array.from({length:200},()=>newSet());const existing=state.library[0];assert.equal((await send({type:'SAVE_SET',set:newSet()})).ok,false);assert.equal(state.library.length,200);assert.equal((await send({type:'SAVE_SET',set:{...existing,name:'Still editable'}})).ok,true);assert.equal(state.library.length,200);
});
