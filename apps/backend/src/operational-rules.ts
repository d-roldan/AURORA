/** All thresholds are synthetic demonstration controls, not validated medical limits. */
export type AlertLevel='NONE'|'YELLOW'|'RED';
export type DemoThreshold={metric:string;unit:string;direction:'HIGH'|'LOW';yellow:number;red:number;priority:number};
export const DEMO_THRESHOLDS:DemoThreshold[]=[
 {metric:'rover_pressure',unit:'kPa',direction:'LOW',yellow:85,red:60,priority:100},
 {metric:'rover_oxygen',unit:'%',direction:'LOW',yellow:19,red:17,priority:95},
 {metric:'rover_co2',unit:'ppm',direction:'HIGH',yellow:1500,red:2500,priority:90},
 {metric:'solar_particle_alert',unit:'0/1',direction:'HIGH',yellow:1,red:1,priority:98},
 {metric:'radiation_rate',unit:'µSv/h',direction:'HIGH',yellow:40,red:100,priority:97},
 {metric:'spo2',unit:'%',direction:'LOW',yellow:94,red:90,priority:96},
 {metric:'blood_glucose',unit:'mg/dL',direction:'HIGH',yellow:180,red:250,priority:85},
 {metric:'systolic_bp',unit:'mmHg',direction:'HIGH',yellow:150,red:180,priority:84},
 {metric:'hydration',unit:'%',direction:'LOW',yellow:50,red:45,priority:82},
 {metric:'body_temperature',unit:'°C',direction:'HIGH',yellow:38,red:39,priority:83},
 {metric:'co2',unit:'ppm',direction:'HIGH',yellow:1500,red:2500,priority:80},
 {metric:'battery_remaining',unit:'%',direction:'LOW',yellow:25,red:10,priority:88},
 {metric:'oxygen_remaining',unit:'%',direction:'LOW',yellow:25,red:10,priority:94}
];
export function classifyDemo(value:number,rule:DemoThreshold):AlertLevel{
 if(!Number.isFinite(value))return 'NONE';
 const crosses=(limit:number)=>rule.direction==='HIGH'?value>=limit:value<=limit;
 return crosses(rule.red)?'RED':crosses(rule.yellow)?'YELLOW':'NONE';
}
export const UNIVERSAL_KEYS=['spo2','heart_rate','hrv_rmssd','hrv_sdnn','radiation_rate','radiation_dose'];
export const ZONES=['TRANSIT','STATION','ROVER','SURFACE'] as const;
export type Zone=typeof ZONES[number];
export const ZONE_PROFILES:Record<Zone,{label:string;description:string;slots:{title:string;metrics:string[];note?:string}[]}>= {
 TRANSIT:{label:'Spacecraft · deep-space transit',description:'Isolation, fluid shifts, space weather and circadian records',slots:[
  {title:'Fluid shift & ocular pressure',metrics:['intraocular_pressure','cephalic_fluid_shift'],note:'Synthetic research parameters. No SANS diagnosis or prevention claim.'},
  {title:'Psychosocial check-in',metrics:['perceived_stress','mood','fatigue'],note:'Synthetic self-report. No voice analysis or mental-health diagnosis.'},
  {title:'Sleep & circadian rhythm',metrics:['sleep_duration','deep_sleep_duration','rem_sleep_duration','circadian_offset'],note:'Periodic synthetic sleep record, not ECG-derived sleep staging.'}
 ]},
 STATION:{label:'Space station · orbital habitat',description:'Countermeasures, cabin conditions and daily task readiness',slots:[
  {title:'Countermeasure exercise record',metrics:['exercise_duration','exercise_sessions','muscle_strength','physical_activity'],note:'No prescribed ARED/treadmill/cycle plan configured; adherence cannot be assessed.'},
  {title:'Cabin & vascular context',metrics:['co2','plasma_volume','vascular_resistance'],note:'Synthetic plasma and resistance records; not inferred from blood pressure.'},
  {title:'Cognitive task record',metrics:['reaction_time','attention','fatigue'],note:'Synthetic task performance, not a validated fitness-for-duty assessment.'}
 ]},
 ROVER:{label:'Rover · exterior vehicle',description:'Pressurization, breathing gases, thermal load and life-support supplies',slots:[
  {title:'Rover pressure & breathing gases',metrics:['rover_pressure','rover_oxygen','rover_co2'],note:'Dedicated synthetic rover channels, not cabin measurements or suit telemetry.'},
  {title:'Metabolic & thermal load',metrics:['metabolic_rate','energy_expenditure','respiratory_rate','body_temperature']},
  {title:'Hydration & life-support supplies',metrics:['hydration','water_remaining','cooling_water_remaining','battery_remaining','oxygen_remaining']}
 ]},
 SURFACE:{label:'Lunar / planetary base',description:'Partial-gravity load, gait, surface dust and local exposure',slots:[
  {title:'Musculoskeletal load',metrics:['weight_bearing_load','muscle_strength','bone_density','physical_activity'],note:'Synthetic load and periodic bone record; no bone density inferred from ECG.'},
  {title:'Gait & neuromuscular context',metrics:['gait_cadence','gait_symmetry','fatigue'],note:'Synthetic gait parameters; no fall-risk prediction.'},
  {title:'Surface dust & dosimetry',metrics:['surface_dust','radiation_rate','radiation_dose'],note:'Synthetic surface context; no measured regolith identification or planetary radiation model.'}
 ]}
};
export function promoteSlots<T>(slots:T[],alerts:{metric:string;level:string;priority:number}[]){
 const candidate=[...alerts].filter(a=>a.level==='RED'&&!UNIVERSAL_KEYS.includes(a.metric)).sort((a,b)=>b.priority-a.priority||a.metric.localeCompare(b.metric))[0];
 return {slots:slots.map((s,i)=>candidate&&i===2?{override:candidate}:s),promoted:candidate||null};
}
