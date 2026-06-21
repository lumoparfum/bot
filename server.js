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
let gunlukBaslangic = 500.0;
let yedekKasa = 0.0;
let botCalisiyor = false;
let trailingAktif = true;
let toplamIslem = 0;
let kazancSayisi = 0;
let kayipSayisi = 0;
let likidasyon_sayisi = 0;
let toplamKazanc = 0;
let toplamKayip = 0;
let pozisyonId = 0;
let maxSermaye = 500.0;
let maxDrawdown = 0;
let loopTimer = null;

const MAX_POZISYON = 60;
const MAX_RISK_ORAN = 0.40;
const MAX_ISLEM = 10;
const DD_LIMIT = 0.30;
const MIN_ISLEM = 3;
const MIN_SERMAYE = 20;
const MIN_HEDEF = 0.008;
const MAX_HEDEF = 0.018;
const MIN_STOP = 0.005;
const MAX_STOP = 0.010;
const TAKER_FEE = 0.0004;
const AYNI_COIN_MAX = 3;

const COIN_LIST = [
  'BTCUSDT','ETHUSDT','BNBUSDT','SOLUSDT','XRPUSDT','ADAUSDT','DOGEUSDT',
  'AVAXUSDT','MATICUSDT','LINKUSDT','NEARUSDT','LTCUSDT','ATOMUSDT','UNIUSDT',
  'ETCUSDT','HBARUSDT','VETUSDT','XLMUSDT','ALGOUSDT','FTMUSDT','SANDUSDT',
  'GALAUSDT','MANAUSDT','APEUSDT','CHZUSDT','BATUSDT','ENJUSDT','STXUSDT',
  'KAVAUSDT','ZECUSDT','XTZUSDT','COMPUSDT','AAVEUSDT','GRTUSDT','CRVUSDT',
  'SUSHIUSDT','DOTUSDT','BCHUSDT','FILUSDT','THETAUSDT','EGLDUSDT','AXSUSDT',
  'ZILUSDT','SNXUSDT','MKRUSDT','1INCHUSDT','UMAUSDT','TRXUSDT','SHIBUSDT','ICPUSDT'
];

let pozisyonlar = [];
let islemGecmisi = [];
let equityCurve = [{t: Date.now(), v: 500}];
let pnlGecmisi = [];
let coinStats = {};
let loglar = [];

// ============================================================
// API HELPERS
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
// RİSK HESABI
// ============================================================
function toplamMiktarHesapla() {
  return pozisyonlar.reduce((s, p) => s + p.miktar, 0);
}

function coinSayisi(coin) {
  return pozisyonlar.filter(p => p.coin === coin).length;
}

function gunlukDD() {
  return (gunlukBaslangic - aktifSermaye) / gunlukBaslangic;
}

