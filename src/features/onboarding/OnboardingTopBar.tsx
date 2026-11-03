import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Animated,
  AccessibilityInfo,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme, spacing } from '../../theme';
import { ProgressDots } from './ProgressDots';
import { stepFromPathname, BAR_HEIGHT, TOTAL_STEPS } from './steps';

// Fixed top bar overlay for the onboarding wizard: stationary during slide transitions,
// with an easing progress bar and back button fade/scale.
export const OnboardingTopBar: React.FC = () => {
  const pathname = usePathname();
  const step = stepFromPathname(pathname);
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [reduceMotion, setReduceMotion] = useState(false);

  // Chevron visibility: 0 on step 0 (hidden), 1 on step > 0 (visible)
  const [anim] = useState(() => new Animated.Value(step > 0 ? 1 : 0));

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) setReduceMotion(enabled);
      })
      .catch(() => {});

    const sub = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled: boolean) => {
        setReduceMotion(enabled);
      }
    );

    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, []);

  useEffect(() => {
    const animation = Animated.timing(anim, {
      toValue: step > 0 ? 1 : 0,
      duration: reduceMotion ? 0 : 200,
      useNativeDriver: true,
    });

    animation.start();

    return () => {
      animation.stop();
    };
  }, [step, anim, reduceMotion]);

  const scale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1],
  });

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top,
          height: insets.top + BAR_HEIGHT,
        },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.row}>
        <View style={styles.side} pointerEvents={step === 0 ? 'none' : 'auto'}>
          <Animated.View style={{ opacity: anim, transform: [{ scale }] }}>
            <Pressable
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                }
              }}
              disabled={step === 0}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Back"
              accessibilityElementsHidden={step === 0}
              importantForAccessibility={
                step === 0 ? 'no-hide-descendants' : 'auto'
              }
              style={({ pressed }) => [
                styles.back,
                { opacity: pressed ? 0.5 : 1 },
              ]}
            >
              <Ionicons name="chevron-back" size={26} color={colors.text} />
            </Pressable>
          </Animated.View>
        </View>

        <ProgressDots step={step} total={TOTAL_STEPS} />

        <View style={styles.side} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
    backgroundColor: 'transparent',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: BAR_HEIGHT,
    paddingHorizontal: spacing.md,
  },
  side: {
    width: 44,
  },
  back: {
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
});
