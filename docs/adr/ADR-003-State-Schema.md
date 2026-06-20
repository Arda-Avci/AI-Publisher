# ADR-003: State Schema JSON-Serialization Contract

## Durum
Kabul Edildi (20 Haziran 2026)

## Bağlam
Sistemde job state'i farklı katmanlar (queue.ts, colab_server.py, SSE broadcast, Redis Pub/Sub, RabbitMQ mesajları) arasında taşınıyor. Her katman state'i kendi formatında serialize/deserialize ediyor, bu da tip uyuşmazlıklarına ve hatalara yol açıyor.

Özellikle:
- queue.ts job state'i MySQL/PostgreSQL JSON kolonunda string olarak saklıyor
- SSE broadcast farklı bir format kullanıyor
- Colab callback'i farklı bir payload yapısına sahip
- Redis Pub/Sub mesajlarında tip kontrolü yok

## Karar
Tüm state iletimleri için **tek bir JSON-Serialization contract** tanımlandı:

### `JobState` Schema (Zod)

```typescript
export const JobStateSchema = z.object({
  jobId: z.number(),
  userId: z.number().optional(),
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'cancelled']),
  currentStage: z.string(),
  progressPercent: z.number().min(0).max(100),
  completedScenes: z.number(),
  totalScenes: z.number(),
  etaSeconds: z.number().optional(),
  error: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});
```

### Contract Kuralları

1. **Tüm state iletimleri** bu schema'ya uymak zorundadır (SSE, Redis, RabbitMQ, Colab callback)
2. **Kesin tipler:** `progressPercent` her zaman 0-100 arası number, `status` yalnızca enum'daki değerler
3. **Metadata alanı** isteğe bağlıdır, genişletilebilir (extra fields için)
4. **Tüketici tarafı** schema validation yapmalıdır (Zod parse)
5. **Üretici tarafı** schema'ya uygun çıktı vermelidir

### Uygulama Noktaları

| Katman | Dosya | Değişiklik |
|--------|-------|------------|
| Zod schema | `src/types/job.ts` | JobStateSchema eklendi |
| SSE broadcast | `src/lib/progress.ts` | broadcastProgress JobStateSchema ile doğrulanıyor |
| Redis Pub/Sub | `src/lib/redis.ts` | Mesajlar JobStateSchema ile parse ediliyor |
| RabbitMQ | `src/lib/rabbitmq.ts` | Kuyruk mesajları JobStateSchema formatında |
| Colab callback | `colab_server.py` | Callback payload'ı JobStateSchema'a uygun |

## Sonuçlar
### Olumlu
- Tip güvenli state iletimi tüm katmanlarda
- Yeni katman eklerken contract hazır
- Hata ayıklama kolaylaşır (beklenen format sabit)
- Zod ile runtime validation otomatik

### Olumsuz
- Mevcut kodda format dönüşümü gerektiren yerler olabilir (geçiş süreci)
- Schema değişikliği tüm katmanları etkiler (kırılganlık)
