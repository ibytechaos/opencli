/**
 * List all books in Fanqie author dashboard.
 *
 * API: GET /api/author/book/book_list/v0
 *
 * Usage:
 *   opencli fanqie books
 *   opencli fanqie books --limit 10
 */

import { cli, Strategy } from '@jackwener/opencli/registry';
import { browserFetch } from './_shared/browser-fetch.js';
import type { IPage } from '@jackwener/opencli/types';
import type { BookInfo, FanqieResponse } from './_shared/types.js';

cli({
  site: 'fanqie',
  name: 'books',
  description: '获取作品列表',
  domain: 'fanqienovel.com',
  strategy: Strategy.COOKIE,
  args: [
    { name: 'limit', type: 'int', default: 10, help: '返回数量' },
  ],
  columns: ['book_id', 'book_name', 'word_count', 'chapters', 'level', 'status', 'last_update'],
  func: async (page: IPage, kwargs) => {
    const limit = kwargs.limit as number;
    const res = (await browserFetch(page, 'GET', '/api/author/book/book_list/v0', {
      params: { page_count: limit, page_index: 0 },
    })) as FanqieResponse<{ book_list: BookInfo[]; total_count: number }>;

    const books = res.data?.book_list ?? [];

    return books.map((b) => ({
      book_id: b.book_id,
      book_name: b.book_name,
      word_count: b.content_word_number,
      chapters: b.chapter_number,
      level: b.origin_level || '-',
      status: b.book_intro?.tag || (b.has_hide ? '已隐藏' : '连载中'),
      last_update: b.last_chapter_title,
    }));
  },
});
