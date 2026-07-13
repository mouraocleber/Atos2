import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  showcase: '@atos2_showcase_done',
  chat:     '@atos2_coach_chat_done',
  products: '@atos2_coach_products_done',
  wallet:   '@atos2_coach_wallet_done',
  search:   '@atos2_coach_search_done',
  settings: '@atos2_coach_settings_done',
};

export type CoachTab = 'chat' | 'products' | 'wallet' | 'search' | 'settings';

interface OnboardingContextValue {
  showcaseDone: boolean;
  markShowcaseDone: () => Promise<void>;
  isCoachDone: (tab: CoachTab) => boolean;
  markCoachDone: (tab: CoachTab) => Promise<void>;
  resetAll: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextValue>({
  showcaseDone: true,
  markShowcaseDone: async () => {},
  isCoachDone: () => true,
  markCoachDone: async () => {},
  resetAll: async () => {},
});

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [showcaseDone, setShowcaseDone] = useState(true); // default true → não bloqueia
  const [coachDone, setCoachDone] = useState<Record<CoachTab, boolean>>({
    chat: true, products: true, wallet: true, search: true, settings: true,
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [sc, ch, pr, wa, se, st] = await AsyncStorage.multiGet([
          KEYS.showcase, KEYS.chat, KEYS.products, KEYS.wallet, KEYS.search, KEYS.settings,
        ]);
        setShowcaseDone(sc[1] === 'true');
        setCoachDone({
          chat:     ch[1] === 'true',
          products: pr[1] === 'true',
          wallet:   wa[1] === 'true',
          search:   se[1] === 'true',
          settings: st[1] === 'true',
        });
      } catch (e) {
        // Em caso de erro, assume não feito (mostra tutorial)
        setShowcaseDone(false);
        setCoachDone({ chat: false, products: false, wallet: false, search: false, settings: false });
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const markShowcaseDone = useCallback(async () => {
    await AsyncStorage.setItem(KEYS.showcase, 'true');
    setShowcaseDone(true);
  }, []);

  const isCoachDone = useCallback((tab: CoachTab) => coachDone[tab], [coachDone]);

  const markCoachDone = useCallback(async (tab: CoachTab) => {
    await AsyncStorage.setItem(KEYS[tab], 'true');
    setCoachDone(prev => ({ ...prev, [tab]: true }));
  }, []);

  const resetAll = useCallback(async () => {
    await AsyncStorage.multiRemove(Object.values(KEYS));
    setShowcaseDone(false);
    setCoachDone({ chat: false, products: false, wallet: false, search: false, settings: false });
  }, []);


  return (
    <OnboardingContext.Provider value={{ showcaseDone, markShowcaseDone, isCoachDone, markCoachDone, resetAll }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export const useOnboarding = () => useContext(OnboardingContext);
