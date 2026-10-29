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

  return (
    <StepShell
      step={1}
      title="What do you like to read?"
      subtitle="Pick up to 10. Your feeds are set up from these, and you can change them later."
      footer={
        <>
          <Text
            style={[type.caption, styles.counter, { color: limitHit ? colors.danger : colors.textSecondary }]}
            accessibilityLiveRegion="polite"
          >
            {limitHit
              ? `You can pick up to ${MAX_TOPICS} topics. Remove one to add another.`
              : `${selectedTopics.length}/${MAX_TOPICS} selected`}
          </Text>
          <PrimaryButton
            label="Continue"
            disabled={selectedTopics.length === 0}
            onPress={() => router.push('/api-key')}
          />
        </>
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  counter: { textAlign: 'center' },
});
