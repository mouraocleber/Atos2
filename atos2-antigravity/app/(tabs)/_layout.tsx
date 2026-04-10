import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';

export default function TabsLayout() {
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
          height: 60,
          paddingBottom: 8,
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
          title: 'Conversas',
          headerTitle: 'Conversas',
          tabBarIcon: ({ color }) => <Feather name="message-square" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'Vitrine',
          headerTitle: 'Loja e Vitrine',
          tabBarIcon: ({ color }) => <Feather name="shopping-bag" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'Carteira',
          headerTitle: 'Carteira',
          tabBarIcon: ({ color }) => <Feather name="credit-card" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Buscar',
          headerTitle: 'Buscar Usuários',
          tabBarIcon: ({ color }) => <Feather name="search" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Config',
          headerTitle: 'Configurações',
          tabBarIcon: ({ color }) => <Feather name="settings" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({});
