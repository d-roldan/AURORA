$ErrorActionPreference='Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
$settings=@{};Get-Content .env|ForEach-Object {if($_ -match '^([^#=]+)=(.*)$'){$settings[$matches[1]]=$matches[2]}}
$base="http://localhost:$($settings.HTTP_PORT)/api/v1"
$ready=$false
for($attempt=0;$attempt -lt 15;$attempt++){
 try {$null=Invoke-RestMethod "$base/system/live" -TimeoutSec 3;$ready=$true;break} catch {Start-Sleep -Seconds 2}
}
if(-not $ready){throw 'Core API did not become ready; no history imported'}
$auth=Invoke-RestMethod "$base/auth/login" -Method Post -ContentType application/json -Body (@{username='admin';password=$settings.DEMO_ADMIN_PASSWORD}|ConvertTo-Json)
$headers=@{Authorization="Bearer $($auth.token)"}
$crew=Invoke-RestMethod "$base/crew" -Headers $headers
$devices=Invoke-RestMethod "$base/devices" -Headers $headers
$end=[DateTime]::UtcNow
$subjects=@()
$habitatCatalog=$null
foreach($person in $crew){
 Write-Host "Preparing coherent history: $($person.code)"
 $device=$devices|Where-Object {$_.crewMemberId -eq $person.id -and $_.status -eq 'ACTIVE'}|Select-Object -First 1
 if(-not $device){continue}
 $catalog=Invoke-RestMethod "$base/telemetry/catalog?subjectId=$($person.id)" -Headers $headers
 if(-not $habitatCatalog){$habitatCatalog=$catalog}
 $metrics=@()
 foreach($m in $catalog|Where-Object {$_.subjectId -eq $person.id -and $_.cadence -in @('CONTINUOUS','PERIODIC') -and $_.sourceKind -eq 'SIMULATED'}){
  if(-not $m.latest){continue}
  $metrics+=@{key=$m.key;unit=$m.unit;cadence=$m.cadence;sourceKind=$m.sourceKind;expectedIntervalMs=$m.expectedIntervalMs;displayMin=$m.displayMin;displayMax=$m.displayMax;anchor=@{time=$m.latest.observedAt;value=$m.latest.value}}
 }
 $subjects+=@{deviceId=$device.id;missionId=$device.missionId;scope='CREW';metrics=$metrics}
}
$habitatDevice=$devices|Where-Object {$_.habitatId -and $_.status -eq 'ACTIVE'}|Select-Object -First 1
if($habitatDevice -and $habitatCatalog){
 Write-Host "Preparing coherent history: $($habitatDevice.code)"
 $metrics=@()
 foreach($m in $habitatCatalog|Where-Object {$_.subjectId -eq $habitatDevice.habitatId -and $_.cadence -eq 'CONTINUOUS' -and $_.sourceKind -eq 'SIMULATED'}){
  if(-not $m.latest){continue}
  $metrics+=@{key=$m.key;unit=$m.unit;cadence=$m.cadence;sourceKind=$m.sourceKind;expectedIntervalMs=$m.expectedIntervalMs;displayMin=$m.displayMin;displayMax=$m.displayMax;anchor=@{time=$m.latest.observedAt;value=$m.latest.value}}
 }
 $subjects+=@{deviceId=$habitatDevice.id;missionId=$habitatDevice.missionId;scope='HABITAT';metrics=$metrics}
}
New-Item -ItemType Directory output/validation -Force|Out-Null
@{asOf=$end.ToString('o');subjects=$subjects}|ConvertTo-Json -Depth 12|Set-Content output/validation/history-context.json
docker cp services/simulator/app/history_demo.py aegis-aegis-simulator-1:/tmp/history_demo.py
if($LASTEXITCODE -ne 0){throw 'Could not stage simulator history generator'}
docker cp output/validation/history-context.json aegis-aegis-simulator-1:/tmp/history-context.json
docker compose exec -T aegis-simulator python /tmp/history_demo.py /tmp/history-context.json /tmp/history-batches.json
if($LASTEXITCODE -ne 0){throw 'History generation failed'}
docker cp aegis-aegis-simulator-1:/tmp/history-batches.json output/validation/history-batches.json
$batches=Get-Content output/validation/history-batches.json -Raw|ConvertFrom-Json
$accepted=0;$skipped=0
foreach($batch in $batches){
 $result=Invoke-RestMethod "$base/simulator/history" -Method Post -Headers $headers -ContentType application/json -Body ($batch|ConvertTo-Json -Depth 8 -Compress)
 $accepted+=$result.accepted;$skipped+=$result.skipped
}
$summary=@{model='aurora-coherent-history-v2';source='SIMULATED';subjects=$subjects.Count;batches=@($batches).Count;accepted=$accepted;skipped=$skipped;checkedAt=[DateTime]::UtcNow.ToString('o')}
$summary|ConvertTo-Json|Set-Content output/validation/history-import.json
$summary|ConvertTo-Json
