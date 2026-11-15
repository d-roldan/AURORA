import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {useQuery} from '@tanstack/react-query';
import {ArrowLeft,Expand,Rocket,Orbit,CarFront,Mountain,TriangleAlert,Radio,ShieldAlert} from 'lucide-react';
import {api,Crew} from './api';
import {tr,locale,usePreferences} from './preferences';
import {latestValue} from './retained';
import {ContinuityBanner} from './continuity';
import {DeviceDisplay,DevicePreferences} from './OperationalDevices';
type Zone='TRANSIT'|'STATION'|'ROVER'|'SURFACE';
const environments:{key:Zone;label:string;caption:string;icon:typeof Rocket}[]=[
 {key:'TRANSIT',label:'Spacecraft',caption:'Deep-space transit',icon:Rocket},
 {key:'STATION',label:'Space station',caption:'Orbital habitat',icon:Orbit},
 {key:'ROVER',label:'Rover',caption:'Exterior vehicle',icon:CarFront},
 {key:'SURFACE',label:'Lunar / planetary base',caption:'Partial-gravity surface',icon:Mountain}
];
export type Measurement={key:string;label:string;unit:string;value:number|null;lastValue?:number|null;source:string|null;availability:string;cadence?:string;staleAfterMs?:number;observedAt:string|null};
export type Alert={metric:string;level:string;stale:boolean;eventId:string;measurement:Measurement};
type Slot={id:number;kind:string;title:string;note?:string;metrics:Measurement[];alert?:Alert;replacedTitle?:string};
export type View={crew:{id:string;displayName:string;code:string};environment:Zone;label:string;description:string;slots:Slot[];radiation:Measurement[];level:string;alerts:Alert[];guidance:{steps:string[];yellow:string;method:string};updatedAt:string};
const observed=(value:string)=>new Date(value).toLocaleString(locale(),{timeZone:'UTC',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
export function PersonalSafety({crew}:{crew:Crew}){
 const query=useQuery({queryKey:['operationalView',crew.id,'STATION'],queryFn:()=>api<View>(`/crew/${crew.id}/operational-view?environment=STATION`),refetchInterval:2000});
 const data=query.data;const now=Date.now();
 return <section className="personal-safety" aria-label={tr('Permanent operational context')} data-level={data?.level||'UNKNOWN'}>
  <div className="personal-safety-title"><ShieldAlert size={16}/><span>{tr('UNIVERSAL MONITORING')}</span><small>{tr('SYNTHETIC')}</small></div>
  <div className="personal-safety-readings">{data?.slots.filter(s=>s.kind==='UNIVERSAL').flatMap(s=>s.metrics).map(m=><div key={m.key} data-metric={m.key} data-recorded={!current(m,now)} data-observed-at={m.observedAt||undefined}><span>{tr(m.label)}</span><strong>{value(m,now)} <small>{tr(m.unit)}</small></strong><small>{!current(m,now)?status(m):tr('Latest observation')}</small><time>{m.observedAt?observed(m.observedAt)+' UTC':tr('No data')}</time></div>)}</div>
  <div className="personal-safety-radiation"><span>{tr('RADIATION · ALWAYS VISIBLE')}</span>{data?.radiation.map(m=><div key={m.key} data-metric={m.key} data-recorded={!current(m,now)} data-observed-at={m.observedAt||undefined}><span>{tr(m.label)}</span><strong>{value(m,now)} <small>{tr(m.unit)}</small></strong><small>{!current(m,now)?status(m):tr('Latest observation')} · {m.observedAt?observed(m.observedAt)+' UTC':tr('No data')}</small></div>)}</div>
  {(!data||query.error)&&<p className="personal-safety-warning" role="status">{tr(query.error?'Data feed unavailable. Last alert remains visible; stale measurements are not shown as live.':'Loading operational measurements…')}</p>}
  {!!data?.alerts.length&&<div className="personal-safety-alerts" role="alert">{data.alerts.map(a=><p key={a.eventId}><TriangleAlert size={15}/><strong>{a.level}</strong> · {tr(a.measurement.label)} · {tr(a.stale?'Last recorded · not live':'Review requested')}</p>)}</div>}
 </section>;
}
export function current(m:Measurement,now:number){return m.availability==='AVAILABLE'&&m.observedAt&&now-Date.parse(m.observedAt)<(m.staleAfterMs||10000)&&m.value!==null;}
export function value(m:Measurement,now:number){const retained=latestValue(m);return retained===null?tr('N/A'):retained.toLocaleString(locale(),{maximumFractionDigits:m.unit==='0/1'?0:1});}
export function status(m:Measurement){return latestValue(m)!==null?`${tr('Last recorded')} · ${tr(m.availability==='AVAILABLE'?'STALE':m.availability)}`:tr(m.availability);}

export function EnvironmentModes({crew}:{crew:Crew}){
 usePreferences();
 const [zone,setZone]=useState<Zone|null>(null);
 function open(next:Zone){
  setZone(next);
  // Invoke synchronously inside the user's gesture; denied/unsupported APIs retain a full-window fallback.
  if(!document.fullscreenElement&&document.documentElement.requestFullscreen)document.documentElement.requestFullscreen().catch(()=>{});
 }
 return <><section className="panel environment-launcher"><div><h2>{tr('Operational environment')}</h2><p>{tr('Choose a zone to open a simple fullscreen view with its priority measurements.')}</p></div><div className="environment-buttons">{environments.map(({key,label,caption,icon:Icon})=><button key={key} onClick={()=>open(key)}><Icon size={23}/><span><strong>{tr(label)}</strong><small>{tr(caption)}</small></span><Expand size={15}/></button>)}</div></section>{zone&&<Focus crew={crew} zone={zone} onZone={setZone} onClose={()=>setZone(null)}/>}</>;
}

function Focus({crew,zone,onZone,onClose}:{crew:Crew;zone:Zone;onZone:(zone:Zone)=>void;onClose:()=>void}){
 usePreferences();
 const [device,setDevice]=useState<'HUD'|'TV'|'DETAIL'>(zone==='STATION'?'TV':'HUD');
 const dialog=useRef<HTMLDivElement>(null);const closeButton=useRef<HTMLButtonElement>(null);const wasFullscreen=useRef(false);
 const [fullscreen,setFullscreen]=useState(!!document.fullscreenElement);const [now,setNow]=useState(Date.now());
 const query=useQuery({queryKey:['operationalView',crew.id,zone],queryFn:()=>api<View>(`/crew/${crew.id}/operational-view?environment=${zone}`),refetchInterval:2000,retry:1});
 const data=query.data;
 useEffect(()=>{
  const previous=document.activeElement as HTMLElement|null;const shell=document.querySelector('.shell') as HTMLElement|null;
  const oldOverflow=document.body.style.overflow;document.body.style.overflow='hidden';if(shell)shell.inert=true;closeButton.current?.focus();
  function changed(){const active=!!document.fullscreenElement;setFullscreen(active);if(active)wasFullscreen.current=true;else if(wasFullscreen.current)onClose();}
  function keyboard(e:KeyboardEvent){
   if(e.key==='Escape'&&!document.fullscreenElement){e.preventDefault();onClose();}
   if(e.key==='Tab'&&dialog.current){const items=Array.from(dialog.current.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],[tabindex="0"]'));const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}
  }
  const reauthenticate=()=>{onClose();if(document.fullscreenElement)void document.exitFullscreen().catch(()=>{});};
  changed();document.addEventListener('fullscreenchange',changed);document.addEventListener('keydown',keyboard);window.addEventListener('aegis:session-expired',reauthenticate);const tick=setInterval(()=>setNow(Date.now()),1000);
  return()=>{clearInterval(tick);document.removeEventListener('fullscreenchange',changed);document.removeEventListener('keydown',keyboard);window.removeEventListener('aegis:session-expired',reauthenticate);if(shell)shell.inert=false;document.body.style.overflow=oldOverflow;previous?.focus();};
 },[]);
 async function exit(){if(document.fullscreenElement){try{await document.exitFullscreen();}catch{}}onClose();}
 const level=data?.level||'NONE';
 const acquisitionLive=!!data?.slots[0]?.metrics.some(m=>current(m,now));
 const yellow=data?.alerts.find(a=>a.level==='YELLOW');const redCount=data?.alerts.filter(a=>a.level==='RED').length||0;
 return createPortal(<div ref={dialog} className="operational-overlay" data-device={device} data-level={level} role="dialog" aria-modal="true" aria-label={tr('Operational focus view')}>
  <header className="focus-header"><div><div className="eyebrow">AURORA / {tr('OPERATIONAL FOCUS')}</div><h1>{device==='TV'?tr('Station TV'):crew.displayName}</h1><p>{tr(data?.label||environments.find(e=>e.key===zone)!.label)}</p></div><div className="focus-controls"><span className={query.error||!acquisitionLive?'amber':'green'}><Radio size={14}/>{tr(query.error?'Data feed unavailable':acquisitionLive?'Local data feed':'Last recorded data · no live telemetry')}</span><span className="focus-clock">{new Date(now).toLocaleTimeString(locale(),{timeZone:'UTC',hour12:false})} UTC</span><button ref={closeButton} onClick={exit}><ArrowLeft size={16}/>{tr('Exit focus')}</button></div></header>
  <nav className="focus-zone-switcher" aria-label={tr('Operational environment')}>{environments.map(e=><button key={e.key} aria-pressed={zone===e.key} onClick={()=>onZone(e.key)}>{tr(e.label)}</button>)}</nav>
  <DevicePreferences device={device} onDevice={setDevice}/><ContinuityBanner/>
  <div className="focus-radiation" aria-label={tr('Permanent radiation monitoring')}><span>{tr('RADIATION · ALWAYS VISIBLE')}</span>{data?.radiation.map(m=><div key={m.key} data-metric={m.key} data-observed-at={m.observedAt||undefined} title={m.observedAt?observed(m.observedAt)+' UTC':tr('No data')}><small>{tr(m.label)}</small><strong>{value(m,now)} <small>{tr(m.unit)}</small></strong>{!current(m,now)&&<small>{status(m)}</small>}</div>)}<span className="focus-synthetic">{tr('SYNTHETIC DATA · RESEARCH ONLY')}</span></div>
  {!fullscreen&&<div className="focus-fullscreen-notice"><span>{tr('Full-window view active. Browser fullscreen may require permission.')}</span><button onClick={()=>document.documentElement.requestFullscreen?.().catch(()=>{})}><Expand size={14}/>{tr('Enter browser fullscreen')}</button></div>}
  {query.error&&<div className="focus-warning" role="alert">{tr('Data feed unavailable. Last alert remains visible; stale measurements are not shown as live.')}</div>}
  {device==='DETAIL'&&<>{level==='YELLOW'&&<div className="focus-warning" role="status"><TriangleAlert size={21}/><div><strong>{tr('YELLOW · ATTENTION')} · {tr(yellow?.measurement.label||'Review requested')}</strong><p>{tr(data!.guidance.yellow)}</p></div></div>}
  {level==='RED'&&<div className="focus-critical" role="alert"><ShieldAlert size={23}/><div><strong>{tr('RED · EMERGENCY OVERRIDE')} · {redCount} {tr('active demo alerts')} · {data?.alerts.filter(a=>a.level==='RED').map(a=>tr(a.measurement.label)).join(', ')}</strong><p>{tr('Universal measurements remain fixed. A secondary red alert replaces only the lowest-priority contextual slot.')}</p></div></div>}
  {!data?<div className="focus-loading">{tr(query.error?'Service unavailable':'Loading operational measurements…')}</div>:<div className="focus-slots">{data.slots.map(slot=><section key={slot.id} className={'focus-slot '+(slot.kind==='UNIVERSAL'?'focus-universal':'')+(slot.kind==='OVERRIDE'?' focus-override':'')} data-slot={slot.id} data-kind={slot.kind}>
   <div className="focus-slot-title"><small>{tr('SLOT')} {slot.id} · {tr(slot.kind==='UNIVERSAL'?'FIXED':slot.kind==='OVERRIDE'?'OVERRIDE':'CONTEXT')}</small><h2>{tr(slot.title)}</h2></div>
   <div className={'focus-measurements '+(slot.metrics.length===1?'focus-single':'')}>{slot.metrics.map((m,index)=><div className={index===0?'focus-primary-reading':'focus-secondary-reading'} key={m.key} data-metric={m.key} data-observed-at={m.observedAt||undefined} data-recorded={!current(m,now)} title={m.observedAt?observed(m.observedAt)+' UTC':tr('No data')}><span>{tr(m.label)}{m.cadence==='PERIODIC'&&<small>{tr('PERIODIC')}</small>}{m.source==='DERIVED'&&<small>{tr('DERIVED')}</small>}</span><div><strong>{value(m,now)}</strong><small>{tr(m.unit)}</small></div>{!current(m,now)&&<em>{status(m)}</em>}</div>)}</div>
   {slot.kind==='OVERRIDE'?<div className="focus-procedure"><strong>{tr('Human review procedure · demo')}</strong><ol>{data.guidance.steps.map((step,index)=><li key={index}>{tr(step)}</li>)}</ol><small>{tr('Replaces')}: {tr(slot.replacedTitle||'')} · {tr('Demo rules v1')}</small></div>:slot.note&&<p className="focus-slot-note">{tr(slot.note)}</p>}
   <div className="focus-observed">{tr('Last observation (UTC)')}: {slot.metrics[0]?.observedAt?observed(slot.metrics[0].observedAt):tr('No data')}</div>
  </section>)}</div>}
  {level==='RED'&&!data?.slots.some(s=>s.kind==='OVERRIDE')&&<details open className="focus-universal-procedure"><summary>{tr('Human review procedure · demo')}</summary><ol>{data?.guidance.steps.map((step,index)=><li key={index}>{tr(step)}</li>)}</ol></details>}
  </>}{device!=='DETAIL'&&<DeviceDisplay device={device} crew={crew} zone={zone} data={data} error={!!query.error} now={now}/>}<footer className="focus-footer"><span>{tr('Explainable demo rules · no autonomous diagnosis or treatment')}</span><span>{tr('Selecting a zone changes display priorities, not the physical environment or simulation.')}</span></footer>
 </div>,document.body);
}






