# Configuração de deploy no Netlify

Este projeto já possui configuração de rotas em `netlify.toml` e agora suporta deploy automático e manual.

## 1) Deploy automático pelo GitHub Actions

Arquivo: `.github/workflows/netlify-deploy.yml`

No repositório GitHub, configure os Secrets:
- `NETLIFY_AUTH_TOKEN`
- `NETLIFY_SITE_ID`

Com isso, todo push em `main` dispara um build no Netlify.

## 2) Deploy manual por PowerShell

Arquivo: `netlify-deploy.env.ps1`

Defina no terminal:

```powershell
$env:NETLIFY_AUTH_TOKEN="SEU_TOKEN"
$env:NETLIFY_SITE_ID="SEU_SITE_ID"
.\netlify-deploy.env.ps1
```

## 3) Rotas já configuradas

Arquivo: `netlify.toml`

- Proxy backend:
  - `/api/*` -> Render backend
  - `/contact` -> Render backend
  - `/uploads/*` -> Render backend
- Rotas de páginas:
  - `/master` e `/master/*` -> `master.html`
  - `/admin/*` -> `admin.html`
  - `/loja/*` -> `index.html`
