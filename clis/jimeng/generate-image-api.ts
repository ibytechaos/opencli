/**
 * Text-to-image via Volcengine Ark API (Seedream).
 *
 * API: POST https://ark.cn-beijing.volces.com/api/v3/images/generations
 * Auth: Bearer ARK_API_KEY
 * Models: doubao-seedream-5-0-260128, doubao-seedream-4.5, doubao-seedream-4.0, doubao-seedream-3.0-t2i
 *
 * Usage:
 *   opencli jimeng generate-image-api "一只猫坐在月球上"
 *   opencli jimeng generate-image-api "日落山景" --size 2848x1600 --output sunset.png
 *   opencli jimeng generate-image-api "产品海报" --model doubao-seedream-5-0-260128 --response-format b64_json
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { cli, Strategy } from '@jackwener/opencli/registry';
import { ConfigError, CommandExecutionError } from '@jackwener/opencli/errors';

const ARK_BASE = 'https://ark.cn-beijing.volces.com/api/v3';

cli({
  site: 'jimeng',
  name: 'generate-image-api',
  description: '火山方舟 Seedream 文生图 (doubao-seedream-5-0-260128/4.5/4.0)',
  strategy: Strategy.PUBLIC,
  browser: false,
  args: [
    { name: 'prompt', positional: true, required: true, help: '图片描述，支持中英文（建议不超过300汉字）' },
    { name: 'output', default: '', help: '输出文件路径（默认: seedream_{timestamp}.png）' },
    { name: 'model', default: 'doubao-seedream-5-0-260128', help: '模型: doubao-seedream-5.0-lite/4.5/4.0/3.0-t2i' },
    { name: 'size', default: '2048x2048', help: '图片尺寸: WxH（如 2048x2048, 2848x1600, 1600x2848）' },
    { name: 'response-format', default: 'b64_json', help: '返回格式: url 或 b64_json' },
    { name: 'no-watermark', type: 'bool', default: false, help: '不添加水印' },
  ],
  columns: ['status', 'file_path', 'size', 'model'],
  func: async (_page, kwargs) => {
    const apiKey = process.env.ARK_API_KEY;
    if (!apiKey) {
      throw new ConfigError(
        'Missing ARK_API_KEY. Get it from https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey',
      );
    }

    const prompt = kwargs.prompt as string;
    const model = kwargs.model as string;
    const size = kwargs.size as string;
    const responseFormat = kwargs['response-format'] as string;
    const noWatermark = kwargs['no-watermark'] as boolean;
    const timestamp = Date.now();
    const output = resolve((kwargs.output as string) || `seedream_${timestamp}.png`);

    const body: Record<string, unknown> = {
      model,
      prompt,
      size,
      response_format: responseFormat,
      watermark: !noWatermark,
    };

    const res = await fetch(`${ARK_BASE}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new CommandExecutionError(`Ark API HTTP ${res.status}: ${text.slice(0, 300)}`);
    }

    const json = (await res.json()) as {
      error?: { code?: string; message?: string };
      data?: Array<{ url?: string; b64_json?: string; size?: string }>;
      model?: string;
    };

    if (json.error) {
      throw new CommandExecutionError(
        `Ark API error: ${json.error.code} — ${json.error.message}`,
      );
    }

    const imageData = json.data?.[0];
    if (!imageData) {
      throw new CommandExecutionError('No image data returned');
    }

    // Save image
    mkdirSync(dirname(output), { recursive: true });

    if (imageData.b64_json) {
      writeFileSync(output, Buffer.from(imageData.b64_json, 'base64'));
    } else if (imageData.url) {
      const imgRes = await fetch(imageData.url);
      if (!imgRes.ok) throw new CommandExecutionError(`Failed to download image from URL`);
      writeFileSync(output, Buffer.from(await imgRes.arrayBuffer()));
    } else {
      throw new CommandExecutionError('No image URL or base64 in response');
    }

    return [{
      status: '✅ 生成成功',
      file_path: output,
      size: imageData.size || size,
      model: json.model || model,
    }];
  },
});
