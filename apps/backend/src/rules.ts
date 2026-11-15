export type Continuity={last:number; since:number|null; episode:number|null};
/** Demonstration only. Requires monotonic GOOD samples, rest context, <=5s gaps. */
export function advance(state:Continuity,t:number,value:number,center:number,valid:boolean){
 if(t<=state.last)return {state,fire:false,recovered:false};
 const gap=state.last>0&&t-state.last>5000;
 let {since,episode}=state;
 if(gap||!valid){since=null;episode=null;}
 const high=valid&&value>=center*1.2;
 const recovered=!high&&episode!==null;
 if(!high){since=null;episode=null;}else if(since===null)since=t;
 const fire=high&&since!==null&&t-since>=30000&&episode===null;
 if(fire)episode=since;
 return {state:{last:t,since,episode},fire,recovered};
}
