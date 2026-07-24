// Paylasilan ilan linkleri (bkz. ListingDetailScreen.tsx handleShare) buraya
// gelir: stop82.com/ilan/{id} -> vercel.json rewrite ile bu fonksiyona
// yonlendiriliyor. Meilisearch'teki AYNI public search-key (arama disinda
// hicbir yetkisi yok, istemci uygulamada da acikca kullaniliyor) ile ilani
// sunucu tarafinda cekip, WhatsApp/Facebook gibi platformlarin link
// onizlemesinde gercek fotograf/baslik/fiyat gorunmesi icin dogru og: meta
// etiketleriyle bir HTML sayfasi donduruyoruz. Uygulama henuz Universal
// Links (native, ayri bir build gerektiriyor) kurulu olmadigi icin "Uygulamada
// Ac" butonu su an ozel URL scheme (stop82://) kullaniyor - bu, gercek bir
// tiklanan link uzerinden calisir (WhatsApp METIN icine yapistirilinca degil,
// bu sayfadaki gercek <a> etiketi uzerinden).
const MEILI_HOST = 'https://search.stop82.com';
const MEILI_SEARCH_KEY = 'ec7836634550a79fa6564ff6d32d0f6df9b7e80940152d841526158011a8ba73';
const APP_STORE_URL = 'https://apps.apple.com/tr/app/stop82/id6793069111';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatPrice(price) {
  const n = Number(price) || 0;
  return `${n.toLocaleString('tr-TR')} ₺`;
}

// WhatsApp/Facebook'un onizleme kirtayicisi og:image:width/height verilmezse
// (ozellikle dikey/portre fotograflarda - urun fotograflari genelde boyle)
// bazen resmi hic gostermiyor, sessizce metne dusuyor. Tam resim
// kutuphanesi eklemek yerine JPEG/PNG boyutunu dosyanin kendi
// baslik baytlarindan okuyoruz - kucuk ve bagimliliksiz.
function readImageDimensions(buffer) {
  try {
    if (buffer[0] === 0xff && buffer[1] === 0xd8) {
      // JPEG: SOF (Start Of Frame) marker'ini tara
      let offset = 2;
      while (offset < buffer.length) {
        if (buffer[offset] !== 0xff) break;
        const marker = buffer[offset + 1];
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
          const height = buffer.readUInt16BE(offset + 5);
          const width = buffer.readUInt16BE(offset + 7);
          return { width, height, type: 'image/jpeg' };
        }
        const segmentLength = buffer.readUInt16BE(offset + 2);
        offset += 2 + segmentLength;
      }
    } else if (buffer[0] === 0x89 && buffer[1] === 0x50) {
      // PNG: IHDR her zaman sabit ofsette
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      return { width, height, type: 'image/png' };
    }
  } catch {
    // sessizce yut - asagida width/height olmadan devam eder
  }
  return null;
}

