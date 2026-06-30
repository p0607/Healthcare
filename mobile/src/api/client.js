/**
 * Axios client for the mobile app — the React Native counterpart of
 * frontend/src/lib/api.js.
 */
import axios from 'axios';
import { getToken, clearSession } from '../storage/session';
import { getApiBaseUrl, getApiConfigDebugInfo } from '../lib/apiConfig';
import { notifyUnauthorized } from '../lib/authSession';

export const api = axios.create({
  timeout: 30000,
});

api.interceptors.request.use(async (config) => {
  config.baseURL = getApiBaseUrl();
  const token = await getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err?.response?.status === 401) {
      await clearSession();
      notifyUnauthorized();
    }
    return Promise.reject(err);
  }
);

/** Friendly message extractor for showing API errors in the UI. */
export function apiErrorMessage(err, fallback = 'Something went wrong') {
  const serverMsg = err?.response?.data?.message;
  if (serverMsg) return serverMsg;

  const code = err?.code;
  const msg = String(err?.message || '');

  if (
    !err?.response &&
    (msg.includes('Network Error') ||
      code === 'ECONNABORTED' ||
      code === 'ERR_NETWORK' ||
      msg.includes('timeout'))
  ) {
    const { resolvedApi, configuredApi, isAndroidEmulator, envMode, androidModel, metroHost } =
      getApiConfigDebugInfo();
    let deviceHint =
      'Use npm run env:phone for a physical phone, or npm run env:emulator for the Android emulator.';
    if (isAndroidEmulator) {
      deviceHint = `Emulator — API uses ${resolvedApi}. Run: cd mobile && npm run start:emulator`;
    } else if (envMode === 'phone') {
      deviceHint = `Physical phone — API ${resolvedApi}. Same Wi-Fi; run: npm run backend:firewall if blocked.`;
    }
    if (metroHost && configuredApi && !configuredApi.includes(metroHost.split(':')[0])) {
      deviceHint += ` Metro host: ${metroHost}.`;
    }
    return (
      `Cannot reach the API at ${resolvedApi} (configured: ${configuredApi}). ` +
      `${deviceHint} Backend must be running: cd backend && npm run dev.`
    );
  }

  return msg || fallback;
}
