import React from 'react';
import { Text, StyleSheet, StyleProp, TextStyle } from 'react-native';
import { useTheme, spacing, type } from '../../theme';

interface SectionHeadingProps {
  children: string;
  style?: StyleProp<TextStyle>;
}

export const SectionHeading: React.FC<SectionHeadingProps> = ({ children, style }) => {
  const { colors } = useTheme();

  return (
    <Text
      style={[
        type.caption,
        styles.heading,
        { color: colors.textSecondary },
        style,
      ]}
    >
      {children.toUpperCase()}
    </Text>
  );
};

const styles = StyleSheet.create({
  heading: {
    fontWeight: '600',
    letterSpacing: 0.5,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
});
