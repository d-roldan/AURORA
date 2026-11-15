import os
import secrets
from datetime import datetime
from typing import Literal
import neurokit2 as nk
import numpy as np
from fastapi import FastAPI, Header, HTTPException, Depends
from pydantic import BaseModel, Field, field_validator

app = FastAPI(title="AEGIS Internal ECG Analytics", version="0.1.1")

def authorized(x_service_key: str = Header(default="")):
    if not secrets.compare_digest(x_service_key, os.environ["SERVICE_API_KEY"]):
        raise HTTPException(401, "Service key required")

class Window(BaseModel):
    samples: list[float] = Field(min_length=3750, max_length=7500)
    samplingRateHz: Literal[250]
    startAt: datetime
    unit: Literal["a.u."]

    @field_validator("samples")
    @classmethod
    def finite(cls, values):
        if not np.all(np.isfinite(values)):
            raise ValueError("Samples must be finite")
        return values

@app.get("/health")
def health():
    return {"status": "UP", "neurokitVersion": nk.__version__}

@app.post("/v1/ecg/process", dependencies=[Depends(authorized)])
def process(window: Window):
    result = {"algorithmVersion": f"neurokit2-{nk.__version__}-ecg-process-v1", "windowSeconds": len(window.samples)/window.samplingRateHz,
              "quality": "INSUFFICIENT", "heartRateBpm": None, "rPeakIndices": [], "qualityScore": None}
    if np.std(window.samples) < 1e-8:
        return result
    try:
        signals, info = nk.ecg_process(window.samples, sampling_rate=window.samplingRateHz)
        peaks = info["ECG_R_Peaks"]
        rate = float(np.nanmedian(signals["ECG_Rate"]))
        score = float(np.nanmean(signals["ECG_Quality"]))
        if len(peaks) >= 5 and np.isfinite(rate) and np.isfinite(score):
            result.update(quality="GOOD" if score >= .5 else "DEGRADED", heartRateBpm=rate,
                          qualityScore=score, rPeakIndices=peaks.tolist())
    except Exception as exc:
        print(f"ECG processing insufficient: {type(exc).__name__}")
    return result

class HrvWindow(Window):
    samples: list[float] = Field(min_length=75000, max_length=75000)

@app.post('/v1/hrv/process', dependencies=[Depends(authorized)])
def hrv(window: HrvWindow):
    result={'algorithmVersion':f'neurokit2-{nk.__version__}-hrv-time-v1','windowSeconds':300,
            'quality':'INSUFFICIENT','rmssdMs':None,'sdnnMs':None,'rPeakCount':0,
            'method':'ecg_clean → ecg_peaks(correct_artifacts=True) → hrv_time; synthetic sinus ECG, experimental NN surrogate'}
    if np.std(window.samples)<1e-8:
        return result
    try:
        cleaned=nk.ecg_clean(window.samples,sampling_rate=250)
        peaks,info=nk.ecg_peaks(cleaned,sampling_rate=250,correct_artifacts=True)
        indices=info['ECG_R_Peaks']
        quality=float(np.nanmean(nk.ecg_quality(cleaned,rpeaks=indices,sampling_rate=250)))
        intervals=np.diff(indices)*4
        if len(indices)<150 or not np.isfinite(quality) or quality<.5 or np.mean((intervals<300)|(intervals>2000))>.01:
            return result
        features=nk.hrv_time(peaks,sampling_rate=250,show=False)
        rmssd=float(features['HRV_RMSSD'].iloc[0]);sdnn=float(features['HRV_SDNN'].iloc[0])
        if np.isfinite(rmssd) and np.isfinite(sdnn):
            result.update(quality='GOOD',rmssdMs=rmssd,sdnnMs=sdnn,rPeakCount=len(indices),qualityScore=quality)
    except Exception as exc:
        print(f'HRV insufficient: {type(exc).__name__}')
    return result
