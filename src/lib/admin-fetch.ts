import { adminConfigState } from '@/src/store/admin-config';
import type { ApiEnvelope } from '@/src/types/admin';

const LOCALHOST_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0']);

function validateBaseUrl(baseUrl: string) {
  let url: URL;

  try {
    url = new URL(baseUrl);
  } catch {
    throw new Error('BASE_URL_INVALID');
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('BASE_URL_INVALID');
  }

  if (LOCALHOST_HOSTS.has(url.hostname)) {
    throw new Error('BASE_URL_LOCALHOST_UNREACHABLE');
  }
}

function getTransportError(error: unknown) {
  if (!(error instanceof Error)) {
    return error;
  }

  if (error.message === 'Network request failed') {
    return new Error('NETWORK_REQUEST_FAILED');
  }

  return error;
}

function buildRequestUrl(baseUrl: string, path: string) {
  const normalizedBase = baseUrl.trim().replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const duplicatedPrefixes = ['/api/v1', '/api'];

  for (const prefix of duplicatedPrefixes) {
    if (normalizedBase.endsWith(prefix) && normalizedPath.startsWith(`${prefix}/`)) {
      const baseWithoutPrefix = normalizedBase.slice(0, -prefix.length);
      return `${baseWithoutPrefix}${normalizedPath}`;
    }
  }

  return `${normalizedBase}${normalizedPath}`;
}

export async function adminFetch<T>(
  path: string,
  init: RequestInit = {},
  options?: { idempotencyKey?: string }
): Promise<T> {
  const baseUrl = adminConfigState.baseUrl.trim().replace(/\/$/, '');
  const adminApiKey = adminConfigState.adminApiKey.trim();

  if (!baseUrl) {
    throw new Error('BASE_URL_REQUIRED');
  }

  validateBaseUrl(baseUrl);

  if (!adminApiKey) {
    throw new Error('ADMIN_API_KEY_REQUIRED');
  }

  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (adminApiKey) {
    headers.set('x-api-key', adminApiKey);
  }

  if (options?.idempotencyKey) {
    headers.set('Idempotency-Key', options.idempotencyKey);
  }

  let response: Response;

  try {
    response = await fetch(buildRequestUrl(baseUrl, path), {
      ...init,
      headers,
    });
  } catch (error) {
    throw getTransportError(error);
  }

  let json: ApiEnvelope<T>;
  const rawText = await response.text();

  try {
    json = JSON.parse(rawText) as ApiEnvelope<T>;
  } catch {
    throw new Error('INVALID_SERVER_RESPONSE');
  }

  if (!response.ok || json.code !== 0) {
    throw new Error(json.reason || json.message || 'REQUEST_FAILED');
  }

  return json.data as T;
}
