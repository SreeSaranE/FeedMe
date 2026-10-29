import React from 'react';
import { Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Topic } from '../../constants/topics';
import { useTheme, spacing, radius, type } from '../../theme';

interface Props {
  topic: Topic;
  selected: boolean;
  onPress: (id: string) => void;
  onCard?: boolean; // sits on a card, where the usual chip surface would blend in
}

export const TopicChip: React.FC<Props> = ({ topic, selected, onPress, onCard }) => {
  const { colors } = useTheme();
  const fg = selected ? colors.background : colors.text;
  return (
    <Pressable
      onPress={() => onPress(topic.id)}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: selected ? colors.text : onCard ? colors.grouped : colors.surface, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Ionicons name={topic.icon} size={18} color={fg} />
      <Text style={[type.label, { color: fg }]}>{topic.label}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    height: 44,
    borderRadius: radius.full,
  },
});
