import {useRef,useState,type FormEvent} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {NotebookPen} from 'lucide-react';
import {api,type Session} from './api';
import {locale,tr,usePreferences} from './preferences';

export type CheckIn={id:string;recordedAt:string;observedAt:string;title:string;category:string;sleepHours:number|null;fatigueScore:number|null;notes:string};
const categories={GENERAL:'General observation',SLEEP:'Sleep & rest',ACTIVITY:'Activity & routine',WELLBEING:'Personal wellbeing',NUTRITION:'Food & hydration',OTHER:'Other information'};
const utcNow=()=>new Date().toISOString().slice(0,16);
const date=(stamp:string)=>new Date(stamp).toLocaleString(locale(),{timeZone:'UTC',hour12:false});

export function Logbook({subjectId,session}:{subjectId:string;session:Session}){
 usePreferences();const client=useQueryClient();const saving=useRef(false);
 const [page,setPage]=useState(1),[busy,setBusy]=useState(false),[error,setError]=useState<unknown>(),[saved,setSaved]=useState(false);
 const q=useQuery({queryKey:['checkins',subjectId,page],queryFn:()=>api<CheckIn[]>(`/check-ins?subjectId=${subjectId}&page=${page}`),refetchInterval:30000});
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(saving.current)return;
  const form=e.currentTarget;const data=new FormData(form);saving.current=true;setBusy(true);setSaved(false);setError(null);
  try{
   await api('/check-ins','POST',{crewMemberId:subjectId,title:String(data.get('title')),category:String(data.get('category')),notes:String(data.get('notes')),observedAt:new Date(`${data.get('observedAt')}:00.000Z`).toISOString(),
    ...(data.get('sleepHours')!==''?{sleepHours:Number(data.get('sleepHours'))}:{}),...(data.get('fatigueScore')!==''?{fatigueScore:Number(data.get('fatigueScore'))}:{})});
   form.reset();setPage(1);setSaved(true);await client.invalidateQueries({queryKey:['checkins',subjectId]});
  }catch(err){setError(err);}finally{saving.current=false;setBusy(false);}
 }
 return <><div className="personal-section-heading"><span className="personal-kicker">{tr('MANUAL RECORDS · ONBOARD')}</span><h2>{tr('Your mission logbook')}</h2><p>{tr('Record your day, personal observations and anything you consider relevant. Sleep and fatigue are optional.')}</p></div>
 <div className="logbook-grid"><section className="panel personal-records logbook-compose"><h2><NotebookPen size={18}/>{tr('New logbook entry')}</h2><p>{tr('Entries are shared according to mission permissions. This is not a private diary.')}</p>
 {session.role==='DEMO_VIEWER'?<p className="notice">{tr('Read-only access. Sign in with an authorized account to add entries.')}</p>:<form onSubmit={submit} className="personal-check-form">
  <fieldset disabled={busy} className="logbook-fields">
   <label className="personal-wide">{tr('Entry title (optional)')}<input name="title" maxLength={120}/></label>
   <label>{tr('Category')}<select name="category" defaultValue="GENERAL">{Object.entries(categories).map(([value,label])=><option key={value} value={value}>{tr(label)}</option>)}</select></label>
   <label>{tr('Observation date & time (UTC)')}<input name="observedAt" type="datetime-local" defaultValue={utcNow()} max={utcNow()} required/></label>
   <label className="personal-wide">{tr('Logbook notes')}<textarea name="notes" rows={7} minLength={3} maxLength={4000} required placeholder={tr('What happened? What would you like to leave on record?')}/><small>{tr('Free text · up to 4,000 characters. Use the demo with fictitious information only.')}</small></label>
   <label>{tr('Sleep (hours, optional)')}<input name="sleepHours" type="number" min="0" max="24" step="0.1"/></label>
   <label>{tr('Fatigue (0–10, optional)')}<input name="fatigueScore" type="number" min="0" max="10" step="1"/></label>
   <button className="primary" type="submit">{tr(busy?'Saving…':'Save logbook entry')}</button>
  </fieldset>
 </form>}
 {!!error&&<p className="error" role="alert">{tr('Entry not saved. Your text is still in the form.')} {tr(error instanceof Error?error.message:'Service unavailable')}</p>}
 {saved&&<p className="notice" role="status">{tr('Logbook entry saved.')}</p>}
 </section><section className="panel personal-records logbook-history" aria-label={tr('Logbook history')}><div className="personal-panel-heading"><h2>{tr('Logbook history')}</h2><span className="personal-chip">{tr('Newest observations first')}</span></div><p>{tr('Human observations · separate from sensor readings and automatic alerts.')}</p>
 {q.isPending&&<p role="status">{tr('Loading logbook…')}</p>}
 {q.error&&<div className="error" role="alert"><p>{tr('Logbook unavailable. Previously loaded entries may be outdated.')}</p><button onClick={()=>q.refetch()}>{tr('Retry')}</button></div>}
 {q.data?.map(x=><article className="personal-log logbook-entry" key={x.id}><div className="personal-panel-heading"><span className="personal-chip">{tr(categories[x.category as keyof typeof categories]||'General observation')}</span><time dateTime={x.observedAt||x.recordedAt}>{date(x.observedAt||x.recordedAt)} UTC</time></div><h3>{x.title||tr('Untitled observation')}</h3><p className="personal-note">{x.notes}</p>{(x.sleepHours!=null||x.fatigueScore!=null)&&<div className="logbook-values">{x.sleepHours!=null&&<span>{tr('Sleep')} · {x.sleepHours.toLocaleString(locale())} h</span>}{x.fatigueScore!=null&&<span>{tr('Fatigue')} · {x.fatigueScore.toLocaleString(locale())}/10</span>}</div>}<small>{tr('Saved on board')} · {date(x.recordedAt)} UTC</small></article>)}
 {!q.isPending&&!q.error&&!q.data?.length&&<div className="logbook-empty"><NotebookPen size={30}/><h3>{tr('No logbook entries yet.')}</h3><p>{tr('Your observations will appear here after you save them.')}</p></div>}
 <div className="actions logbook-pagination"><button disabled={page===1||q.isFetching} onClick={()=>setPage(p=>p-1)}>{tr('Newer entries')}</button><span>{tr('Page')} {page}</span><button disabled={!q.data||q.data.length<50||q.isFetching} onClick={()=>setPage(p=>p+1)}>{tr('Older entries')}</button></div>
 </section></div></>;
}
