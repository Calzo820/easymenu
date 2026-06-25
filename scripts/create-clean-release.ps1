param(
  [string]$Output = "easymenu-clean-release.zip"
)

$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$outputPath = if ([System.IO.Path]::IsPathRooted($Output)) { $Output } else { Join-Path $root $Output }
$temp = Join-Path ([System.IO.Path]::GetTempPath()) ("easymenu-clean-" + [System.Guid]::NewGuid().ToString("N"))

$excludedDirectories = @(".git", "node_modules", "dist", ".vercel")
$excludedFiles = @(".env", "backend/.env")

New-Item -ItemType Directory -Path $temp | Out-Null

Get-ChildItem -LiteralPath $root -Force | ForEach-Object {
  $name = $_.Name
  if ($_.FullName -eq $outputPath) { return }
  if ($excludedDirectories -contains $name) { return }
  if ($excludedFiles -contains $name) { return }
  Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $temp $name) -Recurse -Force
}

foreach ($file in $excludedFiles) {
  $candidate = Join-Path $temp $file
  if (Test-Path -LiteralPath $candidate) {
    Remove-Item -LiteralPath $candidate -Force
  }
}

if (Test-Path -LiteralPath $outputPath) {
  Remove-Item -LiteralPath $outputPath -Force
}

Compress-Archive -LiteralPath (Join-Path $temp "*") -DestinationPath $outputPath -Force
Remove-Item -LiteralPath $temp -Recurse -Force

Write-Output "Zip pulito creato: $outputPath"
