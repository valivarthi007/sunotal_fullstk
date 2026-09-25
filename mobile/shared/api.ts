declare const process: any;

const DEFAULT_BASE_URL = 'https://admin-sunotal.automateuniverse.space';

export const getApiBaseUrl = (): string => {
  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  return DEFAULT_BASE_URL;
};

export async function mobileApiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {},
  userToken?: string
): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (userToken) {
    headers['Authorization'] = `Bearer ${userToken}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = `API Error ${response.status}: ${response.statusText}`;
    try {
      const errJson = await response.json();
      if (errJson.message || errJson.error) {
        errorMsg = errJson.message || errJson.error;
      }
    } catch {}
    throw new Error(errorMsg);
  }

  return response.json();
}
