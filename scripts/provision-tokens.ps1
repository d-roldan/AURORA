# Run after first InfluxDB initialization. Outputs no secret values.
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
$settings = @{}
Get-Content .env | ForEach-Object { if ($_ -match '^([^#=]+)=(.*)$') { $settings[$matches[1]] = $matches[2] } }
$buckets = docker compose exec -T aegis-influxdb influx bucket list --org aegis --json | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { throw 'Cannot list Influx buckets' }
$ids = @($buckets | Where-Object { $_.name -in @('aegis_vitals','aegis_waveforms','aegis_features') } | ForEach-Object id)
if ($ids.Count -ne 3) { throw 'Expected three initialized AEGIS buckets' }
foreach ($kind in @('APP')) {
 $key = "INFLUX_${kind}_TOKEN"
 if ($settings[$key] -and $settings[$key] -ne 'pending') { continue }
 $arguments = @('compose','exec','-T','aegis-influxdb','influx','auth','create','--org','aegis','--description',"aegis-$($kind.ToLower())-v1",'--json')
 foreach ($id in $ids) { $arguments += @('--read-bucket', $id); if ($kind -eq 'APP') { $arguments += @('--write-bucket', $id) } }
 $auth = & docker @arguments | ConvertFrom-Json
 if ($LASTEXITCODE -ne 0 -or -not $auth.token) { throw "Cannot provision $kind token" }
 $settings[$key] = $auth.token
}
$lines = @($settings.GetEnumerator() | Sort-Object Key | ForEach-Object { "$($_.Key)=$($_.Value)" })
[System.IO.File]::WriteAllLines((Join-Path (Get-Location) '.env'), $lines)
Write-Host 'Scoped bucket token provisioned. Recreate backend and migrate to apply.'
