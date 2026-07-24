const { onDocumentCreated, onDocumentDeleted, onDocumentUpdated, onDocumentWritten } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');
const { getAuth } = require('firebase-admin/auth');
const https = require('https');

initializeApp();
const db = getFirestore();

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const REGION = 'europe-west1';
const LISTING_LIFETIME_DAYS = 35;

// Kendi VPS'imizde barindirilan Meilisearch - Firestore tum ilanlari
// sinirsiz cekmeye devam etmemesi icin (bkz. performans incelemesi),
// gezinme/arama artik bu index uzerinden, sayfali sekilde yapiliyor.
// Master key sadece burada (sunucu tarafinda, secret olarak) kullanilir -
// istemci uygulama sadece "search" yetkili ayri bir anahtar kullanir.
const MEILI_HOST = 'https://search.stop82.com';
const MEILI_MASTER_KEY = defineSecret('MEILI_MASTER_KEY');

// NOT: burada bilerek global fetch() DEGIL Node'un https modulu kullanildi -
// fetch ile Turkce (i, s, g, u, o, c) gibi UTF-8 coklu-byte karakterler
// Meilisearch'e bozuk gidiyordu (Content-Length string.length'e gore
// hesaplaniyor olabilir, byte uzunluguna gore degil). asc-api.js/play-api.js
// scriptlerinde zaten kanitlanmis olan bu desen (acik Content-Length ile
// https.request) sorunu cozuyor.
function meiliRequest(path, method, apiKey, body) {
  return new Promise((resolve, reject) => {
    const data = body ? Buffer.from(JSON.stringify(body), 'utf-8') : null;
    const req = https.request(
      {
        hostname: 'search.stop82.com',
        path,
        method,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          ...(data ? { 'Content-Length': data.length } : {}),
        },
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const bodyText = Buffer.concat(chunks).toString('utf-8');
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(bodyText ? JSON.parse(bodyText) : null);
          } else {
            reject(new Error(`Meilisearch ${method} ${path} -> ${res.statusCode}: ${bodyText}`));
          }
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function listingToMeiliDoc(id, listing) {
  const doc = {
    id,
    title: listing.title ?? '',
    description: listing.description ?? '',
    category: listing.category ?? '',
    subcategory: listing.subcategory ?? '',
    condition: listing.condition ?? '',
    price: listing.price ?? 0,
    locationLabel: listing.location?.label ?? '',
    // Sehir-sadece filtresi (radius secilmedigi "Tumu" durumu) icin ayri bir
    // alan: locationLabel "Ilce, Sehir" gibi tam adresi tutuyor, istemci
    // tarafinda da AYNI mantikla (son virgulden sonraki parca) hesaplanan bu
    // deger olmadan `locationLabel = "Bafra"` gibi bir esitlik filtresi,
    // deger "Bafra, Bafra" oldugu icin HICBIR ZAMAN eslesmiyordu.
    city: (listing.location?.label ?? '').split(',').pop()?.trim() ?? '',
    sellerId: listing.sellerId ?? '',
    sellerName: listing.sellerName ?? '',
    sellerPhotoURL: listing.sellerPhotoURL ?? null,
    images: listing.images ?? [],
    status: listing.status ?? 'active',
    soldTo: listing.soldTo ?? null,
    createdAt: listing.createdAt instanceof Timestamp ? listing.createdAt.toMillis() : Date.now(),
    viewCount: listing.viewCount ?? 0,
    favoriteCount: listing.favoriteCount ?? 0,
    priceHistory: Array.isArray(listing.priceHistory) ? listing.priceHistory : [],
    attributes: listing.attributes ?? {},
    attributesText: Object.values(listing.attributes ?? {}).join(' '),
  };
  // Meilisearch'in _geoRadius/_geoPoint siralamasi icin - konum secilmemis
  // ilanlarda (latitude/longitude yok) bu alan hic yazilmaz.
  if (listing.location?.latitude != null && listing.location?.longitude != null) {
    doc._geo = { lat: listing.location.latitude, lng: listing.location.longitude };
  }
  return doc;
}

async function sendPush(pushToken, title, body, data) {
  if (!pushToken) return;
  try {
    await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        to: pushToken,
        title,
        body,
        data,
        sound: 'default',
        channelId: 'default',
        priority: 'high',
      }),
    });
  } catch {
    // Push bildirimi best-effort bir yan etki - basarisiz olursa (Expo API
    // gecici kesinti vb.) cagiran fonksiyondaki asil islevi (bildirim kaydi,
    // yanit orani takibi vb.) engellememeli.
  }
}

