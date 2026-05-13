import { apiClient } from './http.js';

export const summaryService = {
  async getSummary(chatId) {
    const { data } = await apiClient.post('/ai/summary', { chatId });
    return data.data;
  },
};
