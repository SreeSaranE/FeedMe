import React from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme, spacing, radius, type } from '../../theme';
import { OnboardingIllustration } from './OnboardingIllustration';
import { BAR_HEIGHT } from './steps';

interface ShellProps {
  step: number; // 0-based
  title?: React.ReactNode;
  subtitle?: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}

// Common frame of every wizard step: illustration, title, scrolling content, pinned actions.
// The top bar (back chevron + progress dots) is rendered by the parent layout overlay.
export const StepShell: React.FC<ShellProps> = ({ step, title, subtitle, children, footer }) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      {/* Dynamic vector line illustration with seamless edge alignment across all device sizes */}
      <OnboardingIllustration step={step} />

      <SafeAreaView style={styles.flex} edges={['bottom', 'left', 'right']}>
        <KeyboardAvoidingView
          style={[styles.flex, { paddingTop: insets.top + BAR_HEIGHT }]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {title ? (
              typeof title === 'string' ? (
                <Text style={[type.title, styles.title, { color: colors.text }]} accessibilityRole="header">
                  {title}
                </Text>
              ) : (
                title
              )
            ) : null}
            {subtitle ? (
              <Text style={[type.body, styles.subtitle, { color: colors.textSecondary }]}>
                {subtitle}
              </Text>
            ) : null}
            {children}
          </ScrollView>

          <View style={styles.footer}>{footer}</View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

interface ButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}

export const PrimaryButton: React.FC<ButtonProps> = ({
  label,
  onPress,
  disabled,
  loading,
  icon,
}) => {
  const { colors } = useTheme();
  const inactive = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      style={({ pressed }) => [
        styles.primary,
        {
          backgroundColor: colors.text,
          opacity: inactive ? 0.35 : pressed ? 0.85 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.background} />
      ) : (
        <View style={styles.buttonRow}>
          <Text style={[type.label, styles.primaryLabel, { color: colors.background }]}>
            {label}
          </Text>
          {icon ? <Ionicons name={icon} size={18} color={colors.background} /> : null}
        </View>
      )}
    </Pressable>
  );
};

export const SecondaryButton: React.FC<ButtonProps> = ({ label, onPress, disabled, icon }) => {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [styles.secondary, { opacity: disabled ? 0.4 : pressed ? 0.6 : 1 }]}
    >
      <View style={styles.buttonRow}>
        <Text style={[type.label, { color: colors.textSecondary, fontWeight: '500' }]}>{label}</Text>
        {icon ? <Ionicons name={icon} size={16} color={colors.textSecondary} /> : null}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md, flexGrow: 1 },
  title: {
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  subtitle: {
    lineHeight: 22,
  },
  footer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, paddingTop: spacing.sm, gap: spacing.sm },
  primary: {
    height: 52,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  primaryLabel: {
    fontWeight: '600',
    fontSize: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + 2,
  },
  secondary: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
});
