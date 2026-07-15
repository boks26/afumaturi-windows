const removeTrailingSlashes = (value: string) => value.replace(/\/+$/, '');
const normalizePath = (value: string) => `/${value.replace(/^\/+|\/+$/g, '')}`;

const baseUrl = removeTrailingSlashes(import.meta.env.VITE_API_BASE_URL || 'http://localhost');
const apiPath = normalizePath(import.meta.env.VITE_API_PATH || '/api');
const parsedTimeout = Number(import.meta.env.VITE_API_TIMEOUT_MS || 15000);

export const apiConfig = Object.freeze({
  baseUrl,
  apiPath,
  timeoutMs: Number.isFinite(parsedTimeout) && parsedTimeout > 0 ? parsedTimeout : 15000,
  apiUrl: `${baseUrl}${apiPath}`,
  oauthClientId: import.meta.env.VITE_OAUTH_CLIENT_ID || '',
  oauthClientSecret: import.meta.env.VITE_OAUTH_CLIENT_SECRET || '',
});

export const buildApiUrl = (path = '') =>
  `${apiConfig.apiUrl}${path ? normalizePath(path) : ''}`;
