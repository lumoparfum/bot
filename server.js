const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ============================================================
// KONFİGÜRASYON
// ============================================================
let aktifSermaye = 500.0;
let baslangicSermaye = 500.0;
let yedekKasa = 0.0;
let botCalisiyor = false;
let toplamIslem = 0;
let kazancSayisi = 0;
let kayipSayisi = 0;
let pozisyonlar = [];
let islemGecmisi = [];
let maxDrawdown = 0;
let maxSermaye = 500.0;
let pozisyonId = 0;
let toplamKazanc = 0;
let toplamKayip = 0;

const MIN_ISLEM = 3;
const MAX_ISLEM = 10;
const MIN_SERMAYE = 20;
const MIN_HEDEF = 0.008;
const MAX_HEDEF = 0.018;
const MIN_STOP = 0.005;
const MAX_STOP = 0.010;
const TAKER_FEE = 0.0004;
const AYNI_COIN_MAX = 3;
const DD_LIMIT = 0.30;
const MAX_POZISYON = 60;

const COIN_LIST = [
  'BTCUSDT','ETHUSDT','BNBUSDT','SOLUSDT','XRPUSDT','ADAUSDT','DOGEUSDT',
  'AVAXUSDT','MATICUSDT','LINKUSDT','NEARUSDT','LTCUSDT','ATOMUSDT','UNIUSDT',
  'ETCUSDT','HBARUSDT','VETUSDT','XLMUSDT','ALGOUSDT','FTMUSDT','SANDUSDT',
  'GALAUSDT','MANAUSDT','APEUSDT','CHZUSDT','BATUSDT','ENJUSDT','STXUSDT',
  'KAVAUSDT','ZECUSDT','XTZUSDT','COMPUSDT','AAVEUSDT','GRTUSDT','CRVUSDT',
  'SUSHIUSDT','DOTUSDT','BCHUSDT','FILUSDT','THETAUSDT','EGLDUSDT','AXSUSDT',
  'ZILUSDT','SNXUSDT','MKRUSDT','1INCHUSDT','UMAUSDT','TRXUSDT','SHIBUSDT','ICPUSDT'
];

// ============================================================
// API FONKSİYONLARI
// ============================================================
async function tumFiyatlariGetir() {
  try {
    const res = await axios.get('https://api.binance.com/api/v3/ticker/price');
    const fiyatlar = {};
    for (const item of res.data) {
      if (COIN_LIST.includes(item.symbol)) {
        fiyatlar[item.symbol] = parseFloat(item.price);
      }
    }
    return fiyatlar;
  } catch { return null; }
}

async function tumPerformanslariGetir() {
  try {
    const res = await axios.get('https://api.binance.com/api/v3/ticker/24hr');
    const perf = {};
    for (const item of res.data) {
      if (COIN_LIST.includes(item.symbol)) {
        perf[item.symbol] = parseFloat(item.priceChangePercent);
      }
    }
    return perf;
  } catch { return null; }
}

// ============================================================
// YARDIMCI FONKSİYONLAR
// ============================================================
function toplamMiktarHesapla() {
  return pozisyonlar.reduce((s, p) => s + p.miktar, 0);
}
function coinSayisi(coin) {
  return pozisyonlar.filter(p => p.coin === coin).length;
}
function toplamRiskHesapla() {
  let r = 0;
  for (const p of pozisyonlar) {
    const riskYuzde = Math.abs((p.stopFiyat - p.girisFiyat) / p.girisFiyat);
    r += p.miktar * riskYuzde * p.kaldıraç;
  }
  return r;
}
function gunlukDD() {
  return (baslangicSermaye - aktifSermaye) / baslangicSermaye;
}
function toplamDD() {
  if (maxSermaye <= 0) return 0;
  return (maxSermaye - (aktifSermaye + yedekKasa)) / maxSermaye;
}

