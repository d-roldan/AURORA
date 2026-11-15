const {PrismaClient}=require('@prisma/client');
const {scryptSync,randomBytes}=require('node:crypto');
const db=new PrismaClient();
async function main(){
 const mission=await db.mission.upsert({where:{code:'ARES-01'},update:{},create:{code:'ARES-01',name:'Ares Analog Research Expedition'}});
 const names=['Lucas Orozco','Elba Quaife','Fausto Villalba','Gabriela Iglesias'];
 const roles=['Commander','Science Officer','Flight Engineer','Medical Officer'];
 const centers=[62,65,68,64];
 for(let i=0;i<4;i++){
  const code=`CREW-0${i+1}`;
  const crew=await db.crewMember.upsert({where:{missionId_code:{missionId:mission.id,code}},update:{},create:{missionId:mission.id,code,displayName:names[i],role:roles[i]}});
  await db.healthBaseline.upsert({where:{crewMemberId_metricKey_version:{crewMemberId:crew.id,metricKey:'heart_rate',version:1}},update:{},create:{crewMemberId:crew.id,metricKey:'heart_rate',center:centers[i],spread:3,method:'FICTITIOUS_DEMO_REFERENCE',version:1}});
  await db.device.upsert({where:{code:`SIM-${code}`},update:{},create:{code:`SIM-${code}`,missionId:mission.id,crewMemberId:crew.id,kind:'SYNTHETIC_BIOMETRIC'}});
 }
 const habitat=await db.habitat.upsert({where:{code:'HAB-01'},update:{},create:{code:'HAB-01',missionId:mission.id,name:'Habitat Alpha'}});
 await db.device.upsert({where:{code:'SIM-HAB-01'},update:{},create:{code:'SIM-HAB-01',missionId:mission.id,habitatId:habitat.id,kind:'SYNTHETIC_ENVIRONMENT'}});
 for(const m of require('./metrics.json')){
  const data={label:m.label,unit:m.unit,scope:m.scope||'CREW',category:m.category,cadence:m.cadence||'CONTINUOUS',sourceKind:m.sourceKind||'SIMULATED',expectedIntervalMs:m.interval||2000,staleAfterMs:m.stale||10000,displayMin:m.range[0],displayMax:m.range[1],description:m.description||'Synthetic demonstration data. Display range is not a clinical threshold.'};
  await db.metricDefinition.upsert({where:{key:m.key},update:data,create:{key:m.key,...data}});
 }
 await db.alertRule.upsert({where:{id:'demo-resting-hr-v1'},update:{},create:{id:'demo-resting-hr-v1',metricKey:'heart_rate',version:1,deviationPercent:20,sustainSeconds:30}});
 for(const [username,role] of [['admin','ADMIN'],['medical','MEDICAL_OFFICER'],['viewer','DEMO_VIEWER'],['crew','CREW']]){
 const salt=randomBytes(16).toString('hex');const password=process.env.DEMO_ADMIN_PASSWORD;
 if(!password)throw new Error('DEMO_ADMIN_PASSWORD required');
 const crew=await db.crewMember.findFirst({orderBy:{code:'asc'}});
 await db.user.upsert({where:{username},update:{},create:{username,role,crewMemberId:role==='CREW'?crew.id:null,passwordHash:`${salt}:${scryptSync(password,salt,64).toString('hex')}`}});
 }
 await db.evidenceSource.upsert({where:{url:'https://neuropsychology.github.io/NeuroKit/functions/ecg.html'},update:{},create:{title:'NeuroKit2 ECG methods',url:'https://neuropsychology.github.io/NeuroKit/functions/ecg.html',license:'Documentation reference; no dataset redistributed',provenance:'SCIENTIFIC_REFERENCE'}});
}
main().finally(()=>db.$disconnect());
