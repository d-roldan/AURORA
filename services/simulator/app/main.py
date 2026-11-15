import asyncio
import math
import os
import secrets
import time
from functools import lru_cache
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from typing import Literal
import httpx
import neurokit2 as nk
import numpy as np
from fastapi import FastAPI, Header, HTTPException, Depends
from pydantic import BaseModel, Field

state = {"status":"STOPPED", "scenario":None, "runId":None, "batchesSent":0,"lastSuccessAt":None,"lastError":None}
config = None
revision = 0

@lru_cache(maxsize=8)
def ecg_segment(heart_rate, seed):
    # Immutable seeded segments can be reused when only an alert scenario changes.
    # This avoids lengthy ECG regeneration gaps without replacing NeuroKit2.
    return nk.ecg_simulate(duration=600, sampling_rate=250, heart_rate=heart_rate, random_state=seed, noise=.01)

def iso(t):
    return datetime.fromtimestamp(t, timezone.utc).isoformat(timespec='milliseconds').replace('+00:00','Z')

def auth(x_service_key: str = Header(default="")):
    if not secrets.compare_digest(x_service_key, os.environ["SERVICE_API_KEY"]):
        raise HTTPException(401, 'Service key required')

class Start(BaseModel):
    scenario: Literal['NORMAL','FATIGUE_DEMO','HABITAT_CHANGE','SENSOR_LOSS','YELLOW_ALERT_DEMO','RED_ALERT_DEMO','SOLAR_EVENT_DEMO']
    seed: int = Field(ge=1, le=2147483647)
    subjectId: str
    runId: str
    devices: list[dict]
    baselines: list[dict]
    metrics: list[dict] = []
    latest: list[dict] = []

def continuous_values(rng, elapsed, baseline, fatigue, dose):
    hr=baseline+float(rng.normal(0,.6))+(85-baseline)*min(1,elapsed/12) if fatigue else baseline+float(rng.normal(0,.6))
    exposure=18+float(rng.normal(0,.4))
    metabolic_power=120+float(rng.normal(0,3))
    return {'heart_rate':hr,'spo2':98+float(rng.normal(0,.2)),'body_temperature':36.6+float(rng.normal(0,.03)),
      'systolic_bp':118+float(rng.normal(0,2)),'diastolic_bp':76+float(rng.normal(0,1.2)),
      'respiratory_rate':14+float(rng.normal(0,.6)),'hydration':58+float(rng.normal(0,.15)),
      'physical_activity':1.2+float(rng.uniform(0,.3)),'radiation_rate':exposure,
      'radiation_dose':dose+exposure*2/3600000,'workload':float(np.clip(3+math.sin(elapsed/120)+rng.normal(0,.1),0,10)),
      'eva_active':0,'blood_glucose':105+float(rng.normal(0,2)),
      'rover_pressure':101.0+float(rng.normal(0,.15)),'rover_oxygen':20.9+float(rng.normal(0,.03)),'rover_co2':650+float(rng.normal(0,6)),
      'metabolic_rate':metabolic_power,'energy_expenditure':metabolic_power*3600/4184,
      'water_remaining':max(1.5,3.5-elapsed/36000),'cooling_water_remaining':max(2,4.5-elapsed/36000),
      'battery_remaining':max(45,95-elapsed/7200),'oxygen_remaining':max(45,96-elapsed/7200),
      'weight_bearing_load':150+float(rng.normal(0,3)),'gait_cadence':80+float(rng.normal(0,2)),
      'gait_symmetry':97+float(rng.normal(0,.3)),'surface_dust':25+float(rng.normal(0,1)),
      'solar_particle_alert':0}

