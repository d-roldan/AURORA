import {useState} from 'react';
import {UserRound} from 'lucide-react';
import type {Crew} from './api';
import {tr} from './preferences';

// Portraits belong to these stable fictitious identities, never to an array position or editable name.
const portraits:Record<string,string>={
 '20cd85e5-cb29-4f46-8fb1-e2c0fac227da':'/images/crew/crew-01.png',
 '384e5b0c-c2c2-450a-8132-44088f423ee8':'/images/crew/crew-02.png',
 '2a8c6cfa-7f06-48b1-b3e1-eab22b6343fd':'/images/crew/crew-03.png',
 '88429911-8848-4074-8250-a83b08ff508b':'/images/crew/crew-04.png',
};

export function CrewPortrait({crew,size='small'}:{crew:Crew;size?:'small'|'large'|'header'}){
 const source=portraits[crew.id];const [failed,setFailed]=useState<string>();
 return <span className={`crew-portrait crew-portrait--${size}`} data-crew-id={crew.id} title={tr(source&&failed!==source?'Synthetic portrait · fictitious crew member':'Portrait unavailable')}>
  {source&&failed!==source?<img src={source} alt={`${tr('Synthetic portrait of')} ${crew.displayName}`} width={size==='large'?112:64} height={size==='large'?112:64} decoding="async" onError={()=>setFailed(source)}/>:<span className="crew-portrait-fallback" role="img" aria-label={`${tr('Portrait unavailable')} · ${crew.displayName}`}><UserRound size={22}/><span>{crew.displayName.split(' ').map(n=>n[0]).slice(0,2).join('')}</span></span>}
 </span>;
}

