import { apiClient } from './http.js';

export const chatService = {
  async getChats() {
    const { data } = await apiClient.get('/chats');
    return data.data;
  },

  async createOrGetChat(payload) {
    const { data } = await apiClient.post('/chats', payload);
    return data.data;
  },

  async getMessages(chatId) {
    const { data } = await apiClient.get(`/messages/${chatId}`);
    return data.data;
  },

  async sendMessage(payload) {
    const { data } = await apiClient.post('/messages', payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data;
  },

  async markSeen(chatId) {
    const { data } = await apiClient.post(`/messages/${chatId}/seen`);
    return data.data;
  },

  async searchUsers(query) {
    const { data } = await apiClient.get(`/users/search?q=${encodeURIComponent(query)}`);
    return data.data;
  },

  async updateProfile(payload) {
    const { data } = await apiClient.patch('/users/profile', payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data;
  },

  async deleteChat(chatId) {
    const { data } = await apiClient.delete(`/chats/${chatId}`);
    return data.data;
  },
};
