import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import Ionicons from '@expo/vector-icons/Ionicons';
import { UpdateService, UpdateInfo } from '../../services/updateService';
import { useTheme, spacing, radius, type } from '../../theme';
import { Card, SettingsPage } from './shared';

const GITHUB_URL = 'https://github.com/SreeSaranE/FeedMe';

type CheckStatus = 'idle' | 'checking' | 'upToDate' | 'updateAvailable' | 'error';

export const AboutSettings: React.FC = () => {
  const { colors } = useTheme();
  const name = Constants.expoConfig?.name ?? 'FeedMe';
  const version = Constants.expoConfig?.version ?? '';

  const [status, setStatus] = useState<CheckStatus>('idle');
  const [update, setUpdate] = useState<UpdateInfo | null>(null);

  // Check cached update info on mount
  useEffect(() => {
    let mounted = true;
    UpdateService.checkForUpdate({ force: false })
      .then(info => {
        if (!mounted || !info) return;
        setUpdate(info);
        if (info.isAvailable) {
          setStatus('updateAvailable');
        } else {
          setStatus('upToDate');
        }
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, []);

  const handleCheckUpdates = async () => {
    if (status === 'checking') return;
    setStatus('checking');

    try {
      const result = await UpdateService.checkForUpdate({ force: true });
      if (!result) {
        setStatus('error');
        return;
      }
      setUpdate(result);
      if (result.isAvailable) {
        setStatus('updateAvailable');
      } else {
        setStatus('upToDate');
      }
    } catch {
      setStatus('error');
    }
  };

  const handleOpenUpdate = () => {
    const targetUrl = update?.apkDownloadUrl || update?.releaseUrl || GITHUB_URL;
    WebBrowser.openBrowserAsync(targetUrl).catch(() => undefined);
  };

  const getStatusIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (status) {
      case 'checking':
        return 'cloud-download-outline';
      case 'updateAvailable':
        return 'sparkles';
      case 'upToDate':
        return 'checkmark-circle';
      case 'error':
        return 'alert-circle-outline';
      default:
        return 'cloud-download-outline';
    }
  };

  const getStatusIconColor = (): string => {
    switch (status) {
      case 'updateAvailable':
        return colors.accent;
      case 'upToDate':
        return '#10B981';
      case 'error':
        return colors.danger;
      default:
        return colors.text;
    }
  };

  const getStatusTitle = (): string => {
    switch (status) {
      case 'checking':
        return 'Checking for updates…';
      case 'updateAvailable':
        return `Update available: v${update?.latestVersion}`;
      case 'upToDate':
        return 'FeedMe is up to date';
      case 'error':
        return 'Could not check for updates';
      default:
        return 'Check for updates';
    }
  };

  const getStatusSubtitle = (): string => {
    switch (status) {
      case 'checking':
        return 'Contacting GitHub…';
      case 'updateAvailable':
        return update?.apkDownloadUrl ? 'Tap to download APK release' : 'Tap to view release on GitHub';
      case 'upToDate':
        return `Version ${version} is the latest release`;
      case 'error':
        return 'Tap to retry';
      default:
        return 'Check GitHub for the latest release';
    }
  };

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
        {/* Check for updates row */}
        <Pressable
          onPress={status === 'updateAvailable' ? handleOpenUpdate : handleCheckUpdates}
          disabled={status === 'checking'}
          accessibilityRole="button"
          accessibilityLabel={getStatusTitle()}
          style={({ pressed }) => [
            styles.row,
            { opacity: pressed && status !== 'checking' ? 0.6 : 1 },
          ]}
        >
          <Ionicons name={getStatusIcon()} size={22} color={getStatusIconColor()} />
          <View style={styles.rowText}>
            <Text style={[type.body, { color: colors.text }]}>{getStatusTitle()}</Text>
            <Text style={[type.caption, { color: colors.textSecondary }]} numberOfLines={1}>
              {getStatusSubtitle()}
            </Text>
          </View>

          {status === 'checking' ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : status === 'updateAvailable' ? (
            <View style={[styles.badge, { backgroundColor: colors.accent }]}>
              <Text style={[type.caption, styles.badgeText, { color: colors.onAccent }]}>
                Update
              </Text>
            </View>
          ) : (
            <Ionicons name="refresh-outline" size={18} color={colors.textTertiary} />
          )}
        </Pressable>

        {/* Source code on GitHub row */}
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
  badge: {
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 4,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontWeight: '600',
  },
});
