import { Platform } from 'react-native';
import Constants from 'expo-constants';

const DEFAULT_API = 'http://localhost:5050/api';
const DEFAULT_SOCKET = 'http://localhost:5050';
/** Android emulator alias for the dev machine (host loopback). */
const EMULATOR_HOST = '10.0.2.2';
const API_PORT = '5050';

function configuredApiUrl() {
  return (
    Constants.expoConfig?.extra?.apiUrl ||
    process.env.EXPO_PUBLIC_API_URL ||
    DEFAULT_API
  );
}

function configuredSocketUrl() {
  return (
    Constants.expoConfig?.extra?.socketUrl ||
    process.env.EXPO_PUBLIC_SOCKET_URL ||
    DEFAULT_SOCKET
  );
}

function isLocalhostHost(hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

function isLanHost(hostname) {
  if (!hostname || isLocalhostHost(hostname) || hostname === EMULATOR_HOST) return false;
  return (
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    hostname.startsWith('172.')
  );
}

/**
 * Expo Go on some AVDs reports isDevice=true even on an emulator.
 */
function isAndroidEmulator() {
  if (Platform.OS !== 'android') return false;
  if (Constants.isDevice === false) return true;

  const model = String(Constants.platform?.android?.modelName || '').toLowerCase();
  const product = String(Constants.platform?.android?.product || '').toLowerCase();
  const deviceName = String(Constants.deviceName || '').toLowerCase();
  return (
    model.includes('sdk_gphone') ||
    model.includes('emulator') ||
    model.includes('android sdk built for') ||
    model.includes('simulator') ||
    product.includes('sdk_gphone') ||
    product.includes('emulator') ||
    product.includes('google_sdk') ||
    deviceName.includes('emulator') ||
    deviceName.includes('simulator')
  );
}

function isIosSimulator() {
  return Platform.OS === 'ios' && Constants.isDevice === false;
}

/** Dev machine IP/host from the Metro bundler (same PC that serves the JS bundle). */
function getMetroDevHost() {
  const candidates = [
    Constants.expoConfig?.hostUri,
    Constants.expoGoConfig?.debuggerHost,
    Constants.manifest?.debuggerHost,
    Constants.linkingUri,
  ];

  for (const raw of candidates) {
    if (!raw || typeof raw !== 'string') continue;

    if (raw.includes('://')) {
      try {
        const parsed = new URL(raw);
        if (parsed.hostname) return parsed.hostname;
      } catch {
        /* fall through */
      }
    }

    const host = raw.split(':')[0].trim();
    if (host) return host;
  }

  return null;
}

function shouldUseEmulatorApiHost(metroHost) {
  if (Platform.OS !== 'android') return false;
  if (Constants.isDevice === false) return true;
  if (isAndroidEmulator()) return true;
  if (metroHost && isLocalhostHost(metroHost)) return true;
  return false;
}

/**
 * Pick the API hostname for the current device + Metro session.
 * - Android emulator → 10.0.2.2
 * - Physical phone → same LAN IP as Metro (avoids stale .env after DHCP changes)
 * - iOS simulator → localhost when .env uses LAN IP
 */
function resolveApiHostname(configuredHost) {
  const metroHost = getMetroDevHost();

  if (Platform.OS === 'android') {
    if (shouldUseEmulatorApiHost(metroHost)) {
      return EMULATOR_HOST;
    }

    if (metroHost && isLanHost(metroHost)) {
      return metroHost;
    }

    if (isLocalhostHost(configuredHost)) {
      return EMULATOR_HOST;
    }
  }

  if (Platform.OS === 'ios') {
    if (isIosSimulator() && (isLanHost(configuredHost) || configuredHost === EMULATOR_HOST)) {
      return 'localhost';
    }
    if (Constants.isDevice && metroHost && isLanHost(metroHost)) {
      return metroHost;
    }
  }

  return configuredHost;
}

function isHttpsProductionUrl(url) {
  if (!url) return false;
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
}

function normalizeConfiguredUrl(url, { ensureApiPath = false } = {}) {
  if (!url) return url;
  let out = url.replace(/\/$/, '');
  if (ensureApiPath && !out.endsWith('/api')) {
    out = `${out}/api`;
  }
  if (!ensureApiPath && out.endsWith('/api')) {
    out = out.slice(0, -4);
  }
  return out;
}

function adjustDevUrl(url, { ensureApiPath = false } = {}) {
  if (!url) return url;
  if (isHttpsProductionUrl(url)) {
    return normalizeConfiguredUrl(url, { ensureApiPath });
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }

  parsed.hostname = resolveApiHostname(parsed.hostname);
  if (!parsed.port) parsed.port = API_PORT;

  return normalizeConfiguredUrl(parsed.toString(), { ensureApiPath });
}

export function getApiBaseUrl() {
  return adjustDevUrl(configuredApiUrl(), { ensureApiPath: true });
}

export function getSocketUrl() {
  return adjustDevUrl(configuredSocketUrl(), { ensureApiPath: false });
}

export function getApiConfigDebugInfo() {
  const configuredApi = configuredApiUrl();
  const metroHost = getMetroDevHost();
  return {
    configuredApi,
    configuredSocket: configuredSocketUrl(),
    resolvedApi: getApiBaseUrl(),
    resolvedSocket: getSocketUrl(),
    metroHost,
    platform: Platform.OS,
    isDevice: Constants.isDevice,
    isAndroidEmulator: isAndroidEmulator(),
    androidModel: Constants.platform?.android?.modelName || null,
    envMode: /localhost|127\.0\.0\.1|10\.0\.2\.2/.test(configuredApi) ? 'emulator' : 'phone',
  };
}
