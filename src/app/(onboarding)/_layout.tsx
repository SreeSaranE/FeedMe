import React from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { useTheme } from '../../theme';
import { OnboardingProvider, useGate } from '../../features/onboarding/OnboardingContext';
import { OnboardingTopBar } from '../../features/onboarding/OnboardingTopBar';

export default function OnboardingLayout() {
  const { initial } = useGate();
  const { colors } = useTheme();

  return (
    <OnboardingProvider initial={initial}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            contentStyle: { backgroundColor: colors.background },
          }}
        />
        <OnboardingTopBar />
      </View>
    </OnboardingProvider>
  );
}
