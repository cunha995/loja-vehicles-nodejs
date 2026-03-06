<#
netlify-deploy.env.ps1

Dispara deploy manual no Netlify via API usando variáveis de ambiente.

Variáveis necessárias:
- NETLIFY_AUTH_TOKEN
- NETLIFY_SITE_ID

Uso:
  cd "d:\JE AUTOMOVEIS"
  .\netlify-deploy.env.ps1
#>

Set-StrictMode -Version Latest

$siteId = $env:NETLIFY_SITE_ID
$token = $env:NETLIFY_AUTH_TOKEN

if ([string]::IsNullOrWhiteSpace($siteId)) {
  Write-Host "NETLIFY_SITE_ID não definido." -ForegroundColor Red
  exit 1
}

if ([string]::IsNullOrWhiteSpace($token)) {
  Write-Host "NETLIFY_AUTH_TOKEN não definido." -ForegroundColor Red
  exit 1
}

$uri = "https://api.netlify.com/api/v1/sites/$siteId/builds"
$headers = @{ Authorization = "Bearer $token"; Accept = 'application/json' }

try {
  $resp = Invoke-RestMethod -Method Post -Uri $uri -Headers $headers -Body '{}' -ContentType 'application/json'
  Write-Host "Deploy disparado com sucesso." -ForegroundColor Green
  $resp | Select-Object id, state, created_at, deploy_id | Format-List
} catch {
  Write-Host "Falha ao disparar deploy no Netlify: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}
