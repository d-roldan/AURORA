$ErrorActionPreference='Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
$settings=@{}
Get-Content .env | ForEach-Object {if($_ -match '^([^#=]+)=(.*)$'){$settings[$matches[1]]=$matches[2]}}
$base="http://localhost:$($settings.HTTP_PORT)/api/v1"
$auth=Invoke-RestMethod "$base/auth/login" -Method Post -ContentType application/json -Body (@{username='crew';password=$settings.DEMO_ADMIN_PASSWORD}|ConvertTo-Json)
$headers=@{Authorization="Bearer $($auth.token)"}
$own=$auth.crewMemberId
$other='384e5b0c-c2c2-450a-8132-44088f423ee8'
$checks=[System.Collections.Generic.List[string]]::new()
function Expect-Status($path,$method,$body,$status,$access=$headers){
 try {Invoke-RestMethod "$base/$path" -Method $method -Headers $access -ContentType application/json -Body ($body|ConvertTo-Json)|Out-Null;throw "Expected HTTP $status"} catch {if([int]$_.Exception.Response.StatusCode -ne $status){throw}}
}
$note="Synthetic logbook validation / $([DateTime]::UtcNow.ToString('o'))`nNota original en español. <b>Evidence stays plain text.</b>"
$observed=[DateTime]::UtcNow.AddMinutes(-10).ToString('yyyy-MM-ddTHH:mm:ss.fffZ')
$body=@{crewMemberId=$own;title='Synthetic mission log';category='OTHER';observedAt=$observed;notes=$note}
$record=Invoke-RestMethod "$base/check-ins" -Method Post -Headers $headers -ContentType application/json -Body ($body|ConvertTo-Json)
if($null -ne $record.sleepHours -or $null -ne $record.fatigueScore -or $record.notes -cne $note -or $record.title -ne $body.title -or $record.category -ne 'OTHER'){throw 'Manual note or optional values changed'}
$checks.Add('Free text without sleep/fatigue persists with original multiline text, title and category')
if(([DateTimeOffset]$record.observedAt).ToUniversalTime() -ne ([DateTimeOffset]$observed).ToUniversalTime() -or ([DateTimeOffset]$record.recordedAt) -le ([DateTimeOffset]$record.observedAt)){throw 'Observation and creation time are not distinct'}
$checks.Add('UTC observation time is distinct from server creation time')
$records=Invoke-RestMethod "$base/check-ins?subjectId=$own" -Headers $headers
if(-not ($records|Where-Object {$_.id -eq $record.id -and $_.notes -ceq $note})){throw 'Record not retrievable'}
$checks.Add('Persisted entry is retrievable from NestJS')
Expect-Status 'check-ins' Post (@{crewMemberId=$other;notes='Synthetic unauthorized entry'}) 403
try {Invoke-RestMethod "$base/check-ins?subjectId=$other" -Headers $headers|Out-Null;throw 'Expected HTTP 403'}catch{if([int]$_.Exception.Response.StatusCode -ne 403){throw}}
$viewer=Invoke-RestMethod "$base/auth/demo" -Method Post
Expect-Status 'check-ins' Post $body 403 @{Authorization="Bearer $($viewer.token)"}
$checks.Add('CREW cannot read/write another astronaut; viewer cannot write')
foreach($invalid in @(
 @{notes='   '},@{notes=('a'*4001)},@{title=('a'*121)},@{category='UNSUPPORTED'},
 @{observedAt=[DateTime]::UtcNow.AddHours(1).ToString('yyyy-MM-ddTHH:mm:ss.fffZ')},
 @{observedAt='2026-11-14T12:00:00'},@{observedAt='2026-11-14T12:00:00-03:00'},@{observedAt='2026-02-30T12:00:00Z'},
 @{sleepHours=25},@{fatigueScore=2.5},@{createdBy='spoofed'}
)){
 $bad=$body.Clone();foreach($key in $invalid.Keys){$bad[$key]=$invalid[$key]};Expect-Status 'check-ins' Post $bad 400
}
$checks.Add('Server rejects empty/oversized text, invalid category/date/units, future time and spoofed fields')
$zero=Invoke-RestMethod "$base/check-ins" -Method Post -Headers $headers -ContentType application/json -Body (@{crewMemberId=$own;notes='Synthetic validation: optional zeros';sleepHours=0;fatigueScore=0}|ConvertTo-Json)
if($zero.sleepHours -ne 0 -or $zero.fatigueScore -ne 0){throw 'Optional zero values lost'}
$checks.Add('Legacy payload remains accepted and numeric zero is preserved')
try {Invoke-RestMethod "$base/check-ins?subjectId=$own&page=0" -Headers $headers|Out-Null;throw 'Expected HTTP 400'}catch{if([int]$_.Exception.Response.StatusCode -ne 400){throw}}
$checks.Add('Pagination rejects invalid page')
$result=@{passed=$true;checks=$checks;checkedAt=[DateTime]::UtcNow.ToString('o');entryId=$record.id}
New-Item -ItemType Directory -Path output/validation -Force|Out-Null
$result|ConvertTo-Json -Depth 6|Set-Content output/validation/logbook-api.json
$result|ConvertTo-Json -Depth 6

