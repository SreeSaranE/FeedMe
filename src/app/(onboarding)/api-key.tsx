import React, { useState } from 'react';
import { Text, TextInput, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { StepShell, PrimaryButton, SecondaryButton } from '../../features/onboarding/StepShell';
import { GeminiService } from '../../services/geminiService';
import { useOnboarding } from '../../features/onboarding/OnboardingContext';
import { useTheme, spacing, radius, type } from '../../theme';

const AI_STUDIO_URL = 'https://aistudio.google.com/apikey';

const STEPS = [
  'Open Google AI Studio and sign in with a Google account.',
  'Tap "Create API key". The free tier is enough for a daily digest.',
  'Copy the key and paste it below.',
];

export default function ApiKeyScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { apiKey, setApiKey } = useOnboarding();

  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (text: string) => {
    setApiKey(text);
    setError('');
  };

  // Ping Google first, so a mistyped key is caught here and not as a failed first sync
  const handleContinue = async () => {
    setChecking(true);
    setError('');
    const result = await GeminiService.checkApiKey(apiKey);
    setChecking(false);
    if (result === 'valid') router.push('/finish');
    else if (result === 'invalid') setError('Google rejected this key. Check that you copied all of it.');
    else setError("Couldn't reach Google to check the key. Check your connection and try again, or skip for now.");
  };

  const openStudio = () => WebBrowser.openBrowserAsync(AI_STUDIO_URL).catch(() => undefined);

  return (
    <StepShell
      step={2}
      title="Connect Gemini"
      subtitle="FeedMe needs a free Google Gemini API key to summarize articles."
      footer={
        <>
          <SecondaryButton
            label="Skip for now"
            disabled={checking}
            onPress={() => {
              handleChange('');
              router.push('/finish');
            }}
          />
          <PrimaryButton
            label="Continue"
            disabled={apiKey.trim().length === 0}
            loading={checking}
            onPress={handleContinue}
          />
        </>
      }
    >
      <View style={styles.steps}>
        {STEPS.map((text, i) => (
          <View key={text} style={styles.step}>
            <View style={[styles.number, { backgroundColor: colors.surface }]}>
              <Text style={[type.caption, { color: colors.text, fontWeight: '600' }]}>{i + 1}</Text>
            </View>
            <Text style={[type.body, styles.stepText, { color: colors.text }]}>{text}</Text>
          </View>
        ))}
      </View>

      <SecondaryButton label="Open Google AI Studio" onPress={openStudio} />

      <TextInput
        style={[type.body, styles.input, { backgroundColor: colors.surface, color: colors.text }]}
        placeholder="Paste your API key"
        placeholderTextColor={colors.textTertiary}
        value={apiKey}
        onChangeText={handleChange}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        returnKeyType="done"
        accessibilityLabel="Gemini API key"
      />
      {error ? (
        <Text style={[type.caption, { color: colors.danger }]} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
      <Text style={[type.caption, { color: colors.textSecondary }]}>
        The key is kept in the secure storage of your device and only sent to Google. Without one,
        nothing is synced; you can add it later in Settings.
      </Text>
    </StepShell>
  );
}

const styles = StyleSheet.create({
  steps: { gap: spacing.md, marginTop: spacing.sm },
  step: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  number: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  stepText: { flex: 1 },
  input: { height: 48, borderRadius: radius.sm, borderCurve: 'continuous', paddingHorizontal: spacing.md },
});
