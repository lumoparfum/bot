const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');
const { getAuth } = require('firebase-admin/auth');

initializeApp();
const db = getFirestore();

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const REGION = 'europe-west1';
const LISTING_LIFETIME_DAYS = 15;

async function sendPush(pushToken, title, body, data) {
  if (!pushToken) return;
  await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ to: pushToken, title, body, data }),
  });
}

exports.onNewMessage = onDocumentCreated(
  { document: 'conversations/{conversationId}/messages/{messageId}', region: REGION },
  async (event) => {
    const message = event.data?.data();
    if (!message) return;

    const { conversationId } = event.params;
    const conversationSnap = await db.doc(`conversations/${conversationId}`).get();
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
  }
);

exports.onNewFavorite = onDocumentCreated(
  { document: 'users/{userId}/favorites/{listingId}', region: REGION },
  async (event) => {
    const { userId, listingId } = event.params;
    const listingSnap = await db.doc(`listings/${listingId}`).get();
    const listing = listingSnap.data();
    if (!listing || listing.sellerId === userId) return;

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

exports.onNewListingMatchSavedSearches = onDocumentCreated(
  { document: 'listings/{listingId}', region: REGION },
  async (event) => {
    const listing = event.data?.data();
    if (!listing) return;
    const { listingId } = event.params;

    const searchesSnap = await db.collection('savedSearches').get();
    if (searchesSnap.empty) return;

    const title = (listing.title ?? '').toLocaleLowerCase('tr-TR');
    const description = (listing.description ?? '').toLocaleLowerCase('tr-TR');

    const matches = searchesSnap.docs.filter((docSnap) => {
      const search = docSnap.data();
      if (search.uid === listing.sellerId) return false;
      if (search.query) {
        const q = search.query.toLocaleLowerCase('tr-TR');
        if (!title.includes(q) && !description.includes(q)) return false;
      }
      if (search.category && search.category !== listing.category) return false;
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
