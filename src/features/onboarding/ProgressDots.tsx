import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Easing,
  AccessibilityInfo,
} from 'react-native';
import { useTheme, spacing } from '../../theme';

export const ProgressDots: React.FC<{ step: number; total: number }> = ({
  step,
  total,
}) => {
  const { colors, scheme } = useTheme();
  const [reduceMotion, setReduceMotion] = useState(false);

  // One Animated.Value per dot (0 = inactive/compact, 1 = active/expanded)
  const [anims] = useState(() =>
    Array.from(
      { length: total },
      (_, i) => new Animated.Value(i === step ? 1 : 0)
    )
  );

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
    const animation = Animated.parallel(
      anims.map((anim, i) =>
        Animated.timing(anim, {
          toValue: i === step ? 1 : 0,
          duration: reduceMotion ? 0 : 250,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        })
      )
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [step, anims, reduceMotion]);

  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`Step ${step + 1} of ${total}`}
      accessibilityLiveRegion="polite"
    >
      {anims.map((anim, i) => {
        const isActive = i === step;
        const isCompleted = i < step;
        const width = anim.interpolate({
          inputRange: [0, 1],
          outputRange: [6, 22],
        });

        return (
          <Animated.View
            key={i}
            style={[
              styles.dot,
              { width },
              isActive && { backgroundColor: colors.text },
              isCompleted && {
                backgroundColor: scheme === 'dark' ? '#71717A' : '#A1A1AA',
              },
              !isActive &&
                !isCompleted && {
                  backgroundColor: scheme === 'dark' ? '#27272A' : '#E4E4E7',
                },
            ]}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.xs + 2, alignItems: 'center' },
  dot: { height: 5, borderRadius: 2.5 },
});