// ============================================================
// YENİ POZİSYON AÇMA
// ============================================================
async function yeniPozisyonAc() {
  if (!botCalisiyor) return null;
  if (aktifSermaye < MIN_SERMAYE) return null;
  if (pozisyonlar.length >= MAX_POZISYON) return null;

  const dd = gunlukDD();
  if (dd >= DD_LIMIT) return null;

  const toplam = toplamMiktarHesapla();
  // LİMİT YOK: kasada 20$ kalana kadar aç
  if (aktifSermaye - toplam < MIN_SERMAYE) return null;

  const risk = toplamRiskHesapla();
  if (risk > aktifSermaye * 0.40) return null;

  const perf = await tumPerformanslariGetir();
  if (!perf) return null;
  const uygun = COIN_LIST.filter(c => perf[c] !== undefined);
  if (uygun.length === 0) return null;

  const uygunFiltre = uygun.filter(c => coinSayisi(c) < AYNI_COIN_MAX);
  if (uygunFiltre.length === 0) return null;

  const sorted = [...uygunFiltre].sort((a, b) => perf[a] - perf[b]);
  const dip = sorted.slice(0, Math.min(6, sorted.length));
  const tepe = sorted.slice(-Math.min(6, sorted.length));

  let secilenCoin;
  const dice = Math.random();
  if (dice < 0.4) secilenCoin = dip[Math.floor(Math.random() * dip.length)];
  else if (dice < 0.8) secilenCoin = tepe[Math.floor(Math.random() * tepe.length)];
  else secilenCoin = uygunFiltre[Math.floor(Math.random() * uygunFiltre.length)];

  const degisim = perf[secilenCoin];
  let tip;
  if (degisim < -0.3) tip = 'LONG';
  else if (degisim > 0.3) tip = 'SHORT';
  else tip = Math.random() < 0.5 ? 'LONG' : 'SHORT';

  const available = aktifSermaye - toplam;
  if (available < MIN_ISLEM) return null;
  const maxMiktar = Math.min(MAX_ISLEM, available);
  if (maxMiktar < MIN_ISLEM) return null;
  let miktar = MIN_ISLEM + Math.random() * (maxMiktar - MIN_ISLEM);
  miktar = Math.max(MIN_ISLEM, Math.min(miktar, MAX_ISLEM, available));
  if (miktar < MIN_ISLEM) return null;

  const vol = Math.abs(degisim);
  let kaldıraç;
  if (vol < 0.5) kaldıraç = 3 + Math.floor(Math.random() * 2);
  else if (vol < 1.5) kaldıraç = 4 + Math.floor(Math.random() * 3);
  else kaldıraç = 5 + Math.floor(Math.random() * 3);
  kaldıraç = Math.min(kaldıraç, 8);

  let hedefYuzde = MIN_HEDEF + Math.random() * (MAX_HEDEF - MIN_HEDEF);
  let stopYuzde = MIN_STOP + Math.random() * (MAX_STOP - MIN_STOP);
  stopYuzde = Math.min(stopYuzde, hedefYuzde * 0.65);
  stopYuzde = Math.max(MIN_STOP, stopYuzde);
  hedefYuzde = Math.max(hedefYuzde, stopYuzde * 1.5);

  const fiyatlar = await tumFiyatlariGetir();
  if (!fiyatlar || !fiyatlar[secilenCoin]) return null;
  const girisFiyat = fiyatlar[secilenCoin];

  let hedefFiyat, stopFiyat;
  if (tip === 'LONG') {
    hedefFiyat = girisFiyat * (1 + hedefYuzde);
    stopFiyat = girisFiyat * (1 - stopYuzde);
  } else {
    hedefFiyat = girisFiyat * (1 - hedefYuzde);
    stopFiyat = girisFiyat * (1 + stopYuzde);
  }

  let likidasyon = 0;
  if (kaldıraç > 1) {
    if (tip === 'LONG')
      likidasyon = girisFiyat * (1 - (1 / kaldıraç) + TAKER_FEE);
    else
      likidasyon = girisFiyat * (1 + (1 / kaldıraç) - TAKER_FEE);
  }

  const poz = {
    id: ++pozisyonId,
    coin: secilenCoin,
    tip,
    miktar,
    girisFiyat,
    hedefFiyat,
    stopFiyat,
    likidasyon,
    kaldıraç,
    hedefYuzde,
    stopYuzde,
    acilisZamani: Date.now(),
    durum: 'acik',
    karYuzde: 0,
    karTutar: 0,
    maxKar: 0,
  };

  pozisyonlar.push(poz);
  aktifSermaye -= miktar;

  return poz;
}

