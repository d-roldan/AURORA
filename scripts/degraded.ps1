# Read-only assertion, executed while analytics is intentionally stopped.
$ErrorActionPreference='Stop'
$session=Invoke-RestMethod -Method Post -TimeoutSec 15 http://localhost:8085/api/v1/auth/demo
$headers=@{Authorization="Bearer $($session.token)"}
$health=Invoke-RestMethod -TimeoutSec 15 http://localhost:8085/api/v1/system/health -Headers $headers
$latest=Invoke-RestMethod -TimeoutSec 15 http://localhost:8085/api/v1/telemetry/latest -Headers $headers
$live=@($latest|Where-Object freshness -eq 'LIVE').Count
if($health.status -ne 'DEGRADED' -or $health.services.analytics -ne 'DOWN' -or $live -lt 17){throw 'Degradation handling failed'}
@{status=$health.status;analytics=$health.services.analytics;liveReadings=$live}|ConvertTo-Json|Set-Content output/validation/degraded.json
Write-Host 'PASS: analytics unavailable; Core API and raw telemetry continue'
