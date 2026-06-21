const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const STATE_FILE = path.join(__dirname, 'state.json');

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch (e) { console.error('State okuma hatası:', e); }
  return null;
}

function saveState(data) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(data, null, 2));
  } catch (e) { console.error('State yazma hatası:', e); }
}

const defaultState = {
  aktifSermaye: 500.0,
  baslangicSermaye: 500.0,
  yedekKasa: 0.0,
  botCalisiyor: false,
  toplamIslem: 0,
  kazancSayisi: 0,
  kayipSayisi: 0,
  pozisyonlar: [],
  islemGecmisi: [],
  maxDrawdown: 0,
  maxSermaye: 500.0,
  pozisyonId: 0,
  toplamKazanc: 0,
  toplamKayip: 0,
  equityCurve: [{ t: Date.now(), v: 500 }],
  pnlGecmisi: [],
  coinStats: {},
};

let state = loadState() || defaultState;
saveState(state);

// ============================================================
// KONFİG
// ============================================================
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
// API FONKSİYONLARI (Alternatif URL'ler ile)
// ============================================================
const BINANCE_ENDPOINTS = [
  'https://api.binance.com',
  'https://api1.binance.com',
  'https://api2.binance.com',
  'https://api3.binance.com'
];

async function fetchWithFallback(path, timeout = 5000) {
  let lastError = null;
  for (const baseUrl of BINANCE_ENDPOINTS) {
    try {
      const url = `${baseUrl}${path}`;
      console.log(`📡 Deneniyor: ${url}`);
      const res = await axios.get(url, { timeout });
      return res.data;
    } catch (e) {
      lastError = e;
      console.log(`❌ ${baseUrl} başarısız: ${e.message}`);
    }
  }
  throw lastError || new Error('Tüm endpointler başarısız');
}

async function tumFiyatlariGetir() {
  try {
    console.log('📡 Fiyatlar çekiliyor...');
    const data = await fetchWithFallback('/api/v3/ticker/price', 5000);
    const fiyatlar = {};
    for (const item of data) {
      if (COIN_LIST.includes(item.symbol)) fiyatlar[item.symbol] = parseFloat(item.price);
    }
    console.log(`✅ ${Object.keys(fiyatlar).length} coin fiyatı alındı.`);
    return fiyatlar;
  } catch (e) {
    console.error('❌ Fiyat çekme hatası:', e.message);
    return null;
  }
}

async function tumPerformanslariGetir() {
  try {
    console.log('📡 Performans verileri çekiliyor...');
    const data = await fetchWithFallback('/api/v3/ticker/24hr', 5000);
    const perf = {};
    for (const item of data) {
      if (COIN_LIST.includes(item.symbol)) perf[item.symbol] = parseFloat(item.priceChangePercent);
    }
    console.log(`✅ ${Object.keys(perf).length} coin performansı alındı.`);
    return perf;
  } catch (e) {
    console.error('❌ Performans çekme hatası:', e.message);
    return null;
  }
}

// ============================================================
// YARDIMCI
// ============================================================
function toplamMiktarHesapla() {
  return state.pozisyonlar.reduce((s, p) => s + p.miktar, 0);
}
function coinSayisi(coin) {
  return state.pozisyonlar.filter(p => p.coin === coin).length;
}
function toplamRiskHesapla() {
  let r = 0;
  for (const p of state.pozisyonlar) {
    const riskYuzde = Math.abs((p.stopFiyat - p.girisFiyat) / p.girisFiyat);
    r += p.miktar * riskYuzde * p.kaldıraç;
  }
  return r;
}
function gunlukDD() {
  return (state.baslangicSermaye - state.aktifSermaye) / state.baslangicSermaye;
}
function toplamDD() {
  if (state.maxSermaye <= 0) return 0;
  return (state.maxSermaye - (state.aktifSermaye + state.yedekKasa)) / state.maxSermaye;
}