exports.onNewMessage = onDocumentCreated(
  { document: 'conversations/{conversationId}/messages/{messageId}', region: REGION },
  async (event) => {
    const message = event.data?.data();
    if (!message) return;

    const { conversationId } = event.params;
    const conversationRef = db.doc(`conversations/${conversationId}`);
    const conversationSnap = await conversationRef.get();
    const conversation = conversationSnap.data();
    if (!conversation) return;

    const recipientId = conversation.participantIds.find((id) => id !== message.senderId);
    if (!recipientId) return;

    const senderName =
      message.senderId === conversation.buyerId ? conversation.buyerName : conversation.sellerName;
    const senderPhoto =
      message.senderId === conversation.buyerId
        ? conversation.buyerPhotoURL
        : conversation.sellerPhotoURL;

    await db.collection('users').doc(recipientId).collection('notifications').add({
      type: 'message',
      title: senderName || 'Stop82',
      body: message.text,
      listingId: conversation.listingId ?? null,
      listingImage: conversation.listingImage ?? null,
      conversationId,
      fromUserId: message.senderId,
      fromUserName: senderName || 'Stop82 Kullanıcısı',
      fromUserPhoto: senderPhoto ?? null,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });

    const recipientSnap = await db.doc(`users/${recipientId}`).get();
    await sendPush(recipientSnap.data()?.pushToken, senderName || 'Stop82', message.text, {
      conversationId,
      otherUserId: message.senderId,
      otherUserName: senderName,
      otherUserPhoto: senderPhoto ?? null,
      listingTitle: conversation.listingTitle,
    });

    // Yanit orani/suresi takibi: satici profilinde "genelde X icinde
    // yanitliyor" rozeti icin - sadece ilan sahibinin (seller) alicinin ilk
    // mesajina verdigi ilk yanit olculur, sonraki mesajlar sayilmaz.
    // Transaction icinde: alici arka arkaya hizli iki mesaj gonderirse (ör.
    // hazir cevap cipine cift dokunma), iki tetikleyici ayni anda calisip
    // ikisi de "firstBuyerMessageAt henuz yok" gorup contactedCount'u iki kez
    // artirabilirdi - bu da saticinin yanit oranini haksiz yere dusururdu.
    if (conversation.sellerId && conversation.buyerId) {
      if (message.senderId === conversation.buyerId) {
        await db
          .runTransaction(async (tx) => {
            const snap = await tx.get(conversationRef);
            const conv = snap.data();
            if (!conv || conv.firstBuyerMessageAt) return;
            tx.update(conversationRef, { firstBuyerMessageAt: message.createdAt });
            tx.set(
              db.doc(`users/${conversation.sellerId}`),
              { contactedCount: FieldValue.increment(1) },
              { merge: true }
            );
          })
          .catch(() => {});
      } else if (message.senderId === conversation.sellerId) {
        await db
          .runTransaction(async (tx) => {
            const snap = await tx.get(conversationRef);
            const conv = snap.data();
            if (!conv || !conv.firstBuyerMessageAt || conv.sellerResponded) return;
            const firstMs = conv.firstBuyerMessageAt.toMillis();
            const replyMs = message.createdAt.toMillis();
            const diffMinutes = Math.max(0, Math.round((replyMs - firstMs) / 60000));
            tx.update(conversationRef, { sellerResponded: true });
            tx.set(
              db.doc(`users/${conversation.sellerId}`),
              {
                responseCount: FieldValue.increment(1),
                responseTimeTotalMinutes: FieldValue.increment(diffMinutes),
              },
              { merge: true }
            );
          })
          .catch(() => {});
      }
    }
  }
);

