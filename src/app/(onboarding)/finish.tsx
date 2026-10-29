import React, { useState } from 'react';
import { Alert, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StepShell, PrimaryButton } from '../../features/onboarding/StepShell';
import { useOnboarding, useGate } from '../../features/onboarding/OnboardingContext';
import { buildFeedsForTopics, resolveTopics } from '../../constants/topics';
import { useTheme, spacing, radius, type } from '../../theme';

export default function FinishScreen() {
  const { colors } = useTheme();
  const { selectedTopics, apiKey } = useOnboarding();
  const { finish } = useGate();
  const [saving, setSaving] = useState(false);

  const topics = resolveTopics(selectedTopics);
  const feedCount = buildFeedsForTopics(selectedTopics).length;
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
      title="You're all set"
      subtitle={`${feedCount} feeds will be checked for ${topics.length} topic${topics.length === 1 ? '' : 's'}.`}
      footer={<PrimaryButton label="Start reading" onPress={start} loading={saving} />}
    >
      <Text style={[type.body, { color: colors.text }]}>{topics.map(t => t.label).join(' · ')}</Text>

      <View style={[styles.notice, { backgroundColor: colors.surface }]}>
        <Ionicons
          name={hasKey ? 'checkmark-circle' : 'information-circle-outline'}
          size={22}
          color={hasKey ? colors.accent : colors.textSecondary}
        />
        <Text style={[type.body, styles.noticeText, { color: colors.text }]}>
          {hasKey
            ? 'API key saved. Your first sync starts now.'
            : 'No API key yet. Add one in Settings → API Settings to start syncing. A few tips are waiting in your feed meanwhile.'}
        </Text>
      </View>
    </StepShell>
  );
}

const styles = StyleSheet.create({
  notice: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    alignItems: 'flex-start',
    marginTop: spacing.sm,
  },
  noticeText: { flex: 1 },
});
