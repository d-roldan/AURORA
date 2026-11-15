import {test} from 'node:test';
import assert from 'node:assert/strict';
import {latestValue,readingFresh,retainWave} from '../apps/frontend/src/retained.ts';

test('recorded values survive server masking, including zero, without fabricating missing values',()=>{
 assert.equal(latestValue({value:null,lastValue:62}),62);
 assert.equal(latestValue({value:0,lastValue:62}),0);
 assert.equal(latestValue({value:null}),null);
 assert.equal(latestValue({value:null,lastValue:NaN}),null);
});
test('a restored LIVE flag cannot make old or invalid readings current',()=>{
 const now=Date.now();const record={subjectId:'crew',metric:'heart_rate',value:62,quality:'GOOD',source:'SIMULATED',observedAt:new Date(now-20000).toISOString(),freshness:'LIVE'};
 assert.equal(readingFresh(record,now),false);
 assert.equal(readingFresh({...record,observedAt:new Date(now-2000).toISOString()},now),true);
 assert.equal(readingFresh({...record,quality:'INVALID'},now),false);
});
test('an empty moving ECG window retains the actual old trace and observation time',async()=>{
 const old=[{time:'2026-11-14T00:00:00Z',value:.4,source:'SIMULATED'}];
 assert.deepEqual(await retainWave(async()=>[],old),old);
 assert.deepEqual(await retainWave(async()=>[],undefined),[]);
 const fresh=[{...old[0],time:'2026-11-14T00:01:00Z'}];
 assert.deepEqual(await retainWave(async()=>fresh,old),fresh);
});
test('a failed ECG request is an error, not a successful fresh cached response',async()=>{
 await assert.rejects(retainWave(async()=>{throw new Error('Offline');},[]),/Offline/);
});