exports.onNewFavorite = onDocumentCreated(
  { document: 'users/{userId}/favorites/{listingId}', region: REGION },
  async (event) => {
    const { userId, listingId } = event.params;
    const listingRef = db.doc(`listings/${listingId}`);
    const listingSnap = await listingRef.get();
    const listing = listingSnap.data();
    if (!listing) return;

    await listingRef.update({ favoriteCount: FieldValue.increment(1) }).catch(() => {});

    if (listing.sellerId === userId) return;

    const raterSnap = await db.doc(`users/${userId}`).get();
    const rater = raterSnap.data();
    const raterName = rater?.displayName ?? 'Bir Stop82 kullanıcısı';

    await db.collection('users').doc(listing.sellerId).collection('notifications').add({
      type: 'favorite',
      title: raterName,
      body: `"${listing.title}" ilanını beğendi`,
      listingId,
      listingImage: listing.images?.[0] ?? null,
      conversationId: null,
      fromUserId: userId,
      fromUserName: raterName,
      fromUserPhoto: rater?.photoURL ?? null,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });

    const sellerSnap = await db.doc(`users/${listing.sellerId}`).get();
    await sendPush(
      sellerSnap.data()?.pushToken,
      raterName,
      `"${listing.title}" ilanını beğendi`,
      { listingId }
    );
  }
);

exports.onFavoriteRemoved = onDocumentDeleted(
  { document: 'users/{userId}/favorites/{listingId}', region: REGION },
  async (event) => {
    const { listingId } = event.params;
    const listingRef = db.doc(`listings/${listingId}`);
    // Duz FieldValue.increment(-1) kullanilirsa, Cloud Functions'in "en az
    // bir kez" teslimat garantisi yuzunden bu fonksiyon retry ile iki kez
    // calisirsa favoriteCount gercek degerden dusuk/negatif kalabilir.
    // Transaction icinde 0'in altina dusmeyecek sekilde clamp'liyoruz.
    await db
      .runTransaction(async (tx) => {
        const snap = await tx.get(listingRef);
        if (!snap.exists) return;
        const current = snap.data().favoriteCount ?? 0;
        tx.update(listingRef, { favoriteCount: Math.max(0, current - 1) });
      })
      .catch(() => {});
  }
);

// Favorilere eklenen bir ilanin fiyati dusunce, favorileyen herkese haber
// verilir - Dolap'ta da benzer bir "begеndigin urune teklif ver, firsati
// kacirma" mantigi var. listingId alani favorites dokumanlarina ayrica
// yazildigi icin (bkz. firestore.ts setFavorite) collection group sorgusuyla
// "bu ilani kimler favoriledi" bulunabiliyor.
exports.onListingPriceDrop = onDocumentUpdated(
  { document: 'listings/{listingId}', region: REGION },
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    if (!before || !after) return;
    if (typeof before.price !== 'number' || typeof after.price !== 'number') return;
    if (after.price >= before.price) return;

    const { listingId } = event.params;
    const favoritesSnap = await db.collectionGroup('favorites').where('listingId', '==', listingId).get();
    if (favoritesSnap.empty) return;

    const body = `"${after.title}" fiyatı ₺${before.price.toLocaleString('tr-TR')}'den ₺${after.price.toLocaleString('tr-TR')}'ye düştü!`;

    await Promise.all(
      favoritesSnap.docs.map(async (favDoc) => {
        const userId = favDoc.ref.parent.parent?.id;
        if (!userId || userId === after.sellerId) return;

        await db.collection('users').doc(userId).collection('notifications').add({
          type: 'priceDrop',
          title: 'Favorilediğin ilanda fiyat düştü',
          body,
          listingId,
          listingImage: after.images?.[0] ?? null,
          conversationId: null,
          fromUserId: after.sellerId ?? null,
          fromUserName: after.sellerName ?? 'Stop82',
          fromUserPhoto: after.sellerPhotoURL ?? null,
          read: false,
          createdAt: FieldValue.serverTimestamp(),
        });

        const userSnap = await db.doc(`users/${userId}`).get();
        await sendPush(userSnap.data()?.pushToken, 'Favorilediğin ilanda fiyat düştü', body, { listingId });
      })
    );
  }
);

