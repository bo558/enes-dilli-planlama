# Düzen: Enes Dilli Akademi ürün prototipi

Etkileşimli arayüz prototipi. Backend, gerçek yapay zekâ, ödeme ve gerçek bildirim içermez. Veriler yalnızca kullanıcının tarayıcısında saklanır. "Düzen" çalışma adıdır.

**Canlı önizleme:** https://bo558.github.io/enes-dilli-planlama/

Kurulum gerekmez. Bağlantıyı bilgisayarda veya telefonda açıp "Örnek verilerle gez" seçeneğiyle başlayabilirsiniz.

## Yerel çalıştırma

Gereksinim: [Node.js](https://nodejs.org) 22.12 ve sonrası, 24 veya 26 ve sonrası.

```bash
npm ci
npm run dev
```

Uygulama `http://127.0.0.1:5173/` adresinde açılır. Windows'ta `onizle.cmd` dosyasına çift tıklayarak da başlatabilirsiniz; bağımlılıkları kurar ve tarayıcıyı açar.

| Amaç | Komut veya adres |
| --- | --- |
| Mobil çerçeve | `http://127.0.0.1:5173/cihaz.html` |
| Üretim derlemesi | `npm run build`, çıktı: `dist/index.html` (sunucusuz da açılır) |
| Birim testleri | `npm test` |
| Tarayıcı testleri | Sunucu açıkken `npm run e2e` (Microsoft Edge gerekir) |
| Canlı sürümü test etme | `BASE_URL` ortam değişkenine canlı adresi verip `npm run e2e` |

## Yayınlama

`main` dalına yapılan her push, `.github/workflows/pages.yml` iş akışını çalıştırır: testler geçerse uygulama derlenir ve GitHub Pages'e yayınlanır. Test veya derleme hatasında canlı sürüm değişmez. Durum, deponun Actions sekmesinden izlenir.

Uygulama `HashRouter` kullanır ve tek dosyaya derlenir. Bu nedenle sayfa yenileme, doğrudan bağlantı ve depo alt yolu için ek sunucu ayarı gerekmez.

## Teknoloji

Vite, React, TypeScript, Zustand, Motion, Lucide.

## Klasör yapısı

```
src/
  app/            Rotalar, kabuk, global katmanlar (bildirim, evrim anı, sunum paneli)
  design-system/  Renk değişkenleri, bileşenler, şerit motifi, grafikler
  domain/         Saf iş kuralları: tipler, tarih, puan, bildirim kararı, istatistik
  data/           Örnek kurgusal veri (gerçek kullanıcı verisi yok)
  services/       Dış dünya sınırı: koç, ödeme ve saklama
  store/          Uygulama durumu (app) ve geçici arayüz durumu (ui)
  features/       Ekranlar: today, coach, goals, planner, tasks, focus, pet, reports, reminders, settings, onboarding
tests/e2e/        Tarayıcı testleri ve ekran görüntüsü araçları
public/cihaz.html Sunum için telefon çerçevesi
```

## Backend'e geçiş noktaları

| Bugün | Sonra |
| --- | --- |
| `services/coach/simulatedCoach.ts` | `CoachService` arayüzünü uygulayan sunucu istemcisi. Ekranlar değişmez. |
| `services/index.ts` içindeki `billingService` | Mağaza ve web ödemesi |
| `services/storage.ts` ve `store/app.ts` kalıcılığı | API çağrıları ve sunucu durumu |
| `domain/notifications.ts` | Kurallar sunucudaki bildirim işçisine taşınır |
| `domain/gamification.ts`, `domain/stats.ts` | Saf fonksiyonlardır; sunucuda aynen yeniden kullanılabilir |

## İçerik uyarısı

Bu bir prototiptir, yayındaki bir hizmet değildir. Koç yanıtları gerçek yapay zekâdan gelmez; koç metinleri, plan şablonları ve teknik açıklamaları örnektir ve Enes Dilli tarafından onaylanmamıştır. Hukuk metinleri yer tutucudur. Fiyatlar ve paket sınırları örnektir, karar verilmemiştir. Bu prototipe gerçek kişisel, sağlık veya finansal bilgi girmeyin.

Logo, marka renkleri, "Bilgiyi topladın, sıra düzeni kurmakta." ifadesi ve dört aşama enesdilliakademi.com kaynaklıdır ve marka sahibine aittir. Hayvan çizimleri bu projeye özeldir.
