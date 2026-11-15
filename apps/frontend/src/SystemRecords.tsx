import {tr,usePreferences} from './preferences';
import {useQuery} from '@tanstack/react-query';
import {api,Session} from './api';
export function SystemRecords({session}:{session:Session}){
 const devices=useQuery({queryKey:['devices'],queryFn:()=>api<any[]>('/devices')});
 const logs=useQuery({queryKey:['audit'],queryFn:()=>api<any[]>('/audit'),enabled:session.role==='ADMIN',refetchInterval:5000});
 return <><section className="panel form-panel"><h2>{tr("Acquisition registry")}</h2><p>{tr("Native device monitoring · source assignments and latest confirmed reception")}</p><div className="table-scroll"><table><thead><tr><th>{tr("Device")}</th><th>{tr("Kind")}</th><th>{tr("Configuration")}</th><th>{tr("Last observation (UTC)")}</th></tr></thead><tbody>{tr(devices.data?.map(d=><tr key={d.id}><td>{tr(d.code)}</td><td>{tr(d.kind)}</td><td>{tr(d.status)}</td><td>{tr(d.lastSeenAt||'No data')}</td></tr>))}</tbody></table></div></section>{tr(session.role==='ADMIN'&&<section className="panel form-panel"><h2>{tr("Operator audit trail")}</h2><p>{tr("Latest 100 persistent administrative and event actions.")}</p>{tr(logs.error&&<div className="error">{tr("Audit unavailable")}</div>)}<div className="table-scroll"><table><thead><tr><th>{tr("UTC")}</th><th>{tr("Action")}</th><th>{tr("Entity")}</th><th>{tr("Actor")}</th></tr></thead><tbody>{tr(logs.data?.map(l=><tr key={l.id}><td>{tr(l.createdAt)}</td><td>{tr(l.action)}</td><td>{tr(l.entityType)}{tr(" · ")}{tr(l.entityId)}</td><td>{tr(l.actorId)}</td></tr>))}</tbody></table></div></section>)}</>;
}
