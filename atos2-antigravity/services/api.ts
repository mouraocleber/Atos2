import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Backend hospedado no DigitalOcean (IP fixo — sem dependência do computador local)
export const SERVER_URL = 'http://142.93.59.54:3001';
const BASE_URL = `${SERVER_URL}/api`;

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    const appLang = await AsyncStorage.getItem('appLanguage');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    if (appLang) {
      config.headers['Accept-Language'] = appLang;
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para tratar erros de autenticação
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.multiRemove(['token', 'user']);
    }
    return Promise.reject(error);
  }
);

export default api;

// Helper para configurar a URL do servidor dinamicamente
export const setApiBaseUrl = (url: string) => {
  api.defaults.baseURL = url;
};
