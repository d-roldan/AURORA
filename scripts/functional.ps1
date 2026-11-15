$ErrorActionPreference='Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
$settings=@{}
Get-Content .env|ForEach-Object {if($_ -match '^([^#=]+)=(.*)$'){$settings[$matches[1]]=$matches[2]}}
$base="http://localhost:$($settings.HTTP_PORT)/api/v1"
$login=Invoke-RestMethod "$base/auth/login" -Method Post -ContentType application/json -Body (@{username='admin';password=$settings.DEMO_ADMIN_PASSWORD}|ConvertTo-Json)
$headers=@{Authorization="Bearer $($login.token)"}
function Call($path,$body=$null){$opts=@{Uri="$base$path";Headers=$headers;TimeoutSec=30};if($null -ne $body){$opts.Method='Post';$opts.ContentType='application/json';$opts.Body=$body|ConvertTo-Json -Depth 12}; $response=Invoke-RestMethod @opts; return $response }
function Wait-For($name,[scriptblock]$condition,$seconds=65){$deadline=[DateTime]::UtcNow.AddSeconds($seconds);do{if(&$condition){Write-Host "PASS: $name";return};Start-Sleep -Seconds 2}while([DateTime]::UtcNow -lt $deadline);throw "Timeout: $name"}
$crew=Call '/crew';$target=$crew[0].id
Call '/simulator/start' @{scenario='NORMAL';seed=2026;subjectId=$target}|Out-Null
Start-Sleep -Seconds 6
$started=[DateTime]::UtcNow
Call '/simulator/start' @{scenario='FATIGUE_DEMO';seed=2026;subjectId=$target}|Out-Null
Wait-For 'sustained deviation event from real observations' { $script:event=@(Call '/events'|Where-Object {$_.type -eq 'BASELINE_DEVIATION' -and [DateTime]$_.firstObservedAt -gt $started})[0];$null -ne $script:event }
if($event.evidence.durationSeconds -lt 30 -or $event.evidence.baseline -ne 62){throw 'Invalid deviation evidence'}
$eventId=$event.id
Start-Sleep -Seconds 6
$episodes=@(Call '/events'|Where-Object {$_.type -eq 'BASELINE_DEVIATION' -and [DateTime]$_.firstObservedAt -gt $started})
if($episodes.Count -ne 1){throw 'More than one event per sustained episode'}
Write-Host 'PASS: one event per episode'
Call "/events/$eventId/acknowledge" @{note='Automated functional validation: synthetic episode reviewed'}|Out-Null
Call "/events/$eventId/resolve" @{note='Automated functional validation: synthetic episode closed'}|Out-Null
$resolved=@(Call '/events'|Where-Object id -eq $eventId)[0]
if($resolved.status -ne 'RESOLVED' -or -not $resolved.resolutionNote){throw 'Resolution did not persist'}
Write-Host 'PASS: acknowledgement and resolution persisted'
Call '/simulator/start' @{scenario='NORMAL';seed=2026;subjectId=$target}|Out-Null
Start-Sleep -Seconds 6
$lostStart=[DateTime]::UtcNow
Call '/simulator/start' @{scenario='SENSOR_LOSS';seed=2026;subjectId=$target}|Out-Null
Wait-For 'sensor loss staleness and technical event' {
 $latest=@(Call "/telemetry/latest?subjectId=$target"|Where-Object metric -eq 'heart_rate')[0]
 $lost=@(Call '/events'|Where-Object {$_.type -eq 'SIGNAL_LOST' -and $_.crewMemberId -eq $target -and [DateTime]$_.firstObservedAt -gt $lostStart.AddSeconds(-10)})
 $latest.freshness -eq 'STALE' -and $lost.Count -gt 0
} 40
$habitatStart=[DateTime]::UtcNow
Call '/simulator/start' @{scenario='HABITAT_CHANGE';seed=2026;subjectId=$target}|Out-Null
Wait-For 'habitat environment threshold event' {@(Call '/events'|Where-Object type -eq 'ENVIRONMENT_CHANGE').Count -gt 0} 45
Call '/simulator/stop' @{}|Out-Null
Start-Sleep -Seconds 3
$device=@(Call '/devices'|Where-Object crewMemberId -eq $crew[1].id)[0]
$t=[DateTime]::UtcNow.AddSeconds(-1);$batch=@{schemaVersion=1;batchId='functional-idempotence';missionId=$device.missionId;deviceId=$device.id;source='SIMULATED';samples=@(@{metric='heart_rate';value=65;unit='bpm';quality='GOOD';observedAt=$t.ToString('o')})}
foreach($attempt in 1..2){Invoke-RestMethod "$base/telemetry/ingest" -Method Post -Headers @{'x-service-key'=$settings.SERVICE_API_KEY} -ContentType application/json -Body ($batch|ConvertTo-Json -Depth 8)|Out-Null}
$points=@(Call "/telemetry/history?subjectId=$($crew[1].id)&metric=heart_rate&from=$($t.AddMilliseconds(-1).ToString('o'))&to=$($t.AddMilliseconds(1).ToString('o'))")
if($points.Count -ne 1){throw 'Duplicate Influx points'}
Write-Host 'PASS: repeated batch identity stores one Influx point'
Call '/simulator/start' @{scenario='NORMAL';seed=42;subjectId=$target}|Out-Null
$audit=@(Call '/audit'|Where-Object {$_.entityId -eq $eventId})
if($audit.Count -lt 3){throw 'Audit trail missing transitions'}
$result=@{passed=$true;eventId=$eventId;durationSeconds=$event.evidence.durationSeconds;episodeCount=$episodes.Count;resolved=$resolved.status;duplicatePointCount=$points.Count;auditActions=@($audit|ForEach-Object action);checkedAt=[DateTime]::UtcNow.ToString('o')}
New-Item -ItemType Directory -Force output/validation|Out-Null
$result|ConvertTo-Json -Depth 8|Set-Content output/validation/functional.json
