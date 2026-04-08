/**
 * Generate videos using Veo via Gemini API.
 *
 * API: POST /models/veo-3.0-generate-001:predictLongRunning (async)
 * Then poll: GET /operations/{name} until done.
 *
 * Usage:
 *   opencli gemini video-api "a dog playing fetch on the beach"
 *   opencli gemini video-api "timelapse flower" --duration 8 --aspect-ratio 9:16
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { cli, Strategy } from '@jackwener/opencli/registry';
import { CliError } from '@jackwener/opencli/errors';
import { geminiApi } from './_shared/api.js';

const POLL_INTERVAL_MS = 10_000;
const MAX_POLL_TIME_MS = 10 * 60 * 1_000;

async function pollOperation(operationName: string): Promise<any> {
  const start = Date.now();
  let lastStatus = '';

  while (Date.now() - start < MAX_POLL_TIME_MS) {
    const op = await geminiApi('GET', `/${operationName}`);

    if (op.done) {
      if (op.error) {
        throw new CliError(
          'VIDEO_ERROR',
          `Video generation failed: ${op.error.message || JSON.stringify(op.error)}`,
          'Try a different prompt',
        );
      }
      return op.response ?? op;
    }

    const elapsed = Math.round((Date.now() - start) / 1000);
    const status = `Generating... ${elapsed}s`;
    if (status !== lastStatus) {
      process.stderr.write(`\r${status}`);
      lastStatus = status;
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  throw new CliError('TIMEOUT', 'Video generation timed out after 10 minutes');
}

cli({
  site: 'gemini',
  name: 'video-api',
  description: 'Generate videos using Veo 3 API',
  strategy: Strategy.PUBLIC,
  browser: false,
  args: [
    { name: 'prompt', positional: true, required: true, help: 'Text prompt for video generation' },
    { name: 'output', help: 'Output file path (default: ./veo_{timestamp}.mp4)' },
    { name: 'duration', type: 'int', default: 6, help: 'Duration in seconds (4-8)' },
    { name: 'aspect-ratio', default: '16:9', help: 'Aspect ratio: 16:9, 9:16, or 1:1' },
    { name: 'model', default: 'veo-3.0-generate-001', help: 'Model: veo-3.0-generate-001 or veo-2.0-generate-001' },
  ],
  columns: ['status', 'file'],
  func: async (_page, kwargs) => {
    const prompt = kwargs.prompt as string;
    const model = kwargs.model as string;
    const duration = kwargs.duration as number;
    const aspectRatio = kwargs['aspect-ratio'] as string;

    if (duration < 4 || duration > 8) {
      throw new CliError('INVALID_ARG', `Duration must be 4-8 seconds, got ${duration}`);
    }

    // Start async video generation
    const operation = await geminiApi('POST', `/models/${model}:predictLongRunning`, {
      instances: [{ prompt }],
      parameters: {
        aspectRatio,
        durationSeconds: Number(duration),
      },
    });

    const operationName: string = operation.name;
    if (!operationName) {
      throw new CliError('API_ERROR', 'No operation name returned');
    }

    process.stderr.write('Video generation started, polling...\n');

    // Poll until complete
    const response = await pollOperation(operationName);
    process.stderr.write('\n');

    // Extract video data
    const videos: any[] = response?.generateVideoResponse?.generatedSamples
      ?? response?.generatedVideos ?? response?.videos ?? [];

    if (!videos.length) {
      throw new CliError('NO_VIDEO', 'No video generated', 'Try a different prompt');
    }

    const results: Record<string, string>[] = [];

    const apiKey = process.env.GOOGLE_API_KEY!;

    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];
      const uri: string = video.video?.uri ?? video.uri ?? '';
      const base64: string = video.video?.bytesBase64Encoded ?? video.bytesBase64Encoded ?? '';

      const suffix = videos.length > 1 ? `-${i + 1}` : '';
      const outputPath = (kwargs.output as string) || `./veo_${Date.now()}${suffix}.mp4`;
      mkdirSync(dirname(outputPath), { recursive: true });

      if (uri) {
        // Download video from URI (append API key for auth)
        const downloadUrl = uri + (uri.includes('?') ? '&' : '?') + `key=${apiKey}`;
        const res = await fetch(downloadUrl);
        if (!res.ok) {
          results.push({ status: `❌ download failed (${res.status})`, file: '-' });
          continue;
        }
        const buf = Buffer.from(await res.arrayBuffer());
        writeFileSync(outputPath, buf);
        const sizeMB = (buf.length / 1024 / 1024).toFixed(1);
        results.push({ status: `✅ saved (${sizeMB}MB)`, file: outputPath });
      } else if (base64) {
        const buf = Buffer.from(base64, 'base64');
        writeFileSync(outputPath, buf);
        const sizeMB = (buf.length / 1024 / 1024).toFixed(1);
        results.push({ status: `✅ saved (${sizeMB}MB)`, file: outputPath });
      } else {
        results.push({ status: '❌ no video data', file: '-' });
      }
    }

    return results;
  },
});
