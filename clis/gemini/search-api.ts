/**
 * Google Search via Gemini API with grounding (no browser needed).
 *
 * API: POST /models/gemini-2.5-flash:generateContent
 * Uses googleSearch tool for grounded results with citations.
 *
 * Usage:
 *   opencli gemini search-api "latest TypeScript features"
 *   opencli gemini search-api "具身机器人开源项目 2025"
 */

import { cli, Strategy } from '@jackwener/opencli/registry';
import { CliError } from '@jackwener/opencli/errors';
import { geminiApi } from './_shared/api.js';

cli({
  site: 'gemini',
  name: 'search-api',
  description: 'Google Search via Gemini API (grounding, 无需浏览器)',
  strategy: Strategy.PUBLIC,
  browser: false,
  defaultFormat: 'plain',
  args: [
    { name: 'query', positional: true, required: true, help: 'Search query (中英文均可)' },
    { name: 'model', default: 'gemini-2.5-flash', help: 'Model to use' },
  ],
  columns: ['answer'],
  func: async (_page, kwargs) => {
    const query = kwargs.query as string;
    const model = kwargs.model as string;

    const data = await geminiApi('POST', `/models/${model}:generateContent`, {
      contents: [{ parts: [{ text: query }] }],
      tools: [{ googleSearch: {} }],
    });

    const candidate = data?.candidates?.[0];
    if (!candidate) {
      throw new CliError('NO_RESULT', 'No results returned', 'Try a different query');
    }

    // Extract text answer
    const textParts: string[] = (candidate.content?.parts ?? [])
      .filter((p: any) => p.text)
      .map((p: any) => p.text);

    // Extract grounding sources
    const groundingMeta = candidate.groundingMetadata;
    const chunks: any[] = groundingMeta?.groundingChunks ?? [];
    const sources = chunks
      .filter((c: any) => c.web?.uri)
      .map((c: any) => `- [${c.web?.title || c.web?.uri}](${c.web?.uri})`)
      .join('\n');

    const answer = textParts.join('\n\n');
    const fullResponse = sources
      ? `${answer}\n\n---\nSources:\n${sources}`
      : answer;

    return [{ answer: fullResponse }];
  },
});
