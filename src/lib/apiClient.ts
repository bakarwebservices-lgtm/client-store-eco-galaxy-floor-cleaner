export interface SafeFetchResult<T = any> {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
  details?: any;
}

/**
 * Universal safe fetch wrapper for frontend components & form handlers.
 * - Safely handles non-JSON (HTML, plain text, 413, 502) error responses without crashing JSON.parse.
 * - Provides actionable, clean, user-friendly error messages.
 * - Masks internal technical error details / stack traces from end-users.
 */
export async function safeFetch<T = any>(
  url: string,
  options?: RequestInit
): Promise<SafeFetchResult<T>> {
  try {
    const res = await fetch(url, options);
    const text = await res.text().catch(() => '');
    let parsed: any = null;

    try {
      parsed = JSON.parse(text);
    } catch {
      // Plain text or HTML response (e.g. Vercel 413 / 502 / 504)
    }

    if (!res.ok) {
      if (res.status === 413) {
        return {
          ok: false,
          status: 413,
          data: null,
          error: 'The uploaded file or request payload is too large. Please reduce file size.',
        };
      }
      if (res.status === 401) {
        return {
          ok: false,
          status: 401,
          data: null,
          error: parsed?.error || 'Authentication required. Please sign in to continue.',
        };
      }
      if (res.status === 403) {
        return {
          ok: false,
          status: 403,
          data: null,
          error: parsed?.error || 'Access denied. You do not have permission to perform this action.',
        };
      }
      if (res.status === 404) {
        return {
          ok: false,
          status: 404,
          data: null,
          error: parsed?.error || 'The requested resource could not be found.',
        };
      }
      if (res.status === 409) {
        return {
          ok: false,
          status: 409,
          data: null,
          error: parsed?.error || 'A conflict occurred with existing data (such as a duplicate title, slug, or SKU).',
        };
      }
      if (res.status >= 500) {
        return {
          ok: false,
          status: res.status,
          data: null,
          error: typeof parsed?.error === 'string' && !parsed.error.includes('Prisma') && !parsed.error.includes('SELECT') && !parsed.error.includes('Error:')
            ? parsed.error
            : 'An unexpected server error occurred. Please try again or contact support.',
        };
      }

      const errorMessage =
        (typeof parsed?.error === 'string' ? parsed.error : parsed?.error?.message) ||
        (text && text.length < 150 && !text.includes('<!DOCTYPE') ? text : `Request failed (HTTP ${res.status}).`);

      return {
        ok: false,
        status: res.status,
        data: null,
        error: errorMessage,
        details: parsed?.details,
      };
    }

    return {
      ok: true,
      status: res.status,
      data: parsed as T,
      error: null,
    };
  } catch (err: any) {
    console.error(`Network error during request to ${url}:`, err);
    return {
      ok: false,
      status: 0,
      data: null,
      error: 'Network connection issue. Please verify your internet connection and try again.',
    };
  }
}
