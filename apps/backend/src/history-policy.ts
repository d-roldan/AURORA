export const HISTORY_RETENTION_MS=90*86400000;
export const HISTORY_MODEL='aurora-periodic-history-v1';
export function historyAggregation(span:number){
 return span>3600000?Math.max(1,Math.ceil(span/1200/60000)):null;
}

/** Latest evidence must be chosen across simulation-model tag sets. */
export function newestReadings<T extends {subjectId:string;metric:string;observedAt:string}>(readings:T[]):T[]{
 const seen=new Set<string>();
 return readings.slice().sort((a,b)=>Date.parse(b.observedAt)-Date.parse(a.observedAt))
  .filter(r=>{const key=r.subjectId+':'+r.metric;if(seen.has(key))return false;seen.add(key);return true;});
}
