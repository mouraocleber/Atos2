import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { getSecureItem, deleteSecureItem } from '../utils/secureStorage';

// Backend hospedado no DigitalOcean com HTTPS/SSL
export const SERVER_URL = 'https://api.atos2.online';
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
    // Busca token seguro criptografado via hardware
    const token = await getSecureItem('token');
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

// Interceptor para tratar erros de autenticação e limpar tokens com segurança
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await deleteSecureItem('token');
      await AsyncStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

export default api;

// Helper para configurar a URL do servidor dinamicamente
export const setApiBaseUrl = (url: string) => {
  api.defaults.baseURL = url;
};
