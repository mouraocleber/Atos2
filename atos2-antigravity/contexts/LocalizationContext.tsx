
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations, LanguageCode } from '../constants/translations';

interface LocalizationContextData {
  language: LanguageCode;
  setAppLanguage: (code: LanguageCode) => Promise<void>;
  t: (key: keyof typeof translations['pt-BR']) => string;
}

const LocalizationContext = createContext<LocalizationContextData>({} as LocalizationContextData);

export function LocalizationProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<LanguageCode>('pt-BR');

  useEffect(() => {
    loadStoredLanguage();
  }, []);

  async function loadStoredLanguage() {
    try {
      const stored = await AsyncStorage.getItem('appLanguage');
      if (stored && translations[stored as LanguageCode]) {
        setLanguage(stored as LanguageCode);
      }
    } catch (e) {
      console.error('Erro ao carregar idioma:', e);
    }
  }

  async function setAppLanguage(code: LanguageCode) {
    try {
      await AsyncStorage.setItem('appLanguage', code);
      setLanguage(code);
    } catch (e) {
      console.error('Erro ao salvar idioma:', e);
    }
  }

  function t(key: keyof typeof translations['pt-BR']): string {
    const translation = translations[language] || translations['pt-BR'];
    // @ts-ignore
    return translation[key] || key;
  }

  return (
    <LocalizationContext.Provider value={{ language, setAppLanguage, t }}>
      {children}
    </LocalizationContext.Provider>
  );
}

export const useLocalization = () => useContext(LocalizationContext);
