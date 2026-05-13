import {
  useCallback,
  createContext,
  startTransition,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAuth } from './AuthContext.jsx';
import { useApp } from './AppContext.jsx';
import { chatService } from '../services/chatService.js';
import { summaryService } from '../services/summaryService.js';
import { createSocketConnection } from '../services/socketService.js';
import { normalizeChatCollection, upsertMessage } from '../utils/chat.js';

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const { user, token, isAuthenticated, updateCurrentUser } = useAuth();
  const { pushToast } = useApp();
  const socketRef = useRef(null);
  const [chats, setChats] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState('');
  const [messagesByChat, setMessagesByChat] = useState({});
  const [typingByChat, setTypingByChat] = useState({});
  const [onlineUserIds, setOnlineUserIds] = useState([]);
  const [isChatsLoading, setIsChatsLoading] = useState(false);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [summary, setSummary] = useState({ isOpen: false, loading: false, content: '', title: '' });

  useEffect(() => {
    if (!isAuthenticated || !token) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setChats([]);
      setSelectedChatId('');
      setMessagesByChat({});
      setOnlineUserIds([]);
      return;
    }

    const socket = createSocketConnection(token);
    socketRef.current = socket;

    socket.on('presence:list', ({ userIds }) => setOnlineUserIds(userIds));
    socket.on('presence:changed', ({ userId, isOnline }) => {
      setOnlineUserIds((current) => {
        const set = new Set(current);
        if (isOnline) {
          set.add(userId);
        } else {
          set.delete(userId);
        }
        return [...set];
      });
    });
    socket.on('message:new', ({ chat, message }) => {
      setChats((current) => normalizeChatCollection(current, chat));
      setMessagesByChat((current) => ({
        ...current,
        [chat._id]: upsertMessage(current[chat._id] || [], message),
      }));
    });
    socket.on('message:seen', ({ chatId, messageIds, seenBy, chat }) => {
      setChats((current) => normalizeChatCollection(current, chat));
      setMessagesByChat((current) => ({
        ...current,
        [chatId]: (current[chatId] || []).map((message) => (
          messageIds.includes(message._id)
            ? { ...message, seenBy, status: 'seen' }
            : message
        )),
      }));
    });
    socket.on('typing:start', ({ chatId, user }) => {
      setTypingByChat((current) => ({ ...current, [chatId]: user }));
    });
    socket.on('typing:stop', ({ chatId }) => {
      setTypingByChat((current) => ({ ...current, [chatId]: null }));
    });
    socket.on('profile:updated', ({ user: updatedUser }) => {
      if (updatedUser._id === user?._id) {
        updateCurrentUser(updatedUser);
      }
      setChats((current) => current.map((chat) => ({
        ...chat,
        participants: chat.participants.map((participant) => (
          participant._id === updatedUser._id ? updatedUser : participant
        )),
      })));
    });

    return () => socket.disconnect();
  }, [isAuthenticated, token, updateCurrentUser, user?._id]);

  const fetchChats = useCallback(async () => {
    setIsChatsLoading(true);

    try {
      const response = await chatService.getChats();
      setChats(response.chats);

      if (!selectedChatId && response.chats.length) {
        setSelectedChatId(response.chats[0]._id);
      }
    } catch (error) {
      pushToast({
        title: 'Unable to load chats',
        description: error.message,
        tone: 'danger',
      });
    } finally {
      setIsChatsLoading(false);
    }
  }, [pushToast, selectedChatId]);

  const fetchMessages = useCallback(async (chatId) => {
    if (!chatId) {
      return;
    }

    setIsMessagesLoading(true);
    socketRef.current?.emit('chat:join', { chatId });

    try {
      const response = await chatService.getMessages(chatId);
      setMessagesByChat((current) => ({ ...current, [chatId]: response.messages }));
      setChats((current) => normalizeChatCollection(current, response.chat));
    } catch (error) {
      pushToast({
        title: 'Unable to load messages',
        description: error.message,
        tone: 'danger',
      });
    } finally {
      setIsMessagesLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchChats();
    }
  }, [fetchChats, isAuthenticated]);

  useEffect(() => {
    if (selectedChatId) {
      fetchMessages(selectedChatId);
    }
  }, [fetchMessages, selectedChatId]);

  const startDirectChat = useCallback(async (participantId) => {
    const response = await chatService.createOrGetChat({ participantId });
    setChats((current) => normalizeChatCollection(current, response.chat));
    setSelectedChatId(response.chat._id);
  }, []);

  const sendMessage = useCallback(async (payload) => {
    setIsSending(true);

    try {
      const response = await chatService.sendMessage(payload);
      setChats((current) => normalizeChatCollection(current, response.chat));
      setMessagesByChat((current) => ({
        ...current,
        [response.chat._id]: upsertMessage(current[response.chat._id] || [], response.message),
      }));
    } catch (error) {
      pushToast({
        title: 'Message not sent',
        description: error.message,
        tone: 'danger',
      });
      throw error;
    } finally {
      setIsSending(false);
    }
  }, [pushToast]);

  const markChatSeen = useCallback(async (chatId) => {
    if (!chatId) {
      return;
    }

    const response = await chatService.markSeen(chatId);
    setChats((current) => normalizeChatCollection(current, response.chat));
    setMessagesByChat((current) => ({
      ...current,
      [chatId]: (current[chatId] || []).map((message) => (
        response.messageIds.includes(message._id)
          ? { ...message, seenBy: response.seenBy, status: 'seen' }
          : message
      )),
    }));
  }, []);

  const sendTyping = useCallback((chatId, isTyping) => {
    socketRef.current?.emit(isTyping ? 'typing:start' : 'typing:stop', { chatId });
  }, []);

  const deleteChat = useCallback(async (chatId) => {
    await chatService.deleteChat(chatId);
    startTransition(() => {
      setChats((current) => current.filter((chat) => chat._id !== chatId));
      setMessagesByChat((current) => {
        const clone = { ...current };
        delete clone[chatId];
        return clone;
      });
      setSelectedChatId((current) => (current === chatId ? '' : current));
    });
  }, []);

  const updateProfile = useCallback(async (formData) => {
    const response = await chatService.updateProfile(formData);
    updateCurrentUser(response.user);
    return response;
  }, [updateCurrentUser]);

  const loadSummary = useCallback(async (chatId) => {
    setSummary({ isOpen: true, loading: true, content: '', title: 'Summarize Chat' });

    try {
      const response = await summaryService.getSummary(chatId);
      setSummary({
        isOpen: true,
        loading: false,
        content: response.summary,
        title: response.chatTitle,
      });
    } catch (error) {
      setSummary({
        isOpen: true,
        loading: false,
        content: error.message,
        title: 'Summary unavailable',
      });
    }
  }, []);

  const selectedChat = chats.find((chat) => chat._id === selectedChatId) || null;

  const value = useMemo(
    () => ({
      chats,
      selectedChat,
      selectedChatId,
      setSelectedChatId,
      messages: selectedChat ? (messagesByChat[selectedChat._id] || []) : [],
      typingUser: selectedChat ? typingByChat[selectedChat._id] : null,
      onlineUserIds,
      isChatsLoading,
      isMessagesLoading,
      isSending,
      summary,
      fetchChats,
      fetchMessages,
      startDirectChat,
      sendMessage,
      markChatSeen,
      sendTyping,
      deleteChat,
      updateProfile,
      loadSummary,
      setSummary,
    }),
    [
      chats,
      selectedChat,
      selectedChatId,
      messagesByChat,
      typingByChat,
      onlineUserIds,
      isChatsLoading,
      isMessagesLoading,
      isSending,
      summary,
      fetchChats,
      fetchMessages,
      startDirectChat,
      sendMessage,
      markChatSeen,
      sendTyping,
      deleteChat,
      updateProfile,
      loadSummary,
    ]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);

  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }

  return context;
}