function pageShell({ title, description, image, imageMeta, url, bodyHtml }) {
  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta name="theme-color" content="#1A2238" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Stop82" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(image)}" />
  <meta property="og:image:secure_url" content="${escapeHtml(image)}" />
  ${imageMeta ? `<meta property="og:image:width" content="${imageMeta.width}" />
  <meta property="og:image:height" content="${imageMeta.height}" />
  <meta property="og:image:type" content="${imageMeta.type}" />` : ''}
  <meta property="og:url" content="${escapeHtml(url)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(image)}" />
  <link rel="icon" type="image/png" href="/assets/favicon-96x96.png" sizes="96x96" />
  <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg" />
  <link rel="shortcut icon" href="/assets/favicon.ico" />
  <link rel="apple-touch-icon" sizes="180x180" href="/assets/apple-touch-icon.png" />
  <style>
    :root {
      --primary: #FF6B35; --primary-dark: #E24E17; --navy: #1A2238;
      --background: #FFFFFF; --surface: #F6F7FB; --border: #E7E8EE;
      --text: #1A2238; --text-muted: #6B7280;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0; background: var(--surface); color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .wrap { max-width: 560px; margin: 0 auto; padding: 20px 16px 48px; }
    .wordmark { font-size: 20px; font-weight: 800; color: var(--navy); text-decoration: none; display: inline-block; margin-bottom: 20px; }
    .wordmark span { color: var(--primary); }
    .card { background: var(--background); border-radius: 20px; overflow: hidden; border: 1px solid var(--border); box-shadow: 0 6px 24px rgba(26,34,56,0.08); }
    .card img { width: 100%; aspect-ratio: 4/3; object-fit: cover; display: block; background: var(--surface); }
    .card-body { padding: 20px; }
    .price { font-size: 28px; font-weight: 800; color: var(--navy); margin: 0 0 4px; }
    .title { font-size: 17px; font-weight: 600; margin: 0 0 10px; color: var(--text); }
    .meta { font-size: 13px; color: var(--text-muted); margin: 0 0 16px; }
    .desc { font-size: 14px; line-height: 1.6; color: var(--text-muted); white-space: pre-line; margin: 0; }
    .cta-row { margin-top: 24px; display: flex; flex-direction: column; gap: 10px; }
    .btn { display: block; text-align: center; padding: 14px 20px; border-radius: 999px; font-weight: 700; font-size: 15px; text-decoration: none; }
    .btn-primary { background: var(--primary); color: #fff; }
    .btn-outline { background: #fff; color: var(--navy); border: 1px solid var(--border); }
    .empty { text-align: center; padding: 60px 20px; color: var(--text-muted); }
  </style>
</head>
<body>
  <div class="wrap">
    <a class="wordmark" href="/">Stop<span>82</span></a>
    ${bodyHtml}
  </div>
</body>
</html>`;
}

module.exports = async function handler(req, res) {
  const { id } = req.query;
  const canonicalUrl = `https://stop82.com/ilan/${encodeURIComponent(id)}`;

  let listing = null;
  try {
    const meiliRes = await fetch(`${MEILI_HOST}/indexes/listings/search`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${MEILI_SEARCH_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: '', filter: `id = "${id}"`, limit: 1 }),
    });
    const data = await meiliRes.json();
    listing = (data.hits && data.hits[0]) || null;
  } catch {
    listing = null;
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  if (!listing) {
    res.status(404).send(
      pageShell({
        title: 'İlan bulunamadı — Stop82',
        description: 'Bu ilan kaldırılmış ya da artık mevcut değil.',
        image: 'https://stop82.com/assets/icon.png',
        url: canonicalUrl,
        bodyHtml: `
          <div class="empty">
            <p>Bu ilan kaldırılmış ya da artık mevcut değil.</p>
            <div class="cta-row">
              <a class="btn btn-primary" href="${APP_STORE_URL}">Stop82'yi İndir</a>
            </div>
          </div>`,
      })
    );
    return;
  }

  const image = listing.images && listing.images[0] ? listing.images[0] : 'https://stop82.com/assets/icon.png';
  const title = `${listing.title} - ${formatPrice(listing.price)}`;
  const description = listing.description
    ? listing.description.slice(0, 180)
    : `${listing.locationLabel || ''} konumunda, Stop82'de ücretsiz ilan.`;

  let imageMeta = null;
  try {
    const imgRes = await fetch(image);
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    imageMeta = readImageDimensions(buffer);
  } catch {
    imageMeta = null;
  }
  const appLink = `stop82://ilan/${encodeURIComponent(id)}`;

  const bodyHtml = `
    <div class="card">
      <img src="${escapeHtml(image)}" alt="${escapeHtml(listing.title)}" />
      <div class="card-body">
        <p class="price">${escapeHtml(formatPrice(listing.price))}</p>
        <h1 class="title">${escapeHtml(listing.title)}</h1>
        <p class="meta">${escapeHtml(listing.locationLabel || '')}${listing.status === 'sold' ? ' &middot; Satıldı' : ''}</p>
        ${listing.description ? `<p class="desc">${escapeHtml(listing.description)}</p>` : ''}
      </div>
    </div>
    <div class="cta-row">
      <a class="btn btn-primary" href="${appLink}">Uygulamada Aç</a>
      <a class="btn btn-outline" href="${APP_STORE_URL}">Stop82'yi İndir</a>
    </div>`;

  res.status(200).send(
    pageShell({
      title,
      description,
      image,
      imageMeta,
      url: canonicalUrl,
      bodyHtml,
    })
  );
};
