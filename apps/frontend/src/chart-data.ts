import type {Point} from './api';

/** Trends join observations; only raw waveforms insert real acquisition gaps. */
export function chartPoints(points:Point[],wave=false):{time:string;value:number|null;source?:string;algorithmVersion?:string|null}[]{
 const ordered=points.filter(p=>Number.isFinite(p.value)&&Number.isFinite(Date.parse(p.time)))
  .slice().sort((a,b)=>Date.parse(a.time)-Date.parse(b.time));
 const result:{time:string;value:number|null;source?:string;algorithmVersion?:string|null}[]=[];
 for(let i=0;i<ordered.length;i++){
  if(wave&&i&&Date.parse(ordered[i].time)-Date.parse(ordered[i-1].time)>8)
   result.push({time:new Date(Date.parse(ordered[i-1].time)+1).toISOString(),value:null});
  result.push(ordered[i]);
 }
 return result;
}

export function personalTrendWindow(metric?:{cadence:string;expectedIntervalMs?:number}){
 return metric?.cadence==='PERIODIC'
  ?Math.min(90,Math.max(7,Math.ceil((metric.expectedIntervalMs||86400000)*3/86400000)))*86400000
  :3600000;
}

/** Scenario starts can emit many daily/monthly records. Plot one actual latest
 * observation per native interval, keeping the newest card and endpoint aligned.
 * Raw records remain unchanged and available in exports. */
export function periodicObservations(points:Point[],intervalMs=86400000):Point[]{
 if(!points.length||!Number.isFinite(intervalMs)||intervalMs<=0)return points;
 const ordered=points.slice().sort((a,b)=>Date.parse(b.time)-Date.parse(a.time));
 const latest=Date.parse(ordered[0].time);const intervals=new Set<number>();
 return ordered.filter(p=>{const bin=Math.floor((latest-Date.parse(p.time))/intervalMs);if(intervals.has(bin))return false;intervals.add(bin);return true;}).reverse();
}
