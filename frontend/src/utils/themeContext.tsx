import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark';
export type BackgroundType = 'solid' | 'image';

export interface ThemeContextType {
  mode: ThemeMode;
  backgroundType: BackgroundType;
  backgroundImage?: string;
  setMode: (mode: ThemeMode) => void;
  setBackground: (type: BackgroundType, imageUrl?: string) => void;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<ThemeMode>('dark');
  const [backgroundType, setBackgroundTypeState] = useState<BackgroundType>('solid');
  const [backgroundImage, setBackgroundImageState] = useState<string | undefined>();

  // Carregar preferências do localStorage
  useEffect(() => {
    const savedMode = localStorage.getItem('theme-mode') as ThemeMode | null;
    const savedBgType = localStorage.getItem('bg-type') as BackgroundType | null;
    const savedBgImage = localStorage.getItem('bg-image');

    if (savedMode) {
      setModeState(savedMode);
      applyTheme(savedMode);
    }

    if (savedBgType) {
      setBackgroundTypeState(savedBgType);
    }

    if (savedBgImage) {
      setBackgroundImageState(savedBgImage);
      applyBackground(savedBgImage);
    }
  }, []);

  const applyTheme = (themeMode: ThemeMode) => {
    const body = document.body;
    body.classList.remove('light-mode', 'dark-mode');
    body.classList.add(`${themeMode}-mode`);
  };

  const applyBackground = (imageUrl: string) => {
    const body = document.body;
    if (imageUrl) {
      body.style.backgroundImage = `url(${imageUrl})`;
      body.classList.add('with-background');
    } else {
      body.style.backgroundImage = '';
      body.classList.remove('with-background');
    }
  };

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    localStorage.setItem('theme-mode', newMode);
    applyTheme(newMode);
  };

  const toggleMode = () => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
  };

  const setBackground = (type: BackgroundType, imageUrl?: string) => {
    setBackgroundTypeState(type);
    localStorage.setItem('bg-type', type);

    if (type === 'image' && imageUrl) {
      setBackgroundImageState(imageUrl);
      localStorage.setItem('bg-image', imageUrl);
      applyBackground(imageUrl);
    } else {
      setBackgroundImageState(undefined);
      localStorage.removeItem('bg-image');
      applyBackground('');
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        mode,
        backgroundType,
        backgroundImage,
        setMode,
        setBackground,
        toggleMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme deve ser usado dentro de ThemeProvider');
  }
  return context;
};

