import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme, spacing } from '../../theme';

export const ProgressDots: React.FC<{ step: number; total: number }> = ({ step, total }) => {
  const { colors, scheme } = useTheme();

  return (
    <View style={styles.row} accessible accessibilityLabel={`Step ${step + 1} of ${total}`}>
      {Array.from({ length: total }, (_, i) => {
        const isActive = i === step;
        const isCompleted = i < step;

        return (
          <View
            key={i}
            style={[
              styles.dot,
              isActive && [styles.activeDot, { backgroundColor: colors.text }],
              isCompleted && [
                styles.completedDot,
                { backgroundColor: scheme === 'dark' ? '#71717A' : '#A1A1AA' },
              ],
              !isActive &&
                !isCompleted && [
                  styles.inactiveDot,
                  { backgroundColor: scheme === 'dark' ? '#27272A' : '#E4E4E7' },
                ],
            ]}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.xs + 2, alignItems: 'center' },
  dot: { height: 5, borderRadius: 2.5 },
  inactiveDot: { width: 6 },
  completedDot: { width: 6 },
  activeDot: { width: 22 },
});
