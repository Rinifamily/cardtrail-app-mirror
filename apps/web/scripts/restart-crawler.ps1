# 重启爬虫脚本
# Usage: .\scripts\restart-crawler.ps1

Write-Host "🔄 正在重启爬虫..." -ForegroundColor Green
Write-Host ""

# 停止所有 node 进程（谨慎使用，可能会停止其他 node 进程）
# 更安全的方式是只停止特定的爬虫进程
$crawlerProcesses = Get-Process | Where-Object {
    $_.ProcessName -eq "node" -and 
    $_.CommandLine -like "*crawl-all-pokemon*"
}

if ($crawlerProcesses) {
    Write-Host "停止现有爬虫进程..." -ForegroundColor Yellow
    $crawlerProcesses | Stop-Process -Force
    Start-Sleep -Seconds 2
}

# 启动新爬虫
Write-Host "启动新爬虫..." -ForegroundColor Green
Set-Location $PSScriptRoot\..
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; node scripts/crawl-all-pokemon.js 2>&1 | Tee-Object -FilePath 'crawl-all-pokemon.log'"

Write-Host ""
Write-Host "✅ 爬虫已启动！" -ForegroundColor Green
Write-Host "   查看日志: Get-Content crawl-all-pokemon.log -Tail 20 -Wait" -ForegroundColor Cyan
Write-Host "   检查状态: node scripts/check-crawler-status.js" -ForegroundColor Cyan