exports.onNewListingMatchSavedSearches = onDocumentCreated(
  { document: 'listings/{listingId}', region: REGION },
  async (event) => {
    const listing = event.data?.data();
    if (!listing) return;
    const { listingId } = event.params;

    // Tum kayitli aramalari sinirsiz cekmek yerine (olcek buyudukce
    // pahali/yavas) sadece bu ilanin kategorisiyle eslesebilecekleri
    // sorguluyoruz: kategori belirtmemis (tum kategorilerde arayan)
    // aramalar + tam bu kategoriyi belirtenler.
    const [categorylessSnap, categorySnap] = await Promise.all([
      db.collection('savedSearches').where('category', '==', null).get(),
      listing.category
        ? db.collection('savedSearches').where('category', '==', listing.category).get()
        : Promise.resolve(null),
    ]);
    const searchDocs = categorySnap
      ? [...categorylessSnap.docs, ...categorySnap.docs]
      : categorylessSnap.docs;
    if (searchDocs.length === 0) return;

    const title = (listing.title ?? '').toLocaleLowerCase('tr-TR');
    const description = (listing.description ?? '').toLocaleLowerCase('tr-TR');

    const matches = searchDocs.filter((docSnap) => {
      const search = docSnap.data();
      if (search.uid === listing.sellerId) return false;
      if (search.query) {
        const q = search.query.toLocaleLowerCase('tr-TR');
        if (!title.includes(q) && !description.includes(q)) return false;
      }
      if (search.category && search.category !== listing.category) return false;
      if (search.subcategory && search.subcategory !== listing.subcategory) return false;
      if (search.attributes) {
        const listingAttrs = listing.attributes || {};
        for (const key of Object.keys(search.attributes)) {
          if (listingAttrs[key] !== search.attributes[key]) return false;
        }
      }
      if (search.minPrice != null && listing.price < search.minPrice) return false;
      if (search.maxPrice != null && listing.price > search.maxPrice) return false;
      return true;
    });

    // Ayni kullanici birden fazla eslesen aramaya sahipse tek bildirim yeterli.
    const notifiedUids = new Set();

    await Promise.all(
      matches.map(async (docSnap) => {
        const search = docSnap.data();
        if (notifiedUids.has(search.uid)) return;
        notifiedUids.add(search.uid);

        await db.collection('users').doc(search.uid).collection('notifications').add({
          type: 'savedSearch',
          title: 'Kayıtlı aramanla eşleşen yeni ilan',
          body: listing.title,
          listingId,
          listingImage: listing.images?.[0] ?? null,
          conversationId: null,
          fromUserId: listing.sellerId,
          fromUserName: listing.sellerName ?? 'Stop82',
          fromUserPhoto: listing.sellerPhotoURL ?? null,
          read: false,
          createdAt: FieldValue.serverTimestamp(),
        });

        const userSnap = await db.doc(`users/${search.uid}`).get();
        await sendPush(
          userSnap.data()?.pushToken,
          'Kayıtlı aramanla eşleşen yeni ilan',
          listing.title,
          { listingId }
        );
      })
    );
  }
);

