import { apiConfig, buildApiUrl } from "../config/api";

const TOKEN_KEY = "afumaturi_access_token";
const REFRESH_TOKEN_KEY = "afumaturi_refresh_token";
const TOKEN_EXPIRES_AT_KEY = "afumaturi_token_expires_at";

export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  set: (token: string, refreshToken?: string, expiresIn?: number) => {
    localStorage.setItem(TOKEN_KEY, token);
    if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    if (expiresIn) {
      localStorage.setItem(
        TOKEN_EXPIRES_AT_KEY,
        String(Date.now() + expiresIn * 1000),
      );
    }
  },
  isExpired: () => {
    const expiresAt = Number(localStorage.getItem(TOKEN_EXPIRES_AT_KEY));
    return Number.isFinite(expiresAt) && expiresAt > 0
      ? Date.now() >= expiresAt - 30_000
      : false;
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRES_AT_KEY);
  },
};

interface RefreshResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

let refreshPromise: Promise<string> | null = null;

const refreshAccessToken = async (): Promise<string> => {
  const refreshToken = tokenStorage.getRefresh();
  if (!refreshToken || !apiConfig.oauthClientId) {
    tokenStorage.clear();
    throw new ApiError("Sesiunea a expirat. Autentifică-te din nou.", 401);
  }

  if (!refreshPromise) {
    refreshPromise = absoluteRequest<RefreshResponse>(
      `${apiConfig.baseUrl}/oauth/token`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          grant_type: "refresh_token",
          client_id: apiConfig.oauthClientId,
          client_secret: apiConfig.oauthClientSecret,
          refresh_token: refreshToken,
        }),
      },
    )
      .then((token) => {
        tokenStorage.set(
          token.access_token,
          token.refresh_token || refreshToken,
          token.expires_in,
        );
        return token.access_token;
      })
      .catch((error) => {
        tokenStorage.clear();
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  allowRefresh = true,
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    apiConfig.timeoutMs,
  );

  try {
    let token = tokenStorage.get();
    if ((!token || tokenStorage.isExpired()) && tokenStorage.getRefresh()) {
      token = await refreshAccessToken();
    }
    const response = await fetch(buildApiUrl(path), {
      ...options,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      signal: controller.signal,
    });

    const contentType = response.headers.get("content-type") ?? "";
    const body = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      if (
        response.status === 401 &&
        allowRefresh &&
        tokenStorage.getRefresh()
      ) {
        await refreshAccessToken();
        return apiRequest<T>(path, options, false);
      }
      if (response.status === 401) tokenStorage.clear();
      const message =
        typeof body === "object" && body !== null && "error" in body
          ? String(
              (body as { error?: { message?: string } }).error?.message ||
                `Cererea API a eșuat (${response.status}).`,
            )
          : `Cererea API a eșuat (${response.status}).`;
      throw new ApiError(message, response.status, body);
    }

    return body as T;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function absoluteRequest<T>(
  url: string,
  options: RequestInit,
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    apiConfig.timeoutMs,
  );
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      throw new ApiError(
        body?.error_description || `Cererea a eșuat (${response.status}).`,
        response.status,
        body,
      );
    }
    return body as T;
  } finally {
    window.clearTimeout(timeoutId);
  }
}
