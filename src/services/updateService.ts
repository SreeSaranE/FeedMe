import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { cleanVersion, isNewerVersion } from '../utils/version';

export interface UpdateInfo {
  isAvailable: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseName: string;
  releaseNotes: string;
  releaseUrl: string;
  apkDownloadUrl: string | null;
  apkSize: number | null;
  publishedAt: string;
  isDismissed: boolean;
}

const GITHUB_REPO = 'SreeSaranE/FeedMe';
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
const DEFAULT_FALLBACK_URL = `https://github.com/${GITHUB_REPO}/releases`;

const STORAGE_KEYS = {
  LAST_CHECK_TIME: '@feedme_update_last_check_time',
  DISMISSED_VERSION: '@feedme_update_dismissed_version',
  CACHED_UPDATE_INFO: '@feedme_update_cached_info',
};

const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const REQUEST_TIMEOUT_MS = 10000; // 10 seconds

export class UpdateService {
  /**
   * Returns the currently installed app version from Expo config.
   */
  static getCurrentVersion(): string {
    return cleanVersion(Constants.expoConfig?.version || '1.0.0');
  }

  /**
   * Retrieves the version string previously dismissed by the user, if any.
   */
  static async getDismissedVersion(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.DISMISSED_VERSION);
    } catch {
      return null;
    }
  }

  /**
   * Marks a specific release version as dismissed so it doesn't prompt again.
   */
  static async dismissVersion(version: string): Promise<void> {
    try {
      const normalized = cleanVersion(version);
      if (normalized) {
        await AsyncStorage.setItem(STORAGE_KEYS.DISMISSED_VERSION, normalized);
      }
    } catch (err) {
      console.warn('Failed to save dismissed update version:', err);
    }
  }

  /**
   * Clears the dismissed version record (e.g. for testing or reset).
   */
  static async clearDismissedVersion(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.DISMISSED_VERSION);
    } catch (err) {
      console.warn('Failed to clear dismissed update version:', err);
    }
  }

  /**
   * Checks for updates by querying GitHub Releases.
   * By default, throttles automatic checks to at most once per 24 hours.
   * Pass { force: true } to bypass the 24-hour rate-limiting cache (e.g. user-initiated check).
   */
  static async checkForUpdate(options?: { force?: boolean }): Promise<UpdateInfo | null> {
    const force = Boolean(options?.force);
    const currentVersion = this.getCurrentVersion();

    // Check cached data if within the 24-hour interval and not forced
    if (!force) {
      try {
        const lastCheckStr = await AsyncStorage.getItem(STORAGE_KEYS.LAST_CHECK_TIME);
        const lastCheckTime = lastCheckStr ? parseInt(lastCheckStr, 10) : 0;
        const now = Date.now();

        if (Number.isFinite(lastCheckTime) && now - lastCheckTime < CHECK_INTERVAL_MS) {
          const cachedJson = await AsyncStorage.getItem(STORAGE_KEYS.CACHED_UPDATE_INFO);
          if (cachedJson) {
            const cached: UpdateInfo = JSON.parse(cachedJson);
            const dismissed = await this.getDismissedVersion();
            cached.isDismissed = Boolean(dismissed && cleanVersion(dismissed) === cleanVersion(cached.latestVersion));
            cached.currentVersion = currentVersion;
            cached.isAvailable = isNewerVersion(cached.latestVersion, currentVersion);
            return cached;
          }
        }
      } catch {
        // Cache read failure: proceed to network check
      }
    }

    // Network check against GitHub Releases API
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(GITHUB_API_URL, {
        method: 'GET',
        headers: {
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'FeedMe-App',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // 404 (no releases yet) or 403 (rate limited)
        return await this.getCachedFallback(currentVersion);
      }

      const data = await response.json();
      if (!data || typeof data !== 'object') {
        return await this.getCachedFallback(currentVersion);
      }

      const rawTag = String(data.tag_name || data.name || '');
      const latestVersion = cleanVersion(rawTag);
      if (!latestVersion) {
        return await this.getCachedFallback(currentVersion);
      }

      const isAvailable = isNewerVersion(latestVersion, currentVersion);

      // Find any attached .apk asset
      let apkDownloadUrl: string | null = null;
      let apkSize: number | null = null;

      if (Array.isArray(data.assets)) {
        const apkAsset = data.assets.find(
          (asset: { name?: string; browser_download_url?: string }) =>
            typeof asset.name === 'string' && asset.name.toLowerCase().endsWith('.apk')
        );
        if (apkAsset && typeof apkAsset.browser_download_url === 'string') {
          apkDownloadUrl = apkAsset.browser_download_url;
          apkSize = typeof apkAsset.size === 'number' ? apkAsset.size : null;
        }
      }

      const dismissed = await this.getDismissedVersion();
      const isDismissed = Boolean(dismissed && cleanVersion(dismissed) === latestVersion);

      const updateInfo: UpdateInfo = {
        isAvailable,
        currentVersion,
        latestVersion,
        releaseName: String(data.name || rawTag || `v${latestVersion}`),
        releaseNotes: String(data.body || ''),
        releaseUrl: String(data.html_url || DEFAULT_FALLBACK_URL),
        apkDownloadUrl,
        apkSize,
        publishedAt: String(data.published_at || new Date().toISOString()),
        isDismissed,
      };

      // Cache latest check result and timestamp
      await AsyncStorage.multiSet([
        [STORAGE_KEYS.LAST_CHECK_TIME, String(Date.now())],
        [STORAGE_KEYS.CACHED_UPDATE_INFO, JSON.stringify(updateInfo)],
      ]);

      return updateInfo;
    } catch {
      clearTimeout(timeoutId);
      // Offline, network timeout, or AbortError: fallback to cached result if available
      return await this.getCachedFallback(currentVersion);
    }
  }

  /**
   * Helper to return cached info during network failure or rate limit.
   */
  private static async getCachedFallback(currentVersion: string): Promise<UpdateInfo | null> {
    try {
      const cachedJson = await AsyncStorage.getItem(STORAGE_KEYS.CACHED_UPDATE_INFO);
      if (cachedJson) {
        const cached: UpdateInfo = JSON.parse(cachedJson);
        const dismissed = await this.getDismissedVersion();
        cached.isDismissed = Boolean(dismissed && cleanVersion(dismissed) === cleanVersion(cached.latestVersion));
        cached.currentVersion = currentVersion;
        cached.isAvailable = isNewerVersion(cached.latestVersion, currentVersion);
        return cached;
      }
    } catch {
      // Ignore
    }
    return null;
  }
}
