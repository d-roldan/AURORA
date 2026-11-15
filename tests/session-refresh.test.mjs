import {test} from 'node:test';
import assert from 'node:assert/strict';
import {api,setSession} from '../apps/frontend/src/api.ts';

test('expired viewer requests share a public demo renewal and retry actual reads',async()=>{
 const original=globalThis.fetch;let renewals=0;let reads=0;
 setSession({token:'old-unit-token',role:'DEMO_VIEWER',username:'viewer'});
 globalThis.fetch=async(url,options)=>{
  if(url.endsWith('/auth/demo')){renewals++;await new Promise(resolve=>setTimeout(resolve,10));return Response.json({token:'new-unit-token',role:'DEMO_VIEWER',username:'viewer'});}
  reads++;return options.headers.Authorization==='Bearer new-unit-token'?Response.json({recorded:62}):Response.json({message:'Expired'},{status:401});
 };
 try{const results=await Promise.all([api('/telemetry/latest'),api('/telemetry/latest')]);assert.equal(renewals,1);assert.equal(reads,4);assert.equal(results[0].recorded,62);}finally{globalThis.fetch=original;}
});
test('operator expiry requests reauthentication without silently switching roles',async()=>{
 const original=globalThis.fetch;const previousWindow=globalThis.window;const events=[];let calls=0;
 setSession({token:'expired-operator-unit-token',role:'ADMIN',username:'admin'});
 globalThis.window={dispatchEvent:event=>events.push(event.type)};
 globalThis.fetch=async()=>{calls++;return Response.json({message:'Sign in required'},{status:401});};
 try{await assert.rejects(api('/telemetry/latest'),/Sign in required/);assert.equal(calls,1);assert.deepEqual(events,['aegis:session-expired']);}finally{globalThis.fetch=original;globalThis.window=previousWindow;}
});
