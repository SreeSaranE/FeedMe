import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { StepShell, PrimaryButton, SecondaryButton } from '../../features/onboarding/StepShell';
import { useTheme, spacing, type } from '../../theme';

const GITHUB_URL = 'https://github.com/SreeSaranE/FeedMe';

const POINTS: { icon: React.ComponentProps<typeof Ionicons>['name']; text: string }[] = [
  { icon: 'newspaper-outline', text: 'Reads RSS feeds for the topics you pick.' },
  { icon: 'sparkles-outline', text: 'Google Gemini keeps what matters and writes short takeaways.' },
  { icon: 'lock-closed-outline', text: 'No account and no server. Your key and articles stay on this device.' },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const openGithub = () => WebBrowser.openBrowserAsync(GITHUB_URL).catch(() => undefined);

  return (
    <StepShell
      step={0}
      title="Welcome to FeedMe"
      subtitle="A daily digest from the feeds you choose, summarized on your device."
      footer={
        <>
          <SecondaryButton label="View on GitHub" onPress={openGithub} />
          <PrimaryButton label="Get started" onPress={() => router.push('/topics')} />
        </>
      }
    >
      <View style={styles.points}>
        {POINTS.map(p => (
          <View key={p.text} style={styles.point}>
            <Ionicons name={p.icon} size={22} color={colors.textSecondary} />
            <Text style={[type.body, styles.pointText, { color: colors.text }]}>{p.text}</Text>
          </View>
        ))}
      </View>
      <Text style={[type.caption, { color: colors.textSecondary }]}>
        FeedMe is open source. The code is on GitHub.
      </Text>
    </StepShell>
  );
}

const styles = StyleSheet.create({
  points: { gap: spacing.md, marginVertical: spacing.md },
  point: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  pointText: { flex: 1 },
});
