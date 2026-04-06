# Download baseline filter lists for bundling with the extension

$BundledDir = "filters\bundled"
New-Item -ItemType Directory -Force -Path $BundledDir | Out-Null

Write-Host "Downloading EasyList..."
Invoke-WebRequest -Uri "https://easylist.to/easylist/easylist.txt" -OutFile "$BundledDir\easylist.txt"

Write-Host "Downloading EasyPrivacy..."
Invoke-WebRequest -Uri "https://easylist.to/easylist/easyprivacy.txt" -OutFile "$BundledDir\easyprivacy.txt"

Write-Host "Downloading uBlock Filters (Ads)..."
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/filters.txt" -OutFile "$BundledDir\ublock-ads.txt"

Write-Host "`nDone. Filter list sizes:"
Get-ChildItem "$BundledDir\*.txt" | ForEach-Object {
    $lines = (Get-Content $_.FullName).Count
    Write-Host "  $($_.Name): $lines lines"
}
