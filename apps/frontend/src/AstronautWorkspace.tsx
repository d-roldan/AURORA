import {useEffect,useState,type FormEvent,type ReactNode} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {Activity,ArrowRight,Brain,CalendarDays,Heart,Leaf,NotebookPen,Orbit,UserRound} from 'lucide-react';
import {api,type Crew,type EventRecord,type Point,type Reading,type Session} from './api';
import {Chart} from './Chart';
import {EnvironmentModes,PersonalSafety} from './OperationalView';
import {tr,locale,usePreferences} from './preferences';
import {latestValue} from './retained';
import {personalTrendWindow,periodicObservations} from './chart-data';
import {Logbook,type CheckIn} from './Logbook';
import {CrewPortrait} from './CrewPortrait';

type Metric={key:string;label:string;category:string;unit:string;cadence:string;expectedIntervalMs:number;staleAfterMs:number;description:string;sourceKind:string;subjectId:string;latest:Reading|null};
const sections=[{key:'home',label:'Home',icon:Orbit},{key:'body',label:'Body & indicators',icon:UserRound},{key:'routine',label:'Routine & check-ins',icon:CalendarDays},{key:'trends',label:'Signals & trends',icon:Activity},{key:'quiet',label:'Quiet Space',icon:Leaf}] as const;
type Section=typeof sections[number]['key'];
const zones=[
 {key:'Cognitive',label:'Brain & cognition',x:180,y:67},
 {key:'Respiratory',label:'Respiratory',x:144,y:180},
 {key:'Cardiovascular',label:'Heart & circulation',x:207,y:204},
 {key:'Metabolic',label:'Metabolism',x:180,y:272},
 {key:'Muscular',label:'Muscle & activity',x:112,y:315},
 {key:'Bone',label:'Bone records',x:211,y:412},
] as const;
const date=(stamp:string)=>new Date(stamp).toLocaleString(locale(),{timeZone:'UTC',hour12:false});
function Failure({error}:{error:unknown}){return error?<div className="error" role="alert">{tr(error instanceof Error?error.message:'Service unavailable')}</div>:null;}

export function Companion(){return <svg className="aurora-companion" viewBox="0 0 220 250" fill="none" aria-hidden="true">
 <ellipse cx="110" cy="232" rx="64" ry="10" fill="var(--panel-alt)"/>
 <g fill="var(--panel-bg)" stroke="var(--border)" strokeWidth="2"><path d="M52 216C50 176 62 148 76 135C94 120 126 120 144 135C158 148 170 176 168 216C167 234 53 234 52 216Z"/><path d="M72 138C52 146 40 176 46 202C48 214 59 215 63 203L74 156M148 138C168 146 180 176 174 202C172 214 161 215 157 203L146 156"/><rect x="98" y="106" width="24" height="22" rx="10"/><ellipse cx="110" cy="72" rx="44" ry="40"/></g>
 <path d="M68 62C72 34 148 34 152 62C136 52 84 52 68 62Z" fill="var(--sage-wash)"/>
 <rect x="78" y="60" width="64" height="30" rx="15" fill="var(--panel-alt)"/>
 <path d="M94 75H126" stroke="var(--accent)" strokeWidth="2"/><g fill="var(--accent)"><circle cx="93" cy="75" r="4.8"/><circle cx="127" cy="75" r="4.8"/></g>
 <path d="M84 126Q110 142 136 126" stroke="var(--sand-ink)" strokeWidth="3"/><circle cx="110" cy="164" r="14" fill="var(--sage-wash)" stroke="var(--green)"/><circle cx="110" cy="164" r="6" fill="var(--accent)"/>
</svg>;}

function MetricTile({metric}:{metric?:Metric}){
 const r=metric?.latest;const val=r?latestValue(r):null;
 const fresh=!!r&&r.quality==='GOOD'&&r.freshness==='LIVE'&&Date.now()-Date.parse(r.observedAt)<=metric!.staleAfterMs;
 return <article className="personal-metric" data-metric={metric?.key} data-observed-at={r?.observedAt} data-recorded={!!r&&!fresh}>
  <span>{tr(metric?.label||'No data')}</span><strong>{val===null?'—':val.toLocaleString(locale(),{maximumFractionDigits:2})}<small>{metric?.unit}</small></strong>
  <div className={fresh?'personal-provenance':'retained-label'}>{tr(!r?'No data':fresh?(metric?.cadence==='PERIODIC'?'Stored record':'Latest observation'):'Last recorded · not live')}</div>
  {r&&<time dateTime={r.observedAt}>{date(r.observedAt)} UTC</time>}
  <small>{tr(metric?.sourceKind||'')} · {tr(metric?.cadence||'')}{r?.quality!=='GOOD'&&r?` · ${tr(r.quality)}`:''}</small>
 </article>;
}