// ============================================================
// POZİSYON GÜNCELLEME
// ============================================================
async function pozisyonlariGuncelle() {
  if (!botCalisiyor) return;
  const fiyatlar = await tumFiyatlariGetir();
  if (!fiyatlar) return;

  const kapatilacaklar = [];
  for (let i = 0; i < pozisyonlar.length; i++) {
    const poz = pozisyonlar[i];
    if (poz.durum !== 'acik') continue;
    const guncel = fiyatlar[poz.coin];
    if (!guncel) continue;

    let degisim;
    if (poz.tip === 'LONG')
      degisim = (guncel - poz.girisFiyat) / poz.girisFiyat;
    else
      degisim = (poz.girisFiyat - guncel) / poz.girisFiyat;

    const karYuzde = degisim * 100 * poz.kaldıraç;
    const karTutar = (poz.miktar * degisim * poz.kaldıraç) - (poz.miktar * TAKER_FEE * 2 * poz.kaldıraç);
    poz.karYuzde = karYuzde;
    poz.karTutar = karTutar;

    // Trailing stop
    if (karTutar > poz.maxKar) {
      poz.maxKar = karTutar;
      if (karYuzde > (poz.hedefYuzde * 100 * poz.kaldıraç * 0.35)) {
        if (poz.tip === 'LONG')
          poz.stopFiyat = Math.max(poz.stopFiyat, poz.girisFiyat * (1 + poz.stopYuzde * 0.3));
        else
          poz.stopFiyat = Math.min(poz.stopFiyat, poz.girisFiyat * (1 - poz.stopYuzde * 0.3));
      }
    }

    // Likidasyon
    let likidasyonOldu = false;
    if (poz.kaldıraç > 1 && poz.likidasyon) {
      if (poz.tip === 'LONG' && guncel <= poz.likidasyon) likidasyonOldu = true;
      if (poz.tip === 'SHORT' && guncel >= poz.likidasyon) likidasyonOldu = true;
    }
    if (likidasyonOldu) {
      kayipSayisi++;
      toplamKayip += poz.miktar;
      toplamIslem++;
      islemGecmisi.push({
        coin: poz.coin, tip: poz.tip, miktar: poz.miktar,
        giris: poz.girisFiyat, cikis: guncel,
        kar: -poz.miktar, karYuzde: -100,
        kaldıraç: poz.kaldıraç, neden: 'LİKİDASYON',
        tarih: new Date().toLocaleString('tr-TR')
      });
      kapatilacaklar.push(i);
      continue;
    }

    // Hedef/stop
    let hedefAsildi = false, stopAsildi = false;
    if (poz.tip === 'LONG') {
      if (guncel >= poz.hedefFiyat) hedefAsildi = true;
      if (guncel <= poz.stopFiyat) stopAsildi = true;
    } else {
      if (guncel <= poz.hedefFiyat) hedefAsildi = true;
      if (guncel >= poz.stopFiyat) stopAsildi = true;
    }

    if (hedefAsildi || stopAsildi) {
      const neden = hedefAsildi ? 'HEDEF' : 'STOP';
      const kar = karTutar;

      if (kar >= 0) {
        const yedege = kar * 0.40;
        const aktife = poz.miktar + kar * 0.60;
        yedekKasa += yedege;
        aktifSermaye += aktife;
        kazancSayisi++;
        toplamKazanc += kar;
      } else {
        aktifSermaye += (poz.miktar + kar);
        kayipSayisi++;
        toplamKayip += Math.abs(kar);
      }
      toplamIslem++;
      islemGecmisi.push({
        coin: poz.coin, tip: poz.tip, miktar: poz.miktar,
        giris: poz.girisFiyat, cikis: guncel,
        kar, karYuzde, kaldıraç: poz.kaldıraç, neden,
        tarih: new Date().toLocaleString('tr-TR')
      });
      kapatilacaklar.push(i);
    }
  }

  for (let i = kapatilacaklar.length - 1; i >= 0; i--)
    pozisyonlar.splice(kapatilacaklar[i], 1);

  // Max sermaye
  const toplamDeger = aktifSermaye + yedekKasa;
  if (toplamDeger > maxSermaye) maxSermaye = toplamDeger;
  const dd = toplamDD();
  if (dd > maxDrawdown) maxDrawdown = dd;
}

