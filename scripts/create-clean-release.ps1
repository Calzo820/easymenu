param(
  [string]$Output = "ordynora-clean-release.zip"
)

$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$outputPath = if ([System.IO.Path]::IsPathRooted($Output)) { $Output } else { Join-Path $root $Output }
$temp = Join-Path ([System.IO.Path]::GetTempPath()) ("ordynora-clean-" + [System.Guid]::NewGuid().ToString("N"))
$packageRoot = Join-Path $temp "ordynora"
$excludedDirectoryNames = @(".git", ".vercel", "node_modules", "dist", "dist-ssr", "backups", ".cache", ".tmp")
$excludedLegacyAssets = @(
  "src/assets/logo-easymenu.png",
  "public/icons/easymenu-192.png",
  "public/icons/easymenu-512.png",
  "public/icons/easymenu-maskable-512.png"
)

function Should-Include([string]$RelativePath) {
  $normalized = $RelativePath.Replace("\", "/")
  $segments = $normalized.Split("/", [System.StringSplitOptions]::RemoveEmptyEntries)
  if ($segments | Where-Object { $excludedDirectoryNames -contains $_ }) { return $false }
  if ($excludedLegacyAssets -contains $normalized) { return $false }
  if ($normalized -match "(^|/)\.env($|\.)" -and $normalized -notmatch "\.example$") { return $false }
  if ($normalized -match "(^|/)(preview\.)?.*\.log$") { return $false }
  if ([System.IO.Path]::GetFullPath((Join-Path $root $normalized)) -eq [System.IO.Path]::GetFullPath($outputPath)) { return $false }
  return $true
}

New-Item -ItemType Directory -Path $packageRoot | Out-Null

try {
  Get-ChildItem -LiteralPath $root -File -Recurse -Force | ForEach-Object {
    $relative = $_.FullName.Substring($root.Length).TrimStart("\", "/")
    if (-not (Should-Include $relative)) { return }
    $destination = Join-Path $packageRoot $relative
    New-Item -ItemType Directory -Force -Path ([System.IO.Path]::GetDirectoryName($destination)) | Out-Null
    Copy-Item -LiteralPath $_.FullName -Destination $destination -Force
  }

  if (Test-Path -LiteralPath $outputPath) {
    Remove-Item -LiteralPath $outputPath -Force
  }

  Compress-Archive -Path (Join-Path $temp "*") -DestinationPath $outputPath -CompressionLevel Optimal -Force
  Write-Output "Zip pulito creato: $outputPath"
} finally {
  if (Test-Path -LiteralPath $temp) {
    Remove-Item -LiteralPath $temp -Recurse -Force
  }
}
