import { useDeferredValue, useEffect, useState } from 'react';
import EmojiPicker from 'emoji-picker-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { useChat } from '../../context/ChatContext.jsx';
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js';
import { useAutoScroll } from '../../hooks/useAutoScroll.js';
import { chatService } from '../../services/chatService.js';
import { formatFileSize, formatRelativeDate, formatTime } from '../../utils/formatters.js';
import { getChatPartner, getInitials } from '../../utils/chat.js';
import { toAssetUrl } from '../../utils/assets.js';
import styles from '../../styles/ChatWorkspace.module.css';

function Avatar({ user, isOnline }) {
  return user?.avatarUrl ? (
    <div className={styles.avatarWrap}>
      <img className={styles.avatar} src={toAssetUrl(user.avatarUrl)} alt={user.fullName} />
      <span className={`${styles.presenceDot} ${isOnline ? styles.online : ''}`} />
    </div>
  ) : (
    <div className={styles.avatarFallback}>
      {getInitials(user?.fullName)}
      <span className={`${styles.presenceDot} ${isOnline ? styles.online : ''}`} />
    </div>
  );
}

function SearchPanel({ onPickUser }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const deferredQuery = useDeferredValue(query);
  const debouncedQuery = useDebouncedValue(deferredQuery);

  useEffect(() => {
    const search = async () => {
      if (!debouncedQuery.trim()) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const response = await chatService.searchUsers(debouncedQuery);
        setResults(response.users);
      } finally {
        setLoading(false);
      }
    };

    search();
  }, [debouncedQuery]);

  return (
    <div className={styles.searchPanel}>
      <input
        className={styles.searchInput}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search users to start a conversation"
      />
      <div className={styles.searchResults}>
        {loading ? <p>Searching people...</p> : null}
        {!loading && !results.length && debouncedQuery ? <p>No people matched that search.</p> : null}
        {results.map((user) => (
          <button key={user._id} className={styles.searchResult} onClick={() => onPickUser(user._id)} type="button">
            <Avatar user={user} />
            <span>
              <strong>{user.fullName}</strong>
              <small>{user.email}</small>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function SummaryModal() {
  const { summary, setSummary } = useChat();

  if (!summary.isOpen) {
    return null;
  }

  return (
    <div className={styles.modalBackdrop} onClick={() => setSummary((current) => ({ ...current, isOpen: false }))} role="presentation">
      <section className={styles.modal} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
        <div className={styles.modalHeader}>
          <div>
            <span className={styles.modalEyebrow}>AI Summary</span>
            <h3>{summary.title || 'Conversation Summary'}</h3>
          </div>
          <button type="button" onClick={() => setSummary((current) => ({ ...current, isOpen: false }))}>
            Close
          </button>
        </div>
        {summary.loading ? (
          <div className={styles.summaryLoading}>
            <span className={styles.loaderRing} />
            <p>Reading the most meaningful messages and drafting a concise recap...</p>
          </div>
        ) : (
          <p className={styles.summaryText}>{summary.content}</p>
        )}
      </section>
    </div>
  );
}

function SettingsDrawer() {
  const { user, logout } = useAuth();
  const { updateProfile } = useChat();
  const { toggleTheme } = useApp();
  const [form, setForm] = useState({ fullName: user?.fullName || '', bio: user?.bio || '', avatar: null });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (event) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      const payload = new FormData();
      payload.append('fullName', form.fullName);
      payload.append('bio', form.bio);
      if (form.avatar) {
        payload.append('avatar', form.avatar);
      }
      await updateProfile(payload);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form className={styles.settingsCard} onSubmit={handleSave}>
      <div className={styles.settingsHeader}>
        <h3>Profile settings</h3>
        <button type="button" onClick={toggleTheme}>Toggle theme</button>
      </div>
      <label className={styles.field}>
        <span>Name</span>
        <input value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} />
      </label>
      <label className={styles.field}>
        <span>Bio</span>
        <textarea rows="3" value={form.bio} onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))} />
      </label>
      <label className={styles.field}>
        <span>Avatar</span>
        <input type="file" accept="image/*" onChange={(event) => setForm((current) => ({ ...current, avatar: event.target.files?.[0] || null }))} />
      </label>
      <button className={styles.primaryButton} disabled={isSaving} type="submit">
        {isSaving ? 'Saving...' : 'Save changes'}
      </button>
      <button className={styles.ghostButton} type="button" onClick={logout}>
        Sign out
      </button>
    </form>
  );
}

