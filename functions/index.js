const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');

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
