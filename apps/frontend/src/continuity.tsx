import {useSyncExternalStore} from 'react';
import {QueryClient,useQueryClient} from '@tanstack/react-query';
import type {Session} from './api';
import {tr,usePreferences} from './preferences';

const names=new Set(['personalTrend','missions','crew','overview','crewDetail','operationalView','metricCatalog','wave','features','allMetricHistory','chartEvents']);
const MAX_BYTES=32*1024*1024;
type Snapshot={version:1;savedAt:number;entries:{key:readonly unknown[];data:unknown;updatedAt:number}[]};
let activeScope='';let generation=0;let timer:ReturnType<typeof setTimeout>|undefined;
let storageFailed=false;let restored=new Set<string>();
const listeners=new Set<()=>void>();
const emit=()=>listeners.forEach(fn=>fn());
const allowed=(key:readonly unknown[])=>names.has(String(key[0]));
const hash=(key:readonly unknown[])=>JSON.stringify(key);
const database=()=>new Promise<IDBDatabase>((resolve,reject)=>{
 const request=indexedDB.open('aegis-display-cache',1);
 request.onblocked=()=>reject(new Error('Display cache is blocked'));
 request.onupgradeneeded=()=>request.result.createObjectStore('snapshots');
 request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
});
async function read(scope:string):Promise<Snapshot|undefined>{
 const db=await database();try{return await new Promise((resolve,reject)=>{const tx=db.transaction('snapshots','readonly');const request=tx.objectStore('snapshots').get(scope);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}finally{db.close();}
}
async function write(scope:string,value:Snapshot){
 const db=await database();try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction('snapshots','readwrite');tx.objectStore('snapshots').put(value,scope);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}finally{db.close();}
}
function snapshot(client:QueryClient):Snapshot{
 let size=0;
 const entries=client.getQueryCache().getAll().filter(q=>allowed(q.queryKey)&&q.state.data!==undefined)
  .sort((a,b)=>Number(a.queryKey[0]==='allMetricHistory')-Number(b.queryKey[0]==='allMetricHistory')||b.state.dataUpdatedAt-a.state.dataUpdatedAt)
  .flatMap(q=>{const entry={key:q.queryKey,data:q.state.data,updatedAt:q.state.dataUpdatedAt};const bytes=JSON.stringify(entry).length*2;if(size+bytes>MAX_BYTES)return [];size+=bytes;return [entry];});
 return {version:1,savedAt:Date.now(),entries};
}
export function installContinuity(client:QueryClient){
 client.getQueryCache().subscribe(event=>{
  if(event.type==='updated'&&event.action.type==='success'&&allowed(event.query.queryKey)){
   restored.delete(hash(event.query.queryKey));
   if(activeScope&&!timer){const scope=activeScope;const revision=generation;timer=setTimeout(()=>{timer=undefined;if(scope!==activeScope||revision!==generation)return;void write(scope,snapshot(client)).then(()=>{if(storageFailed){storageFailed=false;emit();}}).catch(()=>{storageFailed=true;emit();});},1500);}
  }
  emit();
 });
}
// Restore only after the API has authenticated this exact identity. Tokens are never cached.
export async function restoreContinuity(client:QueryClient,session:Session){
 const revision=++generation;activeScope='';clearTimeout(timer);timer=undefined;restored=new Set();client.clear();
 const scope=JSON.stringify([1,session.username,session.role,session.crewMemberId||null]);
 try{const saved=await read(scope);if(revision!==generation)return;
  if(saved?.version===1&&Array.isArray(saved.entries))for(const entry of saved.entries){
   if(!allowed(entry.key)||!Number.isFinite(entry.updatedAt))continue;
   client.setQueryData(entry.key,entry.data,{updatedAt:entry.updatedAt});restored.add(hash(entry.key));
  }
 }catch{storageFailed=true;}
 if(revision===generation){activeScope=scope;emit();}
}
export function ContinuityBanner(){
 usePreferences();const client=useQueryClient();
 const status=useSyncExternalStore(callback=>{listeners.add(callback);return()=>{listeners.delete(callback);};},()=>{
  const active=client.getQueryCache().getAll().filter(q=>allowed(q.queryKey)&&q.getObserversCount()>0);
  return JSON.stringify({failed:active.some(q=>q.state.status==='error'),saved:active.some(q=>restored.has(hash(q.queryKey))),storageFailed});
 });
 const state=JSON.parse(status);
 if(!state.failed&&!state.saved&&!state.storageFailed)return null;
 return <div className="continuity-banner" role="status">{tr(state.failed?'Connection interrupted. Last recorded data remains visible; it is not live.':state.saved?'Restored saved display. Reconnecting to verify current data.':'Browser storage unavailable. Readings remain in memory and in the server history.')} {state.storageFailed&&(state.failed||state.saved)&&tr('Browser storage unavailable.')}</div>;
}