// ============================================================
// YENİ POZİSYON AÇ
// ============================================================
async function yeniPozisyonAc() {
  console.log('🔄 Yeni pozisyon deneniyor...');
  if (!state.botCalisiyor) { console.log('⏸ Bot çalışmıyor.'); return null; }
  if (state.aktifSermaye < MIN_SERMAYE) { console.log('⚠️ Sermaye yetersiz.'); return null; }
  if (state.pozisyonlar.length >= MAX_POZISYON) { console.log('⚠️ Maksimum pozisyon dolu.'); return null; }
  if (gunlukDD() >= DD_LIMIT) { console.log('⚠️ Drawdown limiti aşıldı.'); return null; }

  const toplam = toplamMiktarHesapla();
  if (state.aktifSermaye - toplam < MIN_SERMAYE) { console.log('⚠️ Kasa 20$ altında.'); return null; }
  if (toplamRiskHesapla() > state.aktifSermaye * 0.40) { console.log('⚠️ Risk limiti aşıldı.'); return null; }

  const perf = await tumPerformanslariGetir();
  if (!perf) { console.log('❌ Performans verisi alınamadı.'); return null; }
  const uygun = COIN_LIST.filter(c => perf[c] !== undefined);
  if (uygun.length === 0) { console.log('❌ Uygun coin bulunamadı.'); return null; }

  const uygunFiltre = uygun.filter(c => coinSayisi(c) < AYNI_COIN_MAX);
  if (uygunFiltre.length === 0) { console.log('⚠️ Tüm coinlerde max işlem limiti dolu.'); return null; }

  const sorted = [...uygunFiltre].sort((a, b) => perf[a] - perf[b]);
  const dip = sorted.slice(0, Math.min(6, sorted.length));
  const tepe = sorted.slice(-Math.min(6, sorted.length));

  let secilenCoin;
  const dice = Math.random();
  if (dice < 0.4) secilenCoin = dip[Math.floor(Math.random() * dip.length)];
  else if (dice < 0.8) secilenCoin = tepe[Math.floor(Math.random() * tepe.length)];
  else secilenCoin = uygunFiltre[Math.floor(Math.random() * uygunFiltre.length)];

  const degisim = perf[secilenCoin];
  let tip = (degisim < -0.3) ? 'LONG' : (degisim > 0.3) ? 'SHORT' : (Math.random() < 0.5 ? 'LONG' : 'SHORT');

  const available = state.aktifSermaye - toplam;
  if (available < MIN_ISLEM) { console.log('⚠️ Miktar yetersiz.'); return null; }
  let maxMiktar = Math.min(MAX_ISLEM, available);
  if (maxMiktar < MIN_ISLEM) { console.log('⚠️ Miktar yetersiz.'); return null; }
  let miktar = MIN_ISLEM + Math.random() * (maxMiktar - MIN_ISLEM);
  miktar = Math.max(MIN_ISLEM, Math.min(miktar, MAX_ISLEM, available));
  if (miktar < MIN_ISLEM) { console.log('⚠️ Miktar yetersiz.'); return null; }

  const vol = Math.abs(degisim);
  let kaldıraç = (vol < 0.5) ? 3 + Math.floor(Math.random() * 2) : (vol < 1.5) ? 4 + Math.floor(Math.random() * 3) : 5 + Math.floor(Math.random() * 3);
  kaldıraç = Math.min(kaldıraç, 8);

  let hedefYuzde = MIN_HEDEF + Math.random() * (MAX_HEDEF - MIN_HEDEF);
  let stopYuzde = MIN_STOP + Math.random() * (MAX_STOP - MIN_STOP);
  stopYuzde = Math.min(stopYuzde, hedefYuzde * 0.65);
  stopYuzde = Math.max(MIN_STOP, stopYuzde);
  hedefYuzde = Math.max(hedefYuzde, stopYuzde * 1.5);

  const fiyatlar = await tumFiyatlariGetir();
  if (!fiyatlar || !fiyatlar[secilenCoin]) { console.log('❌ Fiyat alınamadı.'); return null; }
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
    likidasyon = tip === 'LONG' ? girisFiyat * (1 - (1 / kaldıraç) + TAKER_FEE) : girisFiyat * (1 + (1 / kaldıraç) - TAKER_FEE);
  }

  const poz = {
    id: ++state.pozisyonId,
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

  state.pozisyonlar.push(poz);
  state.aktifSermaye -= miktar;
  if (!state.coinStats[secilenCoin]) state.coinStats[secilenCoin] = { islem: 0, kar: 0 };
  state.coinStats[secilenCoin].islem++;
  saveState(state);
  console.log(`✅ Yeni ${tip} pozisyon açıldı: ${secilenCoin} | $${miktar.toFixed(2)} | ${kaldıraç}x`);
  return poz;
}

