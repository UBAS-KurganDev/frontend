const COOKIE_NAME = 'ubas_query_id';
const MAX_AGE = 7 * 24 * 60 * 60;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function readQueryCookie(): string | null {
  const entry = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`));
  if (!entry) return null;
  try {
    const value = decodeURIComponent(entry.slice(COOKIE_NAME.length + 1));
    return UUID.test(value) ? value : null;
  } catch {
    return null;
  }
}

function writeCookie(value: string, maxAge: number) {
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

export function saveQueryCookie(queryId: string): void {
  writeCookie(queryId, MAX_AGE);
}

export function clearQueryCookie(): void {
  writeCookie('', 0);
}
