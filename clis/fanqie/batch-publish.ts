/**
 * Batch publish multiple chapters from a directory.
 *
 * File naming convention: 001-第1章 标题.txt, 002-第2章 标题.txt
 * Content must be ≥1000 chars per chapter.
 *
 * Usage:
 *   opencli fanqie batch-publish <book_id> --dir ./chapters/
 *   opencli fanqie batch-publish <book_id> --dir ./chapters/ --draft
 *   opencli fanqie batch-publish <book_id> --files ch1.txt,ch2.txt
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import { cli, Strategy } from '@jackwener/opencli/registry';
import { ArgumentError, CommandExecutionError } from '@jackwener/opencli/errors';
import type { IPage } from '@jackwener/opencli/types';
import { browserFetch } from './_shared/browser-fetch.js';
import type { FanqieResponse, NewArticleData } from './_shared/types.js';

interface ChapterFile {
  filePath: string;
  title: string;
  content: string;
  htmlContent: string;
  wordCount: number;
  index: number;
}

function textToHtml(text: string): string {
  return text
    .split(/\n+/)
    .filter((line) => line.trim())
    .map((line) => `<p>${line.trim()}</p>`)
    .join('');
}

function parseChapterFiles(dir: string): ChapterFile[] {
  const absDir = path.resolve(dir);
  if (!fs.existsSync(absDir)) {
    throw new ArgumentError(`Directory not found: ${absDir}`);
  }

  const files = fs.readdirSync(absDir)
    .filter((f) => /\.(md|txt)$/i.test(f))
    .sort();

  return files.map((f, idx) => {
    const filePath = path.join(absDir, f);
    const content = fs.readFileSync(filePath, 'utf-8');
    const baseName = f.replace(/\.(md|txt)$/i, '');
    const title = baseName.replace(/^\d+[-_.\s]*/, '') || baseName;

    return {
      filePath,
      title,
      content,
      htmlContent: textToHtml(content),
      wordCount: content.replace(/\s/g, '').length,
      index: idx + 1,
    };
  });
}

function parseFileList(fileList: string): ChapterFile[] {
  return fileList.split(',').map((f) => f.trim()).filter(Boolean).map((f, idx) => {
    const absPath = path.resolve(f);
    if (!fs.existsSync(absPath)) {
      throw new ArgumentError(`File not found: ${absPath}`);
    }
    const content = fs.readFileSync(absPath, 'utf-8');
    const baseName = path.basename(f).replace(/\.(md|txt)$/i, '');
    const title = baseName.replace(/^\d+[-_.\s]*/, '') || baseName;
    return {
      filePath: absPath,
      title,
      content,
      htmlContent: textToHtml(content),
      wordCount: content.replace(/\s/g, '').length,
      index: idx + 1,
    };
  });
}

cli({
  site: 'fanqie',
  name: 'batch-publish',
  description: '批量发布章节',
  domain: 'fanqienovel.com',
  strategy: Strategy.COOKIE,
  args: [
    { name: 'book_id', required: true, positional: true, help: '作品 ID' },
    { name: 'dir', help: '章节文件目录' },
    { name: 'files', help: '章节文件列表，逗号分隔' },
    { name: 'draft', type: 'bool', default: false, help: '仅保存为草稿' },
    { name: 'delay', type: 'int', default: 30, help: '每章间隔秒数（防限流）' },
  ],
  columns: ['index', 'title', 'word_count', 'status'],
  func: async (page: IPage, kwargs) => {
    const bookId = kwargs.book_id as string;
    const dir = kwargs.dir as string | undefined;
    const fileList = kwargs.files as string | undefined;
    const delay = kwargs.delay as number;

    const isDraft = kwargs.draft as boolean;

    if (!dir && !fileList) {
      throw new ArgumentError('必须提供 --dir 或 --files');
    }

    const chapters = dir ? parseChapterFiles(dir) : parseFileList(fileList!);
    if (chapters.length === 0) {
      throw new ArgumentError('No .md or .txt files found');
    }

    // Validate all chapters before starting
    for (const ch of chapters) {
      if (ch.title.length < 5) {
        throw new ArgumentError(`标题过短: "${ch.title}" (文件: ${ch.filePath})`);
      }
      if (ch.wordCount < 1000) {
        throw new ArgumentError(`字数不足: ${ch.wordCount} 字 (文件: ${ch.filePath}, 最低1000字)`);
      }
    }

    // Fetch volume info for publish
    let volumeId = '';
    let volumeName = '';
    if (!isDraft) {
      const volRes = (await browserFetch(page, 'GET', '/api/author/volume/volume_list/v1', {
        params: { book_id: bookId },
      })) as FanqieResponse<{ volume_list: Array<{ volume_id: string; volume_name: string }> }>;

      const vol = volRes.data?.volume_list?.[0];
      if (!vol) {
        throw new CommandExecutionError('No volume found for this book');
      }
      volumeId = vol.volume_id;
      volumeName = vol.volume_name;
    }

    const results: Array<{ index: number; title: string; word_count: number; status: string }> = [];

    for (const ch of chapters) {
      try {
        // Create new draft
        const createRes = (await browserFetch(page, 'POST', '/api/author/article/new_article/v0/', {
          body: { book_id: bookId, need_reuse: 0 },
        })) as FanqieResponse<NewArticleData>;

        const itemId = createRes.data?.item_id;
        if (!itemId) throw new Error('Failed to create draft');

        // Save content
        await browserFetch(page, 'POST', '/api/author/article/cover_article/v0/', {
          body: {
            book_id: bookId,
            item_id: itemId,
            title: ch.title,
            content: ch.htmlContent,
          },
        });

        // Publish (if not draft)
        if (!isDraft) {
          await browserFetch(page, 'POST', '/api/author/publish_article/v0/', {
            body: {
              item_id: itemId,
              book_id: bookId,
              volume_id: volumeId,
              volume_name: volumeName,
              title: ch.title,
              content: ch.htmlContent,
              publish_status: 1,
              use_ai: 2,
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

        results.push({
          index: ch.index,
          title: ch.title,
          word_count: ch.wordCount,
          status: isDraft ? '✅ 草稿' : '✅ 已发布',
        });

        // Delay between chapters
        if (ch.index < chapters.length && delay > 0) {
          await new Promise((r) => setTimeout(r, delay * 1000));
        }
      } catch (err) {
        results.push({
          index: ch.index,
          title: ch.title,
          word_count: ch.wordCount,
          status: `❌ ${err instanceof Error ? err.message : 'failed'}`,
        });
      }
    }

    return results;
  },
});
