import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../contexts/AuthContext';
import { LocalizationProvider } from '../contexts/LocalizationContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <LocalizationProvider>
        <AuthProvider>
          <StatusBar style="light" />
          <Slot />
        </AuthProvider>
      </LocalizationProvider>
    </SafeAreaProvider>
  );
}
