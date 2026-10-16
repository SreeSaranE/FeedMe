import React from 'react';
import { View, Text, TextInput, Pressable, Alert, StyleSheet } from 'react-native';
import { useTheme, spacing, radius, type } from '../../theme';
import { SectionLabel, SettingsPage } from './shared';

interface Props {
  onClearCache: () => Promise<void>;
  days: string; // draft text of the "older than" input
  onDaysChange: (v: string) => void;
  onDeleteOlder: (days: number) => Promise<number>;
}

// A whole number of days between 1 and 365, or null if the text isn't valid.
export function parseDays(text: string): number | null {
  const n = Number(text.trim());
  return Number.isInteger(n) && n >= 1 && n <= 365 ? n : null;
}

export const DataSettings: React.FC<Props> = ({ onClearCache, days, onDaysChange, onDeleteOlder }) => {
  const { colors } = useTheme();
  const parsed = parseDays(days);

  const confirmDeleteOlder = () => {
    if (parsed === null) {
      Alert.alert('Invalid number', 'Enter a whole number of days between 1 and 365.');
      return;
    }
    Alert.alert(
      'Delete old articles',
      `Delete all articles older than ${parsed} day${parsed === 1 ? '' : 's'}? Bookmarked articles are kept.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const removed = await onDeleteOlder(parsed);
            Alert.alert(
              'Done',
              removed === 0
                ? 'No articles were older than that.'
                : `Deleted ${removed} article${removed === 1 ? '' : 's'}.`
            );
          },
        },
      ]
    );
  };

  const confirmClear = () => {
    Alert.alert(
      'Clear Cache',
      'This will delete all saved and cached article digests. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await onClearCache();
            Alert.alert('Cache Cleared', 'All stored articles have been removed.');
          },
        },
      ]
    );
  };

  return (
    <SettingsPage>
      <SectionLabel>Delete articles older than</SectionLabel>
      <View style={styles.row}>
        <TextInput
          style={[
            type.body,
            styles.input,
            { backgroundColor: colors.surface, color: parsed === null ? colors.danger : colors.text },
          ]}
          value={days}
          onChangeText={t => onDaysChange(t.replace(/[^0-9]/g, ''))}
          keyboardType="number-pad"
          maxLength={3}
          accessibilityLabel="Delete articles older than, in days"
        />
        <Text style={[type.body, { color: colors.textSecondary }]}>days</Text>
      </View>
      <Text style={[type.caption, styles.hint, { color: colors.textSecondary }]}>
        Uses the publish date of each article. Bookmarked articles are never deleted, and deleted
        articles are not fetched again.
      </Text>
      <Pressable
        onPress={confirmDeleteOlder}
        accessibilityRole="button"
        style={({ pressed }) => [styles.button, { opacity: pressed ? 0.5 : 1 }]}
      >
        <Text style={[type.label, { color: colors.danger }]}>Delete older articles now</Text>
      </Pressable>

      <SectionLabel>Storage</SectionLabel>
      <Text style={[type.body, { color: colors.textSecondary }]}>
        Removes all cached article summaries and bookmarks from this device.
      </Text>
      <Pressable
        onPress={confirmClear}
        accessibilityRole="button"
        style={({ pressed }) => [styles.button, { opacity: pressed ? 0.5 : 1 }]}
      >
        <Text style={[type.label, { color: colors.danger }]}>Clear cached articles</Text>
      </Pressable>
    </SettingsPage>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  input: {
    width: 80,
    height: 44,
    paddingHorizontal: spacing.md,
    textAlign: 'center',
    borderRadius: radius.sm,
    borderCurve: 'continuous',
  },
  hint: { marginTop: spacing.sm },
  button: { paddingVertical: spacing.md, marginTop: spacing.sm },
});
