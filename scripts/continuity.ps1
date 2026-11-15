$ErrorActionPreference='Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
$settings=@{};Get-Content .env|ForEach-Object {if($_ -match '^([^#=]+)=(.*)$'){$settings[$matches[1]]=$matches[2]}}
$base="http://localhost:$($settings.HTTP_PORT)/api/v1"
$auth=Invoke-RestMethod "$base/auth/login" -Method Post -ContentType application/json -Body (@{username='admin';password=$settings.DEMO_ADMIN_PASSWORD}|ConvertTo-Json)
$headers=@{Authorization="Bearer $($auth.token)"}
$id='20cd85e5-cb29-4f46-8fb1-e2c0fac227da'
$results=@()
function Browser($phase){
 $code=(Get-Content tests/e2e/continuity.js -Raw).Replace('__PHASE__',$phase)
 $log=docker exec aegis-browser npx playwright-cli run-code $code
 $log|Set-Content "output/playwright/continuity-$phase.log"
 if(($log -join "`n") -match '### Error'){throw "Browser phase failed: $phase"}
 $json=@($log|Where-Object {$_ -like '{"passed":true*'})[0]
 if(-not $json){throw "Missing browser result: $phase"}
 $script:results+=$json|ConvertFrom-Json;Write-Host "PASS: $phase"
}
function Normal {Invoke-RestMethod "$base/simulator/start" -Method Post -Headers $headers -ContentType application/json -Body (@{scenario='NORMAL';seed=42;subjectId=$id}|ConvertTo-Json)|Out-Null}
try{
 Browser 'warm'
 Invoke-RestMethod "$base/simulator/stop" -Method Post -Headers $headers -ContentType application/json -Body '{}'|Out-Null
 # Let the 12-second live ECG window expire so the frozen-trace behavior is real.
 Start-Sleep -Seconds 16
 Browser 'stopped'
 docker compose stop aegis-backend
 Browser 'api-down'
 docker compose start aegis-backend
 $until=[DateTime]::UtcNow.AddSeconds(60)
 do{Start-Sleep -Seconds 2;try{$up=Invoke-RestMethod "$base/system/live" -TimeoutSec 3}catch{$up=$null}}while(-not $up -and [DateTime]::UtcNow -lt $until)
 if(-not $up){throw 'API did not recover'}
 Browser 'cache-reload'
 Normal
 Browser 'recovered'
 @{passed=$true;results=$results;checkedAt=[DateTime]::UtcNow.ToString('o')}|ConvertTo-Json -Depth 10|Set-Content output/validation/continuity.json
}finally{
 docker compose start aegis-backend|Out-Null
 try{Normal}catch{Write-Warning 'Restore NORMAL after API readiness'}
}
