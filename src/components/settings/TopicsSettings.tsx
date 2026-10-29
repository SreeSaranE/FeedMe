import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TOPICS, MAX_TOPICS } from '../../constants/topics';
import { TopicChip } from '../../features/onboarding/TopicChip';
import { useTheme, spacing, type } from '../../theme';
import { Card, SettingsPage } from './shared';

interface Props {
  selected: string[];
  limitHit: boolean;
  onToggle: (id: string) => void;
}

export const TopicsSettings: React.FC<Props> = ({ selected, limitHit, onToggle }) => {
  const { colors } = useTheme();
  return (
    <SettingsPage>
      <Text style={[type.body, styles.intro, { color: colors.textSecondary }]}>
        Your feeds follow your topics. Feeds you switched off stay off, and feeds you added yourself are kept.
      </Text>
      <Card>
        <View style={styles.body}>
          <View style={styles.grid}>
            {TOPICS.map(topic => (
              <TopicChip
                key={topic.id}
                topic={topic}
                selected={selected.includes(topic.id)}
                onPress={onToggle}
                onCard
              />
            ))}
          </View>
        </View>
      </Card>
      <Text
        style={[type.caption, styles.counter, { color: limitHit ? colors.danger : colors.textSecondary }]}
        accessibilityLiveRegion="polite"
      >
        {limitHit
          ? `You can pick up to ${MAX_TOPICS} topics. Remove one to add another.`
          : `${selected.length}/${MAX_TOPICS} selected`}
      </Text>
    </SettingsPage>
  );
};

const styles = StyleSheet.create({
  intro: { marginHorizontal: spacing.sm, marginBottom: spacing.md },
  body: { padding: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  counter: { marginTop: spacing.sm, marginLeft: spacing.sm },
});
