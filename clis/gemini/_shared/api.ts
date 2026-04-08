/**
 * Shared API helper for Google Gemini REST API.
 *
 * Auth via GOOGLE_API_KEY, passed as x-goog-api-key header (same as OpenClaw).
 * Uses Node.js built-in fetch() (Node 20+).
 */

import { CliError } from '@jackwener/opencli/errors';

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

function getApiKey(): string {
  const key = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!key) {
    throw new CliError(
      'AUTH_MISSING',
      'GOOGLE_API_KEY (or GEMINI_API_KEY) environment variable is not set',
      'Set it via: export GOOGLE_API_KEY=your_key (get from https://aistudio.google.com/apikey)',
    );
  }
  return key;
}

/**
 * Make an authenticated request to the Gemini API.
 */
export async function geminiApi(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: Record<string, unknown>,
): Promise<any> {
  const key = getApiKey();
  const url = `${BASE_URL}${path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-goog-api-key': key,
  };

  const init: RequestInit = { method, headers };
  if (body) init.body = JSON.stringify(body);

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

/** Expose API key for download operations (e.g. Veo video URI) */
export function getGeminiApiKey(): string {
  return getApiKey();
}
