$ErrorActionPreference='Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
$settings=@{};Get-Content .env|ForEach-Object {if($_ -match '^([^#=]+)=(.*)$'){$settings[$matches[1]]=$matches[2]}}
$base="http://localhost:$($settings.HTTP_PORT)/api/v1"
$auth=Invoke-RestMethod "$base/auth/login" -Method Post -ContentType application/json -Body (@{username='admin';password=$settings.DEMO_ADMIN_PASSWORD}|ConvertTo-Json)
$headers=@{Authorization="Bearer $($auth.token)"}
$node=(Get-Command node -ErrorAction SilentlyContinue).Source
if(-not $node){$node=Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'}
function Browser($phase){
 $code=(Get-Content tests/e2e/operational-devices.js -Raw).Replace('__PHASE__',$phase)
 $log=& $node output/playwright/node_modules/@playwright/cli/playwright-cli.js run-code $code
 $log|Set-Content "output/playwright/device-$phase.log"
 if(($log -join "`n") -match '### Error' -or -not (($log -join "`n") -match '"passed":true')){throw "Browser failed: $phase"}
 Write-Host "PASS: $phase"
}
function Scenario($name){Invoke-RestMethod "$base/simulator/start" -Method Post -Headers $headers -ContentType application/json -Body (@{scenario=$name;seed=14;subjectId='384e5b0c-c2c2-450a-8132-44088f423ee8'}|ConvertTo-Json)|Out-Null}
# A dedicated Playwright CLI session must already be open on CREW-01's profile.
try{
 Browser 'normal'
 Scenario 'YELLOW_ALERT_DEMO'
 Browser 'yellow'
 Scenario 'RED_ALERT_DEMO'
 Browser 'red'
 Browser 'offline'
}finally{Scenario 'NORMAL'}
