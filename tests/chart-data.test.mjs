import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chartPoints,personalTrendWindow,periodicObservations} from '../apps/frontend/src/chart-data.ts';
const point=(time,value)=>({time,value,source:'SIMULATED'});
test('daily and monthly observations form a chronological line without inventing samples',()=>{
 const original=[point('2026-11-01T00:00:00Z',1.15),point('2026-09-01T00:00:00Z',1.16),point('2026-10-01T00:00:00Z',1.14)];
 const result=chartPoints(original);
 assert.deepEqual(result,[original[1],original[2],original[0]]);
 assert.equal(original[0].value,1.15);assert.equal(original[0].time,'2026-11-01T00:00:00Z');
 assert.equal(result.length,original.length);assert.ok(result.every(p=>p.value!==null));
});
test('actual ECG gaps stay visible and never get a substitute waveform',()=>{
 const start=Date.parse('2026-11-15T00:00:00Z');
 const samples=[0,4,8,100,104].map((offset,i)=>point(new Date(start+offset).toISOString(),i));
 const result=chartPoints(samples,true);
 assert.equal(result.length,6);assert.equal(result[3].value,null);
 assert.deepEqual(result.filter(p=>p.value!==null),samples);
});
test('periodic query windows fit their cadence; continuously acquired data stays in a useful live-scale window',()=>{
 assert.equal(personalTrendWindow({cadence:'CONTINUOUS'}),3600000);
 assert.equal(personalTrendWindow({cadence:'PERIODIC',expectedIntervalMs:86400000}),7*86400000);
 assert.equal(personalTrendWindow({cadence:'PERIODIC',expectedIntervalMs:7*86400000}),21*86400000);
 assert.equal(personalTrendWindow({cadence:'PERIODIC',expectedIntervalMs:30*86400000}),90*86400000);
});
test('many scenario snapshots do not masquerade as daily or monthly physiological variation',()=>{
 const start=Date.parse('2026-11-15T14:00:00Z');const day=86400000;
 const samples=[-61*day,-31*day,-3600000,-1800000,0].map((offset,i)=>point(new Date(start+offset).toISOString(),i));
 const selected=periodicObservations(samples,30*day);
 assert.deepEqual(selected,[samples[0],samples[1],samples[4]]);
 assert.equal(selected.at(-1),samples.at(-1));assert.equal(samples.length,5);
});
