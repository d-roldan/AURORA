export type Session={token:string;role:string;username:string;crewMemberId?:string};
let session:Session|null=null;
let refreshing:Promise<void>|null=null;
export function setSession(s:Session){session=s;}
export async function api<T=any>(path:string,method='GET',body?:unknown):Promise<T>{
 const request=()=>fetch('/api/v1'+path,{method,signal:AbortSignal.timeout(method==='GET'?20000:60000),headers:{'Content-Type':'application/json',...(session?{Authorization:`Bearer ${session.token}`}:{})},body:body?JSON.stringify(body):undefined});
 const tokenAtRequest=session?.token;
 let response=await request();
 if(response.status===401&&session?.token!==tokenAtRequest)response=await request();
 if(response.status===401&&!path.startsWith('/auth/')&&session?.role==='DEMO_VIEWER'){
  if(!refreshing){const original=session;refreshing=fetch('/api/v1/auth/demo',{method:'POST',signal:AbortSignal.timeout(15000)}).then(async r=>{if(!r.ok)throw new Error('Session refresh unavailable');const renewed:Session=await r.json();if(session===original)session=renewed;}).finally(()=>{refreshing=null;});}
  await refreshing;response=await request();
 }
 if(response.status===401&&!path.startsWith('/auth/'))window.dispatchEvent(new Event('aegis:session-expired'));
 if(!response.ok){const error=await response.json().catch(()=>({message:'Connection failed'}));throw new Error(typeof error.message==='string'?error.message:Array.isArray(error.message?.message)?error.message.message.join('; '):JSON.stringify(error.message));}
 return response.json();
}
export type Reading={subjectId:string;metric:string;value:number;quality:string;source:string;observedAt:string;freshness:string};
export type Crew={id:string;missionId:string;code:string;displayName:string;role:string;baselines:{center:number;metricKey:string;version:number;method:string}[]};
export type EventRecord={id:string;type:string;status:string;severity:string;firstObservedAt:string;crewMember?:Crew;crewMemberId?:string;evidence:Record<string,any>;acknowledgementNote?:string;resolutionNote?:string};
export type Point={time:string;value:number;source:string;algorithmVersion?:string|null};
