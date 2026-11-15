$ErrorActionPreference='Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
$settings=@{};Get-Content .env|ForEach-Object {if($_ -match '^([^#=]+)=(.*)$'){$settings[$matches[1]]=$matches[2]}}
$base="http://localhost:$($settings.HTTP_PORT)/api/v1"
$auth=Invoke-RestMethod "$base/auth/login" -Method Post -ContentType application/json -Body (@{username='admin';password=$settings.DEMO_ADMIN_PASSWORD}|ConvertTo-Json)
$headers=@{Authorization="Bearer $($auth.token)"}
$batch=@(Get-Content output/validation/history-batches.json -Raw|ConvertFrom-Json)[0]
$retry=Invoke-RestMethod "$base/simulator/history" -Method Post -Headers $headers -ContentType application/json -Body ($batch|ConvertTo-Json -Depth 8 -Compress)
if($retry.accepted -ne 0){throw 'Retry was not idempotent'}
$viewer=Invoke-RestMethod "$base/auth/demo" -Method Post
try {Invoke-RestMethod "$base/simulator/history" -Method Post -Headers @{Authorization="Bearer $($viewer.token)"} -ContentType application/json -Body ($batch|ConvertTo-Json -Depth 8 -Compress)|Out-Null;throw 'Viewer could import history'} catch {if([int]$_.Exception.Response.StatusCode -ne 403){throw}}
$bad=$batch|ConvertTo-Json -Depth 8|ConvertFrom-Json;$bad.samples[0].observedAt=[DateTime]::UtcNow.ToString('o')
try {Invoke-RestMethod "$base/simulator/history" -Method Post -Headers $headers -ContentType application/json -Body ($bad|ConvertTo-Json -Depth 8 -Compress)|Out-Null;throw 'Recent fake history was accepted'} catch {if([int]$_.Exception.Response.StatusCode -ne 400){throw}}
$people=Invoke-RestMethod "$base/crew" -Headers $headers
$end=[DateTime]::UtcNow;$start=$end.AddDays(-89);$rows=@()
foreach($person in $people){
 $catalog=Invoke-RestMethod "$base/telemetry/catalog?subjectId=$($person.id)" -Headers $headers
 foreach($key in @('sleep_duration','bone_density','bone_p1np','reaction_time')){
  $m=$catalog|Where-Object {$_.key -eq $key}
  $points=Invoke-RestMethod "$base/telemetry/history?subjectId=$($person.id)&metric=$key&from=$($start.ToString('o'))&to=$($end.ToString('o'))" -Headers $headers
  $fixture=@($points|Where-Object {$_.algorithmVersion -eq 'aurora-periodic-history-v1'})
  if($points.Count -lt 3 -or $fixture.Count -lt 2){throw "Insufficient history: $($person.code)/$key"}
  $last=$points[-1]
  if($last.time -ne $m.latest.observedAt -or [Math]::Abs($last.value-$m.latest.value) -gt 0.000001){throw "Last chart observation does not match the card: $key"}
  for($i=1;$i -lt $fixture.Count;$i++){
   $delta=([DateTimeOffset]$fixture[$i].time-[DateTimeOffset]$fixture[$i-1].time).TotalMilliseconds
   if([Math]::Abs($delta-$m.expectedIntervalMs) -gt 1){throw "Incorrect fixture cadence: $key"}
  }
  $rows+=@{crew=$person.code;metric=$key;count=$points.Count;syntheticHistory=$fixture.Count;lastValue=$last.value;lastObservedAt=$last.time;unit=$m.unit}
 }
}
$result=@{passed=$true;checks=@('Historical import retry accepted zero new points','Viewer import rejected with 403','Recent fixture timestamp rejected with 400','Daily/weekly/monthly records available for all four astronauts','Historical fixture respects catalog cadence','Last graph values and timestamps match current catalog cards');series=$rows;checkedAt=[DateTime]::UtcNow.ToString('o')}
$result|ConvertTo-Json -Depth 8|Set-Content output/validation/history-verification.json
$result|ConvertTo-Json -Depth 8
