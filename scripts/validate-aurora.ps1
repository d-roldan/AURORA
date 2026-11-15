$ErrorActionPreference='Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
$settings=@{}
Get-Content .env | ForEach-Object {if($_ -match '^([^#=]+)=(.*)$'){$settings[$matches[1]]=$matches[2]}}
$base="http://localhost:$($settings.HTTP_PORT)/api/v1"
$auth=Invoke-RestMethod "$base/auth/login" -Method Post -ContentType application/json -Body (@{username='crew';password=$settings.DEMO_ADMIN_PASSWORD}|ConvertTo-Json)
$headers=@{Authorization="Bearer $($auth.token)"}
$own=$auth.crewMemberId
if(-not $own){throw 'Missing assigned crew identity'}
$crew=Invoke-RestMethod "$base/crew" -Headers $headers
if(@($crew).Count -ne 1 -or $crew[0].id -ne $own){throw 'Crew identity isolation failed'}
$other='384e5b0c-c2c2-450a-8132-44088f423ee8'
try {Invoke-RestMethod "$base/crew/$other/overview" -Headers $headers | Out-Null;throw 'Unexpected access to another astronaut'} catch {
 if([int]$_.Exception.Response.StatusCode -ne 403){throw}
}
$stored=Invoke-RestMethod "$base/check-ins?subjectId=$own" -Headers $headers
$record=$stored|Where-Object {$_.notes.StartsWith('Synthetic AURORA interface validation / ')}|Select-Object -First 1
if(-not $record){
 $note='Synthetic AURORA interface validation / '+[DateTime]::UtcNow.ToString('o')
 $body=@{crewMemberId=$own;sleepHours=7.5;fatigueScore=2;notes=$note}|ConvertTo-Json
 $record=Invoke-RestMethod "$base/check-ins" -Method Post -Headers $headers -ContentType application/json -Body $body
}
$note=$record.notes
$stored=Invoke-RestMethod "$base/check-ins?subjectId=$own" -Headers $headers
if(-not ($stored | Where-Object {$_.id -eq $record.id -and $_.notes -eq $note})){throw 'Check-in did not persist'}
$viewer=Invoke-RestMethod "$base/auth/demo" -Method Post
$health=Invoke-RestMethod "$base/system/health" -Headers @{Authorization="Bearer $($viewer.token)"}
$result=@{passed=$true;checks=@('CREW reads only its assigned profile','Other crew overview rejected with HTTP 403','Synthetic check-in persisted with original note','Existing system health endpoint remains available');checkedAt=[DateTime]::UtcNow.ToString('o');services=$health.services}
New-Item -ItemType Directory -Path output/validation -Force|Out-Null
$result|ConvertTo-Json -Depth 6|Set-Content output/validation/aurora-api.json
$result|ConvertTo-Json -Depth 6
