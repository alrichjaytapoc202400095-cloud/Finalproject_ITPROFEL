$root = Split-Path -Parent $PSScriptRoot
$backendPath = Join-Path $root 'backend'
$frontendPath = Join-Path $root 'frontend'

Start-Process -FilePath 'powershell.exe' -WorkingDirectory $backendPath -ArgumentList '-NoExit -Command "npm run dev"'

Write-Host 'Waiting for the backend API to become ready...'
$apiReady = $false
$lastHealthError = 'No response yet.'
for ($attempt = 1; $attempt -le 60; $attempt++) {
  try {
    $response = Invoke-WebRequest -Uri 'http://localhost:5000/health' -TimeoutSec 1 -UseBasicParsing
    if ($response.StatusCode -eq 200) {
      $apiReady = $true
      break
    }
    $lastHealthError = "Health check returned HTTP $($response.StatusCode)."
  } catch {
    $lastHealthError = $_.Exception.Message
  }
  Start-Sleep -Seconds 1
}

if (-not $apiReady) {
  Write-Error "Backend did not become ready within 2 minutes. Last health check: $lastHealthError"
  exit 1
}

Start-Process -FilePath 'powershell.exe' -WorkingDirectory $frontendPath -ArgumentList '-NoExit -Command "npm run dev"'
Write-Host 'Backend API is ready. Backend and frontend are running in separate PowerShell windows.'
