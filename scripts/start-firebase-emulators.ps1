param(
  [string]$ProjectId = 'cetprosmp-2026',
  [string]$ExportDir = './exportedData',
  [string]$BackupDir = './backups',
  [string]$Only = 'auth,functions,firestore,storage,dataconnect',
  [switch]$Full,
  [switch]$NoImport,
  [switch]$NoExport,
  [switch]$NoBackup
)

$ErrorActionPreference = 'Stop'

# Resolve JAVA_HOME from user env or latest local JDK under ~/.jdks
$javaHome = [Environment]::GetEnvironmentVariable('JAVA_HOME', 'User')
if (-not $javaHome -or -not (Test-Path (Join-Path $javaHome 'bin\\java.exe'))) {
  $jdksRoot = Join-Path $env:USERPROFILE '.jdks'
  if (Test-Path $jdksRoot) {
    $javaHome = Get-ChildItem $jdksRoot -Directory |
      Where-Object { Test-Path (Join-Path $_.FullName 'bin\\java.exe') } |
      Sort-Object LastWriteTime -Descending |
      Select-Object -First 1 -ExpandProperty FullName
  }
}

if (-not $javaHome -or -not (Test-Path (Join-Path $javaHome 'bin\\java.exe'))) {
  throw 'No se encontro Java. Instala un JDK (por ejemplo en C:\Users\Enrique\.jdks) y reintenta.'
}

$env:JAVA_HOME = $javaHome
$javaBin = Join-Path $javaHome 'bin'
if (-not (($env:Path -split ';') -contains $javaBin)) {
  $env:Path = "$javaBin;$env:Path"
}

Write-Host "Usando JAVA_HOME=$env:JAVA_HOME"
# Kill stale Firebase emulator processes that keep ports locked (especially SQL Connect on 9399).
$ports = 4400,4500,5000,5001,8080,9099,9199,9399,5433
$listeners = Get-NetTCPConnection -LocalPort $ports -State Listen -ErrorAction SilentlyContinue
$ownerIds = $listeners | Select-Object -ExpandProperty OwningProcess -Unique
foreach ($ownerId in $ownerIds) {
  try {
    $proc = Get-CimInstance Win32_Process -Filter "ProcessId = $ownerId"
    if (-not $proc) { continue }
    $cmdLine = [string]$proc.CommandLine
    $isFirebaseProc = $proc.Name -like 'dataconnect-emulator*' -or $cmdLine -match 'firebase-tools|firebase-functions|emulators:start|dataconnect-emulator|cloud-firestore-emulator|\\.cache\\firebase\\emulators'
    if ($isFirebaseProc) {
      Write-Host "Liberando puerto usado por PID $ownerId ($($proc.Name))"
      Stop-Process -Id $ownerId -Force -ErrorAction Stop
    }
  } catch {
    Write-Warning ("No se pudo detener PID {0}: {1}" -f $ownerId, $_.Exception.Message)
  }
}

$selectedEmulators = $Only
if ($Full) {
  $selectedEmulators = 'auth,functions,firestore,storage,dataconnect'
}

if (($selectedEmulators -split ',') -contains 'functions') {
  $env:FUNCTIONS_DISCOVERY_TIMEOUT = '180'
  npm --prefix functions run build
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
}

$cmd = "npx -y firebase-tools@latest emulators:start --project $ProjectId --only $selectedEmulators"

$willImport = -not $NoImport -and (Test-Path $ExportDir)

if (-not $NoExport -and -not $NoBackup -and (Test-Path $ExportDir)) {
  $timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
  $exportLeaf = Split-Path -Path $ExportDir -Leaf
  if (-not $exportLeaf) {
    $exportLeaf = 'emulator-data'
  }
  $backupPath = Join-Path $BackupDir "$exportLeaf-before-emulators-$timestamp"
  New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
  Copy-Item -Path $ExportDir -Destination $backupPath -Recurse -Force
  Write-Host "Respaldo preventivo creado en $backupPath"
}

if ($willImport) {
  Write-Host "Importando datos de emuladores desde $ExportDir"
  $cmd = "$cmd --import=$ExportDir"
} elseif (-not $NoImport) {
  Write-Warning "No se encontro $ExportDir. Los emuladores arrancaran sin importar datos."
}

if (-not $NoExport) {
  Write-Host "Exportando datos de emuladores al cerrar hacia $ExportDir"
  $cmd = "$cmd --export-on-exit=$ExportDir"
}

cmd /c $cmd
exit $LASTEXITCODE
