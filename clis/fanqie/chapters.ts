/**
 * List chapters for a book in Fanqie author dashboard.
 *
 * API: GET /api/author/chapter/chapter_list/v1
 *
 * Usage:
 *   opencli fanqie chapters <book_id>
 *   opencli fanqie chapters <book_id> --limit 20
 */

import { cli, Strategy } from '@jackwener/opencli/registry';
import { browserFetch } from './_shared/browser-fetch.js';
import type { IPage } from '@jackwener/opencli/types';
import { ARTICLE_STATUS, type ChapterItem, type FanqieResponse } from './_shared/types.js';

cli({
  site: 'fanqie',
  name: 'chapters',
  description: '获取章节列表',
  domain: 'fanqienovel.com',
  strategy: Strategy.COOKIE,
  args: [
    { name: 'book_id', required: true, positional: true, help: '作品 ID' },
    { name: 'limit', type: 'int', default: 20, help: '返回数量' },
    { name: 'status', default: '', help: '筛选状态：draft=草稿, published=已发布, 空=全部' },
  ],
  columns: ['index', 'item_id', 'title', 'word_count', 'status', 'create_time'],
  func: async (page: IPage, kwargs) => {
    const bookId = kwargs.book_id as string;
    const limit = kwargs.limit as number;

    // Map friendly status names to API values
    const statusMap: Record<string, string> = { draft: '0', published: '1' };
    const statusParam = statusMap[kwargs.status as string] ?? '';

    const res = (await browserFetch(page, 'GET', '/api/author/chapter/chapter_list/v1', {
      params: {
        book_id: bookId,
        page_index: 0,
        page_count: limit,
        status: statusParam,
      },
    })) as FanqieResponse<{ item_list: ChapterItem[]; total_count: number }>;

    const items = res.data?.item_list ?? [];

    return items.map((c) => ({
      index: c.index,
      item_id: c.item_id,
      title: c.title,
      word_count: c.word_number,
      status: ARTICLE_STATUS[c.article_status] ?? String(c.article_status),
      create_time: new Date(Number(c.create_time) * 1000).toLocaleString('zh-CN'),
    }));
  },
});
