import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// Routes that must NOT carry an Authorization header — auth endpoints work
// against credentials, not tokens, and a stale token can confuse middleware.
const NO_AUTH_PATHS = ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password'];

// Render free-tier services may take 30-60s to cold-start. Use a longer
// timeout for auth endpoints so the user doesn't see a misleading
// "incorrect password" when the real cause is cold-start latency.
const AUTH_TIMEOUT_MS = 60000;
const DEFAULT_TIMEOUT_MS = 30000;

const api = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  timeout: DEFAULT_TIMEOUT_MS,
});

api.interceptors.request.use(async (config) => {
  const url = config.url || '';
  const isAuthRoute = NO_AUTH_PATHS.some(p => url.includes(p));
  if (isAuthRoute) {
    if (config.headers && 'Authorization' in config.headers) {
      delete (config.headers as any).Authorization;
    }
    config.timeout = AUTH_TIMEOUT_MS;
  } else {
    const token = await AsyncStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't wipe the stored token on a 401 from the login attempt itself —
    // the user just typed wrong credentials, they aren't authenticated yet.
    const isAuthRoute = NO_AUTH_PATHS.some(p => (error.config?.url || '').includes(p));
    if (error.response?.status === 401 && !isAuthRoute) {
      AsyncStorage.removeItem('auth_token');
    }
    return Promise.reject(error);
  }
);

export default api;