// ============================================================
// YENİ POZİSYON
// ============================================================
async function yeniPozisyonAc() {
  if (!botCalisiyor) return null;
  if (aktifSermaye <= 0) return null;
  if (aktifSermaye < MIN_SERMAYE) return null;
  if (pozisyonlar.length >= MAX_POZISYON) return null;

  const dd = gunlukDD();
  if (dd >= DD_LIMIT) return null;

  // KASA KONTROLÜ: 20$ kalana kadar işlem aç
  const toplam = toplamMiktarHesapla();
  const kalan = aktifSermaye - toplam;
  if (kalan < MIN_SERMAYE) return null;

  // Risk kontrolü (toplam risk)
  let toplamRisk = 0;
  for (const p of pozisyonlar) {
    const riskYuzde = Math.abs((p.stopFiyat - p.girisFiyat) / p.girisFiyat);
    toplamRisk += p.miktar * riskYuzde * p.kaldıraç;
  }
  if (toplamRisk > aktifSermaye * MAX_RISK_ORAN) return null;

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

  // Miktar: kalanın %80'ine kadar, ama max 10$
  const available = aktifSermaye - toplam;
  const maxMiktar = Math.min(MAX_ISLEM, available * 0.8);
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

  if (!coinStats[secilenCoin]) coinStats[secilenCoin] = { islem: 0, kar: 0 };
  coinStats[secilenCoin].islem++;

  logEkle(`🆕 ${tip} ${secilenCoin} | ${miktar.toFixed(2)}$ | ${kaldıraç}x | H:${(hedefYuzde * 100).toFixed(1)}% S:${(stopYuzde * 100).toFixed(1)}%`, 'success');
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

    if (trailingAktif && karTutar > poz.maxKar) {
      poz.maxKar = karTutar;
      if (karYuzde > (poz.hedefYuzde * 100 * poz.kaldıraç * 0.35)) {
        if (poz.tip === 'LONG')
          poz.stopFiyat = Math.max(poz.stopFiyat, poz.girisFiyat * (1 + poz.stopYuzde * 0.3));
        else
          poz.stopFiyat = Math.min(poz.stopFiyat, poz.girisFiyat * (1 - poz.stopYuzde * 0.3));
      }
    }

    let likidasyonOldu = false;
    if (poz.kaldıraç > 1 && poz.likidasyon) {
      if (poz.tip === 'LONG' && guncel <= poz.likidasyon) likidasyonOldu = true;
      if (poz.tip === 'SHORT' && guncel >= poz.likidasyon) likidasyonOldu = true;
    }
    if (likidasyonOldu) {
      logEkle(`💥 LİKİDASYON! ${poz.coin} ${poz.tip} | -${poz.miktar.toFixed(2)}$`, 'error');
      kayipSayisi++;
      toplamKayip += poz.miktar;
      toplamIslem++;
      islemGecmisi.push({
        coin: poz.coin,
        tip: poz.tip,
        miktar: poz.miktar,
        giris: poz.girisFiyat,
        cikis: guncel,
        kar: -poz.miktar,
        karYuzde: -100,
        kaldıraç: poz.kaldıraç,
        neden: 'LİKİDASYON',
        tarih: new Date().toLocaleString('tr-TR')
      });
      pnlGecmisi.push(-poz.miktar);
      likidasyon_sayisi++;
      if (coinStats[poz.coin]) coinStats[poz.coin].kar -= poz.miktar;
      kapatilacaklar.push(i);
      continue;
    }

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
        coin: poz.coin,
        tip: poz.tip,
        miktar: poz.miktar,
        giris: poz.girisFiyat,
        cikis: guncel,
        kar,
        karYuzde,
        kaldıraç: poz.kaldıraç,
        neden,
        tarih: new Date().toLocaleString('tr-TR')
      });
      pnlGecmisi.push(kar);
      if (coinStats[poz.coin]) coinStats[poz.coin].kar += kar;

      logEkle(`${neden === 'HEDEF' ? '✅' : '❌'} ${poz.coin} ${poz.tip} ${neden} | ${kar >= 0 ? '+' : ''}${kar.toFixed(2)}$ (${karYuzde.toFixed(1)}%) | ${poz.kaldıraç}x`, kar >= 0 ? 'success' : 'error');
      kapatilacaklar.push(i);
    }
  }

  for (let i = kapatilacaklar.length - 1; i >= 0; i--)
    pozisyonlar.splice(kapatilacaklar[i], 1);

  const toplamDeger = aktifSermaye + yedekKasa;
  if (toplamDeger > maxSermaye) maxSermaye = toplamDeger;
  const dd = (maxSermaye - toplamDeger) / maxSermaye;
  if (dd > maxDrawdown) maxDrawdown = dd;

  if (equityCurve.length === 0 || Date.now() - equityCurve[equityCurve.length - 1].t > 3000) {
    equityCurve.push({ t: Date.now(), v: toplamDeger });
    if (equityCurve.length > 200) equityCurve.shift();
  }
}

// ============================================================
// ANA DÖNGÜ
// ============================================================
async function anaDongu() {
  if (!botCalisiyor) return;
  await pozisyonlariGuncelle();
  if (pozisyonlar.length < MAX_POZISYON) {
    await yeniPozisyonAc();
  }
}

// ============================================================
// LOG EKLE
// ============================================================
function logEkle(mesaj, tur = 'info') {
  const saat = new Date().toLocaleTimeString('tr-TR');
  loglar.push({ zaman: saat, mesaj, tur });
  if (loglar.length > 200) loglar.shift();
}

// ============================================================
// API ENDPOINTLER
// ============================================================
app.get('/status', (req, res) => {
  const toplamDeger = aktifSermaye + yedekKasa;
  const netKZ = toplamDeger - baslangicSermaye;
  const ddGunluk = Math.max(0, gunlukDD()) * 100;
  const ddMax = Math.max(0, maxDrawdown * 100);

  let gerceklesmemis = 0;
  for (const p of pozisyonlar) gerceklesmemis += p.karTutar || 0;

  res.json({
    aktifSermaye,
    yedekKasa,
    toplamDeger,
    netKZ,
    pozisyonlar: pozisyonlar.map(p => ({
      id: p.id,
      coin: p.coin,
      tip: p.tip,
      miktar: p.miktar,
      girisFiyat: p.girisFiyat,
      karYuzde: p.karYuzde,
      karTutar: p.karTutar,
      hedefFiyat: p.hedefFiyat,
      stopFiyat: p.stopFiyat,
      kaldıraç: p.kaldıraç,
      likidasyon: p.likidasyon
    })),
    islemGecmisi: islemGecmisi.slice(-50),
    coinStats,
    loglar: loglar.slice(-30),
    toplamIslem,
    kazancSayisi,
    kayipSayisi,
    likidasyon_sayisi,
    toplamKazanc,
    toplamKayip,
    maxDrawdown: ddMax,
    ddGunluk,
    botCalisiyor,
    pozisyonSayisi: pozisyonlar.length
  });
});

app.post('/start', (req, res) => {
  if (!botCalisiyor) {
    botCalisiyor = true;
    if (loopTimer) clearInterval(loopTimer);
    loopTimer = setInterval(anaDongu, 1500);
    logEkle('▶ Bot başlatıldı.', 'success');
    res.json({ success: true, message: 'Bot başlatıldı.' });
  } else {
    res.json({ success: false, message: 'Bot zaten çalışıyor.' });
  }
});

