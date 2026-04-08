/**
 * Update an existing chapter in Fanqie.
 *
 * API: POST /api/author/article/cover_article/v0/
 *
 * Usage:
 *   opencli fanqie update <item_id> --book_id <book_id> --title "新标题"
 *   opencli fanqie update <item_id> --book_id <book_id> --file chapter_v2.md
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import { cli, Strategy } from '@jackwener/opencli/registry';
import { ArgumentError } from '@jackwener/opencli/errors';
import type { IPage } from '@jackwener/opencli/types';
import { browserFetch } from './_shared/browser-fetch.js';

/** Convert plain text to Fanqie HTML format */
function textToHtml(text: string): string {
  return text
    .split(/\n+/)
    .filter((line) => line.trim())
    .map((line) => `<p>${line.trim()}</p>`)
    .join('');
}

cli({
  site: 'fanqie',
  name: 'update',
  description: '更新章节内容或标题',
  domain: 'fanqienovel.com',
  strategy: Strategy.COOKIE,
  args: [
    { name: 'item_id', required: true, positional: true, help: '章节 item_id' },
    { name: 'book_id', required: true, help: '作品 ID' },
    { name: 'title', help: '新章节标题' },
    { name: 'file', help: '新内容文件路径' },
    { name: 'content', help: '新正文内容' },
  ],
  columns: ['status', 'item_id', 'word_count'],
  func: async (page: IPage, kwargs) => {
    const itemId = kwargs.item_id as string;
    const bookId = kwargs.book_id as string;
    const title = kwargs.title as string | undefined;
    const filePath = kwargs.file as string | undefined;

    let rawContent = kwargs.content as string | undefined;
    if (filePath) {
      const absPath = path.resolve(filePath);
      if (!fs.existsSync(absPath)) {
        throw new ArgumentError(`File not found: ${absPath}`);
      }
      rawContent = fs.readFileSync(absPath, 'utf-8');
    }

    if (!title && !rawContent) {
      throw new ArgumentError('必须提供 --title、--file 或 --content');
    }

    const body: Record<string, string | number | boolean> = {
      book_id: bookId,
      item_id: itemId,
    };
    if (title) body.title = title;
    if (rawContent) body.content = textToHtml(rawContent);

    await browserFetch(page, 'POST', '/api/author/article/cover_article/v0/', { body });

    const wordCount = rawContent ? rawContent.replace(/\s/g, '').length : '-';

    return [{
      status: '✅ 已更新',
      item_id: itemId,
      word_count: wordCount,
    }];
  },
});
