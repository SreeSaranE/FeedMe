import React from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, spacing, radius, type } from '../../theme';
import { ProgressDots } from './ProgressDots';

export const TOTAL_STEPS = 4;

interface ShellProps {
  step: number; // 0-based
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}

// Common frame of every wizard step: progress, title, scrolling content, pinned actions.
export const StepShell: React.FC<ShellProps> = ({ step, title, subtitle, children, footer }) => {
  const { colors } = useTheme();
  const router = useRouter();
  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: colors.background }]}
      edges={['top', 'bottom', 'left', 'right']}
    >
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.progress}>
          <View style={styles.side}>
            {step > 0 && (
              <Pressable
                onPress={() => {
                  Keyboard.dismiss(); // a closing keyboard during the slide makes it stutter
                  router.back();
                }}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Back"
                style={({ pressed }) => [styles.back, { opacity: pressed ? 0.5 : 1 }]}
              >
                <Ionicons name="chevron-back" size={26} color={colors.accent} />
              </Pressable>
            )}
          </View>
          <ProgressDots step={step} total={TOTAL_STEPS} />
          <View style={styles.side} />
        </View>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[type.title, { color: colors.text }]} accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? <Text style={[type.body, { color: colors.textSecondary }]}>{subtitle}</Text> : null}
          {children}
        </ScrollView>
        <View style={styles.footer}>{footer}</View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

interface ButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export const PrimaryButton: React.FC<ButtonProps> = ({ label, onPress, disabled, loading }) => {
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
        { backgroundColor: colors.accent, opacity: inactive ? 0.4 : pressed ? 0.8 : 1 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.onAccent} />
      ) : (
        <Text style={[type.label, { color: colors.onAccent }]}>{label}</Text>
      )}
    </Pressable>
  );
};

export const SecondaryButton: React.FC<ButtonProps> = ({ label, onPress, disabled }) => {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [styles.secondary, { opacity: disabled ? 0.4 : pressed ? 0.6 : 1 }]}
    >
      <Text style={[type.label, { color: colors.accent }]}>{label}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  progress: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    paddingHorizontal: spacing.md,
  },
  side: { width: 44 },
  back: { width: 44, height: 44, justifyContent: 'center' },
  content: { padding: spacing.lg, gap: spacing.md, flexGrow: 1 },
  footer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, paddingTop: spacing.sm, gap: spacing.xs },
  primary: {
    height: 52,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: { height: 44, alignItems: 'center', justifyContent: 'center' },
});
