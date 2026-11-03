import React from 'react';
import { Stack } from 'expo-router';
import { useTheme } from '../../theme';
import { AppStateProvider } from '../../features/articles/AppStateContext';

export default function AppLayout() {
  const { colors } = useTheme();
  return (
    <AppStateProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen
          name="article/[id]"
          options={{
            animation: 'fade_from_bottom',
            animationDuration: 350,
          }}
        />
      </Stack>
    </AppStateProvider>
  );
}
