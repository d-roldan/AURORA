const {test}=require('node:test');const assert=require('node:assert/strict');
const {newestReadings,historyAggregation}=require('../dist/history-policy');
const {Telemetry}=require('../dist/telemetry');
test('old fixture series cannot replace latest actual readings from another tag set',()=>{
 const recent={subjectId:'crew',metric:'sleep_duration',observedAt:'2026-11-15T01:00:00Z',value:7.5};
 const old={...recent,observedAt:'2026-10-15T01:00:00Z',value:7.3};
 assert.deepEqual(newestReadings([old,recent]),[recent]);
 assert.deepEqual(newestReadings([recent,old]),[recent]);
 assert.equal(newestReadings([old,{...recent,subjectId:'other'}]).length,2);
});
test('long queries aggregate to a bounded resolution instead of truncating the most recent hours',()=>{
 assert.equal(historyAggregation(3600000),null);
 for(const days of [1,7,90])assert.ok(days*1440/historyAggregation(days*86400000)<=1200);
});
const sample=()=>({metric:'bone_density',value:1.15,unit:'g/cm²',observedAt:new Date(Date.now()-30*86400000).toISOString(),quality:'GOOD'});
function fixture(){
 const telemetry=Object.create(Telemetry.prototype);const writes=[],audits=[];
 telemetry.db={metricDefinition:{findMany:async()=>[{key:'bone_density',scope:'CREW',cadence:'PERIODIC',sourceKind:'SIMULATED',unit:'g/cm²',displayMin:.5,displayMax:1.8}]},auditLog:{create:async input=>audits.push(input)}};
 telemetry.device=async()=>({id:'device',missionId:'mission',crewMemberId:'crew'});
 telemetry.rows=async()=>[];telemetry.write=async(bucket,points)=>writes.push({bucket,points});
 telemetry.operational={ingest:()=>assert.fail('History must not evaluate current alert rules')};
 return {telemetry,writes,audits};
}
test('history import validates every sample before writing and is disabled outside demo',async()=>{
 const old=process.env.DEMO_MODE;process.env.DEMO_MODE='true';
 try{
  for(const invalid of [{...sample(),unit:'mg'},{...sample(),metric:'heart_rate'},{...sample(),value:100},{...sample(),observedAt:new Date().toISOString()},{...sample(),observedAt:new Date(Date.now()-91*86400000).toISOString()}]){
   const {telemetry,writes}=fixture();await assert.rejects(()=>telemetry.importDemoHistory({samples:[sample(),invalid]},'admin'));assert.equal(writes.length,0);
  }
  process.env.DEMO_MODE='false';await assert.rejects(()=>fixture().telemetry.importDemoHistory({samples:[sample()]},'admin'));
 }finally{if(old===undefined)delete process.env.DEMO_MODE;else process.env.DEMO_MODE=old;}
});
test('history import preserves original points, deduplicates retries, and audits only new synthetic samples',async()=>{
 const old=process.env.DEMO_MODE;process.env.DEMO_MODE='true';
 try{
  const {telemetry,writes,audits}=fixture();const stored=sample(),fresh={...sample(),observedAt:new Date(Date.now()-60*86400000).toISOString()};
  telemetry.rows=async()=>[{_time:stored.observedAt}];
  const input={batchId:'fixture',samples:[stored,fresh,fresh]};
  const first=await telemetry.importDemoHistory(input,'admin');assert.equal(first.accepted,1);assert.equal(first.skipped,2);assert.equal(writes[0].points.length,1);assert.equal(audits.length,1);
  assert.match(writes[0].points[0].toLineProtocol(),/source=SIMULATED/);
  telemetry.rows=async()=>[stored,fresh].map(s=>({_time:s.observedAt}));
  assert.equal((await telemetry.importDemoHistory(input,'admin')).accepted,0);assert.equal(writes.length,1);assert.equal(audits.length,1);
 }finally{if(old===undefined)delete process.env.DEMO_MODE;else process.env.DEMO_MODE=old;}
});
