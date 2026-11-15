import {tr,usePreferences,locale} from './preferences';
import {useEffect,useRef} from 'react';
import * as echarts from 'echarts/core';
import {LineChart} from 'echarts/charts';
import {GridComponent,TooltipComponent,DataZoomComponent,LegendComponent,MarkLineComponent} from 'echarts/components';
import {CanvasRenderer} from 'echarts/renderers';
import {Point} from './api';
import {chartPoints} from './chart-data';
echarts.use([LineChart,GridComponent,TooltipComponent,DataZoomComponent,LegendComponent,MarkLineComponent,CanvasRenderer]);
export type SignalSeries={key?:string;name:string;points:Point[];unit:string;color?:string;baseline?:number;threshold?:number;displayMin?:number;displayMax?:number;periodic?:boolean};
export type ChartEvent={time:string;label:string};
export function Chart({points=[],series,wave=false,unit='bpm',height=220,events=[],normalized=false,visibleKeys,onToggle}:{points?:Point[];series?:SignalSeries[];wave?:boolean;unit?:string;height?:number;events?:ChartEvent[];normalized?:boolean;visibleKeys?:string[];onToggle?:(name:string,selected:boolean)=>void}){
 const {theme,language}=usePreferences();
 const palette=getComputedStyle(document.documentElement);
 const muted=palette.getPropertyValue('--muted').trim(),grid=palette.getPropertyValue('--chart-grid').trim();
 const colors=['--accent','--amber','--green'].map(key=>palette.getPropertyValue(key).trim());
 const ref=useRef<HTMLDivElement>(null);const instance=useRef<echarts.ECharts|null>(null);
 const data:SignalSeries[]=series?.length?series:[{name:wave?'Raw ECG':'Telemetry',points,unit}];
 const count=data.reduce((n,s)=>n+s.points.length,0);
 useEffect(()=>{
  if(!ref.current)return;const chart=echarts.init(ref.current);instance.current=chart;
  chart.setOption({animation:false,yAxis:{type:'value'},series:[],grid:{top:wave?20:75,right:70,bottom:wave?32:50,left:65},tooltip:{trigger:'axis',renderMode:'richText',backgroundColor:theme==='light'?'#fff':'#121d2e',textStyle:{color:theme==='light'?'#162e43':'#e6edf5'},borderColor:grid},legend:{type:'scroll',top:4,textStyle:{color:muted},show:!wave,pageTextStyle:{color:muted}},xAxis:{type:'time',axisLabel:{color:muted,hideOverlap:true,formatter:(value:number)=>new Date(value).toLocaleString(locale(),{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',timeZone:'UTC',hour12:false})},splitLine:{show:wave,lineStyle:{color:grid}}},dataZoom:wave?[]:[{type:'inside'},{type:'slider',height:14,bottom:0,borderColor:grid,textStyle:{color:muted}}]});
  const resize=new ResizeObserver(()=>chart.resize());resize.observe(ref.current);return()=>{resize.disconnect();chart.dispose();instance.current=null;};
 },[wave,theme,language]);
 useEffect(()=>{
  const longRange=data.some(s=>s.points.length>1&&Date.parse(s.points.at(-1)!.time)-Date.parse(s.points[0].time)>2*86400000);
  const units=normalized?['Relative display scale']:[...new Set(data.map(s=>s.unit))];
  const scaled=(s:SignalSeries,v:number)=>normalized?100*(v-(s.displayMin??0))/((s.displayMax??100)-(s.displayMin??0)):v;
  instance.current?.setOption({grid:{left:10,right:units.length>1?65:12,containLabel:true},xAxis:{axisLabel:{formatter:(stamp:number)=>longRange?new Date(stamp).toLocaleDateString(locale(),{day:'2-digit',month:'2-digit',timeZone:'UTC'}):new Date(stamp).toLocaleTimeString(locale(),{hour:'2-digit',minute:'2-digit',second:wave?'2-digit':undefined,timeZone:'UTC',hour12:false})}},legend:visibleKeys?{selected:Object.fromEntries(data.map(s=>[tr(s.name),visibleKeys.includes(s.key||s.name)]))}:{},tooltip:{formatter:(params:any)=>{const list=(Array.isArray(params)?params:[params]).filter((p:any)=>p.data?.[2]!==null);if(!list.length)return '';const header=new Date(list[0].value[0]).toLocaleString(locale(),{timeZone:'UTC',hour12:false})+' UTC';return [header,...list.slice(0,16).map((p:any)=>{const signal=data.find(s=>tr(s.name)===p.seriesName);return `${p.seriesName}: ${Number(p.data[2]).toLocaleString(locale(),{maximumFractionDigits:3})} ${tr(signal?.unit||'')} · ${tr(String(p.data[4]||'').startsWith('aurora-')&&String(p.data[4]||'').includes('history')?'Synthetic history':p.data[3]||'')}`;}),...(list.length>16?[`+${list.length-16} ${tr('more series')}`]:[])].join('\n');}},yAxis:units.map((u,i)=>({type:'value',scale:true,name:tr(u),position:i?'right':'left',offset:i>1?(i-1)*55:0,min:normalized?(extent:any)=>Math.min(0,extent.min):undefined,max:normalized?(extent:any)=>Math.max(100,extent.max):undefined,nameTextStyle:{color:muted},axisLabel:{color:muted,formatter:(v:number)=>v.toLocaleString(locale(),{maximumFractionDigits:4})},splitLine:{show:i===0,lineStyle:{color:grid}}})),series:data.map((s,i)=>({id:s.key||s.name,name:tr(s.name),type:'line',yAxisIndex:normalized?0:units.indexOf(s.unit),data:chartPoints(s.points,wave).map(p=>[Date.parse(p.time),p.value===null?null:scaled(s,p.value),p.value,p.source,p.algorithmVersion]),showSymbol:s.points.length===1,symbolSize:5,smooth:false,lineStyle:{width:wave?1.3:1.6,color:s.color||colors[i%3]},itemStyle:{color:s.color||colors[i%3]},connectNulls:false,markLine:{silent:true,symbol:'none',label:{fontSize:8,color:muted},data:[...(s.baseline!==undefined?[{yAxis:scaled(s,s.baseline),name:tr('Baseline'),label:{formatter:tr('Baseline')+' '+s.baseline.toLocaleString(locale()),position:'insideEndTop'},lineStyle:{color:theme==='light'?'#167d5e':'#4ed6ac',type:'dashed'}}]:[]),...(s.threshold!==undefined?[{yAxis:scaled(s,s.threshold),name:tr('Demo threshold'),label:{formatter:tr('Demo +20%'),position:'insideEndTop'},lineStyle:{color:colors[1],type:'dashed'}}]:[]),...(i===0?events.map(e=>({xAxis:Date.parse(e.time),name:tr(e.label),label:{formatter:tr(e.label),position:'insideEndTop'},lineStyle:{color:colors[1],type:'dotted'}})):[])]}}))},{replaceMerge:['series','yAxis']});
 });
 useEffect(()=>{const chart=instance.current;if(!chart||!onToggle)return;const handler=(event:any)=>onToggle(event.name,event.selected[event.name]);chart.on('legendselectchanged',handler);return()=>{chart.off('legendselectchanged',handler);};},[wave,theme,language,onToggle]);
 return <div className="chart-wrap" style={{height}}>{tr(!count&&<div className="chart-empty">{tr("No stored ")}{tr(wave?'ECG samples':'readings')}{tr(" in this window")}</div>)}<div ref={ref} style={{height:'100%',width:'100%'}} role="img" aria-label={`${tr(wave?'ECG':'Historical telemetry')} ${tr('chart')}, ${count.toLocaleString(locale())} ${tr('persisted samples')}, ${[...new Set(data.map(s=>tr(s.unit)))].join(' / ')}`}/></div>;
}
