/**
 * List draft chapters for a book (shortcut for chapters --status draft).
 *
 * Usage:
 *   opencli fanqie drafts <book_id>
 */

import { cli, Strategy } from '@jackwener/opencli/registry';
import { browserFetch } from './_shared/browser-fetch.js';
import type { IPage } from '@jackwener/opencli/types';
import type { ChapterItem, FanqieResponse } from './_shared/types.js';

cli({
  site: 'fanqie',
  name: 'drafts',
  description: '获取草稿章节列表',
  domain: 'fanqienovel.com',
  strategy: Strategy.COOKIE,
  args: [
    { name: 'book_id', required: true, positional: true, help: '作品 ID' },
    { name: 'limit', type: 'int', default: 20, help: '返回数量' },
  ],
  columns: ['index', 'item_id', 'title', 'word_count', 'create_time'],
  func: async (page: IPage, kwargs) => {
    const bookId = kwargs.book_id as string;
    const res = (await browserFetch(page, 'GET', '/api/author/chapter/chapter_list/v1', {
      params: {
        book_id: bookId,
        page_index: 0,
        page_count: kwargs.limit as number,
        status: '0', // draft only
      },
    })) as FanqieResponse<{ item_list: ChapterItem[] }>;

    return (res.data?.item_list ?? []).map((c) => ({
      index: c.index,
      item_id: c.item_id,
      title: c.title,
      word_count: c.word_number,
      create_time: new Date(Number(c.create_time) * 1000).toLocaleString('zh-CN'),
    }));
  },
});