def periodic_values(rng,fatigue):
    sleep=5.2 if fatigue else 7.5+float(rng.normal(0,.25))
    start=(23+float(rng.normal(0,.2)))%24
    return {'muscle_strength':420+float(rng.normal(0,25)),'exercise_duration':float(rng.integers(35,65)),
      'exercise_sessions':float(rng.integers(1,3)),'bone_density':1.15+float(rng.normal(0,.04)),
      'bone_p1np':40+float(rng.normal(0,4)),'bone_ctx':.35+float(rng.normal(0,.03)),
      'perceived_stress':float(rng.integers(2,5)),'mood':float(rng.integers(0,4)),
      'fatigue':7.0 if fatigue else float(rng.integers(1,4)),
      'reaction_time':245+float(rng.normal(0,15)),'attention':float(rng.uniform(90,99)),
      'sleep_duration':sleep,'sleep_interruptions':float(rng.integers(0,4)),'sleep_start':start,'sleep_end':(start+sleep)%24,
      'rest_duration':float(rng.integers(30,90)),'eva_duration':0.0,
      'intraocular_pressure':16+float(rng.normal(0,.5)),'cephalic_fluid_shift':300+float(rng.normal(0,15)),
      'deep_sleep_duration':1.4+float(rng.normal(0,.1)),'rem_sleep_duration':1.7+float(rng.normal(0,.1)),
      'circadian_offset':float(rng.normal(0,.2)),'plasma_volume':2900+float(rng.normal(0,50)),
      'vascular_resistance':17+float(rng.normal(0,.4))}

async def send(client, path, payload):
    for delay in (0, .5, 1, 2):
        if delay:
            await asyncio.sleep(delay)
        try:
            r = await client.post(os.environ['CORE_API_URL']+'/api/v1/telemetry/'+path, json=payload)
            r.raise_for_status()
            state.update(lastSuccessAt=iso(time.time()),lastError=None,batchesSent=state['batchesSent']+1)
            return True
        except Exception as exc:
            state['lastError'] = f'{type(exc).__name__}: ingestion not confirmed'
    return False

async def prepare_segments(current, segment_index):
    segments = {}
    for index, device in enumerate(current.devices):
        subject = device.get('crewMemberId')
        if not subject:
            continue
        center = next((b['center'] for b in current.baselines if b['crewMemberId'] == subject), 62)
        target = 85 if current.scenario == 'FATIGUE_DEMO' and subject == current.subjectId else center
        segments[subject] = await asyncio.to_thread(ecg_segment, target, current.seed + segment_index * 100 + index)
    return segments

