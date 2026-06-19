$ErrorActionPreference = "Stop"

# Hedef dizin
$distDir = Join-Path $PSScriptRoot "dist"
if (!(Test-Path $distDir)) {
    New-Item -ItemType Directory -Force -Path $distDir | Out-Null
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "🚀 FAZ 1: Base Docker Imajı Insa Ediliyor" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

if (Test-Path (Join-Path $PSScriptRoot "Dockerfile.base")) {
    docker build -t ai-publisher-base:latest -f (Join-Path $PSScriptRoot "Dockerfile.base") $PSScriptRoot
    if ($LASTEXITCODE -ne 0) {
        Write-Error "❌ Base Docker Imajı insa edilirken hata olustu!"
    }
} else {
    Write-Error "❌ Dockerfile.base bulunamadi!"
}

$models = @("cogvideox", "wan", "ltx", "hunyuan", "xtts", "audioldm2", "wav2lip", "musetalk", "whisper", "stablediffusion", "kokorotts")
$totalModels = $models.Count

for ($i = 0; $i -lt $totalModels; $i++) {
    $model = $models[$i]
    $idx = $i + 1
    
    Write-Host ""
    Write-Host "======================================================================" -ForegroundColor Green
    Write-Host "📦 [$idx/$totalModels] MODEL: $model" -ForegroundColor Green
    Write-Host "======================================================================" -ForegroundColor Green
    
    $modelDir = Join-Path $PSScriptRoot $model
    $dockerfilePath = Join-Path $modelDir "Dockerfile"
    
    if (!(Test-Path $modelDir)) {
        Write-Warning "❌ Hata: '$model' dizini bulunamadi!"
        continue
    }
    if (!(Test-Path $dockerfilePath)) {
        Write-Warning "❌ Hata: '$dockerfilePath' bulunamadi!"
        continue
    }
    
    # Derleme
    Write-Host "[FAZ 1/3] Docker imaji insa ediliyor (ai-publisher-$model:latest)..."
    docker build -t "ai-publisher-$model:latest" -f $dockerfilePath $modelDir
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "❌ Hata: $model imaji insa edilemedi!"
        continue
    }
    
    # Sıkıştırma ve Drive Formatında Kaydetme
    $targetPath = Join-Path $distDir "$model.tar.gz"
    Write-Host "[FAZ 2/3] Imaj alpine gzip ile sikistiriliyor..."
    Write-Host "[INFO] Hedef Dosya: $targetPath"
    
    # Pipe to alpine gzip
    & cmd /c "docker save ai-publisher-$model:latest | docker run -i --rm alpine gzip > `"$targetPath`""
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "❌ Hata: $model imaji sikistirilirken sorun olustu!"
        continue
    }
    
    # Temizlik
    Write-Host "[FAZ 3/3] Disk alani kazanmak icin yerel imaj temizleniyor..."
    docker rmi "ai-publisher-$model:latest" | Out-Null
    docker image prune -f | Out-Null
    
    Write-Host "✅ Basarili! $model.tar.gz olusturuldu." -ForegroundColor Green
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "🎉 Tum Docker imajlari insa edildi ve colab_docker/dist klasorune kaydedildi!" -ForegroundColor Cyan
Write-Host "Lutfen bu klasordeki .tar.gz dosyalarini Google Drive'inizda 'Colab Notebooks/docker/images/' dizinine yukleyin." -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
