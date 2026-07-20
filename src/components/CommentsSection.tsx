import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing, typography, type ColorPalette } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useRequireAuth } from '../hooks/useRequireAuth';
import {
  addComment,
  containsBannedWord,
  deleteOwnComment,
  hideComment,
  subscribeToComments,
} from '../services/comments';
import { submitReport } from '../services/reports';
import { formatRelativeDate } from '../utils/format';
import { showAlert } from './AppAlert';
import { ReportModal } from './ReportModal';
import type { ListingComment } from '../types/comment';

const MIN_SECONDS_BETWEEN_COMMENTS = 15;

type Props = {
  listingId: string;
  listingSellerId: string;
};

export function CommentsSection({ listingId, listingSellerId }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user } = useAuth();
  const requireAuth = useRequireAuth();

  const [comments, setComments] = useState<ListingComment[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [reportTarget, setReportTarget] = useState<ListingComment | null>(null);
  const lastSentAt = useRef(0);

  useEffect(() => {
    const unsubscribe = subscribeToComments(listingId, setComments);
    return unsubscribe;
  }, [listingId]);

  const isListingOwner = user?.uid === listingSellerId;

  const handleSend = async () => {
    if (!requireAuth() || !user) return;
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    if (containsBannedWord(trimmed)) {
      showAlert('Uygun Olmayan İçerik', 'Yorumun uygunsuz kelimeler içeriyor, lütfen düzenle.');
      return;
    }
    const secondsSinceLast = (Date.now() - lastSentAt.current) / 1000;
    if (secondsSinceLast < MIN_SECONDS_BETWEEN_COMMENTS) {
      showAlert('Yavaş Ol', 'Çok hızlı yorum gönderiyorsun, birkaç saniye bekle.');
      return;
    }

    setSending(true);
    try {
      await addComment(listingId, user.uid, user.displayName ?? 'Stop82 Kullanıcısı', user.photoURL, trimmed);
      lastSentAt.current = Date.now();
      setText('');
    } catch {
      showAlert('Hata', 'Yorum gönderilemedi, tekrar dene.');
    } finally {
      setSending(false);
    }
  };

  const handleHide = (comment: ListingComment) => {
    showAlert('Yorumu Gizle', 'Bu yorum ilanda kimseye gösterilmeyecek. Emin misin?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Gizle',
        style: 'destructive',
        onPress: () =>
          hideComment(listingId, comment.id).catch(() =>
            showAlert('Hata', 'Yorum gizlenemedi, tekrar dene.')
          ),
      },
    ]);
  };

  const handleDeleteOwn = (comment: ListingComment) => {
    showAlert('Yorumu Sil', 'Yorumunu silmek istediğine emin misin?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () =>
          deleteOwnComment(listingId, comment.id).catch(() =>
            showAlert('Hata', 'Yorum silinemedi, tekrar dene.')
          ),
      },
    ]);
  };

  const handleSubmitReport = async (reason: string) => {
    if (!user || !reportTarget) return;
    await submitReport({
      type: 'comment',
      targetId: reportTarget.id,
      targetOwnerId: reportTarget.authorId,
      reporterId: user.uid,
      reporterName: user.displayName ?? 'Stop82 Kullanıcısı',
      reason,
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Yorumlar ({comments.length})</Text>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Bir soru sor ya da yorum yaz..."
          placeholderTextColor={colors.textFaint}
          multiline
        />
        <Pressable
          style={[styles.sendButton, !text.trim() && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || sending}
        >
          <Ionicons name="send" size={16} color="#fff" />
        </Pressable>
      </View>

      {comments.length === 0 ? (
        <Text style={styles.emptyText}>Henüz yorum yok. İlk soruyu sen sor.</Text>
      ) : (
        comments.map((comment) => {
          const isOwnComment = comment.authorId === user?.uid;
          return (
            <View key={comment.id} style={styles.commentRow}>
              {comment.authorPhoto ? (
                <Image source={{ uri: comment.authorPhoto }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarFallbackText}>{comment.authorName.charAt(0)}</Text>
                </View>
              )}
              <View style={styles.commentBody}>
                <View style={styles.commentHeader}>
                  <Text style={styles.commentAuthor}>{comment.authorName}</Text>
                  <Text style={styles.commentTime}>{formatRelativeDate(comment.createdAt)}</Text>
                </View>
                <Text style={styles.commentText}>{comment.text}</Text>
                <View style={styles.commentActions}>
                  {isOwnComment && (
                    <Pressable onPress={() => handleDeleteOwn(comment)} hitSlop={6}>
                      <Text style={styles.actionText}>Sil</Text>
                    </Pressable>
                  )}
                  {isListingOwner && !isOwnComment && (
                    <Pressable onPress={() => handleHide(comment)} hitSlop={6}>
                      <Text style={styles.actionText}>Gizle</Text>
                    </Pressable>
                  )}
                  {!isOwnComment && (
                    <Pressable
                      onPress={() => {
                        if (requireAuth()) setReportTarget(comment);
                      }}
                      hitSlop={6}
                    >
                      <Text style={styles.actionTextMuted}>Şikayet Et</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            </View>
          );
        })
      )}

      <ReportModal
        visible={!!reportTarget}
        title="Yorumu Şikayet Et"
        reportType="comment"
        onClose={() => setReportTarget(null)}
        onSubmit={handleSubmitReport}
      />
    </View>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: {
      marginTop: spacing.lg,
    },
    heading: {
      ...typography.headline,
      color: colors.text,
      marginBottom: spacing.sm,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    input: {
      flex: 1,
      maxHeight: 90,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      fontSize: 14,
      color: colors.text,
    },
    sendButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendButtonDisabled: {
      opacity: 0.4,
    },
    emptyText: {
      ...typography.subhead,
      color: colors.textMuted,
    },
    commentRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    avatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.surface,
    },
    avatarFallback: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.navy,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarFallbackText: {
      color: colors.primary,
      fontWeight: '700',
      fontSize: 12,
    },
    commentBody: {
      flex: 1,
      gap: 2,
    },
    commentHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    commentAuthor: {
      ...typography.subhead,
      fontWeight: '600',
      color: colors.text,
    },
    commentTime: {
      ...typography.caption,
      color: colors.textFaint,
    },
    commentText: {
      ...typography.subhead,
      color: colors.textMuted,
    },
    commentActions: {
      flexDirection: 'row',
      gap: spacing.md,
      marginTop: 2,
    },
    actionText: {
      ...typography.caption,
      fontWeight: '600',
      color: colors.error,
    },
    actionTextMuted: {
      ...typography.caption,
      fontWeight: '600',
      color: colors.textFaint,
    },
  });
}