function MetricTrend({metric}:{metric?:Metric}){
 const qc=useQueryClient();const span=personalTrendWindow(metric);const key=['personalTrend',metric?.subjectId,metric?.key,span];
 const q=useQuery({queryKey:key,enabled:!!metric&&metric.cadence!=='WAVEFORM',refetchInterval:10000,queryFn:async()=>{
  const end=new Date(),start=new Date(end.getTime()-span);
  const points=await api<Point[]>(`/telemetry/history?subjectId=${metric!.subjectId}&metric=${metric!.key}&from=${start.toISOString()}&to=${end.toISOString()}`);
  return points.length?points:qc.getQueryData<Point[]>(key)||points;
 }});
 const stored=q.data||[];const points=metric?.cadence==='PERIODIC'?periodicObservations(stored,metric.expectedIntervalMs):stored;const last=points.at(-1);const retained=!!last&&Date.now()-Date.parse(last.time)>(metric?.staleAfterMs||10000);
 return <section className="panel personal-trend"><div className="personal-panel-heading"><div><span className="personal-kicker">{tr('STORED OBSERVATIONS')} · {span===3600000?tr('Last hour'):`${span/86400000} ${tr('days')}`}</span><h2>{tr(metric?.label||'Awaiting acquisition')}</h2></div><span className="personal-chip">{metric?.unit||'—'}</span></div><Failure error={q.error}/>
  {retained&&<p className="retained-label">{tr('Last recorded · not live')} · {date(last.time)} UTC</p>}
  <Chart series={metric?[{key:metric.key,name:metric.label,points,unit:metric.unit,periodic:metric.cadence==='PERIODIC'}]:undefined} height={245}/><p className="personal-footnote">{tr('Latest stored observation per record interval. Lines do not add measurements.')}</p>
 </section>;
}

