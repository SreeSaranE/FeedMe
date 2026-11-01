import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { StepShell, PrimaryButton } from '../../features/onboarding/StepShell';
import { useTheme, spacing, type } from '../../theme';

export default function WelcomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <StepShell
      step={0}
      title={
        <View style={styles.header}>
          <Text style={[type.label, styles.brand, { color: colors.textSecondary }]}>FeedMe</Text>
          <Text style={[type.title, styles.title, { color: colors.text }]} accessibilityRole="header">
            A little less scrolling,{'\n'}a lot more knowing.
          </Text>
        </View>
      }
      subtitle="All your favorite reads, in one place. Discover interesting stories, catch up on what matters, and let AI do the summarizing for you."
      footer={
        <PrimaryButton
          label="Let's get started"
          onPress={() => router.push('/topics')}
        />
      }
    >
      <View style={styles.spacer} />
    </StepShell>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.xs,
  },
  brand: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  title: {
    lineHeight: 36,
    letterSpacing: -0.5,
    marginTop: spacing.xs,
  },
  spacer: {
    flex: 1,
  },
});
