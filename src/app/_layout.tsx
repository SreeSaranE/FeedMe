import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Stack, ThemeProvider, DarkTheme, DefaultTheme } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import { StorageService } from '../services/storage';
import { GateProvider, OnboardingInitial } from '../features/onboarding/OnboardingContext';
import { useTheme } from '../theme';

export default function RootLayout() {
  const { colors, scheme } = useTheme();

  // Load Poppins fonts with graceful fallback if an error occurs
  const [fontsLoaded, fontError] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  // null until the saved settings are read
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const [initial, setInitial] = useState<OnboardingInitial>({ topics: [], apiKey: '' });

  // Navigation theme matching the app theme so the native container view never falls back to white
  const navTheme = useMemo(
    () => ({
      ...(scheme === 'dark' ? DarkTheme : DefaultTheme),
      colors: {
        ...(scheme === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
        background: colors.background,
        card: colors.background,
      },
    }),
    [scheme, colors.background]
  );

  // Log warning if custom font fails, app continues with system fallback
  useEffect(() => {
    if (fontError) {
      console.warn('Poppins font failed to load; using system font fallback:', fontError);
    }
  }, [fontError]);

  // The window behind the screens defaults to white, which flashes at the screen edge while a
  // page slides in (visible in dark mode). Paint it with the theme.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.background).catch(() => undefined);
  }, [colors.background]);

  useEffect(() => {
    StorageService.getSettings()
      .then(s => {
        setInitial({ topics: s.selectedTopics, apiKey: s.geminiApiKey });
        setOnboarded(s.onboardingCompleted);
      })
      .catch(() => setOnboarded(true)); // never lock an existing user out of the feed
  }, []);

  const finish = useCallback(async (topics: string[], apiKey: string) => {
    await StorageService.completeOnboarding(topics, apiKey);
    setOnboarded(true);
  }, []);

  // Only held in memory: if the app is closed mid-way, the next launch opens the feed.
  const showIntroAgain = useCallback(async () => {
    const s = await StorageService.getSettings();
    setInitial({ topics: s.selectedTopics, apiKey: s.geminiApiKey });
    setOnboarded(false);
  }, []);

  const gate = useMemo(() => ({ finish, showIntroAgain, initial }), [finish, showIntroAgain, initial]);

  const isReady = (fontsLoaded || fontError !== null) && onboarded !== null;

  return (
    <SafeAreaProvider style={{ backgroundColor: colors.background }}>
      <StatusBar style="auto" />
      {!isReady ? (
        <View style={{ flex: 1, backgroundColor: colors.background }} />
      ) : (
        <GateProvider value={gate}>
          <ThemeProvider value={navTheme}>
            {/* Guards: the wizard is only reachable until it is finished, and the feed only after.
                When a guard flips, the router moves to the other group and drops the old screens
                from history, so back cannot return to the wizard. */}
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
              <Stack.Protected guard={onboarded ?? true} redirectTo="/welcome">
                <Stack.Screen name="(app)" />
              </Stack.Protected>
              <Stack.Protected guard={!onboarded} redirectTo="/">
                <Stack.Screen name="(onboarding)" />
              </Stack.Protected>
            </Stack>
          </ThemeProvider>
        </GateProvider>
      )}
    </SafeAreaProvider>
  );
}
