# Bayram Meral ile Harita Avcısı

Türkiye'nin 81 ilini haritada öğreten, KPSS coğrafya sorularıyla sınayan mobil uyumlu web oyunu.
Hazırlayan: Oğuz ARIK · Benim Hocam

**Oyna:** https://oguzarik.github.io/harita-avcisi/

## Modlar

- **Harita Bilmece** — Bölgeye dokun, ile dokun, üç yakın isimden doğruyu seç. Bölgeleri tamamla, 81 ili yerinden öğren.
- **Hız Turu** — 60 saniye, yanan ilin adını seç, seri yaptıkça puan katlanır.
- **KPSS** — 20 soru, 5 şık, 12 dakika. Konum, komşu, bölge, kıyı, sınır, demir yatağı. Sınav sonunda yanlışlara dokun, haritada gör.

## Telefona kurma

- **iPhone:** Safari'de aç → Paylaş → Ana Ekrana Ekle. Tam ekran, çevrimdışı çalışır.
- **Android:** Chrome'da aç → menü → Ana ekrana ekle.

## Bilgisayarda tek dosya

```
node build.js
```

`dist/HaritaAvcisi.html` dosyası tüm oyunu içerir; çift tıkla açılır, sunucu gerekmez.
`dist/Harita Avcisi (PC).bat` oyunu pencere olarak açar.

## Geliştirme

Düz HTML + Canvas + JavaScript, bağımlılık yok.

| Dosya | İçerik |
| --- | --- |
| `index.html` | Ekranlar |
| `game.js` | Oyun mantığı, harita çizimi, ses, KPSS soru üretici |
| `mapdata.js` | 81 ilin sınır koordinatları ve komşulukları |
| `styles.css` | Arayüz, mobil güvenli alanlar |
| `sw.js` | Çevrimdışı önbellek (service worker) |
| `build.js` | Tek dosya derleyici |

Yerelde denemek için klasörü herhangi bir statik sunucuyla aç, ya da `YURT.vbs` ile başlat.
