$ErrorActionPreference='Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
$settings=@{};Get-Content .env|ForEach-Object {if($_ -match '^([^#=]+)=(.*)$'){$settings[$matches[1]]=$matches[2]}}
$base="http://localhost:$($settings.HTTP_PORT)/api/v1"
$session=Invoke-RestMethod "$base/auth/login" -Method Post -ContentType application/json -Body (@{username='admin';password=$settings.DEMO_ADMIN_PASSWORD}|ConvertTo-Json)
$headers=@{Authorization="Bearer $($session.token)"}
function Call($path,$body=$null){$opts=@{Uri="$base$path";Headers=$headers;TimeoutSec=40};if($null -ne $body){$opts.Method='Post';$opts.ContentType='application/json';$opts.Body=$body|ConvertTo-Json -Depth 10};$response=Invoke-RestMethod @opts;return $response}
$results=[System.Collections.Generic.List[string]]::new()
function Check($condition,$name){if(-not $condition){throw "FAIL: $name"};$results.Add($name);Write-Host "PASS: $name"}
function Wait-For([scriptblock]$condition,$seconds=120){$until=[DateTime]::UtcNow.AddSeconds($seconds);do{if(&$condition){return};Start-Sleep -Seconds 2}while([DateTime]::UtcNow -lt $until);throw 'Operational state did not converge'}
$crew=Call '/crew';$id=$crew[0].id
function View($zone='ROVER'){Call "/crew/$id/operational-view?environment=$zone"}
function Scenario($name){Call '/simulator/start' @{scenario=$name;seed=14;subjectId=$id}|Out-Null}
try{
 Scenario 'NORMAL'
 Wait-For {$script:view=View;$view.level -eq 'NONE' -and $view.slots[0].metrics[0].availability -eq 'AVAILABLE'}
 foreach($zone in @('TRANSIT','STATION','ROVER','SURFACE')){
  $v=View $zone;Check ($v.slots.Count -eq 5) "Five slots in $zone"
  Check ($v.slots[0].id -eq 1 -and $v.slots[0].metrics[0].key -eq 'spo2' -and $v.slots[1].id -eq 2 -and $v.slots[1].metrics[0].key -eq 'heart_rate') "Fixed universal slots in $zone"
  Check ($v.radiation.Count -eq 3) "Permanent radiation strip in $zone"
 }
 Scenario 'YELLOW_ALERT_DEMO'
 Wait-For {$script:view=View;$view.level -eq 'YELLOW'}
 Check (@($view.slots|Where-Object kind -eq OVERRIDE).Count -eq 0) 'Yellow does not replace a contextual slot'
 $yellow=@($view.alerts|Where-Object metric -eq blood_glucose)[0];$eventId=$yellow.eventId
 Scenario 'RED_ALERT_DEMO'
 Wait-For {$script:view=View;$view.level -eq 'RED'}
 $override=@($view.slots|Where-Object kind -eq OVERRIDE)[0]
 Check ($override.id -eq 5 -and $override.metrics[0].key -eq 'blood_glucose') 'Secondary red replaces slot 5'
 Check (@($view.alerts|Where-Object metric -eq blood_glucose)[0].eventId -eq $eventId) 'Escalation preserves episode identity'
 Call "/events/$eventId/acknowledge" @{note='Synthetic operational override reviewed in functional test'}|Out-Null
 $v=View;Check ($v.level -eq 'RED') 'Acknowledgement does not hide active red condition'
 docker compose restart aegis-backend
 Wait-For {try{$script:view=View;$view.level -eq 'RED'}catch{$false}} 60
 Check (@($view.alerts|Where-Object metric -eq blood_glucose)[0].eventId -eq $eventId) 'Active red episode survives API restart'
 Call '/simulator/stop' @{}|Out-Null
 Wait-For {$script:view=View;@($view.alerts|Where-Object {$_.metric -eq 'blood_glucose' -and $_.stale}).Count -gt 0} 35
 Check ($view.level -eq 'RED' -and @($view.slots|Where-Object kind -eq OVERRIDE)[0].metrics[0].value -eq $null) 'Stale data retains red latch and masks stale value'
 Scenario 'NORMAL'
 Wait-For {$script:view=View;$view.level -eq 'NONE'}
 $review=@((Call '/events')|Where-Object id -eq $eventId)[0]
 Check ($review.status -eq 'ACKNOWLEDGED' -and -not $review.evidence.conditionActive) 'Recovery does not resolve human review'
 Call "/events/$eventId/resolve" @{note='Synthetic condition recovered and test completed'}|Out-Null
 Scenario 'SOLAR_EVENT_DEMO'
 Wait-For {$script:view=View 'TRANSIT';$view.level -eq 'RED' -and @($view.alerts|Where-Object metric -eq solar_particle_alert).Count -eq 1}
 Check (@($view.slots|Where-Object kind -eq OVERRIDE)[0].metrics[0].key -eq 'solar_particle_alert') 'Synthetic SPE promoted in transit while radiation remains visible'
 # Freeze the producer: otherwise two normal glucose samples can legitimately recover
 # the injected alert while a catalog request is running.
 Call '/simulator/stop' @{}|Out-Null
 Start-Sleep -Seconds 4
 $devices=Call '/devices';$device=@($devices|Where-Object crewMemberId -eq $id)[0]
 $batch=@{schemaVersion=1;batchId='ops-glucose-retry';missionId=$device.missionId;deviceId=$device.id;source='SIMULATED';samples=@(@{metric='blood_glucose';value=280;unit='mg/dL';observedAt=[DateTime]::UtcNow.ToString('o');quality='GOOD'})}
 foreach($attempt in 1..2){Invoke-RestMethod "$base/telemetry/ingest" -Method Post -Headers @{'x-service-key'=$settings.SERVICE_API_KEY} -ContentType application/json -Body ($batch|ConvertTo-Json -Depth 8)|Out-Null}
 $v=View;Check (@($v.alerts|Where-Object metric -eq blood_glucose).Count -eq 1) 'Repeated batch does not duplicate active operational episode'
 foreach($quality in @('GOOD','INVALID','GOOD')){
  Start-Sleep -Milliseconds 300
  $batch.batchId=[guid]::NewGuid().ToString();$batch.samples[0].value=105;$batch.samples[0].quality=$quality;$batch.samples[0].observedAt=[DateTime]::UtcNow.ToString('o')
  Invoke-RestMethod "$base/telemetry/ingest" -Method Post -Headers @{'x-service-key'=$settings.SERVICE_API_KEY} -ContentType application/json -Body ($batch|ConvertTo-Json -Depth 8)|Out-Null
 }
 $v=View;Check (@($v.alerts|Where-Object metric -eq blood_glucose).Count -eq 1) 'Invalid observation breaks normal-reading recovery streak'
 $crewSession=Invoke-RestMethod "$base/auth/login" -Method Post -ContentType application/json -Body (@{username='crew';password=$settings.DEMO_ADMIN_PASSWORD}|ConvertTo-Json)
 $denied=Invoke-WebRequest "$base/crew/$($crew[1].id)/operational-view?environment=ROVER" -Headers @{Authorization="Bearer $($crewSession.token)"} -SkipHttpErrorCheck
 Check ($denied.StatusCode -eq 403) 'Crew cannot inspect another astronaut operational view'
 New-Item -ItemType Directory -Force output/validation|Out-Null
 @{passed=$true;checks=$results;eventId=$eventId;checkedAt=[DateTime]::UtcNow.ToString('o')}|ConvertTo-Json -Depth 8|Set-Content output/validation/operational.json
}finally{Scenario 'NORMAL'}