export function AstronautWorkspace({crew,session,events,checks,checkError,onEdit,ecg,history}:{crew:Crew;session:Session;events:EventRecord[];checks:CheckIn[];checkError:unknown;onEdit:(e:FormEvent<HTMLFormElement>)=>Promise<void>;ecg:ReactNode;history:ReactNode}){
 usePreferences();const [section,setSection]=useState<Section>('home');const [domain,setDomain]=useState<string>('Cardiovascular');const [trendKey,setTrendKey]=useState('heart_rate');
 const catalog=useQuery({queryKey:['metricCatalog',crew.id],queryFn:()=>api<Metric[]>(`/telemetry/catalog?subjectId=${crew.id}`),refetchInterval:10000});
 const metrics=catalog.data||[];const metric=(key:string)=>metrics.find(m=>m.key===key);
 const group=metrics.filter(m=>m.category===domain&&m.cadence!=='WAVEFORM');
 const domains=[...new Set(metrics.map(m=>m.category))];
 const openEvents=events.filter(e=>e.status!=='RESOLVED');
 return <div className="astronaut-workspace">
  <header className="personal-header"><CrewPortrait crew={crew} size="header"/><div className="personal-header-copy"><span className="personal-kicker">{tr('YOUR ONBOARD WORKSPACE')} · {crew.code}</span><h1>{tr('Welcome back,')} <strong>{crew.displayName}</strong></h1><p>{crew.role} · {tr('Fictitious astronaut · Synthetic source')}</p></div><span className="personal-chip"><Orbit size={14}/>{tr('Local / onboard')}</span></header>
  <PersonalSafety crew={crew}/>
  <nav className="personal-nav" aria-label={tr('Personal workspace navigation')}>{sections.map(({key,label,icon:Icon})=><button key={key} aria-current={section===key?'page':undefined} onClick={()=>setSection(key)}><Icon size={17}/>{tr(label)}</button>)}</nav>
  <Failure error={catalog.error}/>
  <section aria-label={tr(sections.find(s=>s.key===section)!.label)}>
  {section==='home'&&<><div className="personal-home-grid"><section className="panel personal-welcome"><div className="personal-companion-frame"><Companion/><span className="personal-chip">{tr('AURORA · Onboard companion')}</span></div><div className="personal-welcome-copy"><span className="personal-kicker">{tr('A MOMENT FOR YOU')}</span><h2>{tr('Your mission.')}<br/><strong>{tr('Your personal space.')}</strong></h2><p>{tr('Review your observations, explore your trends and keep a record of your day, here on board.')}</p><div className="actions"><button className="primary" onClick={()=>setSection('routine')}><NotebookPen size={16}/>{tr('Record check-in')}</button><button onClick={()=>setSection('quiet')}><Leaf size={16}/>{tr('Open Quiet Space')}</button></div><div className="personal-context"><span><Heart size={16}/>{tr('Individual reference')}</span>{crew.baselines.map(b=><p key={b.metricKey+':'+b.version}>{tr(b.metricKey)} · <strong>{b.center} {metric(b.metricKey)?.unit}</strong> · {tr('Version')} {b.version}</p>)}{!crew.baselines.length&&<p>{tr('No data')}</p>}<small>{tr('Frozen fictitious parameters. No clinical interpretation.')}</small></div></div></section><div className="personal-summary-grid">{['exercise_duration','sleep_duration','hrv_rmssd','mood'].map(key=><MetricTile key={key} metric={metric(key)}/>)}<div className="personal-summary-trend"><MetricTrend metric={metric('sleep_duration')}/></div></div></div>
   <div className="personal-lower-grid"><section className="panel personal-records"><div className="personal-panel-heading"><h2>{tr('Human review')}</h2><span className="personal-chip">{openEvents.length} {tr('open events')}</span></div>{openEvents.length?openEvents.slice(0,4).map(e=><article key={e.id} className="personal-log"><strong>{tr(e.type.replaceAll('_',' '))}</strong><p>{tr(e.status)} · {date(e.firstObservedAt)} UTC</p><p>{e.evidence.explanation}</p></article>):<p>{tr('No open review events. Absence of a flag is not health evidence.')}</p>}</section><section className="panel personal-records"><div className="personal-panel-heading"><h2>{tr('Your latest check-in')}</h2><button onClick={()=>setSection('routine')}><ArrowRight size={16}/>{tr('View records')}</button></div><Failure error={checkError}/>{checks[0]?<><p>{date(checks[0].observedAt||checks[0].recordedAt)} UTC</p>{checks[0].sleepHours!=null&&<p>{tr('Sleep')} {checks[0].sleepHours} h</p>}{checks[0].fatigueScore!=null&&<p>{tr('Fatigue')} {checks[0].fatigueScore}/10</p>}{checks[0].title&&<h3>{checks[0].title}</h3>}<p className="personal-note">{checks[0].notes}</p></>:<p>{tr('No check-ins recorded.')}</p>}</section></div>{ecg}<EnvironmentModes crew={crew}/></>}
  {section==='body'&&<><div className="personal-section-heading"><h2>{tr('Body schema & individual indicators')}</h2><p>{tr('Select a system to explore recorded evidence. This map does not assess health.')}</p></div><div className="personal-body-grid"><section className="panel personal-body-map"><span className="personal-kicker">{tr('EXPLORE BY SYSTEM')}</span><svg viewBox="0 0 360 510" role="img" aria-label={tr('Body system navigation')}><path className="body-outline" d="M165 110C138 98 137 49 154 32C168 16 193 16 207 32C224 49 222 98 195 110L198 134C226 141 250 151 258 176L289 295Q291 312 278 316Q265 318 262 304L234 223L229 301L221 468Q220 486 207 486Q193 486 194 469L185 349H175L166 469Q167 486 153 486Q140 486 139 468L131 301L126 223L98 304Q95 318 82 316Q69 312 71 295L102 176C110 151 134 141 162 134Z"/><path d="M180 115V335M142 177H218M150 291H210" stroke="var(--border)" strokeDasharray="4 6"/>{zones.map(z=><g key={z.key} role="button" tabIndex={0} aria-label={tr(z.label)} aria-pressed={domain===z.key} onClick={()=>setDomain(z.key)} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();setDomain(z.key);}}}><circle cx={z.x} cy={z.y} r={domain===z.key?20:12} fill={domain===z.key?'var(--accent)':'var(--sage-wash)'} stroke="var(--accent)"/><circle cx={z.x} cy={z.y} r="4" fill={domain===z.key?'var(--primary-ink)':'var(--accent)'}/></g>)}</svg><div className="body-zone-buttons" aria-label={tr('Select a body system')}>{zones.map(z=><button key={z.key} aria-pressed={domain===z.key} onClick={()=>setDomain(z.key)}>{tr(z.label)}</button>)}</div></section><div><div className="personal-panel-heading"><h2>{tr(domain)}</h2><span className="personal-chip">{group.length} {tr('indicators')}</span></div><div className="personal-domain-metrics">{group.map(m=><MetricTile key={m.key} metric={m}/>)}{!group.length&&<p>{tr('No data')}</p>}</div><label className="personal-trend-picker">{tr('Trend indicator')}<select value={(group.find(m=>m.key===trendKey)||group[0])?.key||''} onChange={e=>setTrendKey(e.target.value)}>{group.map(m=><option value={m.key} key={m.key}>{tr(m.label)} · {m.unit}</option>)}</select></label><MetricTrend metric={group.find(m=>m.key===trendKey)||group[0]}/></div></div><div className="personal-domain-list" aria-label={tr('All indicator domains')}>{domains.map(d=><button key={d} aria-pressed={domain===d} onClick={()=>setDomain(d)}>{tr(d)}</button>)}</div></>}
  {section==='routine'&&<><Logbook subjectId={crew.id} session={session}/>{session.role==='ADMIN'&&<form className="panel form-panel" onSubmit={onEdit}><h2>{tr('Edit fictitious profile')}</h2><div className="form-row"><label>{tr('Display name')}<input name="displayName" defaultValue={crew.displayName} minLength={3} required/></label><label>{tr('Role')}<input name="role" defaultValue={crew.role} minLength={3} required/></label><button>{tr('Save profile')}</button></div></form>}</>}
  {section==='trends'&&<>{ecg}{history}<section className="panel personal-records"><h2>{tr('Individual reference')}</h2>{crew.baselines.map(b=><p key={b.metricKey+':'+b.version}>{tr(b.metricKey)} · {b.center} · {tr('Version')} {b.version} · {b.method}</p>)}<p>{tr('Frozen fictitious parameters. No clinical interpretation.')}</p></section><EnvironmentModes crew={crew}/></>}
  {section==='quiet'&&<QuietSpace/>}
  </section>
 </div>;
}

