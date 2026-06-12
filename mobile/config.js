import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Adjust this address to match your development setup:
// 1. We dynamically check the Expo Metro bundler host IP so it works automatically on physical devices.
// 2. If not running in Expo dev, fall back to emulator/localhost defaults.
const getDevHost = () => {
  if (__DEV__) {
    // Constants.expoConfig?.hostUri contains the bundler host (e.g., '192.168.1.8:8081')
    const hostUri = Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost;
    if (hostUri) {
      const ip = hostUri.split(':')[0];
      if (ip) {
        console.log(`[Config] Resolved dev host IP from Metro: ${ip}`);
        return ip;
      }
    }
  }
  const defaultHost = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
  console.log(`[Config] Using fallback host: ${defaultHost}`);
  return defaultHost;
};

const host = getDevHost();

export const API_BASE_URL = `http://${host}:5000`;

/**
 * Perform a fetch request with a timeout limit.
 * Helps prevent the app from loading indefinitely on connection hang-ups.
 */
export const fetchWithTimeout = async (url, options = {}, timeout = 4000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new Error(`Timeout connecting to API server.\n\nTarget: ${url}\n\n1. Ensure your backend server is running on port 5000.\n2. If testing on a physical phone, make sure you configure your computer's local IP address in mobile/config.js.`);
    }
    throw new Error(`Network connection failed.\n\nTarget: ${url}\n\nEnsure backend is running and accessible.`);
  }
};
