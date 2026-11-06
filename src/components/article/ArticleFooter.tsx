import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, spacing, type } from '../../theme';
import Ionicons from '@expo/vector-icons/Ionicons';

interface ArticleFooterProps {
  link: string;
  isSample?: boolean;
  isRaw?: boolean;
  hasApiKey?: boolean;
}

export const ArticleFooter: React.FC<ArticleFooterProps> = ({ link, isSample, isRaw, hasApiKey }) => {
  const { colors } = useTheme();

  let domain: string | null = null;
  try {
    const hostname = new URL(link).hostname;
    domain = hostname.replace(/^www\./i, '');
  } catch {
    domain = null;
  }

  return (
    <View style={styles.footer}>
      {!isSample && !isRaw && (
        <Text style={[type.caption, { color: colors.textSecondary }]}>
          Summarized by Gemini. May contain errors.
        </Text>
      )}
      {isRaw && (
        <View style={styles.warningRow}>
          <Ionicons
            name={hasApiKey ? 'information-circle-outline' : 'warning-outline'}
            size={14}
            color={hasApiKey ? colors.textSecondary : '#F59E0B'}
          />
          <Text style={[type.caption, { color: colors.textSecondary }]}>
            {hasApiKey
              ? 'Feed fetched before setting API key.'
              : 'Raw feed. Add API key in Settings for AI summaries.'}
          </Text>
        </View>
      )}
      {domain ? (
        <Text style={[type.caption, { color: colors.textSecondary }]}>
          Source: {domain}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  footer: {
    marginTop: spacing.xl,
    alignItems: 'center',
    gap: spacing.xs,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
