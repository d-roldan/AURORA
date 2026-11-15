"""Deterministic coherent synthetic history. Outputs batches; only NestJS writes.

No ECG/HRV is fabricated. Periodic cadences come from the API catalog. Continuous
history uses a bounded six-hour resolution and is anchored to simulated readings.
"""
import hashlib
import json
import math
import sys
from datetime import datetime, timezone

DAY = 86400000
HOUR = 3600000
CONTINUOUS_INTERVAL = 6 * HOUR
MODEL = 'aurora-coherent-history-v2'


def millis(stamp):
    return int(datetime.fromisoformat(stamp.replace('Z', '+00:00')).timestamp() * 1000)


def iso(stamp):
    return datetime.fromtimestamp(stamp / 1000, timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')


def clamp(value, low, high):
    return min(high, max(low, value))


def periodic_snapshot(anchors, day, phase):
    slow = math.sin(day * .37 + phase) - math.sin(phase)
    weekly = math.sin(day * .17 + phase) - math.sin(phase)
    values = {}
    for key, value in anchors.items():
        amplitude = max(abs(value) * .025, .02)
        values[key] = value + amplitude * slow
    sleep = clamp(anchors.get('sleep_duration', 7.5) + .35 * slow, 4, 10)
    start = (anchors.get('sleep_start', 23) + .12 * weekly) % 24
    sleep_debt = 7.5 - sleep
    values.update(sleep_duration=sleep, sleep_start=start, sleep_end=(start + sleep) % 24,
                  deep_sleep_duration=min(sleep * .30, max(.3, anchors.get('deep_sleep_duration', 1.4) + .08 * slow)),
                  rem_sleep_duration=min(sleep * .32, max(.4, anchors.get('rem_sleep_duration', 1.7) + .1 * slow)),
                  bone_density=anchors.get('bone_density', 1.15) + max(0, -day) * .00004 + .0015 * weekly,
                  bone_p1np=anchors.get('bone_p1np', 40) + 1.8 * weekly,
                  bone_ctx=anchors.get('bone_ctx', .35) - .012 * weekly,
                  fatigue=round(clamp(anchors.get('fatigue', 2) + sleep_debt * .8 - .45 * slow, 0, 10)),
                  mood=round(clamp(anchors.get('mood', 2) - sleep_debt * .45 + .4 * slow, -5, 5)),
                  perceived_stress=round(clamp(anchors.get('perceived_stress', 3) + sleep_debt * .5 - .3 * slow, 0, 10)),
                  reaction_time=max(100, anchors.get('reaction_time', 245) + sleep_debt * 12 - 5 * slow),
                  attention=clamp(anchors.get('attention', 95) - sleep_debt * 1.5 + .5 * slow, 0, 100),
                  sleep_interruptions=max(0, round(anchors.get('sleep_interruptions', 2) + sleep_debt * .5 - .3 * slow)),
                  exercise_sessions=max(0, round(anchors.get('exercise_sessions', 2) + .45 * slow)),
                  exercise_duration=max(0, anchors.get('exercise_duration', 50) + 6 * slow),
                  rest_duration=max(0, anchors.get('rest_duration', 55) + sleep_debt * 5 - 4 * slow),
                  muscle_strength=anchors.get('muscle_strength', 420) + 4 * weekly,
                  circadian_offset=anchors.get('circadian_offset', 0) + .12 * weekly,
                  plasma_volume=anchors.get('plasma_volume', 2900) + 22 * weekly,
                  vascular_resistance=anchors.get('vascular_resistance', 17) - .18 * weekly,
                  cephalic_fluid_shift=anchors.get('cephalic_fluid_shift', 300) + 7 * weekly,
                  intraocular_pressure=anchors.get('intraocular_pressure', 16) + .18 * weekly)
    # Preserve a resting scenario rather than introducing an invented EVA session.
    values['eva_duration'] = anchors.get('eva_duration', 0)
    return values


def continuous_snapshot(anchors, stamp, as_of, phase, scope):
    moment = datetime.fromtimestamp(stamp / 1000, timezone.utc)
    hour = moment.hour + moment.minute / 60
    day = stamp / DAY
    daily = math.sin(2 * math.pi * (hour - 6) / 24)
    slow = math.sin(day * .19 + phase)
    active = max(0, math.sin(math.pi * (hour - 6) / 16)) if 6 <= hour <= 22 else 0
    values = {key: value + max(abs(value) * .008, .01) * slow for key, value in anchors.items()}
    if scope == 'HABITAT':
        values.update(co2=620 + 155 * active + 18 * slow,
                      oxygen=20.9 - .025 * active + .015 * slow,
                      temperature=21.7 + .8 * active + .15 * daily,
                      humidity=42 + 2.2 * active + 1.1 * slow,
                      pressure=101.3 + .12 * slow)
        return values

    baseline = anchors.get('heart_rate', 64)
    activity = .85 + 1.15 * active + .08 * slow
    workload = 1.5 + 2.8 * active + .35 * slow
    meal = sum(math.exp(-((hour-center)/1.15)**2) for center in (8, 13, 19))
    metabolic = 76 + 72 * activity + 5 * slow
    elapsed_days = max(0, (as_of - stamp) / DAY)
    radiation_rate = 1.05 + .15 * slow
    values.update(
        heart_rate=baseline + 8.5 * active + 1.1 * slow,
        spo2=98.1 - .18 * active + .08 * slow,
        systolic_bp=116 + 7 * active + 1.6 * slow,
        diastolic_bp=75 + 3.2 * active + .9 * slow,
        respiratory_rate=13 + 3.1 * active + .35 * slow,
        body_temperature=36.45 + .28 * active + .07 * daily,
        hydration=58.5 - .7 * active + .4 * slow,
        physical_activity=activity,
        radiation_rate=radiation_rate,
        radiation_dose=max(0, anchors.get('radiation_dose', 3.2) - elapsed_days * .025),
        workload=workload,
        eva_active=0,
        blood_glucose=91 + 16 * meal + 2.5 * slow,
        rover_pressure=101.0 + .12 * slow,
        rover_oxygen=20.9 + .02 * slow,
        rover_co2=610 + 25 * active + 8 * slow,
        metabolic_rate=metabolic,
        energy_expenditure=metabolic * 3600 / 4184,
        water_remaining=clamp(4.4 - .11 * hour + .08 * slow, 1.5, 4.5),
        cooling_water_remaining=clamp(5.2 - .08 * hour + .06 * slow, 2, 5.5),
        battery_remaining=clamp(98 - 2.1 * hour + 1.2 * slow, 48, 100),
        oxygen_remaining=clamp(98 - 1.8 * hour + .8 * slow, 52, 100),
        weight_bearing_load=120 + 105 * active + 5 * slow,
        gait_cadence=18 + 76 * active + 2 * slow,
        gait_symmetry=97 + .35 * slow,
        surface_dust=18 + 7 * active + 1.5 * slow,
        solar_particle_alert=0)
    return values


def generate(context):
    now = millis(context['asOf'])
    batches = []
    for subject in context['subjects']:
        metrics = [m for m in subject['metrics'] if m['cadence'] in ('CONTINUOUS', 'PERIODIC') and m['sourceKind'] == 'SIMULATED']
        anchors = {m['key']: m['anchor']['value'] for m in metrics if m.get('anchor')}
        phase = int(hashlib.sha256(subject['deviceId'].encode()).hexdigest()[:8], 16) / 2**32 * 2 * math.pi
        samples = []
        snapshots = {}
        for metric in metrics:
            anchor = metric.get('anchor')
            if not anchor:
                continue
            if metric['cadence'] == 'PERIODIC':
                end = millis(anchor['time'])
                interval = metric['expectedIntervalMs']
                # Each periodic series retains its catalog cadence, including weekly/monthly records.
                count = min(90, math.ceil(85 * DAY / interval))
                stamps = (end - index * interval for index in range(1, count + 1))
            else:
                # Historical continuous trends are evidence snapshots, not fabricated two-second acquisition.
                end = ((now - DAY - HOUR) // CONTINUOUS_INTERVAL) * CONTINUOUS_INTERVAL
                stamps = range(end, now - 89 * DAY, -CONTINUOUS_INTERVAL)
            for stamp in stamps:
                if not now - 89 * DAY <= stamp <= now - DAY - 60000:
                    continue
                snapshot_key = (metric['cadence'], stamp)
                if snapshot_key not in snapshots:
                    day = (stamp - millis(anchor['time'])) / DAY
                    snapshots[snapshot_key] = (periodic_snapshot(anchors, day, phase) if metric['cadence'] == 'PERIODIC'
                                               else continuous_snapshot(anchors, stamp, now, phase, subject.get('scope', 'CREW')))
                value = snapshots[snapshot_key].get(metric['key'], anchors[metric['key']])
                value = round(clamp(value, metric['displayMin'], metric['displayMax']), 4)
                samples.append(dict(metric=metric['key'], value=value, unit=metric['unit'], observedAt=iso(stamp), quality='GOOD'))
        # Grouping by metric keeps exact-timestamp deduplication bounded to one
        # raw Influx query per batch instead of one query per mixed series.
        for metric_key in sorted({sample['metric'] for sample in samples}):
            metric_samples = sorted((sample for sample in samples if sample['metric'] == metric_key),
                                    key=lambda sample: sample['observedAt'])
            identity = hashlib.sha256(f'{subject["deviceId"]}:{metric_key}'.encode()).hexdigest()[:12]
            for offset in range(0, len(metric_samples), 300):
                batches.append(dict(schemaVersion=1, batchId=f'{MODEL}-{identity}-{offset}',
                                    missionId=subject['missionId'], deviceId=subject['deviceId'],
                                    source='SIMULATED', samples=metric_samples[offset:offset + 300]))
    return batches


if __name__ == '__main__':
    with open(sys.argv[1], encoding='utf-8-sig') as file:
        context = json.load(file)
    with open(sys.argv[2], 'w', encoding='utf-8') as file:
        json.dump(generate(context), file, allow_nan=False)
