/**
 * Semantic version parsing and comparison utilities.
 * Supports standard semver strings with optional 'v' prefix (e.g. "v1.0.3", "1.0.3").
 */

export interface SemverParts {
  major: number;
  minor: number;
  patch: number;
}

/**
 * Normalizes a version string by trimming whitespace and removing leading 'v' or 'V'.
 */
export function cleanVersion(version: string): string {
  if (!version) return '';
  return version.trim().replace(/^[vV]/, '');
}

/**
 * Parses a version string into major, minor, and patch numbers.
 * Ignores any trailing pre-release or build metadata (e.g. "-beta.1", "+build123").
 */
export function parseSemver(version: string): SemverParts {
  const cleaned = cleanVersion(version);
  if (!cleaned) {
    return { major: 0, minor: 0, patch: 0 };
  }

  // Split on pre-release / build metadata delimiter (- or +)
  const coreVersion = cleaned.split(/[-+]/)[0];
  const parts = coreVersion.split('.').map(part => {
    const num = parseInt(part, 10);
    return Number.isFinite(num) && num >= 0 ? num : 0;
  });

  return {
    major: parts[0] ?? 0,
    minor: parts[1] ?? 0,
    patch: parts[2] ?? 0,
  };
}

/**
 * Compares two semantic version strings.
 * Returns:
 *   1 if v1 > v2
 *   -1 if v1 < v2
 *   0 if v1 === v2
 */
export function compareSemver(v1: string, v2: string): number {
  const p1 = parseSemver(v1);
  const p2 = parseSemver(v2);

  if (p1.major !== p2.major) {
    return p1.major > p2.major ? 1 : -1;
  }
  if (p1.minor !== p2.minor) {
    return p1.minor > p2.minor ? 1 : -1;
  }
  if (p1.patch !== p2.patch) {
    return p1.patch > p2.patch ? 1 : -1;
  }

  return 0;
}

/**
 * Checks whether `latestVersion` is strictly newer than `currentVersion`.
 * Returns false if either version is invalid or empty.
 */
export function isNewerVersion(latestVersion: string, currentVersion: string): boolean {
  if (!latestVersion || !currentVersion) return false;
  return compareSemver(latestVersion, currentVersion) > 0;
}
