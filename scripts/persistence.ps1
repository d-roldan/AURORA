$ErrorActionPreference='Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
$settings=@{}
Get-Content .env | ForEach-Object {if($_ -match '^([^#=]+)=(.*)$'){$settings[$matches[1]]=$matches[2]}}
$base="http://localhost:$($settings.HTTP_PORT)/api/v1"
$login=Invoke-RestMethod "$base/auth/login" -Method Post -ContentType application/json -Body (@{username='admin';password=$settings.DEMO_ADMIN_PASSWORD}|ConvertTo-Json)
$headers=@{Authorization="Bearer $($login.token)"}
function Read($path){Invoke-RestMethod "$base$path" -Headers $headers -TimeoutSec 30}
$crew=Read '/crew';$id=$crew[0].id
$to=[DateTime]::UtcNow.AddSeconds(-3).ToString('o');$from=[DateTime]::UtcNow.AddMinutes(-10).ToString('o')
$path="/telemetry/history?subjectId=$id&metric=heart_rate&from=$from&to=$to"
$historyBefore=Read $path
$baselineBefore=(Read "/crew/$id/baseline")|ConvertTo-Json -Depth 10 -Compress
$eventIdsBefore=@((Read '/events')|ForEach-Object id)
if($historyBefore.Count -lt 5 -or $eventIdsBefore.Count -lt 1){throw 'Need historical readings and at least one persisted event before test'}
docker compose restart
if($LASTEXITCODE -ne 0){throw 'Compose restart failed'}
$ready=$false
for($i=0;$i -lt 40;$i++){
 Start-Sleep -Seconds 2
 try{$health=Read '/system/health';if($health.status -eq 'UP'){$ready=$true;break}}catch{}
}
if(-not $ready){throw 'Services did not recover'}
$historyAfter=Read $path
$baselineAfter=(Read "/crew/$id/baseline")|ConvertTo-Json -Depth 10 -Compress
$eventIdsAfter=@((Read '/events')|ForEach-Object id)
if(($historyBefore|ConvertTo-Json -Depth 6 -Compress) -ne ($historyAfter|ConvertTo-Json -Depth 6 -Compress)){throw 'Fixed Influx history changed across restart'}
if($baselineBefore -ne $baselineAfter){throw 'Baseline changed across restart'}
foreach($eventId in $eventIdsBefore){if($eventId -notin $eventIdsAfter){throw "Missing persisted event $eventId"}}
$result=@{passed=$true;historyPoints=$historyAfter.Count;persistedEvents=$eventIdsBefore.Count;baselineUnchanged=$true;services=$health.services;checkedAt=[DateTime]::UtcNow.ToString('o')}
New-Item -ItemType Directory -Force output/validation | Out-Null
$result|ConvertTo-Json -Depth 6|Set-Content output/validation/persistence.json
$result|ConvertTo-Json -Depth 6
