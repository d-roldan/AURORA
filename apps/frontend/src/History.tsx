import {useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {Download,CheckCheck,ListFilter} from 'lucide-react';
import {api,Crew,EventRecord,Point,Reading} from './api';
import {Chart,SignalSeries} from './Chart';
import {periodicObservations} from './chart-data';
import {tr,locale,usePreferences} from './preferences';
type Metric={key:string;label:string;unit:string;category:string;cadence:string;expectedIntervalMs:number;sourceKind:string;description:string;subjectId:string;displayMin:number;displayMax:number;latest:Reading|null;baseline:number|null};
type StoredSeries={metric:Metric;subjectId:string;points:Point[];error?:string;comparison?:boolean;retained?:boolean};
const localDate=(date:Date)=>new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16);
const categoryOrder=['Cardiovascular','Respiratory','Metabolic','Muscular','Bone','Psychological','Cognitive','Sleep','Radiation','Environmental','Operational'];
const palette=['#38aab8','#e0a345','#9d7ce1','#459f72','#d5749f','#7c96c8','#ba7b49','#689d9d','#ad935e','#b86779','#8e9b53','#5b87b7'];
export function History({subjectId}:{subjectId:string}){
 const {theme}=usePreferences();
 const qc=useQueryClient();
 const [selected,setSelected]=useState<string[]|null>(null);const [comparison,setComparison]=useState('');const [scale,setScale]=useState('normalized');
 const [window,setWindow]=useState('129600');const [from,setFrom]=useState(localDate(new Date(Date.now()-3600000)));const [to,setTo]=useState(localDate(new Date()));
 const crew=useQuery({queryKey:['crew'],queryFn:()=>api<Crew[]>('/crew')});
 const catalog=useQuery({queryKey:['metricCatalog',subjectId],queryFn:()=>api<Metric[]>(`/telemetry/catalog?subjectId=${subjectId}`),refetchInterval:10000});
 const eventQuery=useQuery({queryKey:['chartEvents',subjectId],queryFn:()=>api<EventRecord[]>(`/events?subjectId=${subjectId}`)});
 const metrics=catalog.data||[];const active=selected===null?metrics.map(m=>m.key):selected;
 const historyKey=['allMetricHistory',subjectId,comparison,window,window==='custom'?from:null,window==='custom'?to:null,metrics.length];
 const q=useQuery({queryKey:historyKey,enabled:!!metrics.length,refetchInterval:10000,queryFn:async()=>{
  const previous=qc.getQueryData<StoredSeries[]>(historyKey)||[];
  const start=window==='custom'?new Date(from).getTime():Date.now()-Number(window)*60000;const end=window==='custom'?new Date(to).getTime():Date.now();
  if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start||end-start>90*86400000)throw new Error('Choose a valid range of up to 90 days.');
  const configs=metrics.map(m=>({metric:m,subject:m.subjectId,comparison:false}));
  if(comparison&&comparison!==subjectId)configs.push(...metrics.filter(m=>m.category!=='Environmental').map(m=>({metric:m,subject:comparison,comparison:true})));
  return Promise.all(configs.map(async c=>{
   const wave=c.metric.cadence==='WAVEFORM';const range=`&from=${new Date(wave?Math.max(start,end-30000):start).toISOString()}&to=${new Date(end).toISOString()}`;
   const old=previous.find(s=>s.metric.key===c.metric.key&&s.subjectId===c.subject&&s.comparison===c.comparison);
   try{const points=await api<Point[]>(`/telemetry/${wave?'waveforms':'history'}?subjectId=${c.subject}${wave?'':'&metric='+c.metric.key}${range}`);const retained=window!=='custom'&&!points.length&&!!old?.points.length;return {metric:c.metric,subjectId:c.subject,comparison:c.comparison,points:retained?old!.points:points,retained} as StoredSeries;}
   catch(error){return {metric:c.metric,subjectId:c.subject,comparison:c.comparison,points:old?.points||[],retained:!!old?.points.length,error:error instanceof Error?error.message:'Service unavailable'} as StoredSeries;}
  }));
 }});
 const units=[...new Set(metrics.filter(m=>active.includes(m.key)).map(m=>m.unit))];const normalized=scale==='normalized'||units.length>2;
 // Hide unselected series from original-unit axes; normalized mode keeps the complete clickable legend.
 const stored=(q.data||[]).filter(s=>normalized||active.includes(s.metric.key));
 const signals:SignalSeries[]=stored.map((s,i)=>({key:s.metric.key+(s.comparison?':compare':''),name:`${s.metric.category==='Environmental'?'Habitat':crew.data?.find(c=>c.id===s.subjectId)?.displayName||'Crew'} · ${s.metric.label}`,points:s.metric.cadence==='PERIODIC'?periodicObservations(s.points,s.metric.expectedIntervalMs):s.points,unit:s.metric.unit,color:`hsl(${(i*137.508)%360},60%,${theme==='light'?40:65}%)`,displayMin:s.metric.displayMin,displayMax:s.metric.displayMax,periodic:s.metric.cadence==='PERIODIC',...(s.metric.baseline!==null&&!s.comparison?{baseline:s.metric.baseline,threshold:s.metric.baseline*1.2}:{})}));
 const visible=signals.filter(s=>active.includes(s.key!.replace(':compare',''))).map(s=>s.key!);
 function toggle(key:string,checked:boolean){setSelected(checked?[...new Set([...active,key])]:active.filter(k=>k!==key));}
 const events=(eventQuery.data||[]).map(e=>({time:e.firstObservedAt,label:e.type.replaceAll('_',' ')}));
 const errors=q.data?.filter(s=>s.error)||[];
 const retained=q.data?.filter(s=>s.retained)||[];
 const pointCount=stored.filter(s=>active.includes(s.metric.key)).reduce((n,s)=>n+s.points.length,0);
 function csv(){
  const escape=(v:unknown)=>'"'+String(v??'').replaceAll('"','""')+'"';
  const rows=[['observedAtUTC','subjectId','category','metric','value','unit','source','cadence','algorithmVersion','displayState']];
  for(const s of q.data||[])if(active.includes(s.metric.key))for(const p of s.points)rows.push([p.time,s.subjectId,s.metric.category,s.metric.key,String(p.value),s.metric.unit,p.source,s.metric.cadence,String((p as any).algorithmVersion||''),s.retained?'RETAINED':'STORED']);
  const url=URL.createObjectURL(new Blob([rows.map(r=>r.map(escape).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`aurora-all-metrics-${new Date().toISOString().replaceAll(':','-')}.csv`;a.click();URL.revokeObjectURL(url);
 }
 return <section className="panel history"><div className="panel-heading"><div><h2>{tr('Stored trends & comparison')}</h2><p>{tr('All astronaut metrics, shared habitat, and periodic records in one native chart.')}</p></div><button onClick={csv} disabled={!pointCount}><Download size={14}/>{tr('Export CSV')}</button></div>
 <div className="trend-controls"><label>{tr('Time range')}<select value={window} onChange={e=>setWindow(e.target.value)}><option value="15">{tr('Last 15 minutes')}</option><option value="60">{tr('Last hour')}</option><option value="1440">{tr('Last 24 hours')}</option><option value="10080">{tr('Last 7 days')}</option><option value="129600">{tr('Last 90 days')}</option><option value="custom">{tr('Custom range')}</option></select></label><label>{tr('Display scale')}<select value={normalized?'normalized':'original'} onChange={e=>setScale(e.target.value)}><option value="normalized">{tr('Relative overlay · all units')}</option><option value="original" disabled={units.length>2}>{tr('Original units · up to two units')}</option></select></label><label>{tr('Compare crew')}<select value={comparison} onChange={e=>setComparison(e.target.value)}><option value="">{tr('None')}</option>{crew.data?.filter(c=>c.id!==subjectId).map(c=><option value={c.id} key={c.id}>{c.displayName}</option>)}</select></label></div>
 {window==='custom'&&<div className="trend-controls"><label>{tr('From (local time)')}<input type="datetime-local" value={from} onChange={e=>setFrom(e.target.value)}/></label><label>{tr('To (local time)')}<input type="datetime-local" value={to} onChange={e=>setTo(e.target.value)}/></label></div>}
 {(catalog.error||q.error)&&<div className="error" role="alert">{tr((catalog.error||q.error)?.message)}</div>}
 <p className="personal-footnote">{tr('Latest stored observation per record interval. Lines do not add measurements.')}</p><div className="overlay-notice">{tr(normalized?'Relative plotting scale only: each metric uses its documented display range. This is not a health score. Tooltips and exports retain original values and units.':'Original values and unit axes. Select at most two different units for this view.')}</div>
 {!!retained.length&&<div className="continuity-banner" role="status">{tr('Last recorded series retained. Observation times are unchanged; this is not a live signal.')} {retained.map(s=>tr(s.metric.label)).join(', ')}</div>}
 <div className="metric-toolbar"><strong><ListFilter size={15}/>{active.length} / {metrics.length} {tr('metrics selected')}</strong><button onClick={()=>setSelected(null)}><CheckCheck size={14}/>{tr('Select all')}</button><button onClick={()=>setSelected([])}>{tr('Deselect all')}</button><small>{tr('Select with checkboxes or the chart legend.')}</small></div>
 <details className="metric-selection"><summary>{tr("Choose metrics by category")}</summary><div className="metric-picker">{categoryOrder.map(category=>{const group=metrics.filter(m=>m.category===category);if(!group.length)return null;const all=group.every(m=>active.includes(m.key));return <section className="metric-category" key={category}><button className="category-toggle" onClick={()=>setSelected(all?active.filter(k=>!group.some(m=>m.key===k)):[...new Set([...active,...group.map(m=>m.key)])])}>{tr(category)}<small>{group.filter(m=>active.includes(m.key)).length}/{group.length}</small></button>{group.map(m=><label className="metric-option" key={m.key} title={tr(m.description)+" / "+tr("Display range")+": "+m.displayMin+"–"+m.displayMax+" "+m.unit+" / "+(m.latest?.observedAt||tr("No data"))}><input type="checkbox" checked={active.includes(m.key)} onChange={e=>toggle(m.key,e.target.checked)}/><span>{tr(m.label)}<small>{tr(m.cadence)} · {tr(m.unit)} · {tr(m.sourceKind)}</small></span><strong>{m.latest?m.latest.value.toLocaleString(locale(),{maximumFractionDigits:2}):tr('N/A')}</strong></label>)}</section>;})}</div></details>
 {!active.length&&<p className="overlay-empty">{tr('No metrics selected. Choose a metric or select all.')}</p>}
 <Chart key={subjectId+window+from+to+scale} series={signals} normalized={normalized} visibleKeys={visible} onToggle={(name,checked)=>{const s=signals.find(s=>tr(s.name)===name);if(s)toggle(s.key!.replace(':compare',''),checked);}} events={events} height={420}/>
 <div className="chart-footer"><span>{pointCount.toLocaleString(locale())} {tr('persisted points · wheel to zoom / drag to pan · event annotations')}</span><span>{tr('ECG: last 30s · HRV: complete 5min window · periodic records are not continuous sensors')}</span></div>
 {!!errors.length&&<details className="metric-errors"><summary>{errors.length} {tr('series temporarily unavailable')}</summary>{errors.map((s,i)=><p key={i}>{tr(s.metric.label)}: {tr(s.error)}</p>)}</details>}
 <p className="periodic-note">{tr('Periodic records include labeled synthetic history and scenario observations at catalog cadence. They are not inferred from ECG.')}</p>
 </section>;
}
