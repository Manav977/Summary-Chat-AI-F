import { apiClient } from './http.js';

export const authService = {
  async signup(payload) {
    const { data } = await apiClient.post('/auth/signup', payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data;
  },

  async login(payload) {
    const { data } = await apiClient.post('/auth/login', payload);
    return data.data;
  },

  async getMe() {
    const { data } = await apiClient.get('/auth/me');
    return data.data;
  },
};
