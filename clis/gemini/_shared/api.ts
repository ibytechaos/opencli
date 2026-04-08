/**
 * Shared API helper for Google Gemini REST API.
 *
 * Auth is via the GOOGLE_API_KEY environment variable, passed as a query parameter.
 * Uses Node.js built-in fetch() (Node 20+).
 */

import { CliError } from '@jackwener/opencli/errors';

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

function getApiKey(): string {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) {
    throw new CliError(
      'AUTH_MISSING',
      'GOOGLE_API_KEY environment variable is not set',
      'Set it via: export GOOGLE_API_KEY=your_key',
    );
  }
  return key;
}

/**
 * Make an authenticated request to the Gemini API.
 *
 * @param method  HTTP method (GET, POST, etc.)
 * @param path    API path, e.g. `/models/gemini-2.0-flash-exp:generateContent`
 * @param body    Optional JSON body (will be serialised automatically)
 * @returns       Parsed JSON response
 */
export async function geminiApi(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: Record<string, unknown>,
): Promise<any> {
  const key = getApiKey();
  const sep = path.includes('?') ? '&' : '?';
  const url = `${BASE_URL}${path}${sep}key=${key}`;

  const init: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };

  if (body) {
    init.body = JSON.stringify(body);
  }

  const res = await fetch(url, init);

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new CliError(
      'API_ERROR',
      `Gemini API ${res.status}: ${res.statusText}`,
      text || 'Check your API key and request parameters',
    );
  }

  return res.json();
}
