import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { SERVER_URL } from '../services/api';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { setSecureItem, getSecureItem, deleteSecureItem } from '../utils/secureStorage';
import { getOrCreateDeviceId } from '../utils/deviceId';

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
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
}

interface PendingAuthData {
  email?: string;
  phone?: string;
  userId?: string;
  mode?: 'new_device' | 'register_verification';
}

interface AuthContextData {
  user: User | null;
  token: string | null;
  loading: boolean;
  pendingAuthData: PendingAuthData | null;
  signIn: (email: string, password: string) => Promise<{ requires2FA?: boolean }>;
  signInWithGoogle: () => Promise<{ requires2FA?: boolean }>;
  signUp: (data: SignUpData) => Promise<{ requiresVerification?: boolean }>;
  verifyOtp: (emailCode: string, smsCode: string) => Promise<void>;
  resendOtp: () => Promise<void>;
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
  const [pendingAuthData, setPendingAuthData] = useState<PendingAuthData | null>(null);

  useEffect(() => {
    try {
      GoogleSignin.configure({
        webClientId: '399781155509-82nebimrcr62redp0q0o782jajc6uimg.apps.googleusercontent.com',
        offlineAccess: false,
      });
    } catch (e) {
      console.warn('[AuthContext] Google Sign-In initialization failed:', e);
    }
    loadStoredData();
  }, []);

