/**
 * 统一 API 入口。
 * 默认走同源（开发环境由 Vite 代理 /api、/uploads 到后端，
 * 生产环境由 Nginx 反代），也可用 VITE_API_BASE_URL 指定。
 */

export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL || '';

export function getAuthToken(): string | null {
  try {
    return sessionStorage.getItem('auth_token');
  } catch {
    return null;
  }
}

export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface ApiError extends Error {
  status?: number;
  code?: string;
  payload?: unknown;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...getAuthHeaders(),
    },
  });

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const err = new Error(data?.error || data?.message || `请求失败 (${res.status})`) as ApiError;
    err.status = res.status;
    err.code = data?.code;
    err.payload = data;
    throw err;
  }

  return data as T;
}

export async function apiPostJson<T = unknown>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
