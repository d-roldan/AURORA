$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
if (Test-Path -LiteralPath '.env') { Write-Host '.env exists; preserving credentials.'; exit 0 }
$port = 8085
while (Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue) { $port++ }
$lines = @("HTTP_PORT=$port", 'POSTGRES_DB=aegis', 'POSTGRES_USER=aegis')
foreach ($name in @('POSTGRES_PASSWORD','JWT_SECRET','DEMO_ADMIN_PASSWORD','INFLUX_TOKEN','INFLUX_PASSWORD','SERVICE_API_KEY')) {
 $bytes = New-Object byte[] 24
 [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
 $secret = ([BitConverter]::ToString($bytes)).Replace('-','').ToLowerInvariant()
 $lines += "$name=$secret"
}
[System.IO.File]::WriteAllLines((Join-Path (Get-Location) '.env'), $lines)
Write-Host "Created local secrets. HTTP port: $port. Run docker compose up -d --build."
