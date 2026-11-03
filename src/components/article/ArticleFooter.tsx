import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, spacing, type } from '../../theme';

interface ArticleFooterProps {
  link: string;
  isSample?: boolean;
}

export const ArticleFooter: React.FC<ArticleFooterProps> = ({ link, isSample }) => {
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
      {!isSample && (
        <Text style={[type.caption, { color: colors.textSecondary }]}>
          Summarized by Gemini. May contain errors.
        </Text>
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
});
