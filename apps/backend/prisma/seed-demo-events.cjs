const {PrismaClient}=require('@prisma/client');
const db=new PrismaClient();
const ago=hours=>new Date(Date.now()-hours*3600000);

async function main(){
 if(process.env.DEMO_MODE!=='true')throw new Error('Demo events require DEMO_MODE=true');
 const mission=await db.mission.findUnique({where:{code:'ARES-01'},include:{crew:{orderBy:{code:'asc'}},habitats:true}});
 if(!mission||mission.crew.length<4||!mission.habitats.length)throw new Error('ARES-01 demo seed is incomplete');
 const [lucas,elba,fausto,gabriela]=mission.crew,habitat=mission.habitats[0];

 // Signal-loss records remain an internal acquisition concern, not part of the operator-facing demo catalog.
 const obsolete=await db.healthEvent.deleteMany({where:{OR:[
  {type:'SIGNAL_LOST'},
  {dedupKey:{in:['demo-catalog:mission-note','demo-catalog:sensor-gap','demo-catalog:habitat-co2','demo-catalog:baseline-review','demo-catalog:operational-yellow','demo-catalog:operational-red']}}
 ]}});

 const events=[
  {dedupKey:'demo-operations:exercise-reminder',type:'EXERCISE_REMINDER',severity:'INFO',status:'OPEN',crewMemberId:elba.id,firstObservedAt:ago(.75),lastObservedAt:ago(.75),evidence:{demoOnly:true,source:'SYNTHETIC_MISSION_SCHEDULE',category:'ACTIVITY',scheduledFor:ago(.5).toISOString(),durationMinutes:45,explanation:'Scheduled exercise window for Elba. Confirm availability and record completion in the mission logbook.'}},
  {dedupKey:'demo-operations:blood-study',type:'BLOOD_STUDY_DUE',severity:'REVIEW',status:'ACKNOWLEDGED',crewMemberId:elba.id,firstObservedAt:ago(7),lastObservedAt:ago(6.8),acknowledgedAt:ago(6.7),acknowledgedBy:'demo-seed',acknowledgementNote:'Medical study window confirmed with the simulated mission schedule.',evidence:{demoOnly:true,source:'SYNTHETIC_MEDICAL_SCHEDULE',category:'MEDICAL_STUDY',study:'Routine blood panel',scheduledFor:ago(-18).toISOString(),fastingRequired:false,explanation:'A scheduled fictitious blood study is due during the next mission day. Human medical staff must follow the approved protocol.'}},
  {dedupKey:'demo-operations:radiation-high',type:'HIGH_RADIATION_ALERT',severity:'RED',status:'OPEN',habitatId:habitat.id,firstObservedAt:ago(1.6),lastObservedAt:ago(1.4),evidence:{demoOnly:true,source:'SYNTHETIC_RADIATION_MONITOR',category:'RADIATION',metric:'radiation_rate',observed:1.42,unit:'mSv/h',demoThreshold:1,conditionActive:true,explanation:'Synthetic external radiation rate crossed the red demonstration threshold. Notify mission control and follow the approved shelter procedure.'}},
  {dedupKey:'demo-operations:suit-oxygen-low',type:'SUIT_OXYGEN_LOW',severity:'RED',status:'RESOLVED',crewMemberId:elba.id,firstObservedAt:ago(29),lastObservedAt:ago(28.7),acknowledgedAt:ago(28.9),resolvedAt:ago(28.7),acknowledgedBy:'demo-seed',resolvedBy:'demo-seed',acknowledgementNote:'EVA telemetry and suit identifier verified.',resolutionNote:'Training exercise ended and the synthetic suit oxygen value returned to the nominal demo range.',evidence:{demoOnly:true,source:'SYNTHETIC_EVA_SUIT',category:'EVA',metric:'suit_oxygen',observed:18.1,unit:'%',demoThreshold:19.5,conditionActive:false,explanation:'Synthetic suit oxygen fell below the EVA demonstration threshold. The event illustrates an operational emergency workflow, not a real measurement.'}},
  {dedupKey:'demo-operations:eva-checklist',type:'EVA_CHECKLIST_DUE',severity:'YELLOW',status:'ACKNOWLEDGED',crewMemberId:fausto.id,firstObservedAt:ago(4),lastObservedAt:ago(3.8),acknowledgedAt:ago(3.7),acknowledgedBy:'demo-seed',acknowledgementNote:'Checklist assigned to the flight engineer for human completion.',evidence:{demoOnly:true,source:'SYNTHETIC_MISSION_SCHEDULE',category:'EVA',scheduledFor:ago(-3).toISOString(),explanation:'Pre-EVA suit, communications and consumables checklist is due before the next activity window.'}},
  {dedupKey:'demo-operations:hydration',type:'HYDRATION_REMINDER',severity:'INFO',status:'RESOLVED',crewMemberId:lucas.id,firstObservedAt:ago(12),lastObservedAt:ago(11.8),acknowledgedAt:ago(11.9),resolvedAt:ago(11.8),acknowledgedBy:'demo-seed',resolvedBy:'demo-seed',acknowledgementNote:'Reminder reviewed during the scheduled break.',resolutionNote:'Synthetic reminder completed and recorded.',evidence:{demoOnly:true,source:'SYNTHETIC_MISSION_SCHEDULE',category:'WELLBEING',explanation:'Scheduled hydration reminder after the exercise block. This is an operational prompt, not medical advice.'}},
  {dedupKey:'demo-operations:sleep-window',type:'REST_WINDOW_REMINDER',severity:'INFO',status:'OPEN',crewMemberId:gabriela.id,firstObservedAt:ago(2.5),lastObservedAt:ago(2.5),evidence:{demoOnly:true,source:'SYNTHETIC_MISSION_SCHEDULE',category:'SLEEP',scheduledFor:ago(-1).toISOString(),explanation:'Planned rest window is approaching. Confirm handover of active mission tasks before the scheduled period.'}}
 ];
 let created=0,updated=0;
 for(const event of events){
  const existing=await db.healthEvent.findUnique({where:{dedupKey:event.dedupKey}});
  if(existing){await db.healthEvent.update({where:{id:existing.id},data:{missionId:mission.id,ruleVersion:1,...event}});updated++;continue;}
  await db.$transaction(async tx=>{
   const record=await tx.healthEvent.create({data:{missionId:mission.id,ruleVersion:1,...event}});
   await tx.auditLog.create({data:{actorId:'demo-seed',action:'DEMO_EVENT_CREATED',entityType:'HealthEvent',entityId:record.id,metadata:{type:event.type,severity:event.severity,status:event.status,demoOnly:true}}});
  });
  created++;
 }

 const logbook=[
  {title:'Inicio de jornada y planificación',category:'GENERAL',hoursAgo:96,fatigueScore:2,sleepHours:7.4,notes:'Revisión del plan diario con el equipo. Se confirmaron las ventanas de ejercicio, experimentos y mantenimiento del hábitat. Sin novedades operativas al inicio del turno.'},
  {title:'Sesión de ejercicio en cinta',category:'ACTIVITY',hoursAgo:77,fatigueScore:4,notes:'Completé 42 minutos de ejercicio programado. Ajusté la sujeción de la cinta durante los primeros minutos y finalicé la sesión sin interrupciones.'},
  {title:'Preparación de muestras biológicas',category:'OTHER',hoursAgo:54,notes:'Organicé y etiqueté el material de práctica para el estudio de sangre programado. Verifiqué inventario, conservación y cadena de registro con la oficial médica.'},
  {title:'Chequeo previo de traje EVA',category:'ACTIVITY',hoursAgo:31,fatigueScore:3,notes:'Participé en la verificación de comunicaciones, sellos y reserva de oxígeno del traje. Durante el ejercicio se simuló una lectura baja y se completó el procedimiento de retorno.'},
  {title:'Turno durante alerta de radiación',category:'GENERAL',hoursAgo:19,fatigueScore:5,notes:'Se ejecutó el procedimiento de resguardo por una alerta sintética de radiación. Confirmé el inventario del módulo protegido y registré el relevo de guardia.'},
  {title:'Descanso y recuperación',category:'SLEEP',hoursAgo:10,fatigueScore:3,sleepHours:6.8,notes:'Descanso algo más corto por el relevo nocturno. Al despertar completé hidratación, desayuno y revisión de tareas antes de iniciar actividades.'},
  {title:'Observación del día de misión',category:'WELLBEING',hoursAgo:2,fatigueScore:3,notes:'Jornada estable. Queda pendiente el estudio de sangre del próximo turno y una nueva sesión de ejercicio. Solicité confirmar el horario definitivo con control de misión.'}
 ];
 let logbookCreated=0,logbookExisting=0;
 for(const entry of logbook){
  const existing=await db.healthCheckIn.findFirst({where:{crewMemberId:elba.id,createdBy:'demo-logbook-seed',title:entry.title}});
  if(existing){logbookExisting++;continue;}
  const {hoursAgo,...record}=entry;
  await db.$transaction(async tx=>{
   const checkIn=await tx.healthCheckIn.create({data:{crewMemberId:elba.id,createdBy:'demo-logbook-seed',observedAt:ago(hoursAgo),...record}});
   await tx.auditLog.create({data:{actorId:'demo-logbook-seed',action:'CHECK_IN_CREATED',entityType:'HealthCheckIn',entityId:checkIn.id,metadata:{demoOnly:true,crewCode:elba.code,category:entry.category}}});
  });
  logbookCreated++;
 }
 console.log(JSON.stringify({events:{created,updated,total:events.length,removedObsolete:obsolete.count},elbaLogbook:{created:logbookCreated,existing:logbookExisting,total:logbook.length},source:'SYNTHETIC_MISSION_DEMO'}));
}

main().finally(()=>db.$disconnect());
