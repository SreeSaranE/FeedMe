import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Animated, Easing, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, spacing, radius, type } from '../../theme';

// Fades and lifts content in on mount; `delay` staggers siblings.
export function FadeIn({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  const [progress] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 280,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [progress, delay]);
  return (
    <Animated.View
      style={{
        opacity: progress,
        transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
      }}
    >
      {children}
    </Animated.View>
  );
}

// A rounded surface that groups related rows; hairlines separate its children.
export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors, scheme } = useTheme();
  const items = React.Children.toArray(children);
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.separator },
        scheme === 'light' && styles.cardShadow,
        style,
      ]}
    >
      {items.map((child, i) => (
        <React.Fragment key={i}>
          {i > 0 && <View style={[styles.cardSeparator, { backgroundColor: colors.separator }]} />}
          {child}
        </React.Fragment>
      ))}
    </View>
  );
}

export function SectionLabel({ children }: { children: string }) {
  const { colors } = useTheme();
  return (
    <Text style={[type.caption, styles.sectionLabel, { color: colors.textSecondary }]}>
      {children.toUpperCase()}
    </Text>
  );
}

// A page body: scrolls, with consistent edge padding.
export function SettingsPage({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView
      contentContainerStyle={styles.page}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <FadeIn>{children}</FadeIn>
    </ScrollView>
  );
}

// Navigation row on the settings home list.
export function NavRow({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.navRow, { opacity: pressed ? 0.6 : 1 }]}
    >
      <View style={[styles.navIcon, { backgroundColor: colors.grouped }]}>
        <Ionicons name={icon} size={18} color={colors.text} />
      </View>
      <View style={styles.navText}>
        <Text style={[type.body, { color: colors.text }]}>{title}</Text>
        {subtitle ? (
          <Text style={[type.caption, { color: colors.textSecondary }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontWeight: '500',
    letterSpacing: 0.5,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    marginLeft: spacing.sm,
  },
  page: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xl * 2 },
  card: {
    borderRadius: radius.md + 4,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  cardShadow: { boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)' },
  cardSeparator: { height: StyleSheet.hairlineWidth, marginLeft: spacing.md },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 60,
    paddingHorizontal: spacing.md,
  },
  navIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navText: { flex: 1, gap: 2 },
});
