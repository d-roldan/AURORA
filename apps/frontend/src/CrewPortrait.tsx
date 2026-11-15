import {useState} from 'react';
import {UserRound} from 'lucide-react';
import type {Crew} from './api';
import {tr} from './preferences';

// Seeded crew codes remain stable when a database is recreated and UUIDs change.
const portraits:Record<string,string>={
 'CREW-01':'/images/crew/crew-01.png?v=20261115',
 'CREW-02':'/images/crew/crew-02.png?v=20261115',
 'CREW-03':'/images/crew/crew-03.png?v=20261115',
 'CREW-04':'/images/crew/crew-04.png?v=20261115',
};

export function CrewPortrait({crew,size='small'}:{crew:Crew;size?:'small'|'large'|'header'}){
 const source=portraits[crew.code];const [failed,setFailed]=useState<string>();
 return <span className={`crew-portrait crew-portrait--${size}`} data-crew-id={crew.id} title={tr(source&&failed!==source?'Synthetic portrait · fictitious crew member':'Portrait unavailable')}>
  {source&&failed!==source?<img src={source} alt={`${tr('Synthetic portrait of')} ${crew.displayName}`} width={size==='large'?112:64} height={size==='large'?112:64} decoding="async" onError={()=>setFailed(source)}/>:<span className="crew-portrait-fallback" role="img" aria-label={`${tr('Portrait unavailable')} · ${crew.displayName}`}><UserRound size={22}/><span>{crew.displayName.split(' ').map(n=>n[0]).slice(0,2).join('')}</span></span>}
 </span>;
}

