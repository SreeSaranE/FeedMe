import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, spacing, radius, type } from '../../theme';
import { Card, SettingsPage } from './shared';

const GITHUB_URL = 'https://github.com/SreeSaranE/FeedMe';

export const AboutSettings: React.FC = () => {
  const { colors } = useTheme();
  const name = Constants.expoConfig?.name ?? 'FeedMe';
  const version = Constants.expoConfig?.version ?? '';

  return (
    <SettingsPage>
      <View style={styles.hero}>
        <Image
          source={require('../../../assets/icon.png')}
          style={[styles.icon, { backgroundColor: colors.surface }]}
          contentFit="cover"
          accessibilityLabel={`${name} app icon`}
        />
        <Text style={[type.title, { color: colors.text }]}>{name}</Text>
        {version ? (
          <Text style={[type.caption, { color: colors.textSecondary }]}>Version {version}</Text>
        ) : null}
      </View>

      <Card>
      <Pressable
        onPress={() => WebBrowser.openBrowserAsync(GITHUB_URL).catch(() => undefined)}
        accessibilityRole="link"
        style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Ionicons name="logo-github" size={22} color={colors.text} />
        <View style={styles.rowText}>
          <Text style={[type.body, { color: colors.text }]}>Source code on GitHub</Text>
          <Text style={[type.caption, { color: colors.textSecondary }]} numberOfLines={1}>
            {GITHUB_URL.replace('https://', '')}
          </Text>
        </View>
        <Ionicons name="open-outline" size={18} color={colors.textTertiary} />
      </Pressable>
      </Card>
    </SettingsPage>
  );
};

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  icon: { width: 96, height: 96, borderRadius: radius.md * 2, borderCurve: 'continuous' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 64,
    paddingHorizontal: spacing.md,
  },
  rowText: { flex: 1, gap: 2 },
});
