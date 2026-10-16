import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Switch, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FeedConfig } from '../../types';
import { DEFAULT_FEEDS } from '../../constants/defaultFeeds';
import { useTheme, spacing, radius, type } from '../../theme';
import { SectionLabel, SettingsPage } from './shared';

interface Props {
  feeds: FeedConfig[];
  onChange: (feeds: FeedConfig[]) => void;
  articlesPerFeed: number;
  onArticlesPerFeedChange: (v: number) => void;
}

export const FeedsSettings: React.FC<Props> = ({
  feeds,
  onChange,
  articlesPerFeed,
  onArticlesPerFeedChange,
}) => {
  const { colors } = useTheme();
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');

  const toggle = (id: string) =>
    onChange(feeds.map(f => (f.id === id ? { ...f, enabled: !f.enabled } : f)));

  const add = () => {
    if (!name.trim() || !url.trim()) {
      Alert.alert('Missing Info', 'Please enter both feed name and feed URL.');
      return;
    }
    onChange([
      ...feeds,
      {
        id: `custom-${Date.now()}`,
        name: name.trim(),
        url: url.trim(),
        enabled: true,
        category: 'Custom Feed',
      },
    ]);
    setName('');
    setUrl('');
    setShowAdd(false);
  };

  const remove = (id: string, feedName: string) => {
    Alert.alert('Remove Feed', `Remove "${feedName}" from feeds?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => onChange(feeds.filter(f => f.id !== id)) },
    ]);
  };

  const reset = () => {
    Alert.alert('Reset Feeds', 'Reset to default curated tech feeds?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', onPress: () => onChange(DEFAULT_FEEDS) },
    ]);
  };

  const inputStyle = [
    type.body,
    styles.input,
    { backgroundColor: colors.surface, color: colors.text },
  ];

  return (
    <SettingsPage>
      <SectionLabel>Articles per feed</SectionLabel>
      <View style={styles.countRow}>
        {[2, 3, 5, 8].map(count => {
          const selected = articlesPerFeed === count;
          return (
            <Pressable
              key={count}
              onPress={() => onArticlesPerFeedChange(count)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={({ pressed }) => [
                styles.countChip,
                {
                  backgroundColor: selected ? colors.text : colors.surface,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Text
                style={[
                  type.label,
                  { color: selected ? colors.background : colors.textSecondary },
                ]}
              >
                {count}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.headerRow}>
        <SectionLabel>{`Feeds (${feeds.filter(f => f.enabled).length}/${feeds.length})`}</SectionLabel>
        <View style={styles.headerActions}>
          <Pressable onPress={reset} hitSlop={8} accessibilityRole="button">
            <Text style={[type.label, { color: colors.textSecondary }]}>Reset</Text>
          </Pressable>
          <Pressable onPress={() => setShowAdd(!showAdd)} hitSlop={8} accessibilityRole="button">
            <Text style={[type.label, { color: colors.accent }]}>{showAdd ? 'Cancel' : 'Add'}</Text>
          </Pressable>
        </View>
      </View>

      {showAdd && (
        <View style={styles.addForm}>
          <TextInput
            style={inputStyle}
            placeholder="Name"
            placeholderTextColor={colors.textTertiary}
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={inputStyle}
            placeholder="RSS URL"
            placeholderTextColor={colors.textTertiary}
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          <Pressable
            onPress={add}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.addButton,
              { backgroundColor: colors.accent, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text style={[type.label, { color: colors.onAccent }]}>Add feed</Text>
          </Pressable>
        </View>
      )}

      {feeds.map(feed => (
        <View key={feed.id} style={[styles.feedRow, { borderBottomColor: colors.separator }]}>
          <View style={styles.feedInfo}>
            <Text style={[type.body, { color: colors.text }]}>{feed.name}</Text>
            <Text style={[type.caption, { color: colors.textTertiary }]} numberOfLines={1}>
              {feed.url}
            </Text>
          </View>
          <Switch
            value={feed.enabled}
            onValueChange={() => toggle(feed.id)}
            trackColor={{ false: colors.separator, true: colors.accent }}
          />
          <Pressable
            onPress={() => remove(feed.id, feed.name)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${feed.name}`}
          >
            <Ionicons name="trash-outline" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>
      ))}
    </SettingsPage>
  );
};

const styles = StyleSheet.create({
  countRow: { flexDirection: 'row', gap: spacing.sm },
  countChip: {
    flex: 1,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderCurve: 'continuous',
  },
  headerRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  headerActions: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.sm },
  addForm: { gap: spacing.sm, marginBottom: spacing.md },
  input: {
    height: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
  },
  addButton: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderCurve: 'continuous',
  },
  feedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  feedInfo: { flex: 1 },
});
