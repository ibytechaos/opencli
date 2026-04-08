/**
 * Generate images using Gemini's native image generation (gemini-2.5-flash-image).
 *
 * API: POST /models/{model}:generateContent
 * The model returns inline base64-encoded image data.
 *
 * Usage:
 *   opencli gemini generate-image "a cat riding a skateboard"
 *   opencli gemini generate-image "sunset over mountains" --output sunset.png
 *   opencli gemini generate-image "pixel art dragon" --model gemini-2.5-flash-image
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { cli, Strategy } from '@jackwener/opencli/registry';
import { CliError } from '@jackwener/opencli/errors';
import { geminiApi } from './_shared/api.js';

function extFromMime(mime: string): string {
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('gif')) return 'gif';
  return 'jpg';
}

cli({
  site: 'gemini',
  name: 'image-api',
  description: 'Generate images using Gemini native image generation',
  strategy: Strategy.PUBLIC,
  browser: false,
  args: [
    { name: 'prompt', positional: true, required: true, help: 'Text prompt for image generation' },
    { name: 'output', help: 'Output file path (default: ./generated-{timestamp}.png)' },
    { name: 'model', default: 'gemini-2.5-flash-image', help: 'Model to use' },
  ],
  columns: ['status', 'file', 'mime_type'],
  func: async (_page, kwargs) => {
    const prompt = kwargs.prompt as string;
    const model = kwargs.model as string;

    const data = await geminiApi('POST', `/models/${model}:generateContent`, {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
    });

    const parts: any[] = data?.candidates?.[0]?.content?.parts ?? [];
    const imageParts = parts.filter(
      (p: any) => p.inlineData?.data && p.inlineData?.mimeType?.startsWith('image/'),
    );

    if (!imageParts.length) {
      const textPart = parts.find((p: any) => p.text);
      throw new CliError(
        'NO_IMAGE',
        'No image was generated',
        textPart?.text || 'Try a different prompt',
      );
    }

    const results: Record<string, string>[] = [];

    for (let i = 0; i < imageParts.length; i++) {
      const part = imageParts[i];
      const mimeType: string = part.inlineData.mimeType;
      const base64: string = part.inlineData.data;
      const ext = extFromMime(mimeType);

      const suffix = imageParts.length > 1 ? `-${i + 1}` : '';
      const outputPath =
        (kwargs.output as string) || `./generated-${Date.now()}${suffix}.${ext}`;

      mkdirSync(dirname(outputPath), { recursive: true });
      writeFileSync(outputPath, Buffer.from(base64, 'base64'));

      results.push({
        status: 'saved',
        file: outputPath,
        mime_type: mimeType,
      });
    }

    return results;
  },
});
