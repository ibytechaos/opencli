import type { IPage } from '@jackwener/opencli/types';
import { CommandExecutionError } from '@jackwener/opencli/errors';

export interface FetchOptions {
  body?: Record<string, string | number | boolean>;
  headers?: Record<string, string>;
  params?: Record<string, string | number>;
  /** Use JSON body instead of form-urlencoded (default: form-urlencoded) */
  json?: boolean;
}

/** Common query params required by all Fanqie APIs */
const BASE_PARAMS = 'aid=2503&app_name=muye_novel';

/**
 * Execute a fetch() inside the Chrome browser context.
 * Cookies and msToken are handled automatically by the browser.
 *
 * Fanqie APIs use application/x-www-form-urlencoded for POST by default.
 */
export async function browserFetch(
  page: IPage,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  options: FetchOptions = {}
): Promise<unknown> {
  // Build URL with base params
  const sep = path.includes('?') ? '&' : '?';
  let url = `https://fanqienovel.com${path}${sep}${BASE_PARAMS}`;
  if (options.params) {
    const qs = new URLSearchParams(
      Object.entries(options.params).map(([k, v]) => [k, String(v)])
    ).toString();
    url += '&' + qs;
  }

  let bodyCode = '';
  let contentType = 'application/x-www-form-urlencoded';

  if (options.body) {
    if (options.json) {
      contentType = 'application/json';
      bodyCode = `body: JSON.stringify(${JSON.stringify(options.body)}),`;
    } else {
      // Form-urlencoded (default for Fanqie)
      const formParts = Object.entries(options.body)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&');
      bodyCode = `body: ${JSON.stringify(formParts)},`;
    }
  }

  const js = `
    (async () => {
      const res = await fetch(${JSON.stringify(url)}, {
        method: ${JSON.stringify(method)},
        credentials: 'include',
        headers: {
          'Content-Type': ${JSON.stringify(contentType)},
          ...${JSON.stringify(options.headers ?? {})}
        },
        ${bodyCode}
      });
      return res.json();
    })()
  `;

  const result = await page.evaluate(js);

  // Fanqie API returns { code: 0, message: 'success', data: ... }
  if (result && typeof result === 'object' && 'code' in result) {
    const code = (result as { code: number }).code;
    if (code !== 0) {
      const msg = (result as { msg?: string; message?: string }).msg
        ?? (result as { message?: string }).message
        ?? 'unknown error';
      throw new CommandExecutionError(`Fanqie API error ${code}: ${msg}`);
    }
  }

  return result;
}
