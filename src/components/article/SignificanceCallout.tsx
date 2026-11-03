import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, spacing, type } from '../../theme';
import { SectionHeading } from './SectionHeading';

interface SignificanceCalloutProps {
  text: string;
}

// A quiet pull-quote: a thin accent rule and an accent label, no filled box.
export const SignificanceCallout: React.FC<SignificanceCalloutProps> = ({ text }) => {
  const { colors } = useTheme();

  if (!text || !text.trim()) return null;

  return (
    <View style={[styles.callout, { borderLeftColor: colors.accent }]}>
      <SectionHeading style={[styles.label, { color: colors.accent }]}>Why it matters</SectionHeading>
      <Text style={[type.body, { color: colors.text }]}>{text.trim()}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  callout: {
    paddingLeft: spacing.md,
    borderLeftWidth: 2,
  },
  label: {
    marginTop: 0,
    marginBottom: spacing.xs,
  },
});
