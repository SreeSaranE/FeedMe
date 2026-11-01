import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, spacing, radius, type } from '../../theme';

interface ArticleActionsProps {
  link: string;
}

export const ArticleActions: React.FC<ArticleActionsProps> = ({ link }) => {
  const { colors } = useTheme();

  const handleOpenLink = async () => {
    if (!link) return;
    try {
      await WebBrowser.openBrowserAsync(link, {
        toolbarColor: colors.background,
        controlsColor: colors.accent,
      });
    } catch {
      // Ignore
    }
  };

  return (
    <View style={styles.container}>
      <Pressable
        onPress={handleOpenLink}
        accessibilityRole="button"
        accessibilityLabel="Read full article"
        style={({ pressed }) => [
          styles.button,
          {
            borderColor: colors.accent,
            backgroundColor: pressed ? colors.surface : 'transparent',
          },
        ]}
      >
        <Text style={[type.label, { color: colors.accent }]}>Read full article</Text>
        <Ionicons name="arrow-forward" size={18} color={colors.accent} />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.xl,
  },
  button: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    width: '100%',
  },
});
