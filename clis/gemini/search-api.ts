/**
 * Google Search via Gemini API with grounding (no browser needed).
 *
 * Returns structured results optimized for agent consumption:
 * - content: synthesized answer text
 * - citations: array of {title, url} with resolved real URLs
 *
 * Output format follows OpenClaw's web_search payload convention.
 *
 * Usage:
 *   opencli gemini search-api "latest TypeScript features"
 *   opencli gemini search-api "具身机器人开源项目 2025"
 */

import { cli, Strategy } from '@jackwener/opencli/registry';
import { CliError } from '@jackwener/opencli/errors';
import { geminiApi } from './_shared/api.js';

/** Resolve Google redirect URL to real URL via HEAD request */
async function resolveRedirectUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(5000),
    });
    return res.url || url;
  } catch {
    return url;
  }
}

cli({
  site: 'gemini',
  name: 'search-api',
  description: 'Google Search via Gemini API (grounding, 无需浏览器)',
  strategy: Strategy.PUBLIC,
  browser: false,
  defaultFormat: 'yaml',
  args: [
    { name: 'query', positional: true, required: true, help: 'Search query (中英文均可)' },
    { name: 'model', default: 'gemini-2.5-flash', help: 'Model to use' },
  ],
  columns: ['query', 'provider', 'content', 'citations'],
  func: async (_page, kwargs) => {
    const query = kwargs.query as string;
    const model = kwargs.model as string;

    const start = Date.now();
    const data = await geminiApi('POST', `/models/${model}:generateContent`, {
      contents: [{ parts: [{ text: query }] }],
      tools: [{ google_search: {} }],
    });

    const candidate = data?.candidates?.[0];
    if (!candidate) {
      throw new CliError('NO_RESULT', 'No results returned', 'Try a different query');
    }

    // Extract answer text
    const content = (candidate.content?.parts ?? [])
      .filter((p: any) => p.text)
      .map((p: any) => p.text)
      .join('\n\n');

    // Extract and resolve grounding sources
    const rawChunks: any[] = candidate.groundingMetadata?.groundingChunks ?? [];
    const rawCitations = rawChunks
      .filter((c: any) => c.web?.uri)
      .map((c: any) => ({ url: c.web!.uri!, title: c.web?.title || '' }));

    // Resolve redirect URLs in batches of 5
    const citations: Array<{ title: string; url: string }> = [];
    for (let i = 0; i < rawCitations.length; i += 5) {
      const batch = rawCitations.slice(i, i + 5);
      const resolved = await Promise.all(
        batch.map(async (c) => ({
          title: c.title,
          url: await resolveRedirectUrl(c.url),
        })),
      );
      citations.push(...resolved);
    }

    const tookMs = Date.now() - start;

    // Return structured payload (agent-friendly, follows OpenClaw convention)
    return [{
      query,
      provider: 'gemini',
      model,
      tookMs,
      content,
      citations: JSON.stringify(citations),
    }];
  },
});
