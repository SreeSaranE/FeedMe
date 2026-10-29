import React, { useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { FeedConfig, AppSettings } from '../types';
import { AVAILABLE_MODELS } from '../constants/defaultFeeds';
import { useTheme, spacing, type } from '../theme';
import { Card, NavRow, SettingsPage } from './settings/shared';
import { ApiSettings } from './settings/ApiSettings';
import { FeedsSettings } from './settings/FeedsSettings';
import { DataSettings, parseDays } from './settings/DataSettings';
import { TopicsSettings } from './settings/TopicsSettings';
import { AboutSettings } from './settings/AboutSettings';
import { applyTopicsToFeeds, buildFeedsForTopics, toggleTopicSelection } from '../constants/topics';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  settings: AppSettings;
  feeds: FeedConfig[];
  onSaveSettings: (settings: AppSettings) => Promise<void>;
  onSaveFeeds: (feeds: FeedConfig[]) => Promise<void>;
  onClearCache: () => Promise<void>;
  onDeleteOlder: (days: number) => Promise<number>;
  onShowIntro: () => void;
}

type Page = 'home' | 'api' | 'topics' | 'feeds' | 'data' | 'about';

const PAGE_TITLES: Record<Page, string> = {
  home: 'Settings',
  api: 'API Settings',
  topics: 'Topics',
  feeds: 'Feeds',
  data: 'Data Management',
  about: 'About FeedMe',
};

export const SettingsModal: React.FC<SettingsModalProps> = ({
  visible,
  onClose,
  settings,
  feeds,
  onSaveSettings,
  onSaveFeeds,
  onClearCache,
  onDeleteOlder,
  onShowIntro,
}) => {
  const { colors } = useTheme();
  const [page, setPage] = useState<Page>('home');

  // Drafts are edited across pages and saved together when the sheet closes.
  const [apiKey, setApiKey] = useState(settings.geminiApiKey);
  const [model, setModel] = useState(settings.geminiModel);
  const [articlesPerFeed, setArticlesPerFeed] = useState(settings.articlesPerFeed || 3);
  const [deleteDays, setDeleteDays] = useState(String(settings.deleteOlderThanDays || 10));
  const [feedList, setFeedList] = useState<FeedConfig[]>(feeds);
  const [topicIds, setTopicIds] = useState(settings.selectedTopics);
  const [topicLimitHit, setTopicLimitHit] = useState(false);

  // Each time the sheet opens, start from the saved values on the home page.
  // (Adjusting state during render avoids an extra render pass from an effect.)
  const [wasVisible, setWasVisible] = useState(false);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setPage('home');
      setApiKey(settings.geminiApiKey);
      setModel(settings.geminiModel);
      setArticlesPerFeed(settings.articlesPerFeed || 3);
      setDeleteDays(String(settings.deleteOlderThanDays || 10));
      setFeedList(feeds);
      setTopicIds(settings.selectedTopics);
      setTopicLimitHit(false);
    }
  }

  const handleSaveAndClose = async () => {
    await onSaveSettings({
      ...settings,
      geminiApiKey: apiKey.trim(),
      geminiModel: model,
      articlesPerFeed,
      selectedTopics: topicIds,
      deleteOlderThanDays: parseDays(deleteDays) ?? settings.deleteOlderThanDays,
    });
    await onSaveFeeds(feedList);
    onClose();
  };

  // The feed list follows the topics right away, so the Feeds page and its counts stay in step.
  const handleToggleTopic = (id: string) => {
    const { selected, limitHit } = toggleTopicSelection(topicIds, id, { allowEmpty: false });
    setTopicLimitHit(limitHit);
    if (selected !== topicIds) {
      setTopicIds(selected);
      setFeedList(current => applyTopicsToFeeds(current, selected));
    }
  };

  const handleShowIntro = async () => {
    await handleSaveAndClose();
    onShowIntro();
  };

  // Hardware back / swipe-down: step back through pages before closing.
  const handleBack = () => {
    if (page === 'home') handleSaveAndClose();
    else setPage('home');
  };

  const modelLabel = AVAILABLE_MODELS.find(m => m.value === model)?.label ?? model;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={handleBack}
    >
      <SafeAreaProvider>
      <Frame>
        <View style={styles.header}>
          <View style={styles.side}>
            {page !== 'home' && (
              <Pressable
                onPress={() => setPage('home')}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Back"
                style={({ pressed }) => [styles.back, { opacity: pressed ? 0.5 : 1 }]}
              >
                <Ionicons name="chevron-back" size={24} color={colors.accent} />
              </Pressable>
            )}
          </View>
          <Text style={[type.headline, { color: colors.text }]}>{PAGE_TITLES[page]}</Text>
          <View style={[styles.side, styles.sideEnd]}>
            <Pressable
              onPress={handleSaveAndClose}
              hitSlop={8}
              accessibilityRole="button"
              style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
            >
              <Text style={[type.label, { color: colors.accent }]}>Done</Text>
            </Pressable>
          </View>
        </View>

        {page === 'home' && (
          <SettingsPage>
            <Card>
            <NavRow
              icon="key-outline"
              title="API Settings"
              subtitle={modelLabel}
              onPress={() => setPage('api')}
            />
            <NavRow
              icon="pricetags-outline"
              title="Topics"
              subtitle={`${topicIds.length} selected`}
              onPress={() => setPage('topics')}
            />
            <NavRow
              icon="newspaper-outline"
              title="Feeds"
              subtitle={`${feedList.filter(f => f.enabled).length} of ${feedList.length} enabled · ${articlesPerFeed} per feed`}
              onPress={() => setPage('feeds')}
            />
            <NavRow
              icon="trash-outline"
              title="Data Management"
              subtitle={`Delete after ${parseDays(deleteDays) ?? settings.deleteOlderThanDays} days · cache`}
              onPress={() => setPage('data')}
            />
            </Card>
            <View style={styles.cardGap} />
            <Card>
            <NavRow
              icon="help-circle-outline"
              title="Show intro again"
              subtitle="Walk through topics and API key setup"
              onPress={handleShowIntro}
            />
            <NavRow
              icon="information-circle-outline"
              title="About FeedMe"
              onPress={() => setPage('about')}
            />
            </Card>
          </SettingsPage>
        )}
        {page === 'api' && (
          <ApiSettings
            apiKey={apiKey}
            onApiKeyChange={setApiKey}
            model={model}
            onModelChange={setModel}
          />
        )}
        {page === 'topics' && (
          <TopicsSettings selected={topicIds} limitHit={topicLimitHit} onToggle={handleToggleTopic} />
        )}
        {page === 'feeds' && (
          <FeedsSettings
            feeds={feedList}
            defaultFeeds={buildFeedsForTopics(topicIds)}
            onChange={setFeedList}
            articlesPerFeed={articlesPerFeed}
            onArticlesPerFeedChange={setArticlesPerFeed}
          />
        )}
        {page === 'about' && <AboutSettings />}
        {page === 'data' && (
          <DataSettings
            onClearCache={onClearCache}
            days={deleteDays}
            onDaysChange={setDeleteDays}
            onDeleteOlder={onDeleteOlder}
          />
        )}
      </Frame>
      </SafeAreaProvider>
    </Modal>
  );
};

// Paints the theme behind the (translucent) status and gesture bars.
const Frame: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.grouped, paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <StatusBar style="auto" />
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    height: 56,
  },
  side: { width: 64 },
  sideEnd: { alignItems: 'flex-end' },
  back: { marginLeft: -spacing.xs },
  cardGap: { height: spacing.md },
});
