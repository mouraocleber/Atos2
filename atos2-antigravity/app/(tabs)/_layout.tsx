import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Feather } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalization } from '../../contexts/LocalizationContext';
import { useAuth } from '../../contexts/AuthContext';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { t } = useLocalization();
  const { isLinkAccess } = useAuth();
  
  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.dark.surface,
          shadowColor: 'transparent',
          elevation: 0,
        },
        headerTintColor: Colors.dark.text,
        headerTitleStyle: { fontWeight: '700' },
        tabBarStyle: {
          backgroundColor: Colors.dark.surface,
          borderTopColor: Colors.dark.border,
          borderTopWidth: 1,
          height: 60 + Math.max(15, insets.bottom),
          paddingBottom: 8 + Math.max(15, insets.bottom),
          paddingTop: 4,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.dark.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="chat"
        options={{
          title: t('tab_contacts') || 'Contatos',
          headerTitle: t('header_contacts') || 'Contatos',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconContainer, focused && styles.iconContainerFocused]}>
              <Feather name="users" size={focused ? 22 : 24} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: t('tab_store') || 'Produtos',
          headerTitle: t('header_store') || 'Produtos e Serviços',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconContainer, focused && styles.iconContainerFocused]}>
              <Feather name="shopping-bag" size={focused ? 22 : 24} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          href: isLinkAccess ? null : '/(tabs)/wallet',
          title: t('tab_wallet') || 'Carteira',
          headerTitle: t('header_wallet') || 'Carteira',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconContainer, focused && styles.iconContainerFocused]}>
              <Feather name="credit-card" size={focused ? 22 : 24} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          href: isLinkAccess ? null : '/(tabs)/search',
          title: t('tab_search') || 'Buscar',
          headerTitle: t('header_search') || 'Buscar Usuários',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconContainer, focused && styles.iconContainerFocused]}>
              <Feather name="search" size={focused ? 22 : 24} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="listening"
        options={{
          title: t('tab_listening') || 'Escuta',
          headerTitle: 'Modo Escuta • Tradução ao Vivo',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconContainer, focused && styles.iconContainerFocused]}>
              <Feather name="headphones" size={focused ? 22 : 24} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          href: isLinkAccess ? null : '/(tabs)/settings',
          title: t('tab_settings') || 'Config',
          headerTitle: t('header_settings') || 'Configurações',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconContainer, focused && styles.iconContainerFocused]}>
              <Feather name="settings" size={focused ? 22 : 24} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    padding: 6,
    borderRadius: 20,
  },
  iconContainerFocused: {
    backgroundColor: Colors.primary + '30',
  }
});