// Profil (isim/fotograf) her ilan/sohbet olusturulurken o anki haliyle
// kopyalanip saklanir (performans icin - her goruntulemede users/{uid}'yi
// ayrica okumaya gerek kalmaz). Kullanici sonradan adini/fotografini
// degistirirse bu kopyalar guncel kalsin diye buradan senkronize edilir.
exports.onUserProfileUpdated = onDocumentUpdated(
  { document: 'users/{userId}', region: REGION },
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    if (!before || !after) return;
    const { userId } = event.params;

    const nameChanged = before.displayName !== after.displayName;
    const photoChanged = before.photoURL !== after.photoURL;
    if (!nameChanged && !photoChanged) return;

    const newName = after.displayName ?? 'Stop82 Kullanıcısı';
    const newPhoto = after.photoURL ?? null;

    const listingsSnap = await db.collection('listings').where('sellerId', '==', userId).get();
    await Promise.all(
      listingsSnap.docs.map((docSnap) =>
        docSnap.ref.update({ sellerName: newName, sellerPhotoURL: newPhoto }).catch(() => {})
      )
    );

    const sellerConvosSnap = await db.collection('conversations').where('sellerId', '==', userId).get();
    await Promise.all(
      sellerConvosSnap.docs.map((docSnap) =>
        docSnap.ref.update({ sellerName: newName, sellerPhotoURL: newPhoto }).catch(() => {})
      )
    );

    const buyerConvosSnap = await db.collection('conversations').where('buyerId', '==', userId).get();
    await Promise.all(
      buyerConvosSnap.docs.map((docSnap) =>
        docSnap.ref.update({ buyerName: newName, buyerPhotoURL: newPhoto }).catch(() => {})
      )
    );
  }
);

// ratingSum/ratingCount, kullanicinin toplam puanini istemciden dogrudan
// yazilamayacak sekilde (bkz. firestore.rules) sadece burada, Admin SDK ile
// yeniden hesaplanir - aksi halde teknik bilgisi olan biri kendi
// hesabinin/arkadasinin puanini dogrudan Firestore'a yazip sahte 5 yildiz
// verebilirdi. Tum reviews alt koleksiyonu yeniden toplanip yazilir, boylece
// tekil artis/azalis mantigindaki olasi sapmalar (race condition vb.) de
// kendiliginden duzelir.
exports.onReviewWritten = onDocumentWritten(
  { document: 'users/{userId}/reviews/{raterId}', region: REGION },
  async (event) => {
    const { userId } = event.params;
    const reviewsSnap = await db.collection('users').doc(userId).collection('reviews').get();
    let ratingSum = 0;
    reviewsSnap.forEach((docSnap) => {
      ratingSum += docSnap.data().rating ?? 0;
    });
    await db
      .doc(`users/${userId}`)
      .update({ ratingSum, ratingCount: reviewsSnap.size })
      .catch(() => {});
  }
);

// Stop82 ekibi Firebase Console'dan bir isletme basvurusunun status alanini
// 'approved' veya 'rejected' yaptiginda, kullanicinin accountType'i otomatik
// senkronize edilir - ayri bir manuel adima gerek kalmaz.
exports.onBusinessRequestReviewed = onDocumentUpdated(
  { document: 'businessRequests/{requestId}', region: REGION },
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    if (!before || !after || before.status === after.status) return;

    if (after.status === 'approved') {
      await db.doc(`users/${after.uid}`).set({ accountType: 'business' }, { merge: true });
    } else if (after.status === 'rejected') {
      await db.doc(`users/${after.uid}`).set({ accountType: 'individual' }, { merge: true });
    }

    await db.collection('users').doc(after.uid).collection('notifications').add({
      type: 'business',
      title: after.status === 'approved' ? 'İşletme başvurun onaylandı' : 'İşletme başvurun reddedildi',
      body:
        after.status === 'approved'
          ? `"${after.companyName}" için işletme rozeti profilinde aktif.`
          : `"${after.companyName}" başvurusu onaylanmadı.`,
      listingId: null,
      listingImage: null,
      conversationId: null,
      fromUserId: null,
      fromUserName: 'Stop82',
      fromUserPhoto: null,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });
  }
);

exports.deleteAccount = onCall({ region: REGION }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Önce giriş yapmalısın.');

  const bucket = getStorage().bucket();

  // Kullanicinin ilanlarini ve fotograflarini sil.
  const listingsSnap = await db.collection('listings').where('sellerId', '==', uid).get();
  await Promise.all(
    listingsSnap.docs.map(async (docSnap) => {
      await bucket.deleteFiles({ prefix: `listings/${docSnap.id}/` }).catch(() => {});
      await docSnap.ref.delete();
    })
  );

  // Profil fotografini da sil - aksi halde storage'da sahipsiz bir dosya kalir.
  await bucket.deleteFiles({ prefix: `avatars/${uid}/` }).catch(() => {});

  // Kayitli aramalarini sil.
  const searchesSnap = await db.collection('savedSearches').where('uid', '==', uid).get();
  await Promise.all(searchesSnap.docs.map((docSnap) => docSnap.ref.delete()));

  // Profil belgesini (favoriler, aldigi degerlendirmeler, bildirimler,
  // contacts dahil) recursive olarak sil.
  await db.recursiveDelete(db.doc(`users/${uid}`));

  // En son kimlik dogrulama hesabini sil - bundan sonra tekrar giris yapamaz.
  await getAuth().deleteUser(uid);

  return { success: true };
});

