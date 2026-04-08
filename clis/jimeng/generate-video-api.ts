/**
 * Text-to-video generation via Volcengine Ark API (Seedance).
 *
 * Submits an async task, then polls until the video is ready or times out.
 * The generated video is downloaded and saved to a local file.
 *
 * Usage:
 *   opencli jimeng generate-video-api "a golden retriever running on the beach"
 *   opencli jimeng generate-video-api "city timelapse" --duration 10 --aspect-ratio 9:16 --output city.mp4
 */

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cli, Strategy } from '@jackwener/opencli/registry';
import { ConfigError, CommandExecutionError, TimeoutError } from '@jackwener/opencli/errors';

const ARK_BASE = 'https://ark.cn-beijing.volces.com/api/v3';
const MODEL = 'doubao-seedance-2-0-260128';
const POLL_INTERVAL_MS = 5_000;
const MAX_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

cli({
  site: 'jimeng',
  name: 'generate-video-api',
  description: '火山引擎 Seedance 文生视频 API (需要 ARK_API_KEY)',
  strategy: Strategy.PUBLIC,
  browser: false,
  args: [
    { name: 'prompt', positional: true, required: true, help: '视频描述 prompt' },
    { name: 'output', help: '输出文件路径 (默认: jimeng_video.mp4)', default: 'jimeng_video.mp4' },
    { name: 'duration', type: 'int' as const, default: 5, help: '视频时长 (5 或 10 秒)' },
    { name: 'aspect-ratio', help: '画面比例: 16:9, 9:16, 1:1 (默认 16:9)', default: '16:9' },
  ],
  columns: ['status', 'file_path', 'size', 'duration', 'prompt'],
  func: async (_page, kwargs) => {
    const apiKey = process.env.ARK_API_KEY;
    if (!apiKey) {
      throw new ConfigError(
        'Missing ARK_API_KEY environment variable. ' +
        'Set it with your Volcengine Ark API key for Seedance video generation.',
      );
    }

    const prompt = kwargs.prompt as string;
    const output = resolve(kwargs.output as string);
    const duration = kwargs.duration as number;
    const aspectRatio = kwargs['aspect-ratio'] as string;

    // Validate args
    if (![5, 10].includes(duration)) {
      throw new CommandExecutionError('Duration must be 5 or 10 seconds');
    }
    if (!['16:9', '9:16', '1:1'].includes(aspectRatio)) {
      throw new CommandExecutionError('Aspect ratio must be 16:9, 9:16, or 1:1');
    }

    const authHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    };

    // Step 1: Submit generation task
    const createBody = JSON.stringify({
      model: MODEL,
      content: [{ type: 'text', text: prompt }],
      parameters: { duration, aspect_ratio: aspectRatio },
    });

    const createRes = await fetch(`${ARK_BASE}/contents/generations/tasks`, {
      method: 'POST',
      headers: authHeaders,
      body: createBody,
    });

    if (!createRes.ok) {
      const text = await createRes.text();
      throw new CommandExecutionError(`Ark API returned HTTP ${createRes.status}: ${text}`);
    }

    const createJson = (await createRes.json()) as {
      id?: string;
      error?: { message?: string; code?: string };
    };

    if (createJson.error) {
      throw new CommandExecutionError(
        `Ark API error: ${createJson.error.message ?? createJson.error.code ?? 'unknown'}`,
      );
    }

    const taskId = createJson.id;
    if (!taskId) {
      throw new CommandExecutionError('No task ID returned from Ark API');
    }

    // Step 2: Poll for completion
    const startTime = Date.now();
    let videoUrl: string | undefined;

    while (Date.now() - startTime < MAX_TIMEOUT_MS) {
      await sleep(POLL_INTERVAL_MS);

      const pollRes = await fetch(`${ARK_BASE}/contents/generations/tasks/${taskId}`, {
        method: 'GET',
        headers: authHeaders,
      });

      if (!pollRes.ok) {
        const text = await pollRes.text();
        throw new CommandExecutionError(`Ark poll API returned HTTP ${pollRes.status}: ${text}`);
      }

      const pollJson = (await pollRes.json()) as {
        status?: string;
        content?: { type?: string; url?: string; video_url?: string }[];
        error?: { message?: string };
      };

      if (pollJson.status === 'succeeded') {
        // Extract video URL from response
        const videoContent = pollJson.content?.find(
          (c) => c.type === 'video' || c.video_url || c.url,
        );
        videoUrl = videoContent?.video_url ?? videoContent?.url;
        break;
      }

      if (pollJson.status === 'failed') {
        throw new CommandExecutionError(
          `Video generation failed: ${pollJson.error?.message ?? 'unknown error'}`,
        );
      }

      // status is still "running" / "pending" — continue polling
    }

    if (!videoUrl) {
      throw new TimeoutError('Video generation', 300, `Task ID: ${taskId} — you can check status later.`);
    }

    // Step 3: Download video
    const downloadRes = await fetch(videoUrl);
    if (!downloadRes.ok) {
      throw new CommandExecutionError(`Failed to download video: HTTP ${downloadRes.status}`);
    }
    const arrayBuffer = await downloadRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    writeFileSync(output, buffer);

    const sizeMB = (buffer.length / (1024 * 1024)).toFixed(1);

    return [
      {
        status: 'success',
        file_path: output,
        size: `${sizeMB} MB`,
        duration: `${duration}s`,
        prompt: prompt.length > 60 ? prompt.slice(0, 57) + '...' : prompt,
      },
    ];
  },
});
