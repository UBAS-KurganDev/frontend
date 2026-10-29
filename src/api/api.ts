import axios from 'axios';

export function resolveApiUrl(configuredApiUrl?: string): string {
  const base = configuredApiUrl?.trim().replace(/\/+$/, '') || '';
  if (base.endsWith('/api/v1')) return base;
  if (base.endsWith('/api')) return `${base}/v1`;
  return `${base}/api/v1`;
}

export const API_URL = resolveApiUrl(import.meta.env.VITE_API_URL);

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});
