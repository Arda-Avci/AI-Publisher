$outputFile = "c:\Users\Damla\Proje\AI-Publisher\project_all.md"
$rootDir = "c:\Users\Damla\Proje\AI-Publisher"

if (Test-Path $outputFile) { Remove-Item $outputFile }

$extensions = @("*.ts", "*.js", "*.py", "*.html", "*.css", "*.md", "*.json")
$excludeDirs = @("node_modules", "Wav2Lip", "__pycache__", ".git", ".codegraph", "videolar", "uploads", ".agents", "scratch")
# Don't include package-lock.json or data.db
$excludeFiles = @("package-lock.json", "project_all.md")

Get-ChildItem -Path $rootDir -Recurse -Include $extensions | Where-Object { 
  $path = $_.FullName
  $exclude = $false
  foreach ($dir in $excludeDirs) {
    if ($path -match "\\$dir\\") { $exclude = $true; break }
  }
  foreach ($exFile in $excludeFiles) {
    if ($path -match "$exFile$") { $exclude = $true; break }
  }
  if (-not $exclude) { return $true }
} | ForEach-Object {
  $relPath = $_.FullName.Substring($rootDir.Length + 1)
  Out-File -FilePath $outputFile -InputObject "### Dosya: $relPath" -Encoding utf8 -Append
  
  $ext = $_.Extension.TrimStart('.')
  if ($ext -eq "ts") { $ext = "typescript" }
  elseif ($ext -eq "js") { $ext = "javascript" }
  elseif ($ext -eq "py") { $ext = "python" }
  elseif ($ext -eq "md") { $ext = "markdown" }
  
  Out-File -FilePath $outputFile -InputObject "```$ext" -Encoding utf8 -Append
  Get-Content $_.FullName -Raw -Encoding UTF8 | Out-File -FilePath $outputFile -Encoding utf8 -Append -NoNewline
  Out-File -FilePath $outputFile -InputObject "`n````n" -Encoding utf8 -Append
}

Write-Host "project_all.md created successfully."
