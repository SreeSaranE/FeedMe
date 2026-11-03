import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { StepShell, PrimaryButton } from '../../features/onboarding/StepShell';
import { TopicChip } from '../../features/onboarding/TopicChip';
import { useOnboarding } from '../../features/onboarding/OnboardingContext';
import { TOPICS, MAX_TOPICS } from '../../constants/topics';
import { useTheme, spacing, type } from '../../theme';

export default function TopicsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { selectedTopics, limitHit, toggleTopic } = useOnboarding();
  const count = selectedTopics.length;
  const buttonLabel = count >= 2 ? 'Sounds good, continue' : 'Continue';

  return (
    <StepShell
      step={1}
      title="What's caught your interest lately?"
      subtitle="Pick the topics you enjoy reading about. We'll find interesting stories and bring them all together in your feed."
      footer={
        <View style={styles.footerContainer}>
          <Text
            style={[
              type.caption,
              styles.helperText,
              { color: limitHit ? colors.danger : colors.textSecondary },
            ]}
            accessibilityLiveRegion="polite"
          >
            {limitHit
              ? `You can pick up to ${MAX_TOPICS} topics. Remove one to add another.`
              : 'No worries, you can always change these later!'}
          </Text>
          <PrimaryButton
            label={buttonLabel}
            disabled={count === 0}
            onPress={() => router.push('/api-key')}
          />
        </View>
      }
    >
      <View style={styles.grid}>
        {TOPICS.map(topic => (
          <TopicChip
            key={topic.id}
            topic={topic}
            selected={selectedTopics.includes(topic.id)}
            onPress={toggleTopic}
          />
        ))}
      </View>
    </StepShell>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  footerContainer: {
    gap: spacing.sm,
    alignItems: 'center',
    width: '100%',
  },
  helperText: {
    textAlign: 'center',
  },
});
