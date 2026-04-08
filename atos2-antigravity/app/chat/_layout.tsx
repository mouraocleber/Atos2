import { Stack } from 'expo-router';
import { Colors } from '../../constants/theme';

export default function ChatLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="[id]" 
        options={{ 
          headerShown: false 
        }} 
      />
    </Stack>
  );
}
