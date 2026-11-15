import {NavLink,Link} from 'react-router-dom';
import {Activity,LayoutDashboard,Users,TriangleAlert,SlidersHorizontal,Server,Shield,ChevronRight,Orbit,Settings,PanelLeftClose,PanelLeftOpen} from 'lucide-react';
import {tr,usePreferences,setPreferences} from './preferences';

const links=[['/','Mission Control',LayoutDashboard],['/crew','Crew',Users],['/telemetry','Telemetry',Activity],['/events','Events',TriangleAlert],['/simulator','Simulator',SlidersHorizontal],['/system','System',Server],['/settings','Settings',Settings]] as const;

export function Sidebar(){
 const {sidebarCollapsed}=usePreferences();
 const toggleLabel=tr(sidebarCollapsed?'Expand sidebar':'Collapse sidebar');
 return <><aside className="sidebar" data-collapsed={sidebarCollapsed} aria-label={tr('Main navigation')}>
  <button className="sidebar-toggle" type="button" aria-label={toggleLabel} title={toggleLabel} aria-expanded={!sidebarCollapsed} aria-controls="main-navigation" onClick={()=>setPreferences({sidebarCollapsed:!sidebarCollapsed})}>{sidebarCollapsed?<PanelLeftOpen size={18}/>:<PanelLeftClose size={18}/>}</button>
  <Link to="/" className="brand" aria-label={tr('AURORA · Mission Control')} title={tr('AURORA · Mission Control')}><div className="brand-mark"><Shield size={26}/></div><span>AURORA<small>{tr('MISSION HEALTH SYSTEMS')}</small></span></Link>
  <div className="nav-label">{tr('OPERATIONS')}</div>
  <nav id="main-navigation">{links.map(([path,label,Icon])=><NavLink key={path} to={path} end={path==='/'} aria-label={tr(label)} title={sidebarCollapsed?tr(label):undefined} onClick={()=>{if(window.matchMedia('(max-width:760px)').matches)setPreferences({sidebarCollapsed:true});}}><Icon size={18}/><span className="sidebar-link-label">{tr(label)}</span><ChevronRight size={13}/></NavLink>)}</nav>
  <div className="sidebar-bottom"><div className="orbit-icon"><Orbit size={42}/></div><strong>{tr('Earth-independent by design')}</strong><p>{tr('Local infrastructure.')}<br/>{tr('Human oversight.')}</p><div className="onboard"><span className="dot"/>{tr('ONBOARD NETWORK')}</div><small>{tr('RESEARCH BUILD · V0.1.0')}</small></div>
 </aside>{!sidebarCollapsed&&<button className="sidebar-backdrop" type="button" aria-label={tr('Close navigation')} onClick={()=>setPreferences({sidebarCollapsed:true})}/>}</>;
}
