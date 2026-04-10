import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Configure o IP do seu computador aqui para o Expo Go conseguir conectar.
// No seu terminal, rode 'ipconfig' e procure pelo Endereço IPv4.
const BASE_URL = 'http://10.213.69.86:3001/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Bypass-Tunnel-Reminder': 'true',
  },
});

// Interceptor para adicionar token JWT
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
