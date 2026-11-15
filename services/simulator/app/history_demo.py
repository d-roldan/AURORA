"""Deterministic fictitious periodic history. Outputs batches; only NestJS writes.

No ECG/HRV is fabricated. Cadences come from the API catalog; values are anchored
to existing simulated observations and never replace their timestamps or values.
"""
import hashlib
import json
import math
import sys
from datetime import datetime, timezone

DAY = 86400000
MODEL = 'aurora-periodic-history-v1'


def millis(stamp):
    return int(datetime.fromisoformat(stamp.replace('Z', '+00:00')).timestamp() * 1000)


def iso(stamp):
    return datetime.fromtimestamp(stamp / 1000, timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')


def periodic_snapshot(anchors, day, phase):
    slow = math.sin(day * .37 + phase) - math.sin(phase)
    weekly = math.sin(day * .17 + phase) - math.sin(phase)
    values = {}
    for key, value in anchors.items():
        amplitude = max(abs(value) * .025, .02)
        values[key] = value + amplitude * slow
    sleep = min(10, max(4, anchors.get('sleep_duration', 7.5) + .35 * slow))
    start = (anchors.get('sleep_start', 23) + .12 * weekly) % 24
    values.update(sleep_duration=sleep, sleep_start=start, sleep_end=(start + sleep) % 24,
                  deep_sleep_duration=min(sleep * .30, max(.3, anchors.get('deep_sleep_duration', 1.4) + .08 * slow)),
                  rem_sleep_duration=min(sleep * .32, max(.4, anchors.get('rem_sleep_duration', 1.7) + .1 * slow)),
                  bone_density=anchors.get('bone_density', 1.15) + .006 * weekly,
                  fatigue=round(min(10, max(0, anchors.get('fatigue', 2) - .8 * slow))),
                  mood=round(min(5, max(-5, anchors.get('mood', 2) + .6 * slow))),
                  perceived_stress=round(min(10, max(0, anchors.get('perceived_stress', 3) - .5 * slow))),
                  reaction_time=max(100, anchors.get('reaction_time', 245) - 7 * slow),
                  attention=min(100, max(0, anchors.get('attention', 95) + .7 * slow)))
    for key in ('exercise_sessions', 'sleep_interruptions'):
        values[key] = max(0, round(anchors.get(key, 2) + .6 * slow))
    # Preserve a resting scenario rather than introducing an invented EVA session.
    values['eva_duration'] = anchors.get('eva_duration', 0)
    return values


def generate(context):
    now = millis(context['asOf'])
    batches = []
    for subject in context['subjects']:
        metrics = [m for m in subject['metrics'] if m['cadence'] == 'PERIODIC' and m['sourceKind'] == 'SIMULATED']
        anchors = {m['key']: m['anchor']['value'] for m in metrics if m.get('anchor')}
        phase = int(hashlib.sha256(subject['deviceId'].encode()).hexdigest()[:8], 16) / 2**32 * 2 * math.pi
        samples = []
        for metric in metrics:
            anchor = metric.get('anchor')
            if not anchor:
                continue
            end = millis(anchor['time'])
            interval = metric['expectedIntervalMs']
            # Each series retains its real API cadence, including weekly/monthly records.
            count = min(90, math.ceil(85 * DAY / interval))
            for index in range(1, count + 1):
                stamp = end - index * interval
                if not now - 89 * DAY <= stamp <= now - DAY - 60000:
                    continue
                day = (stamp - end) / DAY
                value = periodic_snapshot(anchors, day, phase).get(metric['key'], anchors[metric['key']])
                value = round(min(metric['displayMax'], max(metric['displayMin'], value)), 4)
                samples.append(dict(metric=metric['key'], value=value, unit=metric['unit'], observedAt=iso(stamp), quality='GOOD'))
        samples.sort(key=lambda sample: (sample['observedAt'], sample['metric']))
        for offset in range(0, len(samples), 300):
            batches.append(dict(schemaVersion=1, batchId=f'{MODEL}-{subject["deviceId"]}-{offset}',
                                missionId=subject['missionId'], deviceId=subject['deviceId'],
                                source='SIMULATED', samples=samples[offset:offset + 300]))
    return batches


if __name__ == '__main__':
    with open(sys.argv[1], encoding='utf-8-sig') as file:
        context = json.load(file)
    with open(sys.argv[2], 'w', encoding='utf-8') as file:
        json.dump(generate(context), file, allow_nan=False)