// ============================================================
// POZİSYON GÜNCELLEME
// ============================================================
async function pozisyonlariGuncelle() {
  if (!state.botCalisiyor) return;
  const fiyatlar = await tumFiyatlariGetir();
  if (!fiyatlar) return;

  const kapatilacaklar = [];
  for (let i = 0; i < state.pozisyonlar.length; i++) {
    const poz = state.pozisyonlar[i];
    if (poz.durum !== 'acik') continue;
    const guncel = fiyatlar[poz.coin];
    if (!guncel) continue;

    let degisim = poz.tip === 'LONG' ? (guncel - poz.girisFiyat) / poz.girisFiyat : (poz.girisFiyat - guncel) / poz.girisFiyat;
    const karYuzde = degisim * 100 * poz.kaldıraç;
    const karTutar = (poz.miktar * degisim * poz.kaldıraç) - (poz.miktar * TAKER_FEE * 2 * poz.kaldıraç);
    poz.karYuzde = karYuzde;
    poz.karTutar = karTutar;

    if (karTutar > poz.maxKar) {
      poz.maxKar = karTutar;
      if (karYuzde > (poz.hedefYuzde * 100 * poz.kaldıraç * 0.35)) {
        if (poz.tip === 'LONG') poz.stopFiyat = Math.max(poz.stopFiyat, poz.girisFiyat * (1 + poz.stopYuzde * 0.3));
        else poz.stopFiyat = Math.min(poz.stopFiyat, poz.girisFiyat * (1 - poz.stopYuzde * 0.3));
      }
    }

    let likidasyonOldu = false;
    if (poz.kaldıraç > 1 && poz.likidasyon) {
      if (poz.tip === 'LONG' && guncel <= poz.likidasyon) likidasyonOldu = true;
      if (poz.tip === 'SHORT' && guncel >= poz.likidasyon) likidasyonOldu = true;
    }
    if (likidasyonOldu) {
      state.kayipSayisi++;
      state.toplamKayip += poz.miktar;
      state.toplamIslem++;
      state.islemGecmisi.push({ coin: poz.coin, tip: poz.tip, miktar: poz.miktar, giris: poz.girisFiyat, cikis: guncel, kar: -poz.miktar, karYuzde: -100, kaldıraç: poz.kaldıraç, neden: 'LİKİDASYON', tarih: new Date().toLocaleString('tr-TR') });
      state.pnlGecmisi.push(-poz.miktar);
      if (state.coinStats[poz.coin]) state.coinStats[poz.coin].kar -= poz.miktar;
      kapatilacaklar.push(i);
      continue;
    }

    let hedefAsildi = false,
      stopAsildi = false;
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
        state.yedekKasa += kar * 0.40;
        state.aktifSermaye += poz.miktar + kar * 0.60;
        state.kazancSayisi++;
        state.toplamKazanc += kar;
      } else {
        state.aktifSermaye += (poz.miktar + kar);
        state.kayipSayisi++;
        state.toplamKayip += Math.abs(kar);
      }
      state.toplamIslem++;
      state.islemGecmisi.push({ coin: poz.coin, tip: poz.tip, miktar: poz.miktar, giris: poz.girisFiyat, cikis: guncel, kar, karYuzde, kaldıraç: poz.kaldıraç, neden, tarih: new Date().toLocaleString('tr-TR') });
      state.pnlGecmisi.push(kar);
      if (state.coinStats[poz.coin]) state.coinStats[poz.coin].kar += kar;
      kapatilacaklar.push(i);
    }
  }

  for (let i = kapatilacaklar.length - 1; i >= 0; i--) {
    state.pozisyonlar.splice(kapatilacaklar[i], 1);
  }

  const toplamDeger = state.aktifSermaye + state.yedekKasa;
  if (toplamDeger > state.maxSermaye) state.maxSermaye = toplamDeger;
  const dd = toplamDD();
  if (dd > state.maxDrawdown) state.maxDrawdown = dd;

  state.equityCurve.push({ t: Date.now(), v: toplamDeger });
  if (state.equityCurve.length > 200) state.equityCurve.shift();

  saveState(state);
}

