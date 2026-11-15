const {PrismaClient}=require('@prisma/client');
const db=new PrismaClient();
const ago=hours=>new Date(Date.now()-hours*3600000);

async function main(){
 if(process.env.DEMO_MODE!=='true')throw new Error('Demo events require DEMO_MODE=true');
 const mission=await db.mission.findUnique({where:{code:'ARES-01'},include:{crew:{orderBy:{code:'asc'}},habitats:true}});
 if(!mission||mission.crew.length<4||!mission.habitats.length)throw new Error('ARES-01 demo seed is incomplete');
 const [lucas,elba,fausto,gabriela]=mission.crew,habitat=mission.habitats[0];
 const events=[
  {dedupKey:'demo-catalog:mission-note',type:'MISSION_REVIEW_NOTE',severity:'INFO',status:'RESOLVED',crewMemberId:gabriela.id,firstObservedAt:ago(72),lastObservedAt:ago(71.5),acknowledgedAt:ago(71.8),resolvedAt:ago(71.5),acknowledgedBy:'demo-seed',resolvedBy:'demo-seed',acknowledgementNote:'Demonstration note reviewed by the simulated medical officer.',resolutionNote:'No action required; retained as an example of an informational record.',evidence:{demoOnly:true,source:'SYNTHETIC_EVENT_CATALOG',category:'MISSION',explanation:'Routine synthetic mission review completed. Informational example only; no health inference.'}},
  {dedupKey:'demo-catalog:sensor-gap',type:'SIGNAL_LOST',severity:'TECHNICAL',status:'RESOLVED',crewMemberId:elba.id,firstObservedAt:ago(48),lastObservedAt:ago(47.7),acknowledgedAt:ago(47.9),resolvedAt:ago(47.7),acknowledgedBy:'demo-seed',resolvedBy:'demo-seed',acknowledgementNote:'Connector and observation timestamp checked.',resolutionNote:'Synthetic stream recovered; retained readings remained labelled with original time.',evidence:{demoOnly:true,source:'SYNTHETIC_EVENT_CATALOG',category:'ACQUISITION',metric:'spo2',lastObservedAgeSeconds:18,explanation:'Synthetic sensor stream became stale. Data unavailable during the gap; no health inference was made.'}},
  {dedupKey:'demo-catalog:habitat-co2',type:'ENVIRONMENT_CHANGE',severity:'YELLOW',status:'ACKNOWLEDGED',habitatId:habitat.id,firstObservedAt:ago(30),lastObservedAt:ago(29.8),acknowledgedAt:ago(29.7),acknowledgedBy:'demo-seed',acknowledgementNote:'Synthetic habitat reading verified; human follow-up remains open.',evidence:{demoOnly:true,source:'SYNTHETIC_EVENT_CATALOG',category:'ENVIRONMENT',metric:'co2',observed:1580,unit:'ppm',demoThreshold:1500,explanation:'Synthetic habitat CO₂ crossed a demonstration threshold. Operational review example; not a clinical assessment.'}},
  {dedupKey:'demo-catalog:baseline-review',type:'BASELINE_DEVIATION',severity:'REVIEW',status:'OPEN',crewMemberId:lucas.id,firstObservedAt:ago(18),lastObservedAt:ago(17.9),evidence:{demoOnly:true,source:'SYNTHETIC_EVENT_CATALOG',category:'PHYSIOLOGICAL_REVIEW',metric:'heart_rate',observed:79,baseline:62,unit:'bpm',durationSeconds:34,explanation:'Persistent synthetic deviation from the fictitious resting reference. Verify the measurement and request human review; no diagnosis is provided.'}},
  {dedupKey:'demo-catalog:operational-yellow',type:'OPERATIONAL_THRESHOLD',severity:'YELLOW',status:'ACKNOWLEDGED',crewMemberId:gabriela.id,firstObservedAt:ago(8),lastObservedAt:ago(7.8),acknowledgedAt:ago(7.7),acknowledgedBy:'demo-seed',acknowledgementNote:'Workload context and sensor quality checked; condition remains under observation.',evidence:{demoOnly:true,source:'SYNTHETIC_EVENT_CATALOG',category:'OPERATIONAL',metric:'workload',observed:7.2,unit:'0–10',conditionActive:true,explanation:'Synthetic workload crossed the yellow demonstration boundary. Human operational review required.'}},
  {dedupKey:'demo-catalog:operational-red',type:'OPERATIONAL_THRESHOLD',severity:'RED',status:'OPEN',crewMemberId:fausto.id,firstObservedAt:ago(2),lastObservedAt:ago(1.9),evidence:{demoOnly:true,source:'SYNTHETIC_EVENT_CATALOG',category:'OPERATIONAL',metric:'blood_glucose',observed:280,unit:'mg/dL',conditionActive:true,explanation:'Synthetic value crossed a red demonstration boundary. This illustrates escalation and requires human review; it is not a diagnosis or treatment instruction.'}}
 ];
 let created=0,existing=0;
 for(const event of events){
  if(await db.healthEvent.findUnique({where:{dedupKey:event.dedupKey}})){existing++;continue;}
  await db.$transaction(async tx=>{
   const record=await tx.healthEvent.create({data:{missionId:mission.id,ruleVersion:1,...event}});
   await tx.auditLog.create({data:{actorId:'demo-seed',action:'DEMO_EVENT_CREATED',entityType:'HealthEvent',entityId:record.id,metadata:{type:event.type,severity:event.severity,status:event.status,demoOnly:true}}});
  });
  created++;
 }
 console.log(JSON.stringify({created,existing,total:events.length,source:'SYNTHETIC_EVENT_CATALOG'}));
}

main().finally(()=>db.$disconnect());
