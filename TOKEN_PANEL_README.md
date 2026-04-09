# 🎫 Swenzy Token Panel Sistemi

Bu sistem, Discord hesapları oluşturmak ve yönetmek için geliştirilmiş bir paneldir.

## 🚀 Özellikler

### ✨ Ana Özellikler
- **Yeni Hesap Oluşturma**: Tek tek veya toplu hesap oluşturma
- **Token Yönetimi**: Tokenları otomatik kaydetme ve listeleme
- **Sunucu Katılımı**: Belirtilen sunucu ID'sine toplu katılım
- **Token Doğrulama**: Mevcut tokenların geçerliliğini kontrol etme
- **Dışa Aktarma**: Token listesini dışa aktarma

### 🎮 Kullanım

#### Komutu Çalıştırma
```
!panel
```

#### Panel Butonları
- **🆕 Yeni Hesap Oluştur**: Tek bir yeni Discord hesabı oluşturur
- **📦 Toplu Hesap Oluştur**: 1-10 arası toplu hesap oluşturur
- **🔗 Sunucuya Katıl**: Tüm hesapları belirtilen sunucuya katılır
- **📋 Token Listesi**: Mevcut tokenları listeler
- **✅ Token Doğrula**: Tokenların geçerliliğini kontrol eder
- **📤 Token Dışa Aktar**: Token listesini metin olarak gösterir

## 🔧 Teknik Detaylar

### Veri Yapısı
```javascript
{
  token: "Discord token",
  username: "Kullanıcı adı",
  voiceChannelId: "Ses kanalı ID",
  statusType: "none/game/spotify",
  gameName: "Oyun adı (varsa)"
}
```

### Güvenlik
- ⚠️ **Önemli**: Bu sistem eğitim amaçlıdır
- Gerçek Discord hesabı oluşturma Discord ToS'a aykırıdır
- Tokenları güvenli tutun ve paylaşmayın

### Rate Limiting
- Hesap oluşturma: 1 saniye bekleme
- Sunucu katılımı: 2 saniye bekleme
- Token doğrulama: Sıralı işlem

## 📊 Özellik Durumu

| Özellik | Durum | Açıklama |
|---------|-------|----------|
| Panel UI | ✅ | Tam çalışır |
| Tek Hesap | ✅ | Simülasyon |
| Toplu Hesap | ✅ | Simülasyon |
| Token Listesi | ✅ | Tam çalışır |
| Token Doğrulama | ✅ | Gerçek API |
| Sunucu Katılımı | ⚠️ | Simülasyon |
| Dışa Aktarma | ✅ | Tam çalışır |

## 🎯 Kullanım Senaryoları

1. **Test Hesapları**: Bot testi için hesap oluşturma
2. **Sunucu Doldurma**: Sunucuya toplu üye ekleme
3. **Token Yönetimi**: Mevcut tokenları organize etme

## ⚠️ Uyarılar

- Bu sistem sadece eğitim amaçlıdır
- Discord Terms of Service'i ihlal etmeyiniz
- Tokenları güvenli saklayın
- Rate limit kurallarına uyun

## 🔄 Güncellemeler

- v1.0: İlk sürüm - Panel UI ve temel özellikler
- Gelecek: Gerçek hesap oluşturma entegrasyonu (yasal çerçevede)