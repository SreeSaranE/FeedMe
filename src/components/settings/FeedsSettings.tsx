import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Switch,
  Alert,
  StyleSheet,
  Platform,
  ToastAndroid,
  ScrollView,
  Keyboard,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Clipboard from 'expo-clipboard';
import { FeedConfig } from '../../types';
import {
  sortFeeds,
  groupFeedsByCategory,
  getAvailableCategories,
  DEFAULT_FEED_CATEGORY,
  findDuplicateFeed,
} from '../../constants/topics';
import { useTheme, spacing, radius, type } from '../../theme';
import { Card, SectionLabel, SettingsPage } from './shared';
import { normalizeFeedUrl } from '../../utils/url';

interface Props {
  feeds: FeedConfig[];
  defaultFeeds: FeedConfig[]; // the feeds of the selected topics, for Reset
  onChange: (feeds: FeedConfig[]) => void;
  articlesPerFeed: number;
  onArticlesPerFeedChange: (v: number) => void;
}

export const FeedsSettings: React.FC<Props> = ({
  feeds,
  defaultFeeds,
  onChange,
  articlesPerFeed,
  onArticlesPerFeedChange,
}) => {
  const { colors } = useTheme();
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState(DEFAULT_FEED_CATEGORY);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCreatingNewCategory, setIsCreatingNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const availableCategories = useMemo(() => getAvailableCategories(feeds), [feeds]);

  const copyFeedUrl = async (id: string, feedUrl: string) => {
    await Clipboard.setStringAsync(feedUrl);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(prev => (prev === id ? null : prev));
    }, 2000);
    if (Platform.OS === 'android') {
      ToastAndroid.show('Feed URL copied', ToastAndroid.SHORT);
    }
  };

  const toggle = (id: string) =>
    onChange(sortFeeds(feeds.map(f => (f.id === id ? { ...f, enabled: !f.enabled } : f))));

  const resetAddForm = () => {
    Keyboard.dismiss();
    setName('');
    setUrl('');
    setCategory(DEFAULT_FEED_CATEGORY);
    setIsCreatingNewCategory(false);
    setNewCategoryName('');
    setIsDropdownOpen(false);
  };

  const handleToggleAdd = () => {
    if (showAdd) {
      resetAddForm();
      setShowAdd(false);
    } else {
      setShowAdd(true);
    }
  };

  const add = () => {
    if (!name.trim() || !url.trim()) {
      Alert.alert('Missing Info', 'Please enter both feed name and feed URL.');
      return;
    }

    const feedUrl = normalizeFeedUrl(url);
    const duplicate = findDuplicateFeed(feedUrl, feeds);
    if (duplicate) {
      Alert.alert(
        'Duplicate Feed',
        `This RSS link already exists in "${duplicate.category}" as "${duplicate.name}".`
      );
      return;
    }

    const rawCategory = isCreatingNewCategory
      ? (newCategoryName.trim() || DEFAULT_FEED_CATEGORY)
      : (category.trim() || DEFAULT_FEED_CATEGORY);
    const existingMatch = availableCategories.find(
      c => c.toLowerCase() === rawCategory.toLowerCase()
    );
    const resolvedCategory = existingMatch ?? rawCategory;

    Keyboard.dismiss();
    onChange(
      sortFeeds([
        ...feeds,
        {
          id: `custom-${Date.now()}`,
          name: name.trim(),
          url: feedUrl,
          enabled: true,
          category: resolvedCategory,
        },
      ])
    );
    resetAddForm();
    setShowAdd(false);
  };

  const remove = (id: string, feedName: string) => {
    Alert.alert('Remove Feed', `Remove "${feedName}" from feeds?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => onChange(sortFeeds(feeds.filter(f => f.id !== id))) },
    ]);
  };

  const reset = () => {
    Alert.alert('Reset Feeds', 'Reset to the default feeds of your topics? Feeds you added are removed.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', onPress: () => onChange(sortFeeds(defaultFeeds)) },
    ]);
  };

  const groups = useMemo(() => groupFeedsByCategory(feeds), [feeds]);

  const inputStyle = [
    type.body,
    styles.input,
    { backgroundColor: colors.grouped, color: colors.text },
  ];

  return (
    <SettingsPage>
      <SectionLabel>Articles per feed</SectionLabel>
      <Card>
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
                  backgroundColor: selected ? colors.text : colors.grouped,
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
      </Card>

      <View style={styles.headerRow}>
        <SectionLabel>{`Feeds (${feeds.filter(f => f.enabled).length}/${feeds.length})`}</SectionLabel>
        <View style={styles.headerActions}>
          <Pressable onPress={reset} hitSlop={8} accessibilityRole="button">
            <Text style={[type.label, { color: colors.textSecondary }]}>Reset</Text>
          </Pressable>
          <Pressable onPress={handleToggleAdd} hitSlop={8} accessibilityRole="button">
            <Text style={[type.label, { color: colors.accent }]}>{showAdd ? 'Cancel' : 'Add'}</Text>
          </Pressable>
        </View>
      </View>

      {showAdd && (
        <Card style={styles.addCard}>
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
            onPress={() => {
              Keyboard.dismiss();
              setIsDropdownOpen(prev => !prev);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Category: ${isCreatingNewCategory ? (newCategoryName || 'New category') : category}`}
            style={({ pressed }) => [
              styles.dropdownTrigger,
              { backgroundColor: colors.grouped, borderColor: colors.separator },
              pressed && { opacity: 0.7 },
            ]}
          >
            <View style={styles.dropdownTriggerContent}>
              <Text style={[type.body, { color: colors.text }]} numberOfLines={1}>
                {isCreatingNewCategory
                  ? (newCategoryName.trim() ? newCategoryName.trim() : 'New category...')
                  : category}
              </Text>
            </View>
            <Ionicons
              name={isDropdownOpen ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.textSecondary}
            />
          </Pressable>

          {isDropdownOpen && (
            <View style={[styles.dropdownMenu, { backgroundColor: colors.grouped, borderColor: colors.separator }]}>
              <ScrollView
                style={styles.dropdownScroll}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
              >
                {availableCategories.map(cat => {
                  const isSelected = !isCreatingNewCategory && category === cat;
                  return (
                    <Pressable
                      key={cat}
                      onPress={() => {
                        setCategory(cat);
                        setIsCreatingNewCategory(false);
                        setNewCategoryName('');
                        setIsDropdownOpen(false);
                      }}
                      style={({ pressed }) => [
                        styles.dropdownItem,
                        isSelected && { backgroundColor: colors.card },
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <Text style={[type.body, { color: colors.text }]}>{cat}</Text>
                      {isSelected && <Ionicons name="checkmark" size={18} color={colors.accent} />}
                    </Pressable>
                  );
                })}
                <Pressable
                  onPress={() => {
                    setIsCreatingNewCategory(true);
                    setIsDropdownOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.dropdownItem,
                    styles.newItemRow,
                    { borderTopColor: colors.separator },
                    isCreatingNewCategory && { backgroundColor: colors.card },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <View style={styles.newCategoryRow}>
                    <Ionicons name="add-circle-outline" size={18} color={colors.accent} />
                    <Text style={[type.body, { color: colors.accent }]}>Create new category</Text>
                  </View>
                  {isCreatingNewCategory && <Ionicons name="checkmark" size={18} color={colors.accent} />}
                </Pressable>
              </ScrollView>
            </View>
          )}

          {isCreatingNewCategory && (
            <TextInput
              style={inputStyle}
              placeholder="New category name"
              placeholderTextColor={colors.textTertiary}
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              autoFocus
            />
          )}

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
        </Card>
      )}

      {groups.map((group, groupIdx) => (
        <View key={group.category} style={groupIdx === 0 && !showAdd ? styles.firstCategory : styles.categorySection}>
          <Text style={[type.caption, styles.categoryLabel, { color: colors.textSecondary }]}>
            {group.category.toUpperCase()}
          </Text>
          <Card>
            {group.feeds.map(feed => (
              <View key={feed.id} style={styles.feedRow}>
                <Pressable
                  style={({ pressed }) => [styles.feedInfo, pressed && { opacity: 0.7 }]}
                  onLongPress={() => copyFeedUrl(feed.id, feed.url)}
                  delayLongPress={350}
                  accessibilityRole="button"
                  accessibilityLabel={`${feed.name}, ${feed.url}`}
                  accessibilityHint="Long press to copy feed URL"
                >
                  <Text style={[type.body, { color: feed.enabled ? colors.text : colors.textSecondary }]}>{feed.name}</Text>
                  {copiedId === feed.id ? (
                    <Text style={[type.caption, { color: colors.accent }]} numberOfLines={1}>
                      Copied to clipboard
                    </Text>
                  ) : (
                    <Text style={[type.caption, { color: colors.textTertiary }]} numberOfLines={1}>
                      {feed.url}
                    </Text>
                  )}
                </Pressable>
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
          </Card>
        </View>
      ))}
    </SettingsPage>
  );
};

const styles = StyleSheet.create({
  countRow: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md },
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
  addCard: { marginBottom: spacing.md },
  addForm: { gap: spacing.sm, padding: spacing.md },
  dropdownTrigger: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
  },
  dropdownTriggerContent: {
    gap: 2,
    flex: 1,
  },
  dropdownMenu: {
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  dropdownScroll: {
    maxHeight: 180,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  newCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  newItemRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  categorySection: {
    marginTop: spacing.md,
  },
  firstCategory: {
    marginTop: spacing.xs,
  },
  categoryLabel: {
    fontWeight: '500',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginLeft: spacing.sm,
  },
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
    paddingHorizontal: spacing.md,
  },
  feedInfo: { flex: 1 },
});
