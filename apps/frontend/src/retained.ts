import type {Point,Reading} from './api';
export function readingFresh(reading:Reading|undefined,now=Date.now(),limit=10000){return !!reading&&reading.quality==='GOOD'&&Number.isFinite(reading.value)&&now-Date.parse(reading.observedAt)<=limit;}
export function latestValue<T extends {value:number|null;lastValue?:number|null}>(measurement:T){const value=measurement.value??measurement.lastValue;return typeof value==='number'&&Number.isFinite(value)?value:null;}
export async function retainWave(fetchPoints:()=>Promise<Point[]>,previous:Point[]|undefined){const points=await fetchPoints();return points.length?points:previous||points;}
