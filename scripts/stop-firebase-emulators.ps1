$ErrorActionPreference = 'Stop'

$ports = 4400,4500,5000,5001,8080,9099,9199,9399,5433
$listeners = Get-NetTCPConnection -LocalPort $ports -State Listen -ErrorAction SilentlyContinue
$ownerIds = $listeners | Select-Object -ExpandProperty OwningProcess -Unique

if (-not $ownerIds) {
  Write-Host 'No hay emuladores ocupando puertos conocidos.'
  exit 0
}

foreach ($ownerId in $ownerIds) {
  try {
    $proc = Get-CimInstance Win32_Process -Filter "ProcessId = $ownerId"
    if (-not $proc) { continue }
    $cmdLine = [string]$proc.CommandLine
    $isFirebaseProc = $proc.Name -like 'dataconnect-emulator*' -or $cmdLine -match 'firebase-tools|firebase-functions|emulators:start|dataconnect-emulator|cloud-firestore-emulator|\\.cache\\firebase\\emulators'
    if ($isFirebaseProc) {
      Write-Host "Deteniendo PID $ownerId ($($proc.Name))"
      Stop-Process -Id $ownerId -Force -ErrorAction Stop
    } else {
      Write-Host "Omitiendo PID $ownerId ($($proc.Name)) porque no parece de Firebase"
    }
  } catch {
    Write-Warning ("No se pudo detener PID {0}: {1}" -f $ownerId, $_.Exception.Message)
  }
}
