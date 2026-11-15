import { BadRequestException, ForbiddenException, Injectable, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { InfluxDB, Point } from '@influxdata/influxdb-client';
import { Database } from './database';
import { IngestDto, WaveformDto } from './dto';
import { advance, Continuity } from './rules';
import { OperationalAlerts } from './operational';
import {HISTORY_RETENTION_MS,HISTORY_MODEL,historyAggregation,newestReadings} from './history-policy';
const quote=(s:string)=>JSON.stringify(s);
@Injectable()
export class Telemetry implements OnModuleInit {
 private influx=new InfluxDB({url:process.env.INFLUX_URL!,token:process.env.INFLUX_TOKEN!,timeout:10000});
 private query=this.influx.getQueryApi(process.env.INFLUX_ORG!);
 private states=new Map<string,Continuity>();
 private analyzing=false;
 private processing=new Map<string,Promise<any>>();
 private hrvLast=new Map<string,number>();
 private timer?:NodeJS.Timeout;
 constructor(private db:Database,private operational:OperationalAlerts){}
 async onModuleInit(){this.timer=setInterval(()=>this.background().catch(e=>console.error('telemetry supervisor',e.message)),15000);}
 async rows(flux:string):Promise<any[]>{try{return await this.query.collectRows(flux);}catch{throw new ServiceUnavailableException('Telemetry storage unavailable');}}
 async write(bucket:string,points:Point[]){const writer=this.influx.getWriteApi(process.env.INFLUX_ORG!,bucket,'ms',{maxRetries:0});writer.writePoints(points);try{await writer.close();}catch{throw new ServiceUnavailableException('Telemetry write not confirmed');}}
 async device(id:string,missionId:string){const d=await this.db.device.findUnique({where:{id}});if(!d||d.missionId!==missionId||d.status!=='ACTIVE')throw new BadRequestException('Unknown or inactive device');return d;}
 validateTime(time:string){const t=Date.parse(time);if(!Number.isFinite(t)||t>Date.now()+5000||t<Date.now()-86400000)throw new BadRequestException('Timestamp outside allowed 24h ingestion window');return t;}
 point(d:any,measurement:string,source:string,t:number){return new Point(measurement).tag('mission_id',d.missionId).tag('subject_id',d.crewMemberId||d.habitatId).tag('device_id',d.id).tag('source',source).timestamp(t);}
 async ingest(body:IngestDto){
  const d=await this.device(body.deviceId,body.missionId);const defs=await this.db.metricDefinition.findMany();
  const points=body.samples.map(s=>{
   const metric=defs.find(m=>m.key===s.metric);
   if(!metric||metric.unit!==s.unit||metric.scope!==(d.crewMemberId?'CREW':'HABITAT'))throw new BadRequestException('Metric, scope or canonical unit mismatch');
   return this.point(d,d.crewMemberId?'crew_vitals':'habitat_environment',body.source,this.validateTime(s.observedAt)).tag('metric',s.metric).floatField('value',s.value).stringField('quality',s.quality);
  });
  await this.write('aegis_vitals',points);
  const newest=Math.max(...body.samples.map(s=>Date.parse(s.observedAt)));
  await this.db.device.updateMany({where:{id:d.id,OR:[{lastSeenAt:null},{lastSeenAt:{lt:new Date(newest)}}]},data:{lastSeenAt:new Date(newest)}});
  await this.operational.ingest(d,body.samples,body.source);
  for(const s of [...body.samples].sort((a,b)=>Date.parse(a.observedAt)-Date.parse(b.observedAt))){
   if(s.metric==='heart_rate'&&d.crewMemberId)await this.evaluate(d,s);
   if(s.metric==='co2'&&s.quality==='GOOD'&&s.value>=1500)await this.event(d,'ENVIRONMENT_CHANGE',`environment:${d.id}:${new Date(s.observedAt).toISOString().slice(0,10)}`,s.observedAt,{observed:s.value,unit:'ppm',threshold:1500,source:'SIMULATED',explanation:'Synthetic habitat CO₂ threshold exceeded. Operational demonstration only.'});
  }
  return {accepted:points.length,batchId:body.batchId};
 }
 async evaluate(d:any,s:any){
  const baseline=await this.db.healthBaseline.findFirst({where:{crewMemberId:d.crewMemberId,metricKey:'heart_rate',context:'REST'},orderBy:{version:'desc'}});
  if(!baseline)return;
  const previous=this.states.get(d.id)||{last:0,since:null,episode:null};
  const t=Date.parse(s.observedAt);const valid=s.quality==='GOOD'&&Date.now()-t<10000;
  const result=advance(previous,t,s.value,baseline.center,valid);
  this.states.set(d.id,result.state);
  if(result.fire)await this.event(d,'BASELINE_DEVIATION',`hr:${d.id}:${result.state.episode}`,s.observedAt,{observed:s.value,baseline:baseline.center,baselineId:baseline.id,baselineVersion:baseline.version,ruleId:'demo-resting-hr-v1',durationSeconds:(t-result.state.since!)/1000,windowStart:new Date(result.state.since!).toISOString(),unit:'bpm',source:'SIMULATED',quality:s.quality,context:'REST',explanation:'Persistent deviation from demo resting baseline (≥20% for ≥30s). Verify measurement and record a check-in. No clinical protocol or clinical assistance is provided.'});
  if(result.recovered){const old=await this.db.healthEvent.findUnique({where:{dedupKey:`hr:${d.id}:${previous.episode}`}});if(old)await this.db.healthEvent.update({where:{id:old.id},data:{lastObservedAt:new Date(s.observedAt),evidence:{...(old.evidence as object),recoveredAt:s.observedAt,recoveryValue:s.value,recoveryNote:'Signal returned to demo baseline range. Human review remains open.'}}});}
 }
 async event(d:any,type:string,key:string,time:string,evidence:any){
  return this.db.$transaction(async tx=>{
   const existing=await tx.healthEvent.findUnique({where:{dedupKey:key}});if(existing)return existing;
   const event=await tx.healthEvent.upsert({where:{dedupKey:key},update:{},create:{missionId:d.missionId,crewMemberId:d.crewMemberId,habitatId:d.habitatId,type,severity:type==='SIGNAL_LOST'?'TECHNICAL':'REVIEW',firstObservedAt:new Date(time),lastObservedAt:new Date(time),dedupKey:key,evidence}});
   await tx.auditLog.create({data:{actorId:'telemetry-engine',action:'EVENT_CREATED',entityType:'HealthEvent',entityId:event.id,metadata:{type}}});return event;
  });
 }
 async wave(body:WaveformDto){
  const d=await this.device(body.deviceId,body.missionId);if(!d.crewMemberId)throw new BadRequestException('ECG requires crew device');
  const t=this.validateTime(body.startAt);if(t+body.samples.length*4>Date.now()+5000)throw new BadRequestException('Waveform ends in future');
  const points=body.samples.map((v,i)=>this.point(d,'crew_ecg',body.source,t+i*4).tag('channel',body.channel).floatField('value',v).stringField('quality','GOOD'));
  await this.write('aegis_waveforms',points);return {accepted:points.length,batchId:body.batchId};
 }
 async latest(subjectId?:string){
  if(subjectId&&!/^[a-f0-9-]{36}$/.test(subjectId))throw new BadRequestException('Invalid subject');
  const filter=`|> filter(fn:(r)=>r._field=="value" or r._field=="quality") ${subjectId?`|> filter(fn:(r)=>r.subject_id==${quote(subjectId)})`:''} |> last() |> pivot(rowKey:["_time"],columnKey:["_field"],valueColumn:"_value")`;
  const [vitals,features,defs]=await Promise.all([this.rows(`from(bucket:"aegis_vitals") |> range(start:-90d) ${filter}`),this.rows(`from(bucket:"aegis_features") |> range(start:-90d) ${filter}`),this.db.metricDefinition.findMany()]);
  return newestReadings([...vitals,...features].filter(x=>typeof x.value==='number'&&Number.isFinite(x.value)).map(x=>({subjectId:x.subject_id,metric:x.metric,value:x.value,quality:x.quality,source:x.source,observedAt:x._time,freshness:Date.now()-Date.parse(x._time)>(defs.find(d=>d.key===x.metric)?.staleAfterMs||10000)?'STALE':'LIVE'})));
 }
 async catalog(subjectId:string){
  const crew=await this.db.crewMember.findUnique({where:{id:subjectId},include:{mission:{include:{habitats:true}},baselines:true}});if(!crew)throw new BadRequestException('Unknown crew member');
  const [defs,latest,waves]=await Promise.all([this.db.metricDefinition.findMany({orderBy:[{category:'asc'},{key:'asc'}]}),this.latest(),this.rows(`from(bucket:"aegis_waveforms") |> range(start:-7d) |> filter(fn:(r)=>r.subject_id==${quote(subjectId)} and r._field=="value") |> last()`)]);
  if(waves.length)latest.push({subjectId,metric:'ecg',value:waves[0]._value,quality:'GOOD',source:waves[0].source,observedAt:waves[0]._time,freshness:Date.now()-Date.parse(waves[0]._time)>10000?'STALE':'LIVE'});
  return defs.map(d=>{const subject=d.scope==='HABITAT'?crew.mission.habitats[0]?.id:subjectId;return {...d,subjectId:subject,latest:latest.find(r=>r.subjectId===subject&&r.metric===d.key)||null,baseline:d.key==='heart_rate'?crew.baselines.find(b=>b.metricKey==='heart_rate')?.center:null};});
 }
 async history(subjectId:string,metric:string,from?:string,to?:string,wave=false){
  if(!/^[a-f0-9-]{36}$/.test(subjectId||'')||!(/^[a-z][a-z0-9_]{0,39}$/).test(metric||''))throw new BadRequestException('Invalid subject or metric');
  const end=to?Date.parse(to):Date.now(),start=from?Date.parse(from):end-(wave?12000:900000);
  if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start||end-start>(wave?30000:HISTORY_RETENTION_MS))throw new BadRequestException('Invalid time range (ECG ≤30s, history ≤90d)');
  const definition=await this.db.metricDefinition.findUnique({where:{key:metric}});if(!definition)throw new BadRequestException('Unknown metric');
  const bucket=wave?'aegis_waveforms':definition.sourceKind==='DERIVED'?'aegis_features':'aegis_vitals';
  const tag=wave?'channel':'metric';const key=wave?'lead_demo':metric;
  const minutes=!wave&&definition.cadence!=='PERIODIC'?historyAggregation(end-start):null;
  const agg=minutes?`|> aggregateWindow(every:${minutes}m,fn:mean,createEmpty:false)`:'';
  const rows=await this.rows(`from(bucket:${quote(bucket)}) |> range(start:time(v:${quote(new Date(start).toISOString())}),stop:time(v:${quote(new Date(end).toISOString())})) |> filter(fn:(r)=>r.subject_id==${quote(subjectId)} and r.${tag}==${quote(key)} and r._field=="value") ${agg} |> group() |> sort(columns:["_time"]) |> limit(n:${wave?7500:10000})`);
  return rows.map(r=>({time:r._time,value:r._value,source:r.source||'AGGREGATED',algorithmVersion:r.algorithm_version||null}));
 }
 async importDemoHistory(body:IngestDto,actor:string){
  if(process.env.DEMO_MODE!=='true')throw new ForbiddenException('Demo disabled');
  const d=await this.device(body.deviceId,body.missionId);
  if(!d.crewMemberId&&!d.habitatId)throw new BadRequestException('History requires a crew or habitat device');
  const defs=await this.db.metricDefinition.findMany();const now=Date.now();
  for(const s of body.samples){
   const m=defs.find(m=>m.key===s.metric),t=Date.parse(s.observedAt);
   const scope=d.crewMemberId?'CREW':'HABITAT';
   if(!m||m.scope!==scope||!['CONTINUOUS','PERIODIC'].includes(m.cadence)||m.sourceKind!=='SIMULATED'||m.unit!==s.unit||s.quality!=='GOOD'||s.value<m.displayMin||s.value>m.displayMax)
    throw new BadRequestException('Demo history requires scalar simulated metrics in canonical units, matching scope and display bounds');
   if(!Number.isFinite(t)||t<now-HISTORY_RETENTION_MS||t>now-86400000)
    throw new BadRequestException('Demo history timestamps must be between 1 and 90 days old');
  }
  const existing=new Set<string>();
  const subjectId=(d.crewMemberId||d.habitatId)!;
  for(const key of new Set(body.samples.map(s=>s.metric))){
   const times=body.samples.filter(s=>s.metric===key).map(s=>Date.parse(s.observedAt));
   // Read raw timestamps here: the public history endpoint aggregates long
   // continuous ranges and therefore cannot be used for exact idempotency.
   const rows=await this.rows(`from(bucket:"aegis_vitals") |> range(start:time(v:${quote(new Date(Math.min(...times)).toISOString())}),stop:time(v:${quote(new Date(Math.max(...times)+1).toISOString())})) |> filter(fn:(r)=>r.subject_id==${quote(subjectId)} and r.metric==${quote(key)} and r._field=="value") |> keep(columns:["_time"])`);
   for(const r of rows)existing.add(key+':'+Date.parse(r._time));
  }
  const seen=new Set<string>();const missing=body.samples.filter(s=>{const key=s.metric+':'+Date.parse(s.observedAt);if(existing.has(key)||seen.has(key))return false;seen.add(key);return true;});
  const points=missing.map(s=>this.point(d,'crew_vitals','SIMULATED',Date.parse(s.observedAt)).tag('metric',s.metric).tag('algorithm_version',HISTORY_MODEL).floatField('value',s.value).stringField('quality','GOOD'));
  if(points.length)await this.write('aegis_vitals',points);
  // Historical fixture import never updates lastSeenAt or evaluates operational rules.
  if(points.length)await this.db.auditLog.create({data:{actorId:actor,action:'DEMO_HISTORY_IMPORTED',entityType:'Device',entityId:d.id,metadata:{batchId:body.batchId,model:HISTORY_MODEL,accepted:points.length,source:'SIMULATED'}}});
  return {accepted:points.length,skipped:body.samples.length-points.length,batchId:body.batchId,model:HISTORY_MODEL};
 }
 async process(subjectId:string){
  if(this.processing.has(subjectId))return this.processing.get(subjectId);
  const task=this.processWindow(subjectId);this.processing.set(subjectId,task);
  try{return await task;}finally{this.processing.delete(subjectId);}
 }
 private async processWindow(subjectId:string){
  const end=Date.now()-2000;const samples=await this.history(subjectId,'ecg',new Date(end-20000).toISOString(),new Date(end).toISOString(),true);
  if(samples.length<3750)return {quality:'INSUFFICIENT',heartRateBpm:null};
  for(let i=1;i<samples.length;i++)if(Date.parse(samples[i].time)-Date.parse(samples[i-1].time)>5)return {quality:'GAPS',heartRateBpm:null};
  const response=await fetch(`${process.env.ANALYTICS_URL}/v1/ecg/process`,{method:'POST',headers:{'Content-Type':'application/json','x-service-key':process.env.SERVICE_API_KEY!},body:JSON.stringify({samples:samples.map(s=>s.value),samplingRateHz:250,startAt:samples[0].time,unit:'a.u.'}),signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw new ServiceUnavailableException('Analytics unavailable');
  const result:any=await response.json();
  const d=await this.db.device.findFirst({where:{crewMemberId:subjectId}});if(d&&result.heartRateBpm!==null)await this.write('aegis_features',[this.point(d,'analytics_features','DERIVED',Date.parse(samples.at(-1)!.time)).tag('metric','ecg_heart_rate').tag('algorithm_version',result.algorithmVersion).floatField('value',result.heartRateBpm).stringField('quality',result.quality).floatField('window_seconds',result.windowSeconds)]);
  return result;
 }
 async processHrv(subjectId:string){
  if(!/^[a-f0-9-]{36}$/.test(subjectId))throw new BadRequestException('Invalid subject');
  const end=Math.floor((Date.now()-4000)/4)*4,start=end-300000;
  const samples=await this.rows(`from(bucket:"aegis_waveforms") |> range(start:time(v:${quote(new Date(start).toISOString())}),stop:time(v:${quote(new Date(end).toISOString())})) |> filter(fn:(r)=>r.subject_id==${quote(subjectId)} and r._field=="value") |> keep(columns:["_time","_value"]) |> group() |> sort(columns:["_time"]) |> limit(n:75000)`);
  if(samples.length!==75000)return {quality:'INSUFFICIENT',rmssdMs:null,sdnnMs:null,windowSeconds:samples.length/250};
  for(let i=1;i<samples.length;i++)if(Date.parse(samples[i]._time)-Date.parse(samples[i-1]._time)!==4)return {quality:'GAPS',rmssdMs:null,sdnnMs:null};
  const response=await fetch(`${process.env.ANALYTICS_URL}/v1/hrv/process`,{method:'POST',headers:{'Content-Type':'application/json','x-service-key':process.env.SERVICE_API_KEY!},body:JSON.stringify({samples:samples.map(s=>s._value),samplingRateHz:250,startAt:samples[0]._time,unit:'a.u.'}),signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw new ServiceUnavailableException('Analytics unavailable');const result:any=await response.json();
  const d=await this.db.device.findFirst({where:{crewMemberId:subjectId}});
  if(d&&result.rmssdMs!==null&&result.sdnnMs!==null){await this.write('aegis_features',[['hrv_rmssd',result.rmssdMs],['hrv_sdnn',result.sdnnMs]].map(([metric,value])=>this.point(d,'analytics_features','DERIVED',Date.parse(samples.at(-1)._time)).tag('metric',String(metric)).tag('algorithm_version',result.algorithmVersion).floatField('value',Number(value)).stringField('quality',result.quality).floatField('window_seconds',300)));}
  return result;
 }
 private async background(){
  if(this.analyzing)return;this.analyzing=true;
  try{const crew=await this.db.crewMember.findMany({orderBy:{code:'asc'}});for(const c of crew){try{await this.process(c.id);if(Date.now()-(this.hrvLast.get(c.id)||0)>60000){this.hrvLast.set(c.id,Date.now());await this.processHrv(c.id);}}catch(e:any){console.error('Analytics subject degraded',c.code,e.message);}}}finally{this.analyzing=false;}
 }
}

