# ADR-004: Branch Stratejisi

## Durum
Kabul Edildi (20 Haziran 2026)

## Bağlam
Proje büyüdükçe (286 test, 97+ TS dosyası, ~25 frontend bileşen) tek `main` branch'inde çalışmak riskli hale geldi. CI/CD pipeline'ı mevcut ancak feature branch koruması yok.

## Karar
**GitHub Flow** (basit trunk-based development) benimsendi:
- `main` — her zaman production-ready, doğrudan deploy edilebilir
- Feature branch'leri: `feat/<kisa-isim>` (örn: `feat/wan25-container`)
- Hotfix branch'leri: `fix/<kisa-isim>` (örn: `fix/colab-oom`)
- PR merge → `main` → otomatik CI/CD

## Kurallar
1. `main`'e direkt push yasak (branch protection ile)
2. Her PR en az 1 review + CI green şartı
3. Feature branch'leri kısa ömürlü (< 3 gün)
4. Commit mesajları: Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`)

## Gerekçe
- Takım tek kişi (şimdilik) → GitHub Flow yeterli
- Git-flow (develop/release) aşırı karmaşık, ihtiyaç yok
- CI/CD zaten hazır (`.github/workflows/ci.yml`)

## Geçiş Planı
1. GitHub repo ayarlarından `main` branch protection aktifleştirilecek
2. Mevcut çalışmalar doğrudan `main`'e commit edilecek (geçiş süreci)
3. Yeni feature'lar `feat/` branch'lerinde başlayacak

## Sonuçlar
- OLUMLU: Basit, anlaşılır, CI ile uyumlu
- OLUMLU: Hotfix hızlı deploy edilebilir
- OLUMSUZ: Büyük feature'lar branch'te uzun süre açık kalırsa merge conflict riski
