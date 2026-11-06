import React, { useState } from 'react';
import { Alert, Text, View, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StepShell, PrimaryButton } from '../../features/onboarding/StepShell';
import { useOnboarding, useGate } from '../../features/onboarding/OnboardingContext';
import { resolveTopics } from '../../constants/topics';
import { useTheme, spacing, radius, type } from '../../theme';

export default function FinishScreen() {
  const { colors } = useTheme();
  const { selectedTopics, apiKey } = useOnboarding();
  const { finish } = useGate();
  const [saving, setSaving] = useState(false);

  const topics = resolveTopics(selectedTopics);
  const hasKey = apiKey.trim().length > 0;

  const start = async () => {
    setSaving(true);
    try {
      // Saving flips the root layout's guard, which replaces this wizard with the feed
      await finish(selectedTopics, apiKey);
    } catch {
      setSaving(false);
      Alert.alert('Could not save', 'Something went wrong saving your choices. Please try again.');
    }
  };

  return (
    <StepShell
      step={3}
      title={
        <Text style={[type.title, styles.title, { color: colors.text }]} accessibilityRole="header">
          {"That's it!\nYou're good to go."}
        </Text>
      }
      subtitle="Your feed is ready and waiting. Discover new stories, catch up on your favorite topics, and let FEEDME handle the lengthy reads."
      footer={
        <View style={styles.footerContainer}>
          <Text style={[type.caption, styles.happyReading, { color: colors.textSecondary }]}>
            Happy reading! ❤️
          </Text>
          <PrimaryButton label="Take me to my feed" onPress={start} loading={saving} />
        </View>
      }
    >
      <Text style={[type.body, styles.topicsList, { color: colors.textSecondary }]}>
        {topics.map(t => t.label).join(' · ')}
      </Text>

      <View style={[styles.notice, { backgroundColor: colors.surface }]}>
        <Ionicons
          name={hasKey ? 'checkmark-circle' : 'information-circle-outline'}
          size={20}
          color={hasKey ? colors.accent : colors.textSecondary}
        />
        <Text style={[type.caption, styles.noticeText, { color: colors.text }]}>
          {hasKey
            ? 'API key saved. Your first sync starts now.'
            : 'No API key yet. Your feeds will appear in raw mode. Add a Gemini API key in Settings → API Settings anytime for AI summaries.'}
        </Text>
      </View>
    </StepShell>
  );
}

const styles = StyleSheet.create({
  title: {
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  topicsList: {
    marginVertical: spacing.sm,
    lineHeight: 22,
  },
  notice: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    alignItems: 'flex-start',
  },
  noticeText: {
    flex: 1,
    lineHeight: 18,
  },
  footerContainer: {
    gap: spacing.sm,
    alignItems: 'center',
    width: '100%',
  },
  happyReading: {
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
