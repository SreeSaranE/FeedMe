// The onboarding wizard mounts a single top bar across all screens to keep it
// stationary during page transitions. Step index is derived from the route pathname.

export const ONBOARDING_ROUTES = [
  '/welcome',
  '/topics',
  '/api-key',
  '/finish',
] as const;

export type OnboardingRoute = (typeof ONBOARDING_ROUTES)[number];

export const TOTAL_STEPS = ONBOARDING_ROUTES.length;
export const BAR_HEIGHT = 48;

/**
 * Returns the 0-based step index matching the last segment of the pathname.
 * Falls back to 0 for unknown or empty routes.
 */
export function stepFromPathname(pathname: string): number {
  if (!pathname) return 0;

  const clean = pathname.split(/[?#]/)[0].replace(/\/+$/, '');
  const lastSegment = clean.split('/').filter(Boolean).pop();
  if (!lastSegment) return 0;

  const target = `/${lastSegment}`;
  const index = ONBOARDING_ROUTES.indexOf(target as OnboardingRoute);
  return index >= 0 ? index : 0;
}
