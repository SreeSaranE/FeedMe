import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, spacing, radius, type } from '../theme';

interface FilterBarProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  selectedSource: string;
  onSelectSource: (source: string) => void;
  availableSources: string[];
  searchQuery: string;
  onSearchChange: (text: string) => void;
}

const CATEGORIES = ['All', 'AI', 'Engineering', 'Open Source', 'Tech'];

export const FilterBar: React.FC<FilterBarProps> = ({
  selectedCategory,
  onSelectCategory,
  selectedSource,
  onSelectSource,
  availableSources,
  searchQuery,
  onSearchChange,
}) => {
  const { colors } = useTheme();

  const chip = (label: string, selected: boolean, onPress: () => void) => (
    <Pressable
      key={label}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? colors.text : colors.surface,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Text
        style={[
          type.caption,
          { fontWeight: '500', color: selected ? colors.background : colors.textSecondary },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );

  return (
    <View style={[styles.container, { borderBottomColor: colors.separator }]}>
      <View style={[styles.search, { backgroundColor: colors.surface }]}>
        <Ionicons name="search" size={16} color={colors.textTertiary} />
        <TextInput
          style={[type.body, styles.searchInput, { color: colors.text }]}
          placeholder="Search"
          placeholderTextColor={colors.textTertiary}
          value={searchQuery}
          onChangeText={onSearchChange}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Search articles"
        />
        {searchQuery.length > 0 && (
          <Pressable
            onPress={() => onSearchChange('')}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
          >
            <Ionicons name="close-circle" size={16} color={colors.textTertiary} />
          </Pressable>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        {CATEGORIES.map(cat => chip(cat, selectedCategory === cat, () => onSelectCategory(cat)))}
        {availableSources.length > 0 && (
          <View style={[styles.divider, { backgroundColor: colors.separator }]} />
        )}
        {availableSources.map(source => {
          const selected = selectedSource === source;
          return chip(source, selected, () => onSelectSource(selected ? 'All' : source));
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.sm, // keeps the sync progress line (bar's bottom edge) clear of the search field
    paddingBottom: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    paddingHorizontal: spacing.sm + 4,
    height: 40,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
  },
  searchInput: { flex: 1, paddingVertical: 0 },
  chips: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: spacing.md - 2,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  divider: { width: StyleSheet.hairlineWidth, height: 16, marginHorizontal: spacing.xs },
});
