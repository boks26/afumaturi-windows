import { apiConfig, buildApiUrl } from "../config/api";

const TOKEN_KEY = "afumaturi_access_token";

export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
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
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    apiConfig.timeoutMs,
  );

  try {
    const token = tokenStorage.get();
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
