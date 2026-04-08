/**
 * Publish a chapter to Fanqie (番茄小说发布章节).
 *
 * Two-step process:
 *   1. POST /api/author/article/new_article/v0/ — create draft, get item_id
 *   2. POST /api/author/article/cover_article/v0/ — save title + content
 *
 * Platform rules:
 *   - Title must be ≥5 chars, chapter number in Arabic digits (第1章, not 第一章)
 *   - Content must be ≥1000 chars
 *   - Content is HTML: wrap paragraphs in <p> tags
 *
 * Usage:
 *   opencli fanqie publish <book_id> --title "第99章 新的开始" --file chapter.md
 *   opencli fanqie publish <book_id> --title "第99章 新的开始" --content "正文内容..."
 *   opencli fanqie publish <book_id> --title "第99章" --file ch.md --draft
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import { cli, Strategy } from '@jackwener/opencli/registry';
import { ArgumentError, CommandExecutionError } from '@jackwener/opencli/errors';
import type { IPage } from '@jackwener/opencli/types';
import { browserFetch } from './_shared/browser-fetch.js';
import type { FanqieResponse, NewArticleData } from './_shared/types.js';

/** Convert plain text to Fanqie HTML format (each paragraph wrapped in <p>) */
function textToHtml(text: string): string {
  return text
    .split(/\n+/)
    .filter((line) => line.trim())
    .map((line) => `<p>${line.trim()}</p>`)
    .join('');
}

cli({
  site: 'fanqie',
  name: 'publish',
  description: '发布/保存章节',
  domain: 'fanqienovel.com',
  strategy: Strategy.COOKIE,
  args: [
    { name: 'book_id', required: true, positional: true, help: '作品 ID' },
    { name: 'title', required: true, help: '章节标题（≥5字，序号用阿拉伯数字）' },
    { name: 'file', help: '章节内容文件路径（.txt/.md）' },
    { name: 'content', help: '章节正文内容（与 --file 二选一）' },
    { name: 'draft', type: 'bool', default: false, help: '仅保存为草稿' },
    { name: 'item_id', help: '更新已有草稿（传入 item_id）' },
  ],
  columns: ['status', 'item_id', 'title', 'word_count'],
  func: async (page: IPage, kwargs) => {
    const bookId = kwargs.book_id as string;
    const title = kwargs.title as string;
    const filePath = kwargs.file as string | undefined;
    const isDraft = kwargs.draft as boolean;
    let itemId = kwargs.item_id as string | undefined;

    // Validate title
    if (title.length < 5) {
      throw new ArgumentError('标题至少5个字');
    }
    if (/第[一二三四五六七八九十百千万]+章/.test(title)) {
      throw new ArgumentError('章节序号必须用阿拉伯数字（第1章），不能用中文数字（第一章）');
    }

    // Resolve content
    let rawContent = kwargs.content as string | undefined;
    if (filePath) {
      const absPath = path.resolve(filePath);
      if (!fs.existsSync(absPath)) {
        throw new ArgumentError(`File not found: ${absPath}`);
      }
      rawContent = fs.readFileSync(absPath, 'utf-8');
    }
    if (!rawContent || rawContent.trim().length === 0) {
      throw new ArgumentError('必须提供 --file 或 --content');
    }

    const wordCount = rawContent.replace(/\s/g, '').length;
    if (wordCount < 1000) {
      throw new ArgumentError(`正文至少1000字，当前仅 ${wordCount} 字`);
    }

    // Convert to HTML
    const htmlContent = textToHtml(rawContent);

    // Step 1: Create new draft if no item_id provided
    if (!itemId) {
      const createRes = (await browserFetch(page, 'POST', '/api/author/article/new_article/v0/', {
        body: {
          book_id: bookId,
          need_reuse: 1,
        },
      })) as FanqieResponse<NewArticleData>;

      itemId = createRes.data?.item_id;
      if (!itemId) {
        throw new CommandExecutionError('Failed to create new article draft');
      }
    }

    // Step 2: Save content
    await browserFetch(page, 'POST', '/api/author/article/cover_article/v0/', {
      body: {
        book_id: bookId,
        item_id: itemId,
        title,
        content: htmlContent,
      },
    });

    // Step 3: Get volume info for publish
    if (!isDraft) {
      // Fetch volume list to get volume_id and volume_name
      const volRes = (await browserFetch(page, 'GET', '/api/author/volume/volume_list/v1', {
        params: { book_id: bookId },
      })) as FanqieResponse<{ volume_list: Array<{ volume_id: string; volume_name: string }> }>;

      const vol = volRes.data?.volume_list?.[0];
      if (!vol) {
        throw new CommandExecutionError('No volume found for this book');
      }

      // Step 4: Publish with full params
      await browserFetch(page, 'POST', '/api/author/publish_article/v0/', {
        body: {
          item_id: itemId,
          book_id: bookId,
          volume_id: vol.volume_id,
          volume_name: vol.volume_name,
          title,
          content: htmlContent,
          publish_status: 1,
          use_ai: 2,              // 2=否(不使用AI)
          device_platform: 'pc',
          timer_status: 0,
          need_pay: 0,
          speak_type: 0,
          timer_time: '',
          timer_chapter_preview: '[]',
          has_chapter_ad: false,
          chapter_ad_types: '',
        },
      });
    }

    const statusText = isDraft ? '✅ 已保存草稿' : '✅ 已发布（审核中）';

    return [{
      status: statusText,
      item_id: itemId,
      title,
      word_count: wordCount,
    }];
  },
});