app.post('/stop', (req, res) => {
  if (botCalisiyor) {
    botCalisiyor = false;
    if (loopTimer) {
      clearInterval(loopTimer);
      loopTimer = null;
    }
    logEkle('⏸ Bot durduruldu.', 'warning');
    res.json({ success: true, message: 'Bot durduruldu.' });
  } else {
    res.json({ success: false, message: 'Bot zaten durdurulmuş.' });
  }
});

app.post('/reset', (req, res) => {
  pozisyonlar = [];
  islemGecmisi = [];
  equityCurve = [{ t: Date.now(), v: 500 }];
  pnlGecmisi = [];
  coinStats = {};
  loglar = [];
  aktifSermaye = 500;
  baslangicSermaye = 500;
  gunlukBaslangic = 500;
  yedekKasa = 0;
  toplamIslem = 0;
  kazancSayisi = 0;
  kayipSayisi = 0;
  likidasyon_sayisi = 0;
  toplamKazanc = 0;
  toplamKayip = 0;
  pozisyonId = 0;
  maxSermaye = 500;
  maxDrawdown = 0;
  if (loopTimer) { clearInterval(loopTimer); loopTimer = null; }
  botCalisiyor = false;
  logEkle('🗑️ Sıfırlandı.', 'warning');
  res.json({ success: true, message: 'Sıfırlandı.' });
});

app.get('/report', (req, res) => {
  const satirlar = [];
  const toplamDeger = aktifSermaye + yedekKasa;
  const netKZ = toplamDeger - baslangicSermaye;
  const ddMax = Math.max(0, maxDrawdown * 100);

  satirlar.push('╔══════════════════════════════════════╗');
  satirlar.push('║       VUR KAÇ v4.0 — RAPOR          ║');
  satirlar.push('╚══════════════════════════════════════╝');
  satirlar.push('');
  satirlar.push(`Tarih      : ${new Date().toLocaleString('tr-TR')}`);
  satirlar.push(`Başlangıç  : $${baslangicSermaye.toFixed(2)}`);
  satirlar.push(`Aktif      : $${aktifSermaye.toFixed(2)}`);
  satirlar.push(`Yedek Kâr  : $${yedekKasa.toFixed(2)}`);
  satirlar.push(`Net K/Z    : ${netKZ >= 0 ? '+' : ''}$${netKZ.toFixed(2)}`);
  satirlar.push(`Max DD     : ${ddMax.toFixed(2)}%`);
  satirlar.push('');
  satirlar.push(`Toplam İşlem   : ${toplamIslem}`);
  satirlar.push(`Kazanma Oranı  : ${toplamIslem > 0 ? (kazancSayisi / toplamIslem * 100).toFixed(1) + '%' : '—'}`);
  satirlar.push(`Kazanç Say.    : ${kazancSayisi}`);
  satirlar.push(`Kayıp Say.     : ${kayipSayisi}`);
  satirlar.push(`Likidasyon     : ${likidasyon_sayisi}`);
  satirlar.push(`Toplam Kazanç  : $${toplamKazanc.toFixed(2)}`);
  satirlar.push(`Toplam Kayıp   : $${toplamKayip.toFixed(2)}`);
  satirlar.push('');
  satirlar.push('─── COIN PERFORMANSI ───────────────────');
  const sortedCoins = Object.entries(coinStats).sort((a, b) => b[1].kar - a[1].kar);
  for (const [c, v] of sortedCoins) {
    satirlar.push(`  ${c.padEnd(12)} ${v.islem} işlem  ${v.kar >= 0 ? '+' : ''}$${v.kar.toFixed(2)}`);
  }
  satirlar.push('');
  satirlar.push('─── AÇIK POZİSYONLAR ───────────────────');
  if (pozisyonlar.length === 0) satirlar.push('  Yok');
  else {
    for (const p of pozisyonlar) {
      satirlar.push(`  ${p.tip} ${p.coin} | $${p.miktar.toFixed(2)} | ${p.kaldıraç}x | ${p.karYuzde.toFixed(1)}% | K/Z: ${p.karTutar >= 0 ? '+' : ''}$${p.karTutar.toFixed(2)}`);
    }
  }
  satirlar.push('');
  satirlar.push('─── SON 50 İŞLEM ───────────────────────');
  const goster = islemGecmisi.slice(-50).reverse();
  for (const is of goster) {
    satirlar.push(`  ${is.coin} ${is.tip} | ${is.neden} | ${is.kar >= 0 ? '+' : ''}$${is.kar.toFixed(2)} | ${is.karYuzde.toFixed(1)}% | ${is.tarih}`);
  }
  satirlar.push('');
  satirlar.push('════════════════════════════════════════');

  res.send(satirlar.join('\n'));
});

// ============================================================
// SUNUCU BAŞLAT
// ============================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Bot sunucusu ${PORT} portunda çalışıyor.`);
  logEkle('⚡ Vur Kaç v4.0 sunucusu başladı.', 'success');
});

// Başlangıçta bot kapalı olsun
botCalisiyor = false;
