import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { subscribeToConversations } from '../services/chat';
import type { Conversation } from '../types/chat';

type MessagesContextValue = {
  conversations: Conversation[];
  totalUnread: number;
};

const MessagesContext = createContext<MessagesContextValue | undefined>(undefined);

export function MessagesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    if (!user) {
      setConversations([]);
      return;
    }
    const unsubscribe = subscribeToConversations(user.uid, setConversations);
    return unsubscribe;
  }, [user]);

  const totalUnread = useMemo(
    () => conversations.reduce((sum, c) => sum + (user ? c.unreadCount[user.uid] ?? 0 : 0), 0),
    [conversations, user]
  );

  const value = useMemo<MessagesContextValue>(
    () => ({ conversations, totalUnread }),
    [conversations, totalUnread]
  );

  return <MessagesContext.Provider value={value}>{children}</MessagesContext.Provider>;
}

export function useMessages() {
  const ctx = useContext(MessagesContext);
  if (!ctx) {
    throw new Error('useMessages must be used within a MessagesProvider');
  }
  return ctx;
}
