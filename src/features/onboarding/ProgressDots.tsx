import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme, spacing } from '../../theme';

export const ProgressDots: React.FC<{ step: number; total: number }> = ({ step, total }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.row} accessible accessibilityLabel={`Step ${step + 1} of ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i === step && styles.active,
            { backgroundColor: i === step ? colors.text : colors.separator },
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.xs + 2, alignItems: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3 },
  active: { width: 18 },
});