exports.cleanupExpiredListings = onSchedule(
  { schedule: 'every 24 hours', region: REGION },
  async () => {
    const cutoff = Timestamp.fromMillis(Date.now() - LISTING_LIFETIME_DAYS * 24 * 60 * 60 * 1000);
    const snapshot = await db.collection('listings').where('createdAt', '<', cutoff).get();
    if (snapshot.empty) return;

    const bucket = getStorage().bucket();
    await Promise.all(
      snapshot.docs.map(async (docSnap) => {
        await bucket.deleteFiles({ prefix: `listings/${docSnap.id}/` }).catch(() => {});
        await docSnap.ref.delete();
      })
    );
  }
);

// Android'de "Apple ile Giris" native degil, tarayici tabaninda calisir:
// Apple, kullanici onayladiktan sonra sonucu bu adrese POST eder (form_post
// - id_token/ad-soyad bilgisi icerdigi icin Apple bunu URL'de degil govdede
// gondermeyi zorunlu kiliyor). Biz de bunu uygulamanin kendi ozel linkine
// (stop82://) yonlendirip geri app'e teslim ediyoruz - authService.ts'teki
// signInWithAppleAndroid bu linki WebBrowser.openAuthSessionAsync ile yakalar.
exports.appleAuthCallback = onRequest({ region: REGION }, (req, res) => {
  const body = req.body || {};
  const params = new URLSearchParams();
  if (body.id_token) params.set('id_token', body.id_token);
  if (body.code) params.set('code', body.code);
  if (body.state) params.set('state', body.state);
  if (body.user) params.set('user', body.user);
  res.redirect(302, `stop82://auth-callback?${params.toString()}`);
});

// Meilisearch senkronizasyonu: bir ilan olusturulunca/guncellenince/silinince
// arama indeksindeki kopyasi otomatik guncellenir - istemci artik Firestore'dan
// tum ilanlari degil, buradan sayfali/aranabilir sekilde okuyor.
exports.onListingCreatedSyncSearch = onDocumentCreated(
  { document: 'listings/{listingId}', region: REGION, secrets: [MEILI_MASTER_KEY] },
  async (event) => {
    const listing = event.data?.data();
    if (!listing) return;
    const { listingId } = event.params;
    await meiliRequest('/indexes/listings/documents', 'POST', MEILI_MASTER_KEY.value(), [
      listingToMeiliDoc(listingId, listing),
    ]).catch((err) => console.error('Meili sync (create) basarisiz:', err.message));
  }
);

exports.onListingUpdatedSyncSearch = onDocumentUpdated(
  { document: 'listings/{listingId}', region: REGION, secrets: [MEILI_MASTER_KEY] },
  async (event) => {
    const listing = event.data?.after?.data();
    if (!listing) return;
    const { listingId } = event.params;
    await meiliRequest('/indexes/listings/documents', 'POST', MEILI_MASTER_KEY.value(), [
      listingToMeiliDoc(listingId, listing),
    ]).catch((err) => console.error('Meili sync (update) basarisiz:', err.message));
  }
);

exports.onListingDeletedSyncSearch = onDocumentDeleted(
  { document: 'listings/{listingId}', region: REGION, secrets: [MEILI_MASTER_KEY] },
  async (event) => {
    const { listingId } = event.params;
    await meiliRequest(`/indexes/listings/documents/${listingId}`, 'DELETE', MEILI_MASTER_KEY.value()).catch(
      (err) => console.error('Meili sync (delete) basarisiz:', err.message)
    );
  }
);