// ============================================================
// ANA DÖNGÜ
// ============================================================
setInterval(async () => {
  if (botCalisiyor) {
    await pozisyonlariGuncelle();
    if (aktifSermaye >= MIN_SERMAYE && pozisyonlar.length < MAX_POZISYON) {
      await yeniPozisyonAc();
    }
  }
}, 3000);

// ============================================================
// API ROUTE'LARI
// ============================================================
app.get('/status', (req, res) => {
  const toplamKZ = aktifSermaye + yedekKasa - baslangicSermaye;
  res.json({
    calisiyor: botCalisiyor,
    aktifSermaye,
    yedekKasa,
    toplamKZ,
    pozisyonlar: pozisyonlar.map(p => ({
      coin: p.coin,
      tip: p.tip,
      miktar: p.miktar,
      kaldıraç: p.kaldıraç,
      karYuzde: p.karYuzde,
      karTutar: p.karTutar
    })),
    sonIslemler: islemGecmisi.slice(-10),
    toplamIslem,
    kazancSayisi,
    kayipSayisi,
    maxDrawdown: (maxDrawdown * 100).toFixed(2)
  });
});

app.post('/start', (req, res) => {
  if (!botCalisiyor) {
    botCalisiyor = true;
    res.json({ mesaj: 'Bot başlatıldı.' });
  } else {
    res.json({ mesaj: 'Bot zaten çalışıyor.' });
  }
});

app.post('/stop', (req, res) => {
  if (botCalisiyor) {
    botCalisiyor = false;
    res.json({ mesaj: 'Bot durduruldu.' });
  } else {
    res.json({ mesaj: 'Bot zaten durdurulmuş.' });
  }
});

app.get('/rapor', (req, res) => {
  let rapor = '=== VUR KAÇ BOT RAPORU ===\n';
  rapor += `Tarih: ${new Date().toLocaleString('tr-TR')}\n`;
  rapor += `Aktif Sermaye: $${aktifSermaye.toFixed(2)}\n`;
  rapor += `Yedek Kasa: $${yedekKasa.toFixed(2)}\n`;
  rapor += `Toplam K/Z: $${(aktifSermaye + yedekKasa - baslangicSermaye).toFixed(2)}\n`;
  rapor += `Toplam İşlem: ${toplamIslem}\n`;
  rapor += `Kazanma Oranı: ${toplamIslem > 0 ? ((kazancSayisi / toplamIslem) * 100).toFixed(1) + '%' : '—'}\n`;
  rapor += `Max Drawdown: ${(maxDrawdown * 100).toFixed(2)}%\n\n`;
  rapor += '--- AÇIK POZİSYONLAR ---\n';
  if (pozisyonlar.length === 0) rapor += 'Yok\n';
  else {
    for (const p of pozisyonlar) {
      rapor += `${p.tip} ${p.coin} | $${p.miktar.toFixed(2)} | ${p.kaldıraç}x | K/Z: ${p.karTutar >= 0 ? '+' : ''}$${p.karTutar.toFixed(2)}\n`;
    }
  }
  rapor += '\n--- SON İŞLEMLER ---\n';
  if (islemGecmisi.length === 0) rapor += 'Henüz işlem yok\n';
  else {
    for (const is of islemGecmisi.slice(-20).reverse()) {
      rapor += `${is.coin} ${is.tip} | ${is.neden} | ${is.kar >= 0 ? '+' : ''}$${is.kar.toFixed(2)}\n`;
    }
  }
  res.set('Content-Type', 'text/plain');
  res.send(rapor);
});

// ============================================================
// SUNUCU
// ============================================================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Bot sunucusu ${PORT} portunda çalışıyor.`);
});
