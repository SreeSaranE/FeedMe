import React from 'react';
import { Stack } from 'expo-router';
import { useTheme } from '../../theme';
import { OnboardingProvider, useGate } from '../../features/onboarding/OnboardingContext';

export default function OnboardingLayout() {
  const { initial } = useGate();
  const { colors } = useTheme();
  return (
    <OnboardingProvider initial={initial}>
      <Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: colors.background } }} />
    </OnboardingProvider>
  );
}
