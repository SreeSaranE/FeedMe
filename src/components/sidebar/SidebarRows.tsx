import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useTheme, spacing, radius, type } from '../../theme';

export interface SidebarRowProps {
  icon?: keyof typeof Ionicons.glyphMap;
  logoUrl?: string | null;
  label: string;
  badge?: number | null;
  active?: boolean;
  disabled?: boolean;
  indented?: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
}

export const SidebarRow: React.FC<SidebarRowProps> = ({
  icon,
  logoUrl,
  label,
  badge,
  active = false,
  disabled = false,
  indented = false,
  onPress,
  accessibilityLabel,
}) => {
  const { colors } = useTheme();
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  const showLogo = Boolean(logoUrl && failedUrl !== logoUrl);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        indented && styles.indentedRow,
        active && { backgroundColor: colors.surface },
        disabled && styles.disabledRow,
        pressed && !disabled && styles.pressedRow,
      ]}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected: active, disabled }}
    >
      {showLogo ? (
        <Image
          source={{ uri: logoUrl! }}
          style={styles.rowLogo}
          contentFit="contain"
          transition={100}
          onError={() => setFailedUrl(logoUrl ?? null)}
        />
      ) : icon ? (
        <Ionicons
          name={icon}
          size={20}
          color={active ? colors.accent : colors.textSecondary}
          style={styles.rowIcon}
        />
      ) : null}
      <Text
        style={[
          indented ? type.body : type.label,
          styles.rowLabel,
          { color: active ? colors.accent : colors.text },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
      {badge != null && badge > 0 && !disabled ? (
        <Text style={[type.caption, styles.badge, { color: colors.textSecondary }]}>
          {badge}
        </Text>
      ) : null}
    </Pressable>
  );
};

export interface SectionHeaderProps {
  label: string;
  topicId: string | null;
  unread: number;
  active: boolean;
  expanded: boolean;
  hasFeeds: boolean;
  onSelect?: () => void;
  onToggleExpand: () => void;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  label,
  topicId,
  unread,
  active,
  expanded,
  hasFeeds,
  onSelect,
  onToggleExpand,
}) => {
  const { colors } = useTheme();
  const isSelectable = topicId !== null;

  return (
    <View style={styles.sectionHeaderContainer}>
      <Pressable
        style={({ pressed }) => [
          styles.sectionLabelButton,
          active && { backgroundColor: colors.surface },
          pressed && styles.pressedRow,
        ]}
        onPress={isSelectable ? onSelect : onToggleExpand}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected: active }}
      >
        <Text
          style={[
            type.label,
            styles.rowLabel,
            { color: active ? colors.accent : colors.text },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
        {unread > 0 ? (
          <Text
            style={[
              type.caption,
              styles.sectionUnread,
              { color: colors.textTertiary },
            ]}
          >
            {unread}
          </Text>
        ) : null}
      </Pressable>

      {hasFeeds ? (
        <Pressable
          style={({ pressed }) => [
            styles.chevronButton,
            pressed && styles.pressedChevron,
          ]}
          onPress={onToggleExpand}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={expanded ? `Collapse ${label}` : `Expand ${label}`}
          accessibilityState={{ expanded }}
        >
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.textSecondary}
          />
        </Pressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.sm,
    marginVertical: 2,
    borderRadius: radius.md,
  },
  indentedRow: {
    paddingLeft: spacing.xl + spacing.sm,
  },
  disabledRow: {
    opacity: 0.4,
  },
  pressedRow: {
    opacity: 0.6,
  },
  rowIcon: {
    marginRight: spacing.md,
  },
  rowLogo: {
    width: 18,
    height: 18,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  rowLabel: {
    flex: 1,
  },
  badge: {
    marginLeft: spacing.sm,
  },
  sectionHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.sm,
    marginVertical: 2,
    minHeight: 44,
  },
  sectionLabelButton: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  sectionUnread: {
    marginLeft: spacing.sm,
  },
  chevronButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  pressedChevron: {
    opacity: 0.5,
  },
});
