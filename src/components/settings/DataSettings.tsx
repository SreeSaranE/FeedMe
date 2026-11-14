import React from 'react';
import { View, Text, TextInput, Pressable, Alert, StyleSheet, Platform } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';
import * as Clipboard from 'expo-clipboard';
import { OpmlService, DEFAULT_IMPORT_CATEGORY } from '../../services/opmlService';
import { findDuplicateFeed, getAvailableCategories, sortFeeds } from '../../constants/topics';
import { FeedConfig } from '../../types';
import { useTheme, spacing, radius, type } from '../../theme';
import { Card, SectionLabel, SettingsPage, NavRow } from './shared';

interface Props {
  onClearCache: () => Promise<void>;
  days: string; // draft text of the "older than" input
  onDaysChange: (v: string) => void;
  onDeleteOlder: (days: number) => Promise<number>;
  feeds: FeedConfig[];
  onFeedsChange: (newFeeds: FeedConfig[]) => void | Promise<void>;
}

// A whole number of days between 1 and 365, or null if the text isn't valid.
export function parseDays(text: string): number | null {
  const n = Number(text.trim());
  return Number.isInteger(n) && n >= 1 && n <= 365 ? n : null;
}

export const DataSettings: React.FC<Props> = ({
  onClearCache,
  days,
  onDaysChange,
  onDeleteOlder,
  feeds,
  onFeedsChange,
}) => {
  const { colors } = useTheme();
  const parsed = parseDays(days);

  const handleExportOpml = async () => {
    if (feeds.length === 0) {
      Alert.alert('No Feeds', 'There are no feeds to export.');
      return;
    }

    try {
      const opmlString = OpmlService.generateOpml(feeds);
      const filename = 'feedme-subscriptions.opml';
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;

      await FileSystem.writeAsStringAsync(fileUri, opmlString, {
        encoding: 'utf8',
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/x-opml',
          dialogTitle: 'Export FeedMe Subscriptions',
          UTI: 'org.opml.opml',
        });
      } else {
        await Clipboard.setStringAsync(opmlString);
        Alert.alert(
          'Export Copied',
          'Sharing is not available on this device. The OPML content has been copied to your clipboard.'
        );
      }
    } catch (err) {
      console.warn('Error exporting OPML:', err);
      Alert.alert('Export Failed', 'Could not generate or share the OPML file.');
    }
  };

  const processImportedOpml = async (content: string) => {
    const result = OpmlService.parseOpml(content);
    if (result.feeds.length === 0) {
      Alert.alert(
        'No Feeds Found',
        'Could not find any valid RSS feeds in the selected OPML content.'
      );
      return;
    }

    const availableCategories = getAvailableCategories(feeds);
    const newFeeds: FeedConfig[] = [];
    let duplicateCount = 0;
    const addedCategories = new Set<string>();

    for (let i = 0; i < result.feeds.length; i++) {
      const parsedFeed = result.feeds[i];
      const isDuplicate = findDuplicateFeed(parsedFeed.url, [...feeds, ...newFeeds]);
      if (isDuplicate) {
        duplicateCount++;
        continue;
      }

      // Match existing category case-insensitively, or use parsed category / 'Others'
      const rawCategory = parsedFeed.category || DEFAULT_IMPORT_CATEGORY;
      const matchedCategory =
        availableCategories.find(c => c.toLowerCase() === rawCategory.toLowerCase()) || rawCategory;

      addedCategories.add(matchedCategory);

      newFeeds.push({
        id: `custom-${Date.now()}-${i}`,
        name: parsedFeed.name,
        url: parsedFeed.url,
        enabled: true,
        category: matchedCategory,
      });
    }

    if (newFeeds.length === 0) {
      Alert.alert(
        'All Feeds Already Exist',
        `All ${result.feeds.length} feeds in this file are already in your feed list.`
      );
      return;
    }

    await onFeedsChange(sortFeeds([...feeds, ...newFeeds]));

    const catText = `${addedCategories.size} categor${addedCategories.size === 1 ? 'y' : 'ies'}`;
    const dupText =
      duplicateCount > 0 ? ` (${duplicateCount} duplicate${duplicateCount === 1 ? '' : 's'} skipped)` : '';

    Alert.alert(
      'Import Successful',
      `Imported ${newFeeds.length} new feed${newFeeds.length === 1 ? '' : 's'} into ${catText}.${dupText}`
    );
  };

  const readPickedFile = async (uri: string): Promise<string> => {
    // 1. Try modern File API from expo-file-system (native support for both content:// and file://)
    try {
      const file = new File(uri);
      const content = await file.text();
      if (content) return content;
    } catch (err) {
      console.warn('[readPickedFile] File.text() error:', err);
    }

    // 2. If content:// on Android, try copying to app cache directory first to bridge scoping boundaries
    if (uri.startsWith('content://')) {
      const tempUri = `${FileSystem.cacheDirectory}opml-import-${Date.now()}.opml`;
      try {
        await FileSystem.copyAsync({ from: uri, to: tempUri });
        const content = await FileSystem.readAsStringAsync(tempUri, { encoding: 'utf8' });
        return content;
      } catch (err) {
        console.warn('[readPickedFile] copyAsync fallback error:', err);
      } finally {
        await FileSystem.deleteAsync(tempUri, { idempotent: true }).catch(() => {});
      }
    }

    // 3. Try legacy FileSystem.readAsStringAsync directly
    try {
      return await FileSystem.readAsStringAsync(uri, { encoding: 'utf8' });
    } catch (err) {
      console.warn('[readPickedFile] FileSystem.readAsStringAsync error:', err);
    }

    // 4. Try fetch() as a final fallback
    try {
      const res = await fetch(uri);
      return await res.text();
    } catch (err) {
      console.warn('[readPickedFile] fetch fallback error:', err);
    }

    throw new Error(`Unable to read picked file at URI: ${uri}`);
  };

  const handleImportOpml = async () => {
    try {
      const pickerResult = await DocumentPicker.getDocumentAsync({
        type: ['*/*'],
        // On iOS, copying to cache gives safe sandbox access.
        // On Android, leaving as content:// avoids Expo Go's unscoped host cache permission rejection.
        copyToCacheDirectory: Platform.OS === 'ios',
      });

      if (pickerResult.canceled || !pickerResult.assets || pickerResult.assets.length === 0) {
        return;
      }

      const fileUri = pickerResult.assets[0].uri;
      const fileContent = await readPickedFile(fileUri);
      await processImportedOpml(fileContent);
    } catch (err) {
      console.warn('Error reading OPML file:', err);
      Alert.alert('Import Failed', 'Could not read or parse the selected file.');
    }
  };

  const handleImportClipboard = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (!text || !text.trim()) {
        Alert.alert('Clipboard Empty', 'Your clipboard does not contain any text.');
        return;
      }
      if (!text.includes('<outline') && !text.includes('<opml') && !text.includes('<?xml')) {
        Alert.alert(
          'No OPML Content',
          'The clipboard content does not look like valid OPML XML data.'
        );
        return;
      }
      await processImportedOpml(text);
    } catch (err) {
      console.warn('Error importing from clipboard:', err);
      Alert.alert('Import Failed', 'Could not read or parse clipboard content.');
    }
  };

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
      {/* Feeds Backup & Sync (OPML) */}
      <SectionLabel>Feeds Backup & Sync</SectionLabel>
      <Card>
        <NavRow
          icon="share-outline"
          title="Export Feeds (OPML)"
          subtitle={`${feeds.length} feed${feeds.length === 1 ? '' : 's'} · OPML 2.0 file`}
          onPress={handleExportOpml}
        />
        <NavRow
          icon="cloud-upload-outline"
          title="Import Feeds (OPML)"
          subtitle="Import OPML or XML file from your device"
          onPress={handleImportOpml}
        />
        <NavRow
          icon="clipboard-outline"
          title="Import from Clipboard"
          subtitle="Paste copied OPML text directly"
          onPress={handleImportClipboard}
        />
      </Card>

      <View style={styles.cardGap} />

      {/* Delete articles older than */}
      <SectionLabel>Delete articles older than</SectionLabel>
      <Card>
        <View style={styles.body}>
          <View style={styles.row}>
            <TextInput
              style={[
                type.body,
                styles.input,
                { backgroundColor: colors.grouped, color: parsed === null ? colors.danger : colors.text },
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
        </View>
        <Pressable
          onPress={confirmDeleteOlder}
          accessibilityRole="button"
          style={({ pressed }) => [styles.button, { opacity: pressed ? 0.5 : 1 }]}
        >
          <Text style={[type.label, { color: colors.danger }]}>Delete older articles now</Text>
        </Pressable>
      </Card>

      <View style={styles.cardGap} />

      {/* Storage */}
      <SectionLabel>Storage</SectionLabel>
      <Card>
        <View style={styles.body}>
          <Text style={[type.body, { color: colors.textSecondary }]}>
            Removes all cached article summaries and bookmarks from this device.
          </Text>
        </View>
        <Pressable
          onPress={confirmClear}
          accessibilityRole="button"
          style={({ pressed }) => [styles.button, { opacity: pressed ? 0.5 : 1 }]}
        >
          <Text style={[type.label, { color: colors.danger }]}>Clear cached articles</Text>
        </Pressable>
      </Card>
    </SettingsPage>
  );
};

const styles = StyleSheet.create({
  cardGap: { height: spacing.sm },
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
  body: { padding: spacing.md },
  button: { height: 52, alignItems: 'center', justifyContent: 'center' },
});