  async function loadStoredData() {
    try {
      const storedToken = await getSecureItem('token');
      const storedUser = await AsyncStorage.getItem('user');
      if (storedToken && storedUser) {
        setToken(storedToken);
        const parsedUser = JSON.parse(storedUser);
        const normalizedUser = normalizeProfileImage(parsedUser);
        setUser(normalizedUser);
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

  async function signIn(email: string, password: string): Promise<{ requires2FA?: boolean }> {
    console.log('Tentando login para:', email, 'em', api.defaults.baseURL);
    try {
      const deviceId = await getOrCreateDeviceId();
      const response = await api.post('/auth/login', { email, password, deviceId });

      // Se o backend exigir validação de 2FA para novo dispositivo ou confirmação
      if (response.data?.requires2FA || response.data?.data?.requires2FA) {
        const pending = {
          email,
          phone: response.data?.data?.phone || '',
          userId: response.data?.data?.userId || '',
          mode: 'new_device' as const,
        };
        setPendingAuthData(pending);
        return { requires2FA: true };
      }

      const { token: newToken, refreshToken, user: rawUserData } = response.data.data;
      const userData = normalizeProfileImage(rawUserData);

      await setSecureItem('token', newToken);
      if (refreshToken) {
        await setSecureItem('refreshToken', refreshToken);
      }
      await AsyncStorage.setItem('user', JSON.stringify(userData));

      setToken(newToken);
      setUser(userData);
      setPendingAuthData(null);
      return { requires2FA: false };
    } catch (error: any) {
      console.error('Erro no SignIn:', error.message);
      if (error.response?.data?.requires2FA) {
        setPendingAuthData({
          email,
          phone: error.response.data.phone || '',
          mode: 'new_device',
        });
        return { requires2FA: true };
      }

      if (error.response) {
        const msg = error.response?.data?.message || 'Erro ao fazer login';
        throw new Error(msg);
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('Tempo esgotado. Verifique se o servidor está rodando.');
      } else if (error.request) {
        throw new Error(`Servidor não respondeu. Verifique se o backend está rodando em ${api.defaults.baseURL}`);
      } else {
        throw new Error('Erro ao fazer login: ' + error.message);
      }
    }
  }

  async function signUp(data: SignUpData): Promise<{ requiresVerification?: boolean }> {
    console.log('Tentando registro para:', data.email, 'em', api.defaults.baseURL);
    try {
      const deviceId = await getOrCreateDeviceId();
      const payload = {
        ...data,
        passwordConfirm: data.password,
        deviceId,
      };
      const response = await api.post('/auth/register', payload);

      if (response.data?.requiresVerification || response.data?.data?.requiresVerification) {
        const pending = {
          email: data.email,
          phone: data.phone,
          userId: response.data?.data?.userId || '',
          mode: 'register_verification' as const,
        };
        setPendingAuthData(pending);
        return { requiresVerification: true };
      }

      const { token: newToken, user: rawUserData } = response.data.data;
      const userData = normalizeProfileImage(rawUserData);

      await setSecureItem('token', newToken);
      await AsyncStorage.setItem('user', JSON.stringify(userData));

      setToken(newToken);
      setUser(userData);
      setPendingAuthData(null);
      return { requiresVerification: false };
    } catch (error: any) {
      console.error('Erro no SignUp:', error.message);
      const msg = error.response?.data?.message || 'Erro ao criar conta';
      throw new Error(msg);
    }
  }

  async function signInWithGoogle(): Promise<{ requires2FA?: boolean }> {
    try {
      const deviceId = await getOrCreateDeviceId();
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const signInResult = await GoogleSignin.signIn();
      const idToken = (signInResult as any).data?.idToken || (signInResult as any).idToken;
      if (!idToken) throw new Error('Google Sign-In não retornou idToken');

      const response = await api.post('/auth/google-signin', { idToken, deviceId });

      if (response.data?.requires2FA || response.data?.data?.requires2FA) {
        setPendingAuthData({
          email: response.data?.data?.email || '',
          phone: response.data?.data?.phone || '',
          mode: 'new_device',
        });
        return { requires2FA: true };
      }

      const { token: newToken, refreshToken, user: rawUserData } = response.data.data;
      const userData = normalizeProfileImage(rawUserData);

      await setSecureItem('token', newToken);
      if (refreshToken) {
        await setSecureItem('refreshToken', refreshToken);
      }
      await AsyncStorage.setItem('user', JSON.stringify(userData));

      setToken(newToken);
      setUser(userData);
      setPendingAuthData(null);
      return { requires2FA: false };
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

  async function verifyOtp(emailCode: string, smsCode: string) {
    try {
      const deviceId = await getOrCreateDeviceId();
      const payload = {
        email: pendingAuthData?.email,
        phone: pendingAuthData?.phone,
        emailCode,
        smsCode,
        deviceId,
      };

      const response = await api.post('/auth/verify-otp', payload);
      const { token: newToken, refreshToken, user: rawUserData } = response.data.data;
      const userData = normalizeProfileImage(rawUserData);

      await setSecureItem('token', newToken);
      if (refreshToken) {
        await setSecureItem('refreshToken', refreshToken);
      }
      await AsyncStorage.setItem('user', JSON.stringify(userData));

      setToken(newToken);
      setUser(userData);
      setPendingAuthData(null);
    } catch (error: any) {
      console.error('Erro na verificação de OTP:', error);
      const msg = error.response?.data?.message || 'Código de verificação inválido ou expirado';
      throw new Error(msg);
    }
  }

  async function resendOtp() {
    try {
      const deviceId = await getOrCreateDeviceId();
      await api.post('/auth/resend-otp', {
        email: pendingAuthData?.email,
        phone: pendingAuthData?.phone,
        deviceId,
      });
    } catch (error: any) {
      console.error('Erro ao reenviar OTP:', error);
      const msg = error.response?.data?.message || 'Não foi possível reenviar o código';
      throw new Error(msg);
    }
  }

  async function signOut() {
    await deleteSecureItem('token');
    await deleteSecureItem('refreshToken');
    await AsyncStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setPendingAuthData(null);
  }

  async function refreshUser() {
    try {
      const response = await api.get('/auth/me');
      const raw = response.data.data?.user || response.data.data || response.data.user || response.data;
      const userData = normalizeProfileImage(raw);
      setUser(userData);
      await AsyncStorage.setItem('user', JSON.stringify(userData));
    } catch (e) {
      console.warn('refreshUser falhou:', e);
    }
  }

  function updateUser(partial: Partial<User>) {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...partial };
      AsyncStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        pendingAuthData,
        signIn,
        signInWithGoogle,
        signUp,
        verifyOtp,
        resendOtp,
        signOut,
        refreshUser,
        updateUser,
      }}
    >
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
