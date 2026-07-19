const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp();
const db = getFirestore();

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

exports.onNewMessage = onDocumentCreated(
  'conversations/{conversationId}/messages/{messageId}',
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

    const recipientSnap = await db.doc(`users/${recipientId}`).get();
    const pushToken = recipientSnap.data()?.pushToken;
    if (!pushToken) return;

    await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        to: pushToken,
        title: senderName || 'Stop82',
        body: message.text,
        data: {
          conversationId,
          otherUserId: message.senderId,
          otherUserName: senderName,
          otherUserPhoto:
            message.senderId === conversation.buyerId
              ? conversation.buyerPhotoURL
              : conversation.sellerPhotoURL,
          listingTitle: conversation.listingTitle,
        },
      }),
    });
  }
);