function QuietSpace(){
 const [active,setActive]=useState(false);const [seconds,setSeconds]=useState(0);const {language}=usePreferences();
 useEffect(()=>{if(!active)return;const interval=setInterval(()=>setSeconds(s=>s+1),1000);return()=>clearInterval(interval);},[active]);
 return <div className="personal-quiet-grid"><section className="panel personal-quiet-landscape"><div className="quiet-landscape" aria-hidden="true"><svg viewBox="0 0 800 360" preserveAspectRatio="xMidYMid slice"><circle cx="580" cy="90" r="45" fill="var(--sand-wash)"/><path d="M0 250L130 110L290 245L410 150L640 290L800 170V360H0Z" fill="var(--sage-wash)"/><path d="M0 290L240 205L440 310L690 210L800 270V360H0Z" fill="var(--green)" opacity=".35"/><path d="M0 335Q200 265 390 330T800 310V360H0Z" fill="var(--accent)" opacity=".4"/></svg></div><span className="personal-kicker">{tr('QUIET SPACE')}</span><h2>{tr('A little room to pause.')}</h2><p>{tr('A quiet visual space, available locally. Return to your workspace whenever you choose.')}</p><small>{tr('Illustration · not an external Earth feed')}</small></section><section className="panel personal-records personal-pause"><Leaf size={28}/><h2>{tr('Take a moment')}</h2><p>{tr('An optional pause timer. No health assessment or breathing instructions.')}</p><div className="personal-pause-orb"><span>{Math.floor(seconds/60).toLocaleString(language==='es'?'es-AR':'en-GB',{minimumIntegerDigits:2})}:{String(seconds%60).padStart(2,'0')}</span></div><div className="actions"><button className="primary" onClick={()=>setActive(v=>!v)}>{tr(active?'Pause timer':'Start timer')}</button><button onClick={()=>{setActive(false);setSeconds(0);}}>{tr('Reset timer')}</button></div></section><section className="panel personal-records personal-quiet-note"><Brain size={20}/><div><h2>{tr('Your observations matter')}</h2><p>{tr('Use Routine & check-ins to record an observation. Entries follow mission access permissions and are not a private diary.')}</p></div></section></div>;
}

