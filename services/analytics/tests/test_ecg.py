import os
os.environ["SERVICE_API_KEY"] = "test-key"
import neurokit2 as nk
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
def test_real_neurokit_pipeline():
    samples = nk.ecg_simulate(duration=20, sampling_rate=250, heart_rate=62, random_state=42).tolist()
    response = client.post('/v1/ecg/process', headers={'x-service-key':'test-key'}, json={
        'samples':samples,'samplingRateHz':250,'startAt':'2026-11-14T15:00:00Z','unit':'a.u.'})
    assert response.status_code == 200
    result = response.json()
    assert 58 < result['heartRateBpm'] < 66
    assert len(result['rPeakIndices']) > 15
def test_invalid_and_auth():
    assert client.post('/v1/ecg/process',json={}).status_code == 401
    assert client.post('/v1/ecg/process',headers={'x-service-key':'test-key'},json={}).status_code == 422
def test_flat_signal_is_unavailable():
    response = client.post('/v1/ecg/process',headers={'x-service-key':'test-key'},json={
        'samples':[0]*5000,'samplingRateHz':250,'startAt':'2026-11-14T15:00:00Z','unit':'a.u.'})
    assert response.json()['heartRateBpm'] is None

def test_hrv_real_five_minute_window():
    samples=nk.ecg_simulate(duration=300,sampling_rate=250,heart_rate=62,random_state=44,noise=.01).tolist()
    response=client.post('/v1/hrv/process',headers={'x-service-key':'test-key'},json={
        'samples':samples,'samplingRateHz':250,'startAt':'2026-11-14T15:00:00Z','unit':'a.u.'})
    assert response.status_code==200
    result=response.json()
    assert result['quality']=='GOOD'
    assert 0<result['rmssdMs']<1000
    assert 0<result['sdnnMs']<1000
    assert result['windowSeconds']==300
    assert result['rPeakCount']>250

def test_hrv_rejects_short_window():
    assert client.post('/v1/hrv/process',headers={'x-service-key':'test-key'},json={
        'samples':[0]*5000,'samplingRateHz':250,'startAt':'2026-11-14T15:00:00Z','unit':'a.u.'}).status_code==422
