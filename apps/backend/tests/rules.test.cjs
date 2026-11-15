const {test}=require('node:test');const assert=require('node:assert/strict');const {advance}=require('../dist/rules');
test('requires 30 real seconds, deduplicates, ignores old readings and recovers',()=>{
 let state={last:0,since:null,episode:null};let fires=0;
 for(let t=100000;t<=140000;t+=2000){const r=advance(state,t,85,62,true);state=r.state;if(r.fire)fires++;}
 assert.equal(fires,1);assert.equal(advance(state,110000,85,62,true).fire,false);
 const recovery=advance(state,142000,62,62,true);assert.equal(recovery.recovered,true);assert.equal(recovery.state.since,null);
});
test('gaps and invalid data reset sustained interval',()=>{let s={last:100000,since:100000,episode:null};let r=advance(s,130000,85,62,true);assert.equal(r.fire,false);assert.equal(r.state.since,130000);assert.equal(advance(r.state,132000,85,62,false).state.since,null);});
