/**
 * High-quality image generation via Imagen 4.
 *
 * API: POST /models/imagen-4.0-generate-001:predict
 * Returns base64-encoded images in predictions[].bytesBase64Encoded.
 *
 * Usage:
 *   opencli gemini imagen "a photorealistic cat in a spacesuit"
 *   opencli gemini imagen "abstract art" --count 4 --aspect-ratio 16:9
 *   opencli gemini imagen "logo design" --output logo.png
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { cli, Strategy } from '@jackwener/opencli/registry';
import { CliError } from '@jackwener/opencli/errors';
import { geminiApi } from './_shared/api.js';

cli({
  site: 'gemini',
  name: 'imagen-api',
  description: 'Generate high-quality images via Imagen 4',
  strategy: Strategy.PUBLIC,
  browser: false,
  args: [
    { name: 'prompt', positional: true, required: true, help: 'Text prompt for image generation' },
    { name: 'output', help: 'Output file path (default: ./imagen-{timestamp}.png)' },
    { name: 'count', type: 'int', default: 1, help: 'Number of images to generate (1-4)' },
    { name: 'aspect-ratio', default: '1:1', help: 'Aspect ratio: 1:1, 16:9, 9:16, 4:3, 3:4' },
    { name: 'model', default: 'imagen-4.0-generate-001', help: 'Model to use' },
  ],
  columns: ['status', 'file', 'index'],
  func: async (_page, kwargs) => {
    const prompt = kwargs.prompt as string;
    const model = kwargs.model as string;
    const count = Math.max(1, Math.min(kwargs.count as number, 4));
    const aspectRatio = kwargs['aspect-ratio'] as string;

    const allowedRatios = new Set(['1:1', '16:9', '9:16', '4:3', '3:4']);
    if (!allowedRatios.has(aspectRatio)) {
      throw new CliError(
        'INVALID_ARG',
        `Invalid aspect ratio: ${aspectRatio}`,
        'Use 1:1, 16:9, 9:16, 4:3, or 3:4',
      );
    }

    const data = await geminiApi('POST', `/models/${model}:predict`, {
      instances: [{ prompt }],
      parameters: {
        sampleCount: count,
        aspectRatio,
      },
    });

    const predictions: any[] = data?.predictions ?? [];
    if (!predictions.length) {
      throw new CliError('NO_IMAGE', 'No images were generated', 'Try a different prompt');
    }

    const results: Record<string, string>[] = [];
    const timestamp = Date.now();

    for (let i = 0; i < predictions.length; i++) {
      const base64: string = predictions[i].bytesBase64Encoded;
      if (!base64) {
        results.push({ status: 'error', file: 'no image data', index: String(i + 1) });
        continue;
      }

      const suffix = predictions.length > 1 ? `-${i + 1}` : '';
      const outputPath = (kwargs.output as string) || `./imagen-${timestamp}${suffix}.png`;

      mkdirSync(dirname(outputPath), { recursive: true });
      writeFileSync(outputPath, Buffer.from(base64, 'base64'));

      results.push({
        status: 'saved',
        file: outputPath,
        index: String(i + 1),
      });
    }

    return results;
  },
});