async def produce():
    global config
    async with httpx.AsyncClient(headers={'x-service-key':os.environ['SERVICE_API_KEY']},timeout=12) as client:
        while True:
            if config is None:
                await asyncio.sleep(.5)
                continue
            current = config
            rev = revision
            rng = np.random.default_rng(current.seed)
            elapsed = 0
            start = math.floor(time.time())
            segments = {}
            segment_index = -1
            prefetch = None
            periodic_at={}
            dose={d['crewMemberId']:next((v['value'] for v in current.latest if v['subjectId']==d.get('crewMemberId') and v['metric']=='radiation_dose'),3.2) for d in current.devices if d.get('crewMemberId')}
            while config is current and rev == revision:
                # Generate continuous ten-minute NeuroKit2 signals for every astronaut.
                # Segment boundaries are explicit; each segment is independently seeded.
                if elapsed//600 != segment_index:
                    segment_index = elapsed//600
                    segments = await prefetch if prefetch else await prepare_segments(current, segment_index)
                    prefetch = None
                    if elapsed == 0:
                        start = math.floor(time.time())
                # Prepare the next ten-minute block ahead of the boundary. Scalars and
                # the current ECG keep flowing while NeuroKit2 runs in its worker thread.
                if elapsed % 600 >= 480 and prefetch is None:
                    prefetch = asyncio.create_task(prepare_segments(current, segment_index + 1))
                deadline = start+elapsed+2
                await asyncio.sleep(max(0,deadline-time.time()))
                if config is not current or rev != revision:
                    break
                observed = iso(deadline-0.004)
                ok = True
                for d in current.devices:
                    if config is not current or rev != revision:
                        break
                    subject = d.get('crewMemberId') or d.get('habitatId')
                    if current.scenario=='SENSOR_LOSS' and subject==current.subjectId:
                        continue
                    if d.get('crewMemberId'):
                        baseline = next((b['center'] for b in current.baselines if b['crewMemberId']==subject),62)
                        fatigue=current.scenario=='FATIGUE_DEMO' and subject==current.subjectId
                        scalar=continuous_values(rng,elapsed,baseline,fatigue,dose[subject])
                        if subject==current.subjectId and current.scenario=='YELLOW_ALERT_DEMO':
                            scalar['blood_glucose']=195.0
                        if subject==current.subjectId and current.scenario=='RED_ALERT_DEMO':
                            scalar['blood_glucose']=280.0
                        if subject==current.subjectId and current.scenario=='SOLAR_EVENT_DEMO':
                            scalar['solar_particle_alert']=1.0
                            scalar['radiation_rate']=120.0
                            scalar['radiation_dose']=dose[subject]+120*2/3600000
                        dose[subject]=scalar['radiation_dose']
                        periodic=periodic_values(rng,fatigue)
                        values=[]
                        for metric in current.metrics:
                            if metric['scope']!='CREW' or metric['sourceKind']=='DERIVED' or metric['cadence']=='WAVEFORM':
                                continue
                            key=metric['key']
                            if metric['cadence']=='PERIODIC':
                                identity=(subject,key)
                                if identity in periodic_at and elapsed-periodic_at[identity]<metric['expectedIntervalMs']/1000:
                                    continue
                                periodic_at[identity]=elapsed
                                value=periodic.get(key)
                            else:
                                value=scalar.get(key)
                            if value is not None:
                                values.append((key,value,metric['unit']))
                    else:
                        co2 = 700+float(rng.normal(0,8))+(1200*min(1,elapsed/20) if current.scenario=='HABITAT_CHANGE' else 0)
                        values = [('co2',co2,'ppm'),('oxygen',20.9,'%'),('temperature',22.3+float(rng.normal(0,.1)),'°C'),('humidity',43+float(rng.normal(0,.5)),'%'),('pressure',101.3,'kPa')]
                    common = {'schemaVersion':1,'batchId':f'{current.runId}-{elapsed}-{d["id"]}','missionId':d['missionId'],'deviceId':d['id'],'source':'SIMULATED'}
                    ok &= await send(client,'ingest',{**common,'samples':[{'metric':m,'value':v,'unit':u,'observedAt':observed,'quality':'GOOD'} for m,v,u in values]})
                    if d.get('crewMemberId'):
                        offset = (elapsed%600)*250
                        ok &= await send(client,'waveforms',{**common,'batchId':common['batchId']+'-ecg','signal':'ecg','channel':'lead_demo','unit':'a.u.','startAt':iso(start+elapsed),'samplingRateHz':250,'samples':segments[subject][offset:offset+500].tolist()})
                if config is not current or rev != revision:
                    break
                state['status'] = 'RUNNING' if ok else 'ERROR'
                elapsed += 2
                if time.time()-deadline>4:
                    # Bound backlog: leave a documented gap rather than manufacture continuity.
                    start = math.floor(time.time())-elapsed
            if prefetch:
                prefetch.cancel()

@asynccontextmanager
async def lifespan(app):
    task=asyncio.create_task(produce())
    yield
    task.cancel()

app=FastAPI(title='AEGIS Internal Simulator',lifespan=lifespan)
@app.get('/health')
def health():
    return {'status':'UP'}
@app.get('/status',dependencies=[Depends(auth)])
def status():
    return state
@app.post('/start',dependencies=[Depends(auth)])
def start(body:Start):
    global config, revision
    revision += 1
    config = body
    state.update(status='RUNNING',scenario=body.scenario,runId=body.runId,seed=body.seed,subjectId=body.subjectId,batchesSent=0,lastError=None)
    return state
@app.post('/stop',dependencies=[Depends(auth)])
def stop():
    global config, revision
    revision += 1
    config = None
    state['status']='STOPPED'
    return state
