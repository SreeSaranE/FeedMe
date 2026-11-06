import React from 'react';
import { View, StyleSheet, Pressable, TextInput } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme, spacing, radius, type } from '../theme';

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (text: string) => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchQuery,
  onSearchChange,
}) => {
  const { colors } = useTheme();

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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.sm, // keeps the sync progress line (bar's bottom edge) clear of the search field
    paddingBottom: spacing.sm,
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
});
