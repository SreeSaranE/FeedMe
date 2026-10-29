import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AVAILABLE_MODELS } from '../../constants/defaultFeeds';
import { useTheme, spacing, type } from '../../theme';
import { Card, SectionLabel, SettingsPage } from './shared';
import { ApiUsage, UsageService } from '../../services/usage';

interface Props {
  apiKey: string;
  onApiKeyChange: (v: string) => void;
  model: string;
  onModelChange: (v: string) => void;
}

export const ApiSettings: React.FC<Props> = ({
  apiKey,
  onApiKeyChange,
  model,
  onModelChange,
}) => {
  const { colors } = useTheme();
  const [showKey, setShowKey] = useState(false);
  const [usage, setUsage] = useState<ApiUsage | null>(null);

  useEffect(() => {
    UsageService.get().then(u => setUsage({ ...u }));
  }, []);

  return (
    <SettingsPage>
      <SectionLabel>Gemini API key</SectionLabel>
      <Card>
        <View style={styles.field}>
          <TextInput
            style={[type.body, styles.input, { color: colors.text }]}
            placeholder="API key"
            placeholderTextColor={colors.textTertiary}
            value={apiKey}
            onChangeText={onApiKeyChange}
            secureTextEntry={!showKey}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Pressable
            onPress={() => setShowKey(!showKey)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={showKey ? 'Hide API key' : 'Show API key'}
          >
            <Ionicons
              name={showKey ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.textSecondary}
            />
          </Pressable>
        </View>
      </Card>

      <SectionLabel>Model</SectionLabel>
      <Card>
        {AVAILABLE_MODELS.map(m => {
          const selected = model === m.value;
          return (
            <Pressable
              key={m.value}
              onPress={() => onModelChange(m.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={({ pressed }) => [styles.optionRow, { opacity: pressed ? 0.6 : 1 }]}
            >
              <Text style={[type.body, { color: colors.text, flex: 1 }]}>{m.label}</Text>
              {selected && <Ionicons name="checkmark" size={20} color={colors.accent} />}
            </Pressable>
          );
        })}
      </Card>

      <SectionLabel>Usage today</SectionLabel>
      <Card>
        <UsageRow label="Requests" value={(usage?.requests ?? 0).toLocaleString('en-US')} />
        <UsageRow label="Tokens" value={(usage?.tokens ?? 0).toLocaleString('en-US')} />
        <UsageRow label="Failed requests" value={(usage?.failed ?? 0).toLocaleString('en-US')} />
      </Card>
      <Text style={[type.caption, styles.hint, { color: colors.textSecondary }]}>
        Counted by this app on this device only, per calendar day. Other use of the same key is not included.
      </Text>
    </SettingsPage>
  );
};

function UsageRow({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.optionRow}>
      <Text style={[type.body, { color: colors.text, flex: 1 }]}>{label}</Text>
      <Text style={[type.body, { color: colors.textSecondary }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hint: { marginTop: spacing.sm, marginLeft: spacing.sm },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    height: 52,
  },
  input: { flex: 1, paddingVertical: 0 },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingHorizontal: spacing.md,
  },
});
