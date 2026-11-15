$ErrorActionPreference='Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
$settings=@{}
Get-Content .env|ForEach-Object {if($_ -match '^([^#=]+)=(.*)$'){$settings[$matches[1]]=$matches[2]}}
$base="http://localhost:$($settings.HTTP_PORT)/api/v1"
$session=Invoke-RestMethod "$base/auth/login" -Method Post -ContentType application/json -Body (@{username='admin';password=$settings.DEMO_ADMIN_PASSWORD}|ConvertTo-Json)
$headers=@{Authorization="Bearer $($session.token)"}
$crew=Invoke-RestMethod "$base/crew" -Headers $headers
$results=@()
foreach($subject in $crew){
 $catalog=Invoke-RestMethod "$base/telemetry/catalog?subjectId=$($subject.id)" -Headers $headers -TimeoutSec 40
 $categories=@($catalog.category|Sort-Object -Unique)
 if($catalog.Count -ne 60 -or $categories.Count -ne 11){throw 'Incomplete metric catalog'}
 $available=@($catalog|Where-Object {$null -ne $_.latest})
 if($available.Count -ne 60){throw "Incomplete persisted metrics for $($subject.code): $($available.Count)/60; HRV needs five continuous minutes"}
 $hrv=@($catalog|Where-Object {$_.key -like 'hrv_*'})
 foreach($metric in $hrv){if($metric.latest.source -ne 'DERIVED' -or $metric.latest.value -lt 0){throw 'Invalid HRV provenance'}}
 $wave=Invoke-RestMethod "$base/telemetry/waveforms?subjectId=$($subject.id)" -Headers $headers -TimeoutSec 40
 if($wave.Count -lt 1000){throw 'Missing real ECG per astronaut'}
 $periodic=@($catalog|Where-Object cadence -eq 'PERIODIC')
 if($periodic.Count -lt 15){throw 'Missing periodic records'}
 $analysis=Invoke-RestMethod "$base/analytics/hrv?subjectId=$($subject.id)" -Headers $headers -Method Post -TimeoutSec 60
 if($analysis.quality -ne 'GOOD' -or $analysis.windowSeconds -ne 300){throw "HRV window not ready for $($subject.code)"}
 $results+=@{crew=$subject.code;catalogCount=$catalog.Count;categoryCount=$categories.Count;available=$available.Count;waveformPoints=$wave.Count;periodicCount=$periodic.Count;hrv=$analysis}
 Write-Host "PASS: $($subject.code): 60 metrics, 11 categories, ECG and five-minute NeuroKit2 HRV"
}
$results|ConvertTo-Json -Depth 8|Set-Content output/validation/expanded-metrics.json

