import { Platform } from 'react-native';
import Constants from 'expo-constants';

// ─── YOUR LOCAL MACHINE IP ────────────────────────────────────────────────────
// Run `ipconfig` (Windows) or `ifconfig` (Mac/Linux) and paste your IPv4 here.
// This is only needed when testing on a physical phone via Expo Go.
const LOCAL_IP = '10.63.229.51';
// ─────────────────────────────────────────────────────────────────────────────

const getDevHost = () => {
  if (!__DEV__) {
    // Production: use localhost (or swap with your deployed server URL)
    return 'localhost';
  }

  try {
    // Expo SDK 49+ uses expoConfig.hostUri
    const hostUri =
      Constants.expoConfig?.hostUri ||
      Constants.expoConfig?.packagerOpts?.hostType ||
      Constants.manifest2?.debuggerHost ||
      Constants.manifest?.debuggerHost ||
      Constants.manifest?.packagerOpts?.hostname;

    if (hostUri) {
      // hostUri looks like "192.168.1.5:8081" — strip port
      const rawHost = hostUri.split(':')[0].replace(/^.*?\/\//, '');
      if (rawHost && rawHost !== 'localhost' && rawHost !== '127.0.0.1') {
        console.log(`[Config] Auto-detected Expo host: ${rawHost}`);
        return rawHost;
      }
    }
  } catch (e) {
    // ignore
  }

  // On web, use the browser's hostname
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const browserHost = window.location.hostname;
    if (browserHost && browserHost !== 'localhost' && browserHost !== '127.0.0.1') {
      console.log(`[Config] Using browser host: ${browserHost}`);
      return browserHost;
    }
    // On web localhost, use localhost directly
    return 'localhost';
  }

  // Physical device fallback — use hardcoded machine IP
  console.log(`[Config] Falling back to hardcoded IP: ${LOCAL_IP}`);
  return LOCAL_IP;
};

const host = getDevHost();

export const API_BASE_URL = `http://${host}:5000`;

console.log(`[Config] API Base URL → ${API_BASE_URL}`);

/**
 * Fetch with a configurable timeout.
 * Prevents the app from hanging indefinitely on network issues.
 */
export const fetchWithTimeout = async (url, options = {}, timeoutMs = 8000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timer);
    return response;
  } catch (error) {
    clearTimeout(timer);
    if (error.name === 'AbortError') {
      throw new Error(
        `Request timed out after ${timeoutMs / 1000}s.\n\n` +
        `Target: ${url}\n\n` +
        `Make sure:\n` +
        `1. Backend is running: node server.js (port 5000)\n` +
        `2. If on a physical phone, update LOCAL_IP in mobile/config.js`
      );
    }
    throw new Error(
      `Network error: ${error.message}\n\nTarget: ${url}\n\nEnsure backend is running and accessible.`
    );
  }
};
