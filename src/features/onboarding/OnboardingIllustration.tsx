import React from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../../theme';

interface Props {
  step: number; // 0 to 3
}

export const OnboardingIllustration: React.FC<Props> = ({ step }) => {
  const { width: W, height: H } = useWindowDimensions();
  const { scheme } = useTheme();

  // Exactly matching edge junction heights between consecutive screens
  const YA = H * 0.146; // Step 0 upper exit -> Step 1 upper entrance (~15% from top)
  const YB = H * 0.755; // Step 0 lower exit -> Step 1 lower entrance (~75% from top)
  const YC = H * 0.823; // Step 1 lower exit -> Step 2 lower entrance (~82% from top)
  const YD = H * 0.295; // Step 2 upper exit -> Step 3 upper entrance (~30% from top)
  const YE = H * 0.375; // Step 2 mid exit   -> Step 3 mid entrance   (~37% from top)

  // Subtle light/grey line color in both light and dark modes
  const strokeColor = scheme === 'dark' ? '#3F3F46' : '#D4D4D8';
  const strokeOpacity = 0.9;
  const strokeWidth = 2.4;

  // Build the continuous Bézier path strings for each step
  const getPaths = (): string[] => {
    switch (step) {
      case 0:
        return [
          // Upper curve: enters left at 47% height, gracefully sweeps up to exit right at YA
          `M 0 ${H * 0.473} C ${W * 0.25} ${H * 0.44}, ${W * 0.45} ${H * 0.24}, ${W * 0.75} ${H * 0.14} C ${W * 0.88} ${H * 0.11}, ${W * 0.95} ${YA}, ${W} ${YA}`,
          // Lower curve: gentle undulating wave across bottom third, exiting right at YB
          `M 0 ${H * 0.65} C ${W * 0.22} ${H * 0.68}, ${W * 0.45} ${H * 0.63}, ${W * 0.65} ${H * 0.63} C ${W * 0.82} ${H * 0.63}, ${W * 0.92} ${H * 0.71}, ${W} ${YB}`,
        ];

      case 1:
        return [
          // Upper curve: enters left at YA (continuous from step 0) and curves out through the top
          `M 0 ${YA} C ${W * 0.18} ${YA + H * 0.01}, ${W * 0.32} ${H * 0.05}, ${W * 0.44} 0`,
          // Lower curve: enters left at YB (continuous from step 0), undulates and exits right at YC
          `M 0 ${YB} C ${W * 0.28} ${YB + H * 0.06}, ${W * 0.62} ${YC - H * 0.02}, ${W} ${YC}`,
        ];

      case 2:
        return [
          // Upper curve: enters top and sweeps across to exit right at YD
          `M ${W * 0.46} 0 C ${W * 0.52} ${H * 0.14}, ${W * 0.76} ${YD + H * 0.02}, ${W} ${YD}`,
          // Lower curve: enters left at YC (continuous from step 1), sweeps diagonally up to exit right at YE
          `M 0 ${YC} C ${W * 0.35} ${YC + H * 0.02}, ${W * 0.42} ${H * 0.58}, ${W * 0.68} ${H * 0.44} C ${W * 0.82} ${H * 0.38}, ${W * 0.92} ${YE}, ${W} ${YE}`,
        ];

      case 3:
      default:
        return [
          // Upper curve: enters left at YD (continuous from step 2) and arcs over towards the top-right
          `M 0 ${YD} C ${W * 0.22} ${YD - H * 0.02}, ${W * 0.52} ${H * 0.18}, ${W * 0.82} 0`,
          // Celebratory finale arc: enters left at YE (continuous from step 2) and flows into an open circular loop
          `M 0 ${YE} C ${W * 0.28} ${YE + H * 0.02}, ${W * 0.62} ${H * 0.46}, ${W * 0.78} ${H * 0.65} C ${W * 0.88} ${H * 0.78}, ${W * 0.82} ${H * 0.95}, ${W * 0.64} ${H * 1.0}`,
        ];
    }
  };

  const paths = getPaths();

  return (
    <Svg
      width={W}
      height={H}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    >
      {paths.map((d, index) => (
        <Path
          key={index}
          d={d}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeOpacity={strokeOpacity}
          strokeLinecap="round"
        />
      ))}
    </Svg>
  );
};
