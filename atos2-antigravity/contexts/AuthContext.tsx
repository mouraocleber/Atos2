import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

interface User {
  id: string;
  email: string;
  nickname: string;
  name: string;
  personType: 'PF' | 'PJ';
  profileImage?: string;
  preferredLanguage?: string;
  isSearchable?: boolean;
  plan?: 'FREE' | 'PRO' | 'BUSINESS';
  planExpiresAt?: Date;
}

interface AuthContextData {
  user: User | null;
  token: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (data: SignUpData) => Promise<void>;
  signOut: () => Promise<void>;
}

interface SignUpData {
  email: string;
  phone: string;
  nickname: string;
  name: string;
  personType: 'PF' | 'PJ';
  cpf: string;
  cep: string;
  password: string;
  preferredLanguage?: string;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredData();
  }, []);

  async function loadStoredData() {
    try {
      const [storedToken, storedUser] = await AsyncStorage.multiGet(['token', 'user']);
      if (storedToken[1] && storedUser[1]) {
        setToken(storedToken[1]);
        setUser(JSON.parse(storedUser[1]));
      }
    } catch (e) {
      console.error('Erro ao carregar dados salvos:', e);
    } finally {
      setLoading(false);
    }
  }

  async function signIn(email: string, password: string) {
    console.log('Tentando login para:', email, 'em', api.defaults.baseURL);
    try {
      const response = await api.post('/auth/login', { email, password });
      console.log('Login bem sucedido:', response.data.success);
      const { token: newToken, refreshToken, user: userData } = response.data.data;

      await AsyncStorage.multiSet([
        ['token', newToken],
        ['refreshToken', refreshToken || ''],
        ['user', JSON.stringify(userData)],
      ]);

      setToken(newToken);
      setUser(userData);
    } catch (error: any) {
      console.error('Erro no SignIn:', error.message);
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Data:', JSON.stringify(error.response.data));
        const msg = error.response?.data?.message || 'Erro ao fazer login';
        throw new Error(msg);
      } else if (error.code === 'ECONNABORTED') {
        console.error('Timeout ao conectar ao servidor');
        throw new Error('Tempo esgotado. Verifique se o servidor está rodando.');
      } else if (error.request) {
        console.error('Sem resposta do servidor. URL:', api.defaults.baseURL);
        throw new Error(`Servidor não respondeu. Verifique se o backend está rodando em ${api.defaults.baseURL}`);
      } else {
        throw new Error('Erro ao fazer login: ' + error.message);
      }
    }
  }

  async function signUp(data: SignUpData) {
    console.log('Tentando registro para:', data.email, 'em', api.defaults.baseURL);
    try {
      const payload = {
        ...data,
        passwordConfirm: data.password,
      };
      const response = await api.post('/auth/register', payload);
      console.log('Registro bem sucedido:', response.data.success);
      const { token: newToken, user: userData } = response.data.data;

      await AsyncStorage.multiSet([
        ['token', newToken],
        ['user', JSON.stringify(userData)],
      ]);

      setToken(newToken);
      setUser(userData);
    } catch (error: any) {
      console.error('Erro no SignUp:', error.message);
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Data:', JSON.stringify(error.response.data));
      } else if (error.request) {
        console.error('Nenhuma resposta recebida do servidor. Verifique a conexão/túnel.');
      }
      const msg = error.response?.data?.message || 'Erro ao criar conta';
      throw new Error(msg);
    }
  }

  async function signOut() {
    await AsyncStorage.multiRemove(['token', 'refreshToken', 'user']);
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
