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
  if ($_.Exception.Response) {
    try {
      $statusCode = [int]$_.Exception.Response.StatusCode
      Write-Host "Status HTTP: $statusCode" -ForegroundColor Yellow
    } catch {
    }
    try {
      $stream = $_.Exception.Response.GetResponseStream()
      if ($stream) {
        $reader = New-Object System.IO.StreamReader($stream)
        $body = $reader.ReadToEnd()
        if (-not [string]::IsNullOrWhiteSpace($body)) {
          Write-Host "Resposta da API Netlify:" -ForegroundColor Yellow
          Write-Host $body
        }
      }
    } catch {
    }
  }
  exit 1
}
