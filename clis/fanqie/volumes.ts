/**
 * List volumes (分卷) for a book.
 *
 * API: GET /api/author/volume/volume_list/v1
 *
 * Usage:
 *   opencli fanqie volumes <book_id>
 */

import { cli, Strategy } from '@jackwener/opencli/registry';
import { browserFetch } from './_shared/browser-fetch.js';
import type { IPage } from '@jackwener/opencli/types';
import type { FanqieResponse, VolumeInfo } from './_shared/types.js';

cli({
  site: 'fanqie',
  name: 'volumes',
  description: '获取分卷列表',
  domain: 'fanqienovel.com',
  strategy: Strategy.COOKIE,
  args: [
    { name: 'book_id', required: true, positional: true, help: '作品 ID' },
  ],
  columns: ['index', 'volume_id', 'volume_name', 'chapter_count'],
  func: async (page: IPage, kwargs) => {
    const bookId = kwargs.book_id as string;
    const res = (await browserFetch(page, 'GET', '/api/author/volume/volume_list/v1', {
      params: { book_id: bookId },
    })) as FanqieResponse<{ volume_list: VolumeInfo[] }>;

    return (res.data?.volume_list ?? []).map((v) => ({
      index: v.index,
      volume_id: v.volume_id,
      volume_name: v.volume_name,
      chapter_count: v.item_count,
    }));
  },
});
