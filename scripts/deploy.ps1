param(
  [Parameter(Position = 0)]
  [string]$Message = ""
)

$ErrorActionPreference = "Stop"
$ProjectDir = Split-Path -Parent $PSScriptRoot
$ConfigPath = Join-Path $ProjectDir "deploy.config.local.json"

if (-not (Test-Path -LiteralPath $ConfigPath)) {
  throw "Crie deploy.config.local.json a partir de deploy.config.example.json e preencha GitHub e servidor."
}

$Config = Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json

function Assert-SafeValue([string]$Name, [string]$Value, [string]$Pattern) {
  if (-not $Value -or $Value -notmatch $Pattern) {
    throw "Valor invalido em $Name."
  }
}

Assert-SafeValue "remote" $Config.remote "^[A-Za-z0-9._-]+$"
Assert-SafeValue "branch" $Config.branch "^[A-Za-z0-9._/-]+$"
Assert-SafeValue "sshHost" $Config.sshHost "^[A-Za-z0-9._@-]+$"
Assert-SafeValue "appPath" $Config.appPath "^/[A-Za-z0-9._/-]+$"
Assert-SafeValue "serviceName" $Config.serviceName "^[A-Za-z0-9_.@-]+$"

$SshArgs = @()
if ($Config.identityFile) {
  $IdentityFile = [System.IO.Path]::GetFullPath([string]$Config.identityFile)
  if (-not (Test-Path -LiteralPath $IdentityFile -PathType Leaf)) {
    throw "Arquivo de identidade SSH nao encontrado."
  }
  $SshArgs += @("-i", $IdentityFile, "-o", "BatchMode=yes")
}
$SshArgs += [string]$Config.sshHost

Push-Location $ProjectDir
try {
  npm run build
  if ($LASTEXITCODE -ne 0) { throw "O build falhou. Deploy cancelado." }

  $Changes = git status --porcelain
  if ($LASTEXITCODE -ne 0) { throw "Este diretorio ainda nao e um repositorio Git." }

  if ($Changes) {
    git add --all
    if ($LASTEXITCODE -ne 0) { throw "Falha ao preparar arquivos para o commit." }

    if (-not $Message) {
      $Message = "deploy: " + (Get-Date -Format "yyyy-MM-dd HH:mm")
    }
    git commit -m $Message
    if ($LASTEXITCODE -ne 0) { throw "Falha ao criar o commit." }
  }

  git push $Config.remote $Config.branch
  if ($LASTEXITCODE -ne 0) { throw "Falha ao enviar o commit ao remote." }

  $RemoteCommand = "cd '$($Config.appPath)' && bash scripts/server-update.sh '$($Config.branch)' '$($Config.serviceName)'"
  & ssh @SshArgs $RemoteCommand
  if ($LASTEXITCODE -ne 0) { throw "O servidor nao concluiu a atualizacao." }

  $Commit = (git rev-parse --short HEAD).Trim()
  Write-Host "Deploy concluido no commit $Commit."
  if ($Config.githubOwner -and $Config.githubRepository) {
    Write-Host "CDN: https://cdn.jsdelivr.net/gh/$($Config.githubOwner)/$($Config.githubRepository)@$Commit/public/"
  }
}
finally {
  Pop-Location
}
