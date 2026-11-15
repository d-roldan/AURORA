$ErrorActionPreference='Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
$settings=@{}
Get-Content .env|ForEach-Object {if($_ -match '^([^#=]+)=(.*)$'){$settings[$matches[1]]=$matches[2]}}
$base="http://localhost:$($settings.HTTP_PORT)/api/v1"
$login=Invoke-RestMethod "$base/auth/login" -Method Post -ContentType application/json -Body (@{username='admin';password=$settings.DEMO_ADMIN_PASSWORD}|ConvertTo-Json)
$headers=@{Authorization="Bearer $($login.token)"}
$mission=$null
try{
 $mission=Invoke-RestMethod "$base/missions" -Method Post -Headers $headers -ContentType application/json -Body (@{code="QA-$([Guid]::NewGuid().ToString('N').Substring(0,8))";name='Temporary synthetic validation mission'}|ConvertTo-Json)
 $crew=Invoke-RestMethod "$base/crew" -Method Post -Headers $headers -ContentType application/json -Body (@{missionId=$mission.id;code='QA-CREW';displayName='Fictitious QA Profile';role='Synthetic test operator'}|ConvertTo-Json)
 $saved=Invoke-RestMethod "$base/crew/$($crew.id)/overview" -Headers $headers
 if($saved.crew.displayName -ne 'Fictitious QA Profile'){throw 'Created crew not readable'}
 @{passed=$true;createdMission=$mission.code;createdCrew=$crew.code;cleanup='Scoped temporary QA records removed; audit retained'}|ConvertTo-Json|Set-Content output/validation/management.json
 Write-Host 'PASS: mission and crew creation via authenticated API'
}finally{
 if($mission){
 $cleanup=@'
const {PrismaClient}=require('@prisma/client');
const db=new PrismaClient();
(async()=>{const mission=await db.mission.findUnique({where:{id:process.env.AEGIS_QA_MISSION_ID}});if(!mission||!mission.code.startsWith('QA-'))throw new Error('Only temporary QA missions may be cleaned');await db.$transaction([db.crewMember.deleteMany({where:{missionId:mission.id,code:'QA-CREW'}}),db.mission.delete({where:{id:mission.id}})]);})().finally(()=>db.$disconnect());
'@
 $cleanup|docker compose exec -T -e "AEGIS_QA_MISSION_ID=$($mission.id)" aegis-backend node
 if($LASTEXITCODE -ne 0){throw 'Temporary QA cleanup failed'}
 }
}
