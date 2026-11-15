import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Database } from './database';
import { SampleDto } from './dto';
import { classifyDemo, DEMO_THRESHOLDS, promoteSlots, UNIVERSAL_KEYS, Zone, ZONES, ZONE_PROFILES } from './operational-rules';

@Injectable()
export class OperationalAlerts {
 constructor(private db:Database){}
 async ingest(device:any,samples:SampleDto[],source:string){
  if(source!=='SIMULATED')return;
  const applicable=samples.filter(s=>DEMO_THRESHOLDS.some(r=>r.metric===s.metric));if(!applicable.length)return;
  await this.db.$transaction(async tx=>{
   // Serialize device state without a process-local lock; retries and restarts retain episode identity.
   await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${device.id}::text))`;
   for(const sample of applicable.sort((a,b)=>Date.parse(a.observedAt)-Date.parse(b.observedAt))){
    const rule=DEMO_THRESHOLDS.find(r=>r.metric===sample.metric)!;
    const time=new Date(sample.observedAt);const timestamp=time.getTime();
    if(Date.now()-timestamp>10000)continue;
    const unique={deviceId_metricKey:{deviceId:device.id,metricKey:sample.metric}};
    const state=await tx.operationalAlertState.findUnique({where:unique});
    if(state&&timestamp<=state.lastObservedAt.getTime())continue;
    if(sample.quality!=='GOOD'){
     // An invalid observation breaks a recovery streak, but never clears an alert.
     if(state)await tx.operationalAlertState.update({where:unique,data:{recoveryCount:0,lastObservedAt:time}});
     continue;
    }
    const observed=classifyDemo(sample.value,rule);
    if(!state&&observed==='NONE')continue;
    let level=state?.level||'NONE',eventId=state?.eventId||null,first=state?.firstObservedAt||null,recovery=state?.recoveryCount||0;
    const gap=state&&timestamp-state.lastObservedAt.getTime()>5000;
    if(gap)recovery=0;
    const prior=level;
    if(observed==='NONE'&&level!=='NONE'){
     recovery++;
     if(recovery>=2){level='NONE';recovery=0;}
    }else if(observed!=='NONE'){
     recovery=0;
     if(level==='NONE'||observed==='RED')level=observed;
    }
    if(level!=='NONE'&&prior==='NONE'){
     first=time;eventId=randomUUID();
     await tx.healthEvent.create({data:{id:eventId,missionId:device.missionId,crewMemberId:device.crewMemberId,habitatId:device.habitatId,type:'OPERATIONAL_THRESHOLD',severity:level,status:'OPEN',firstObservedAt:time,lastObservedAt:time,ruleVersion:1,dedupKey:`operational:${eventId}`,evidence:{metric:sample.metric,unit:sample.unit,valueAtTrigger:sample.value,source,quality:sample.quality,ruleVersion:1,demoOnly:true,thresholds:{...rule},conditionActive:true,explanation:'Synthetic value crossed a demonstration threshold. Human review required; not a clinical assessment.'}}});
     await tx.auditLog.create({data:{actorId:'operational-rule-engine',action:'OPERATIONAL_ALERT_CREATED',entityType:'HealthEvent',entityId:eventId,metadata:{metric:sample.metric,level,demoOnly:true}}});
    }else if(level!==prior&&eventId){
     const event=await tx.healthEvent.findUnique({where:{id:eventId}});
     if(event)await tx.healthEvent.update({where:{id:eventId},data:{...(level!=='NONE'?{severity:level}:{}),lastObservedAt:time,evidence:{...(event.evidence as object),conditionActive:level!=='NONE',...(level==='NONE'?{recoveredAt:time.toISOString(),recoveryValue:sample.value}:{escalatedAt:time.toISOString(),escalationValue:sample.value})}}});
     await tx.auditLog.create({data:{actorId:'operational-rule-engine',action:level==='NONE'?'OPERATIONAL_CONDITION_RECOVERED':'OPERATIONAL_ALERT_ESCALATED',entityType:'HealthEvent',entityId:eventId,metadata:{metric:sample.metric,level,demoOnly:true}}});
    }
    await tx.operationalAlertState.upsert({where:unique,create:{deviceId:device.id,metricKey:sample.metric,level,eventId,firstObservedAt:first,lastObservedAt:time,recoveryCount:recovery,ruleVersion:1},update:{level,eventId,firstObservedAt:first,lastObservedAt:time,recoveryCount:recovery}});
   }
  },{timeout:15000});
 }
 async view(subjectId:string,environment:string,catalog:any[]){
  if(!ZONES.includes(environment as Zone))throw new BadRequestException('Unknown operational environment');
  const crew=await this.db.crewMember.findUnique({where:{id:subjectId},include:{mission:{include:{habitats:true}}}});if(!crew)throw new BadRequestException('Unknown crew member');
  const zone=environment as Zone;const profile=ZONE_PROFILES[zone];
  const states=await this.db.operationalAlertState.findMany({where:{level:{not:'NONE'},device:{OR:[{crewMemberId:subjectId},{habitatId:{in:crew.mission.habitats.map(h=>h.id)}}]}},orderBy:[{firstObservedAt:'asc'},{metricKey:'asc'}]});
  const measurement=(key:string)=>{
   const m=catalog.find(m=>m.key===key);
   if(!m)return {key,label:key,unit:'',availability:'NOT_CONFIGURED',value:null,source:null,observedAt:null};
   const r=m.latest;const available=r&&r.freshness==='LIVE'&&r.quality==='GOOD';
   return {key,label:m.label,unit:m.unit,cadence:m.cadence,staleAfterMs:m.staleAfterMs,source:r?.source||m.sourceKind,observedAt:r?.observedAt||null,quality:r?.quality||'UNKNOWN',availability:!r?'NO_DATA':r.freshness==='STALE'?'STALE':r.quality!=='GOOD'?'LOW_QUALITY':'AVAILABLE',value:available?r.value:null,lastValue:r?.value??null};
  };
  const alerts=states.map(s=>({id:s.id,eventId:s.eventId,metric:s.metricKey,level:s.level,priority:DEMO_THRESHOLDS.find(r=>r.metric===s.metricKey)?.priority||0,ruleVersion:s.ruleVersion,firstObservedAt:s.firstObservedAt,lastObservedAt:s.lastObservedAt,measurement:measurement(s.metricKey),stale:measurement(s.metricKey).availability!=='AVAILABLE',demoOnly:true}));
  const dynamic=profile.slots.map((s,i)=>({id:i+3,kind:'DYNAMIC',title:s.title,note:s.note||null,metrics:s.metrics.map(measurement)}));
  const promotion=promoteSlots(dynamic,alerts);
  const fixed=[{id:1,kind:'UNIVERSAL',title:'Oxygen saturation',metrics:[measurement('spo2')]},{id:2,kind:'UNIVERSAL',title:'Heart rate & HRV',metrics:['heart_rate','hrv_rmssd','hrv_sdnn'].map(measurement)}];
  const red=alerts.filter(a=>a.level==='RED'),yellow=alerts.filter(a=>a.level==='YELLOW');
  const slots=promotion.slots.map((slot:any)=>slot.override?{id:5,kind:'OVERRIDE',title:'Emergency Override',metrics:[measurement(slot.override.metric)],alert:alerts.find(a=>a.metric===slot.override.metric),replacedTitle:dynamic[2].title}:slot);
  return {crew:{id:crew.id,code:crew.code,displayName:crew.displayName},environment:zone,label:profile.label,description:profile.description,slots:[...fixed,...slots],radiation:['radiation_rate','radiation_dose','solar_particle_alert'].map(measurement),alerts,level:red.length?'RED':yellow.length?'YELLOW':'NONE',guidance:{method:'VERSIONED_RULES',demoOnly:true,clinicalProtocolConfigured:false,steps:['Pause the current task only when operationally safe.','Verify the sensor, signal quality and observation time.','Notify the designated human mission reviewer.','Follow the approved mission procedure; this prototype provides no clinical protocol.'],yellow:'Verify the flagged measurement and record a check-in with the human mission reviewer.'},updatedAt:new Date().toISOString()};
 }
}
