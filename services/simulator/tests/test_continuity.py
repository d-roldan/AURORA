"""Producer scheduling tests with a deliberately slow background ECG worker.

Scientific generation is covered separately by the real NeuroKit2 pipeline tests.
This test advances the producer clock to cross a real 600-second code boundary.
"""
import asyncio
from types import SimpleNamespace
import httpx
import numpy as np
from simulator import main as producer


def test_prefetch_does_not_interrupt_telemetry_and_hands_off_next_segment(monkeypatch):
    async def run():
        clock = [1794690000.0]
        start = clock[0]
        pending = asyncio.Event()
        done = asyncio.Event()
        frames, scalar_times, prepared = [], [], []
        real_sleep = asyncio.sleep
        current = SimpleNamespace(seed=42, scenario='NORMAL', subjectId='crew', runId='run',
            devices=[{'id':'device','missionId':'mission','crewMemberId':'crew'}],
            baselines=[{'crewMemberId':'crew','center':62}], latest=[],
            metrics=[{'scope':'CREW','sourceKind':'SIMULATED','cadence':'CONTINUOUS','key':'heart_rate','unit':'bpm'}])
        monkeypatch.setattr(producer, 'config', current)
        monkeypatch.setattr(producer, 'revision', 1)
        monkeypatch.setenv('SERVICE_API_KEY', 'unit-test-service-key')
        monkeypatch.setenv('CORE_API_URL', 'http://unit-test')
        monkeypatch.setattr(producer.time, 'time', lambda: clock[0])

        async def sleep(delay):
            clock[0] += max(delay, 0)
            await real_sleep(0)

        async def prepare(config, index):
            prepared.append((index, clock[0]-start))
            if index == 1:
                await pending.wait()  # Deliberately incomplete while telemetry continues.
            return {'crew':np.full(150000, index, dtype=float)}

        class Client:
            def __init__(self, **kwargs): pass
            async def __aenter__(self): return self
            async def __aexit__(self, *args): pass
            async def post(self, url, json):
                if url.endswith('/ingest'):
                    scalar_times.append(json['samples'][0]['observedAt'])
                else:
                    frames.append(json)
                    if clock[0]-start >= 590:
                        pending.set()
                    if clock[0]-start >= 620:
                        done.set()
                await real_sleep(0)
                return httpx.Response(200, request=httpx.Request('POST',url))

        monkeypatch.setattr(producer.asyncio, 'sleep', sleep)
        monkeypatch.setattr(producer, 'prepare_segments', prepare)
        monkeypatch.setattr(producer.httpx, 'AsyncClient', Client)
        task = asyncio.create_task(producer.produce())
        try:
            await asyncio.wait_for(done.wait(), timeout=3)
        finally:
            task.cancel()
            try: await task
            except asyncio.CancelledError: pass
        from datetime import datetime
        times = [datetime.fromisoformat(t.replace('Z','+00:00')).timestamp() for t in scalar_times]
        assert len(frames) >= 310
        assert all(abs(b-a-2) < .001 for a,b in zip(times,times[1:]))
        assert 480 <= prepared[1][1] <= 484
        assert frames[299]['samples'][0] == 0
        assert frames[300]['samples'][0] == 1
        assert prepared[1][0] == 1
    asyncio.run(run())
