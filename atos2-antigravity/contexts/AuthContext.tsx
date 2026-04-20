import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { SERVER_URL } from '../services/api';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

// Normaliza URLs relativas de foto de perfil para URL completa
function normalizeProfileImage(user: any): any {
  if (!user) return user;
  if (user.profileImage && !user.profileImage.startsWith('http')) {
    return { ...user, profileImage: `${SERVER_URL}${user.profileImage}` };
  }
  return user;
}

interface User {
  id: string;
  email: string;
  phone?: string;
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
  signInWithGoogle: () => Promise<void>;
  signUp: (data: SignUpData) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (partial: Partial<User>) => void;
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
    // Configura o Google Sign-In com o webClientId do google-services.json
    GoogleSignin.configure({
      webClientId: '399781155509-82nebimrcr62redp0q0o782jajc6uimg.apps.googleusercontent.com',
      offlineAccess: false,
    });
    loadStoredData();
  }, []);

  async function loadStoredData() {
    try {
      const [storedToken, storedUser] = await AsyncStorage.multiGet(['token', 'user']);
      if (storedToken[1] && storedUser[1]) {
        setToken(storedToken[1]);
        const parsedUser = JSON.parse(storedUser[1]);
        // Normaliza a URL da foto caso tenha sido salva com path relativo
        const normalizedUser = normalizeProfileImage(parsedUser);
        setUser(normalizedUser);
        // Re-salva com a URL correta para as próximas iniciações
        if (parsedUser.profileImage !== normalizedUser.profileImage) {
          await AsyncStorage.setItem('user', JSON.stringify(normalizedUser));
        }
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
      const { token: newToken, refreshToken, user: rawUserData } = response.data.data;
      const userData = normalizeProfileImage(rawUserData);

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
      const { token: newToken, user: rawUserData } = response.data.data;
      const userData = normalizeProfileImage(rawUserData);

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

  async function signInWithGoogle() {
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const signInResult = await GoogleSignin.signIn();
      const idToken = (signInResult as any).data?.idToken || (signInResult as any).idToken;
      if (!idToken) throw new Error('Google Sign-In não retornou idToken');

      // Envia o token para o backend para validação e obtenção de JWT
      const response = await api.post('/auth/google-signin', { idToken });
      const { token: newToken, refreshToken, user: rawUserData } = response.data.data;
      const userData = normalizeProfileImage(rawUserData);

      await AsyncStorage.multiSet([
        ['token', newToken],
        ['refreshToken', refreshToken || ''],
        ['user', JSON.stringify(userData)],
      ]);

      setToken(newToken);
      setUser(userData);
    } catch (error: any) {
      console.error('Erro no Google Sign-In:', error);
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        throw new Error('Login cancelado');
      } else if (error.code === statusCodes.IN_PROGRESS) {
        throw new Error('Login já em andamento');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error('Google Play Services não disponível');
      } else {
        const msg = error.response?.data?.message || error.message || 'Erro ao fazer login com Google';
        throw new Error(msg);
      }
    }
  }

  async function signOut() {
    await AsyncStorage.multiRemove(['token', 'refreshToken', 'user']);
    setToken(null);
    setUser(null);
  }

  // Recarrega dados do usuário do servidor
  async function refreshUser() {
    try {
      const response = await api.get('/auth/me');
      // me() retorna { success, data: { user: {...} } } — extrair corretamente
      const raw = response.data.data?.user || response.data.data || response.data.user || response.data;
      const userData = normalizeProfileImage(raw);
      setUser(userData);
      await AsyncStorage.setItem('user', JSON.stringify(userData));
    } catch (e) {
      console.warn('refreshUser falhou:', e);
    }
  }

  // Atualiza campos do usuário localmente (sem chamada de rede)
  function updateUser(partial: Partial<User>) {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...partial };
      AsyncStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, signIn, signInWithGoogle, signUp, signOut, refreshUser, updateUser }}>
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