export function ChatWorkspace() {
  const { user } = useAuth();
  const { isMobileSidebarOpen, setIsMobileSidebarOpen } = useApp();
  const {
    chats,
    selectedChat,
    selectedChatId,
    setSelectedChatId,
    messages,
    typingUser,
    onlineUserIds,
    isChatsLoading,
    isMessagesLoading,
    isSending,
    startDirectChat,
    sendMessage,
    markChatSeen,
    sendTyping,
    deleteChat,
    loadSummary,
  } = useChat();
  const [draft, setDraft] = useState('');
  const [files, setFiles] = useState([]);
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const scrollRef = useAutoScroll(messages.length, typingUser?._id);

  const partner = getChatPartner(selectedChat, user?._id);
  const isPartnerOnline = partner ? onlineUserIds.includes(partner._id) : false;

  useEffect(() => {
    if (selectedChatId) {
      markChatSeen(selectedChatId).catch(() => {});
    }
  }, [selectedChatId, messages.length, markChatSeen]);

  const handleSend = async (event) => {
    event.preventDefault();
    if (!selectedChatId || (!draft.trim() && !files.length)) {
      return;
    }

    const payload = new FormData();
    payload.append('chatId', selectedChatId);
    payload.append('text', draft.trim());
    files.forEach((file) => payload.append('attachments', file));

    await sendMessage(payload);
    setDraft('');
    setFiles([]);
    setIsEmojiOpen(false);
    sendTyping(selectedChatId, false);
  };

  return (
    <main className={styles.page}>
      <aside className={`${styles.sidebar} ${isMobileSidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <div>
            <span className={styles.eyebrow}>Workspace</span>
            <h2>Chats</h2>
          </div>
          <button type="button" onClick={() => setShowSettings((current) => !current)}>
            Settings
          </button>
        </div>

        <SearchPanel
          onPickUser={async (participantId) => {
            await startDirectChat(participantId);
            setIsMobileSidebarOpen(false);
          }}
        />

        <div className={styles.chatList}>
          {isChatsLoading ? <p className={styles.emptyState}>Loading recent conversations...</p> : null}
          {!isChatsLoading && !chats.length ? <p className={styles.emptyState}>No chats yet. Search for a teammate to begin.</p> : null}
          {chats.map((chat) => {
            const chatPartner = getChatPartner(chat, user?._id);
            const unread = chat.unreadCount || 0;
            const active = chat._id === selectedChatId;
            return (
              <button
                key={chat._id}
                className={`${styles.chatCard} ${active ? styles.chatCardActive : ''}`}
                onClick={() => {
                  setSelectedChatId(chat._id);
                  setIsMobileSidebarOpen(false);
                }}
                type="button"
              >
                <Avatar user={chatPartner} isOnline={onlineUserIds.includes(chatPartner?._id)} />
                <div className={styles.chatMeta}>
                  <div className={styles.chatRow}>
                    <strong>{chatPartner?.fullName || 'Conversation'}</strong>
                    <small>{chat.latestMessage ? formatTime(chat.latestMessage.createdAt) : formatRelativeDate(chat.createdAt)}</small>
                  </div>
                  <div className={styles.chatRow}>
                    <p>{chat.latestMessage?.preview || 'No messages yet'}</p>
                    {unread ? <span className={styles.unreadBadge}>{unread}</span> : null}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {showSettings ? <SettingsDrawer /> : null}
      </aside>

      <section className={styles.chatPane}>
        <header className={styles.chatHeader}>
          <div className={styles.chatHeaderLeft}>
            <button className={styles.mobileToggle} type="button" onClick={() => setIsMobileSidebarOpen((current) => !current)}>
              Menu
            </button>
            {partner ? <Avatar user={partner} isOnline={isPartnerOnline} /> : null}
            <div>
              <h3>{partner?.fullName || 'Select a conversation'}</h3>
              <p>{typingUser ? `${typingUser.fullName} is typing...` : isPartnerOnline ? 'Online now' : partner ? 'Offline' : 'Pick a chat from the sidebar'}</p>
            </div>
          </div>

          <div className={styles.headerActions}>
            <button type="button" disabled={!selectedChatId} onClick={() => loadSummary(selectedChatId)}>
              Summarize Chat
            </button>
            <button type="button" disabled={!selectedChatId} onClick={() => deleteChat(selectedChatId)}>
              Delete chat
            </button>
          </div>
        </header>

        <div ref={scrollRef} className={styles.messageStream}>
          {isMessagesLoading ? <p className={styles.emptyState}>Loading messages...</p> : null}
          {!isMessagesLoading && !messages.length ? <p className={styles.emptyState}>No messages here yet. Say hello or share a file.</p> : null}
          {messages.map((message) => {
            const mine = message.sender._id === user?._id;
            return (
              <article key={message._id} className={`${styles.message} ${mine ? styles.mine : ''}`}>
                <div className={styles.bubble}>
                  {message.text ? <p>{message.text}</p> : null}
                  {message.attachments?.length ? (
                    <div className={styles.attachmentList}>
                      {message.attachments.map((attachment) => (
                        <a key={attachment.url} className={styles.attachmentCard} href={toAssetUrl(attachment.url)} target="_blank" rel="noreferrer">
                          <strong>{attachment.name}</strong>
                          <small>{formatFileSize(attachment.size)}</small>
                        </a>
                      ))}
                    </div>
                  ) : null}
                  <div className={styles.messageMeta}>
                    <small>{formatTime(message.createdAt)}</small>
                    {mine ? <small>{message.status}</small> : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <form className={styles.composer} onSubmit={handleSend}>
          {files.length ? (
            <div className={styles.fileTray}>
              {files.map((file) => (
                <span key={`${file.name}-${file.size}`} className={styles.filePill}>
                  {file.name}
                </span>
              ))}
            </div>
          ) : null}

          {isEmojiOpen ? (
            <div className={styles.emojiPicker}>
              <EmojiPicker onEmojiClick={(emojiData) => setDraft((current) => `${current}${emojiData.emoji}`)} />
            </div>
          ) : null}

          <div className={styles.composerRow}>
            <button type="button" onClick={() => setIsEmojiOpen((current) => !current)}>Emoji</button>
            <label className={styles.fileButton}>
              Attach
              <input
                hidden
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                onChange={(event) => setFiles(Array.from(event.target.files || []))}
              />
            </label>
            <textarea
              rows="1"
              value={draft}
              placeholder="Write a message"
              onChange={(event) => {
                setDraft(event.target.value);
                if (selectedChatId) {
                  sendTyping(selectedChatId, Boolean(event.target.value.trim()));
                }
              }}
            />
            <button className={styles.primaryButton} disabled={isSending || !selectedChatId} type="submit">
              {isSending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </form>
      </section>

      <SummaryModal />
    </main>
  );
}