// ============================================================
// ANA DÖNGÜ
// ============================================================
setInterval(async () => {
  if (state.botCalisiyor) {
    console.log('⏳ Döngü çalışıyor...');
    await pozisyonlariGuncelle();
    if (state.aktifSermaye >= MIN_SERMAYE && state.pozisyonlar.length < MAX_POZISYON) {
      await yeniPozisyonAc();
    }
  }
}, 5000);

// ============================================================
// API ROUTE'LAR
// ============================================================
app.get('/status', (req, res) => {
  const toplamKZ = state.aktifSermaye + state.yedekKasa - state.baslangicSermaye;
  res.json({
    calisiyor: state.botCalisiyor,
    aktifSermaye: state.aktifSermaye,
    yedekKasa: state.yedekKasa,
    toplamKZ,
    pozisyonlar: state.pozisyonlar.map(p => ({
      coin: p.coin,
      tip: p.tip,
      miktar: p.miktar,
      kaldıraç: p.kaldıraç,
      karYuzde: p.karYuzde,
      karTutar: p.karTutar
    })),
    sonIslemler: state.islemGecmisi.slice(-10),
    toplamIslem: state.toplamIslem,
    kazancSayisi: state.kazancSayisi,
    kayipSayisi: state.kayipSayisi,
    maxDrawdown: (state.maxDrawdown * 100).toFixed(2),
    equityCurve: state.equityCurve,
    pnlGecmisi: state.pnlGecmisi,
    coinStats: state.coinStats,
  });
});

app.post('/start', (req, res) => {
  if (!state.botCalisiyor) {
    state.botCalisiyor = true;
    saveState(state);
    res.json({ mesaj: 'Bot başlatıldı.' });
  } else {
    res.json({ mesaj: 'Bot zaten çalışıyor.' });
  }
});

app.post('/stop', (req, res) => {
  if (state.botCalisiyor) {
    state.botCalisiyor = false;
    saveState(state);
    res.json({ mesaj: 'Bot durduruldu.' });
  } else {
    res.json({ mesaj: 'Bot zaten durdurulmuş.' });
  }
});

app.get('/rapor', (req, res) => {
  let rapor = '=== VUR KAÇ BOT RAPORU ===\n';
  rapor += `Tarih: ${new Date().toLocaleString('tr-TR')}\n`;
  rapor += `Aktif Sermaye: $${state.aktifSermaye.toFixed(2)}\n`;
  rapor += `Yedek Kasa: $${state.yedekKasa.toFixed(2)}\n`;
  rapor += `Toplam K/Z: $${(state.aktifSermaye + state.yedekKasa - state.baslangicSermaye).toFixed(2)}\n`;
  rapor += `Toplam İşlem: ${state.toplamIslem}\n`;
  rapor += `Kazanma Oranı: ${state.toplamIslem > 0 ? ((state.kazancSayisi / state.toplamIslem) * 100).toFixed(1) + '%' : '—'}\n`;
  rapor += `Max Drawdown: ${(state.maxDrawdown * 100).toFixed(2)}%\n\n`;
  rapor += '--- AÇIK POZİSYONLAR ---\n';
  if (state.pozisyonlar.length === 0) rapor += 'Yok\n';
  else {
    for (const p of state.pozisyonlar) {
      rapor += `${p.tip} ${p.coin} | $${p.miktar.toFixed(2)} | ${p.kaldıraç}x | K/Z: ${p.karTutar >= 0 ? '+' : ''}$${p.karTutar.toFixed(2)}\n`;
    }
  }
  rapor += '\n--- SON İŞLEMLER ---\n';
  if (state.islemGecmisi.length === 0) rapor += 'Henüz işlem yok\n';
  else {
    for (const is of state.islemGecmisi.slice(-20).reverse()) {
      rapor += `${is.coin} ${is.tip} | ${is.neden} | ${is.kar >= 0 ? '+' : ''}$${is.kar.toFixed(2)}\n`;
    }
  }
  res.set('Content-Type', 'text/plain');
  res.send(rapor);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Bot sunucusu ${PORT} portunda çalışıyor.`);
});
