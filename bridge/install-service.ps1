# ══════════════════════════════════════════════════════════════════════════════
# OptiPilot Bridge — Installation comme tâche planifiée Windows
# À exécuter en tant qu'Administrateur sur le PC du magasin
#
# Usage :
#   1. Ouvrir PowerShell en tant qu'Administrateur
#   2. Se placer dans le dossier bridge : cd "C:\OptiPilot\bridge"
#   3. Exécuter : .\install-service.ps1
#
# Pour désinstaller :
#   .\install-service.ps1 -Uninstall
# ══════════════════════════════════════════════════════════════════════════════

param(
  [switch]$Uninstall
)

$TaskName    = "OptiPilotBridge"
$BridgeDir   = $PSScriptRoot   # dossier où se trouve ce script
$NodePath    = (Get-Command node -ErrorAction SilentlyContinue)?.Source

# ── Désinstallation ───────────────────────────────────────────────────────────
if ($Uninstall) {
  if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Stop-ScheduledTask  -TaskName $TaskName -ErrorAction SilentlyContinue
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "✅ Tâche '$TaskName' supprimée." -ForegroundColor Green
  } else {
    Write-Host "ℹ️  Aucune tâche '$TaskName' trouvée." -ForegroundColor Yellow
  }
  exit 0
}

# ── Vérifications préalables ──────────────────────────────────────────────────
Write-Host ""
Write-Host "══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  OptiPilot Bridge — Installation service" -ForegroundColor Cyan
Write-Host "══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Node.js installé ?
if (-not $NodePath) {
  Write-Host "❌ Node.js introuvable. Installez-le depuis https://nodejs.org avant de continuer." -ForegroundColor Red
  exit 1
}
Write-Host "✅ Node.js trouvé : $NodePath" -ForegroundColor Green

# Dossier dist/ existe ? (npm run build déjà exécuté ?)
$DistEntry = Join-Path $BridgeDir "dist\server.js"
if (-not (Test-Path $DistEntry)) {
  Write-Host ""
  Write-Host "⚙️  Dossier dist/ absent. Lancement de npm install + npm run build..." -ForegroundColor Yellow
  Push-Location $BridgeDir
  npm install
  npm run build
  Pop-Location
  if (-not (Test-Path $DistEntry)) {
    Write-Host "❌ La compilation a échoué. Vérifiez les erreurs ci-dessus." -ForegroundColor Red
    exit 1
  }
}
Write-Host "✅ Build trouvé : $DistEntry" -ForegroundColor Green

# .env existe ?
$EnvFile = Join-Path $BridgeDir ".env"
if (-not (Test-Path $EnvFile)) {
  Write-Host ""
  Write-Host "❌ Fichier .env absent dans $BridgeDir" -ForegroundColor Red
  Write-Host "   Copiez .env.example en .env et remplissez les valeurs SQL." -ForegroundColor Red
  exit 1
}
Write-Host "✅ Fichier .env trouvé" -ForegroundColor Green

# ── Création de la tâche planifiée ───────────────────────────────────────────
Write-Host ""
Write-Host "⚙️  Création de la tâche planifiée '$TaskName'..." -ForegroundColor Yellow

# Supprimer l'ancienne tâche si elle existe
if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
  Stop-ScheduledTask  -TaskName $TaskName -ErrorAction SilentlyContinue
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

$Action  = New-ScheduledTaskAction `
             -Execute $NodePath `
             -Argument "`"$DistEntry`"" `
             -WorkingDirectory $BridgeDir

# Démarre 30 secondes après le boot (laisse le temps à SQL Server de démarrer)
$Trigger = New-ScheduledTaskTrigger -AtStartup
$Trigger.Delay = "PT30S"

$Settings = New-ScheduledTaskSettingsSet `
              -ExecutionTimeLimit (New-TimeSpan -Hours 0) `
              -RestartCount 5 `
              -RestartInterval (New-TimeSpan -Minutes 1) `
              -StartWhenAvailable `
              -MultipleInstances IgnoreNew

# Tourne sous le compte SYSTEM (pas besoin de session ouverte)
$Principal = New-ScheduledTaskPrincipal `
               -UserId "SYSTEM" `
               -LogonType ServiceAccount `
               -RunLevel Highest

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $Action `
  -Trigger $Trigger `
  -Settings $Settings `
  -Principal $Principal `
  -Description "OptiPilot Bridge — connecteur Optimum SQL Server" | Out-Null

Write-Host "✅ Tâche créée." -ForegroundColor Green

# ── Démarrage immédiat ────────────────────────────────────────────────────────
Write-Host ""
Write-Host "🚀 Démarrage du bridge..." -ForegroundColor Yellow
Start-ScheduledTask -TaskName $TaskName
Start-Sleep -Seconds 3

$State = (Get-ScheduledTask -TaskName $TaskName).State
Write-Host "   État : $State" -ForegroundColor Cyan

# ── Test de connexion ─────────────────────────────────────────────────────────
Write-Host ""
Write-Host "🔍 Test de connexion sur http://localhost:5174/health ..." -ForegroundColor Yellow
Start-Sleep -Seconds 2
try {
  $Response = Invoke-RestMethod -Uri "http://localhost:5174/health" -TimeoutSec 5
  Write-Host "✅ Bridge opérationnel : $($Response | ConvertTo-Json -Compress)" -ForegroundColor Green
} catch {
  Write-Host "⚠️  Bridge pas encore prêt (normal si SQL Server démarre lentement)." -ForegroundColor Yellow
  Write-Host "   Réessayez dans 30 secondes : Invoke-RestMethod http://localhost:5174/health" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Installation terminée !" -ForegroundColor Cyan
Write-Host "  Le bridge démarrera automatiquement à chaque boot." -ForegroundColor Cyan
Write-Host ""
Write-Host "  Commandes utiles :" -ForegroundColor White
Write-Host "    Voir l'état  : Get-ScheduledTask -TaskName $TaskName" -ForegroundColor Gray
Write-Host "    Démarrer     : Start-ScheduledTask -TaskName $TaskName" -ForegroundColor Gray
Write-Host "    Arrêter      : Stop-ScheduledTask  -TaskName $TaskName" -ForegroundColor Gray
Write-Host "    Désinstaller : .\install-service.ps1 -Uninstall" -ForegroundColor Gray
Write-Host "══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
