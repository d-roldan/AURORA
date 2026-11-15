from datetime import datetime, timedelta, timezone
from history_demo import generate, periodic_snapshot, continuous_snapshot, millis, DAY


def test_sleep_model_stays_internally_consistent_and_deterministic():
    anchors={'sleep_duration':7.5,'sleep_start':23,'bone_density':1.15,'fatigue':2,'mood':2}
    for day in range(-85, 1):
        sample=periodic_snapshot(anchors, day, .7)
        assert sample == periodic_snapshot(anchors, day, .7)
        assert abs((sample['sleep_start']+sample['sleep_duration'])%24-sample['sleep_end']) < 1e-9
        assert sample['deep_sleep_duration']+sample['rem_sleep_duration'] < sample['sleep_duration']
        assert 1.13 < sample['bone_density'] < 1.17
        assert sample['eva_duration'] == 0


def test_fixture_respects_monthly_cadence_limits_and_never_fabricates_derived_features():
    now=datetime(2026,11,15,tzinfo=timezone.utc)
    stamp=lambda dt:dt.isoformat().replace('+00:00','Z')
    metric=dict(key='bone_density',unit='g/cm²',cadence='PERIODIC',sourceKind='SIMULATED',
                expectedIntervalMs=30*DAY,displayMin=.5,displayMax=1.8,anchor=dict(value=1.15,time=stamp(now-timedelta(hours=12))))
    context=dict(asOf=stamp(now),subjects=[dict(deviceId='device',missionId='mission',metrics=[metric,{**metric,'key':'hrv_rmssd','sourceKind':'DERIVED'}])])
    result=generate(context)
    assert result == generate(context)
    samples=[s for batch in result for s in batch['samples']]
    assert len(samples)==2  # plus the preserved original monthly anchor = three observations
    times=[millis(s['observedAt']) for s in samples]
    assert all(b-a==30*DAY for a,b in zip(times,times[1:]))
    assert all(s['metric']=='bone_density' and s['quality']=='GOOD' and .5<=s['value']<=1.8 for s in samples)
    assert all(batch['source']=='SIMULATED' for batch in result)


def test_continuous_history_has_coherent_cycles_and_monotonic_cumulative_dose():
    now=millis('2026-11-15T12:00:00.000Z')
    anchors={'heart_rate':64,'radiation_dose':3.2,'physical_activity':1.2,'workload':3}
    night=continuous_snapshot(anchors,millis('2026-11-10T03:00:00.000Z'),now,.4,'CREW')
    day=continuous_snapshot(anchors,millis('2026-11-10T15:00:00.000Z'),now,.4,'CREW')
    older=continuous_snapshot(anchors,millis('2026-10-10T15:00:00.000Z'),now,.4,'CREW')
    assert day['physical_activity'] > night['physical_activity']
    assert day['heart_rate'] > night['heart_rate']
    assert day['respiratory_rate'] > night['respiratory_rate']
    assert day['metabolic_rate'] > night['metabolic_rate']
    assert older['radiation_dose'] < day['radiation_dose'] < anchors['radiation_dose']
    assert day['eva_active'] == 0 and day['solar_particle_alert'] == 0
    habitat=continuous_snapshot({'co2':700},millis('2026-11-10T15:00:00.000Z'),now,.4,'HABITAT')
    assert 300 <= habitat['co2'] <= 2500 and 18 <= habitat['oxygen'] <= 23
