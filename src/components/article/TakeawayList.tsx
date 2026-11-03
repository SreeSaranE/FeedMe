import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, spacing, type } from '../../theme';

interface TakeawayListProps {
  bullets: string[];
}

export const TakeawayList: React.FC<TakeawayListProps> = ({ bullets }) => {
  const { colors } = useTheme();

  if (!bullets || bullets.length === 0) return null;

  return (
    <View style={styles.container}>
      {bullets.map((bullet, index) => (
        <View key={index} style={styles.bulletRow}>
          <View style={[styles.dot, { backgroundColor: colors.textTertiary }]} />
          <Text style={[type.body, styles.bulletText, { color: colors.text }]}>
            {bullet}
          </Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: spacing.sm + 4,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 9,
  },
  bulletText: {
    flex: 1,
  },
});
