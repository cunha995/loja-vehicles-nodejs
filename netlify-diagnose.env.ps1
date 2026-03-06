<#
netlify-diagnose.env.ps1

Diagnóstico rápido para sincronização/deploy no Netlify.

Requisitos de ambiente:
- NETLIFY_AUTH_TOKEN
- NETLIFY_SITE_ID

Uso:
  Set-Location "d:\JE AUTOMOVEIS"
  .\netlify-diagnose.env.ps1
#>

Set-StrictMode -Version Latest

$token = $env:NETLIFY_AUTH_TOKEN
$siteId = $env:NETLIFY_SITE_ID

if ([string]::IsNullOrWhiteSpace($token)) {
  Write-Host "NETLIFY_AUTH_TOKEN não definido." -ForegroundColor Red
  exit 1
}

if ([string]::IsNullOrWhiteSpace($siteId)) {
  Write-Host "NETLIFY_SITE_ID não definido." -ForegroundColor Red
  exit 1
}

$headers = @{ Authorization = "Bearer $token"; Accept = 'application/json' }

function Invoke-NetlifyGet($uri) {
  try {
    return Invoke-RestMethod -Method Get -Uri $uri -Headers $headers
  } catch {
    Write-Host "Falha em GET $uri" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.Exception.Response) {
      try {
        $statusCode = [int]$_.Exception.Response.StatusCode
        Write-Host "Status HTTP: $statusCode" -ForegroundColor Yellow
      } catch {}

      try {
        $stream = $_.Exception.Response.GetResponseStream()
        if ($stream) {
          $reader = New-Object System.IO.StreamReader($stream)
          $body = $reader.ReadToEnd()
          if (-not [string]::IsNullOrWhiteSpace($body)) {
            Write-Host "Resposta da API:" -ForegroundColor Yellow
            Write-Host $body
          }
        }
      } catch {}
    }
    return $null
  }
}

Write-Host "[1/3] Validando token..." -ForegroundColor Cyan
$user = Invoke-NetlifyGet "https://api.netlify.com/api/v1/user"
if (-not $user) { exit 1 }
Write-Host "Token válido para usuário: $($user.full_name) <$($user.email)>" -ForegroundColor Green

Write-Host "[2/3] Validando acesso ao site..." -ForegroundColor Cyan
$site = Invoke-NetlifyGet "https://api.netlify.com/api/v1/sites/$siteId"
if (-not $site) {
  Write-Host "O token não tem acesso a este SITE_ID, ou o SITE_ID está incorreto." -ForegroundColor Red
  exit 1
}

Write-Host "Site encontrado: $($site.name)" -ForegroundColor Green
Write-Host "URL: $($site.ssl_url)" -ForegroundColor Green
Write-Host "Repo: $($site.build_settings.repo_url)" -ForegroundColor Green
Write-Host "Branch: $($site.build_settings.repo_branch)" -ForegroundColor Green

Write-Host "[3/3] Lendo último deploy..." -ForegroundColor Cyan
$deploys = Invoke-NetlifyGet "https://api.netlify.com/api/v1/sites/$siteId/deploys?per_page=1"
if ($deploys -and $deploys.Count -gt 0) {
  $last = $deploys[0]
  Write-Host "Último deploy: $($last.id)" -ForegroundColor Green
  Write-Host "Estado: $($last.state)" -ForegroundColor Green
  Write-Host "Criado em: $($last.created_at)" -ForegroundColor Green
} else {
  Write-Host "Nenhum deploy encontrado para este site." -ForegroundColor Yellow
}

Write-Host "Diagnóstico concluído." -ForegroundColor Green
