$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
$settings=@{}
Get-Content .env | ForEach-Object {if($_ -match '^([^#=]+)=(.*)$'){$settings[$matches[1]]=$matches[2]}}
$base="http://localhost:$($settings.HTTP_PORT)/api/v1"
$results=[System.Collections.Generic.List[object]]::new()
function Assert-Result($name,$condition,$details='') {if(-not $condition){throw "FAIL: $name $details"};$results.Add([pscustomobject]@{check=$name;passed=$true;details=$details});Write-Host "PASS: $name $details"}
function Call($path,$method='GET',$body=$null,$headers=$script:admin) {
 $options=@{Uri="$base$path";Method=$method;Headers=$headers;TimeoutSec=40;ContentType='application/json'}
 if($null -ne $body){$options.Body=$body|ConvertTo-Json -Depth 12 -Compress}
 Invoke-RestMethod @options
}
function Status($path,$method,$body,$headers){
 $options=@{Uri="$base$path";Method=$method;Headers=$headers;ContentType='application/json';SkipHttpErrorCheck=$true;TimeoutSec=40}
 if($method -ne 'GET'){$options.Body=$body|ConvertTo-Json -Depth 12 -Compress}
 $r=Invoke-WebRequest @options
 [int]$r.StatusCode
}
$login=Call '/auth/login' 'POST' @{username='admin';password=$settings.DEMO_ADMIN_PASSWORD} @{}
$script:admin=@{Authorization="Bearer $($login.token)"}
$viewer=Call '/auth/demo' 'POST' $null @{}
$viewHeaders=@{Authorization="Bearer $($viewer.token)"}
$crew=Call '/crew';Assert-Result 'four fictitious crew' ($crew.Count -eq 4)
$mission=(Call '/missions')[0]
$health=Call '/system/health';Assert-Result 'all dependencies UP' ($health.status -eq 'UP')
$latest=Call '/telemetry/latest';Assert-Result 'persisted physiological and habitat scalars' ($latest.Count -ge 17) "count=$($latest.Count)"
$wave=Call "/telemetry/waveforms?subjectId=$($crew[0].id)";Assert-Result 'ECG raw points read from Influx' ($wave.Count -gt 1000) "points=$($wave.Count)"
$feature=Call "/telemetry/history?subjectId=$($crew[0].id)&metric=ecg_heart_rate";Assert-Result 'NeuroKit2 feature persisted' ($feature.Count -gt 0) "points=$($feature.Count)"
$spo2=Call "/telemetry/history?subjectId=$($crew[0].id)&metric=spo2";Assert-Result 'SpO2 metric with digit is queryable' ($spo2.Count -gt 0)
Assert-Result 'anonymous rejected' ((Status '/simulator/start' 'POST' @{} @{}) -eq 401)
Assert-Result 'viewer mutation rejected' ((Status '/simulator/stop' 'POST' @{} $viewHeaders) -eq 403)
$devices=Call '/devices';$device=$devices|Where-Object crewMemberId -eq $crew[0].id
$ingest=@{schemaVersion=1;batchId='validation-unit';missionId=$mission.id;deviceId=$device.id;source='SIMULATED';samples=@(@{metric='heart_rate';value=62;unit='wrong';observedAt=[DateTime]::UtcNow.ToString('o');quality='GOOD'})}
$service=@{'x-service-key'=$settings.SERVICE_API_KEY}
Assert-Result 'invalid unit rejected' ((Status '/telemetry/ingest' 'POST' $ingest $service) -eq 400)
$ingest.samples[0].unit='bpm';$ingest.samples[0].value='NaN'
Assert-Result 'nonfinite-like value rejected' ((Status '/telemetry/ingest' 'POST' $ingest $service) -eq 400)
$ingest.samples=@(1..1001|ForEach-Object {@{metric='heart_rate';value=62;unit='bpm';observedAt=[DateTime]::UtcNow.ToString('o');quality='GOOD'}})
Assert-Result 'oversize sample array rejected' ((Status '/telemetry/ingest' 'POST' $ingest $service) -eq 400)
$crewLogin=Call '/auth/login' 'POST' @{username='crew';password=$settings.DEMO_ADMIN_PASSWORD} @{}
Assert-Result 'crew other-subject access rejected' ((Status "/crew/$($crew[1].id)/overview" 'GET' $null @{Authorization="Bearer $($crewLogin.token)"}) -eq 403)
$schema=Invoke-RestMethod "http://localhost:$($settings.HTTP_PORT)/api/docs-json"
Assert-Result 'Swagger DTO contract present' ($schema.components.schemas.IngestDto.properties.samples.type -eq 'array')
New-Item -ItemType Directory -Force output/validation | Out-Null
$results|ConvertTo-Json -Depth 6|Set-Content output/validation/smoke.json
