import {useQueries,useQuery} from '@tanstack/react-query';
import {TriangleAlert} from 'lucide-react';
import {api,Crew} from './api';
import {tr,locale,setPreferences,usePreferences} from './preferences';
import {current,value,status} from './OperationalView';
import type {View,Measurement} from './OperationalView';

type Device='HUD'|'TV'|'DETAIL';
export function DevicePreferences({device,onDevice}:{device:Device;onDevice:(d:Device)=>void}){
 const prefs=usePreferences();
 return <div className="device-toolbar"><nav aria-label={tr('Display device')}>{(['HUD','TV','DETAIL'] as const).map((d,i)=><button key={d} aria-pressed={d===device} onClick={()=>onDevice(d)}>{tr(['Astronaut visor','Station TV','Detailed monitor'][i])}</button>)}</nav><div><button onClick={()=>setPreferences({language:prefs.language==='en'?'es':'en'})} aria-label={tr('Interface language')}>{prefs.language==='en'?'Español':'English'}</button><button onClick={()=>setPreferences({theme:prefs.theme==='dark'?'light':'dark'})}>{tr(prefs.theme==='dark'?'Light mode':'Dark mode')}</button></div></div>;
}
function Reading({m,now,error=false}:{m:Measurement;now:number;error?:boolean}){
 return <div className="device-reading" data-metric={m.key} data-recorded={error||!current(m,now)} data-observed-at={m.observedAt||undefined}><span>{tr(m.label)}</span><strong>{value(m,now)} <small>{tr(m.unit)}</small></strong><small>{tr(error?'Last recorded · not live':current(m,now)?'Latest observation':status(m))}</small><time>{m.observedAt?new Date(m.observedAt).toLocaleString(locale(),{timeZone:'UTC',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false})+' UTC':tr('No data')}</time></div>;
}
function AlertPopup({data,now,error=false}:{data:View;now:number;error?:boolean}){
 if(!data.alerts.length)return null;
 return <section className="device-alert" data-level={data.level} role="alert" aria-label={tr('Automatic operational alert')}><div className="device-alert-heading"><TriangleAlert/><strong>{tr(data.level==='RED'?'RED · EMERGENCY OVERRIDE':'YELLOW · ATTENTION')}</strong><span>{data.crew.displayName}</span></div><div className="device-alert-evidence">{data.alerts.map(a=><Reading key={a.eventId} m={a.measurement} now={now} error={error}/>)}</div><h3>{tr('Human review procedure · demo')}</h3>{data.level==='RED'?<ol>{data.guidance.steps.map(step=><li key={step}>{tr(step)}</li>)}</ol>:<p>{tr(data.guidance.yellow)}</p>}<small>{tr('Active conditions remain visible until the API confirms recovery.')}</small></section>;
}
export function DeviceDisplay({device,crew,zone,data,error,now}:{device:'HUD'|'TV';crew:Crew;zone:View['environment'];data?:View;error:boolean;now:number}){
 if(device==='TV')return <StationTV crew={crew} now={now}/>;
 return <div className="visor-display" data-environment={zone}><div className="device-caption">{tr('Astronaut visor')} · {crew.code}</div>{data?<><AlertPopup data={data} now={now} error={error}/>{!data.alerts.length&&<div className="visor-idle" role="status"><strong>{tr('No active operational alert')}</strong><p>{tr('No flag is not a health guarantee.')}</p></div>}<div className="visor-universal">{data.slots.filter(s=>s.kind==='UNIVERSAL').flatMap(s=>s.metrics).map(m=><Reading key={m.key} m={m} now={now} error={error}/>)}</div></>:<p role="status">{tr(error?'Service unavailable':'Loading operational measurements…')}</p>}<p className="device-caption">{tr('Synthetic demonstration · no clinical protocol configured')}</p></div>;
}
function StationTV({crew,now}:{crew:Crew;now:number}){
 const roster=useQuery({queryKey:['crew'],queryFn:()=>api<Crew[]>('/crew'),refetchInterval:10000,retry:1});
 const members=roster.data?.filter(c=>c.missionId===crew.missionId)||[crew];
 const views=useQueries({queries:members.map(c=>({queryKey:['operationalView',c.id,'STATION'],queryFn:()=>api<View>(`/crew/${c.id}/operational-view?environment=STATION`),refetchInterval:2000,retry:1}))});
 const cabin=useQuery({queryKey:['metricCatalog',crew.id],queryFn:()=>api<{key:string;scope:string;label:string;unit:string;staleAfterMs:number;latest?:{value:number;observedAt:string;quality:string;source:string;freshness:string}}[]>(`/telemetry/catalog?subjectId=${crew.id}`),refetchInterval:2000,retry:1});
 const cabinMetrics=(cabin.data||[]).filter(m=>['co2','oxygen','temperature','humidity','pressure'].includes(m.key)).map(m=>({key:m.key,label:m.label,unit:m.unit,staleAfterMs:m.staleAfterMs,value:m.latest?.value??null,source:m.latest?.source||null,observedAt:m.latest?.observedAt||null,availability:!m.latest?'NO_DATA':m.latest.quality!=='GOOD'?'LOW_QUALITY':m.latest.freshness==='LIVE'?'AVAILABLE':'STALE'}));
 // Severity comes exclusively from NestJS. Display every active episode; no dismissal or UI thresholds.
 const alerts=views.map((q,i)=>({data:q.data,error:!!q.error,member:members[i]})).filter(v=>!!v.data?.alerts.length).sort((a,b)=>Number(b.data!.level==='RED')-Number(a.data!.level==='RED'));
 const unavailable=!!roster.error||views.some(q=>q.error)||!!cabin.error;
 return <div className="station-display"><div className="station-title"><h2>{tr('Station TV')} <small>{tr('Authorized mission crew · location not tracked')}</small></h2><span>{tr('SYNTHETIC DATA · RESEARCH ONLY')}</span></div>{unavailable&&<p className="focus-warning" role="status">{tr('Station coverage incomplete. Retained readings and alerts are not live.')}</p>}{roster.isPending&&<p role="status">{tr('Loading operational measurements…')}</p>}<div className="station-alerts">{alerts.map(v=><AlertPopup key={v.member.id} data={v.data!} now={now} error={v.error}/>)}</div><div className="station-crew-grid">{members.map((member,i)=>{const q=views[i],v=q.data;return <section className="station-crew" data-level={v?.level||'UNKNOWN'} key={member.id}><header><h3>{member.displayName}</h3><strong>{tr(v?.level==='RED'?'RED · EMERGENCY OVERRIDE':v?.level==='YELLOW'?'YELLOW · ATTENTION':!v||q.error||!v.slots[0]?.metrics.some(m=>current(m,now))?'Data feed unavailable':'No active operational alert')}</strong></header>{v?<><div className="station-vitals">{v.slots.filter(s=>s.kind==='UNIVERSAL').flatMap(s=>s.metrics).map(m=><Reading key={m.key} m={m} now={now} error={!!q.error}/>)}</div><div className="station-radiation">{v.radiation.map(m=><Reading key={m.key} m={m} now={now} error={!!q.error}/>)}</div></>:<p>{tr(q.error?'Service unavailable':'Loading operational measurements…')}</p>}</section>;})}</div><section className="station-cabin"><h3>{tr('Habitat environment')}</h3><div>{cabinMetrics.map(m=><Reading key={m.key} m={m} now={now} error={!!cabin.error}/>)}</div>{!cabinMetrics.length&&<p>{tr('No data')}</p>}</section><p className="device-caption">{tr('No flag is not a health guarantee.')}</p></div>;
}


