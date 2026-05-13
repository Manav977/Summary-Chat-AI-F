export function normalizeChatCollection(chats, chat) {
  const withoutCurrent = chats.filter((entry) => entry._id !== chat._id);
  return [chat, ...withoutCurrent].sort(
    (left, right) => new Date(right.lastActivityAt).getTime() - new Date(left.lastActivityAt).getTime()
  );
}

export function upsertMessage(messages, message) {
  const withoutCurrent = messages.filter((entry) => entry._id !== message._id);
  return [...withoutCurrent, message].sort(
    (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
  );
}

export function getChatPartner(chat, currentUserId) {
  return chat?.participants?.find((participant) => participant._id !== currentUserId) || null;
}

export function getInitials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}
