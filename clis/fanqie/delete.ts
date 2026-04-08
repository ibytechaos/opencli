/**
 * Delete a chapter from Fanqie.
 *
 * Usage:
 *   opencli fanqie delete <item_id> --book_id <book_id>
 */

import { cli, Strategy } from '@jackwener/opencli/registry';
import { browserFetch } from './_shared/browser-fetch.js';
import type { IPage } from '@jackwener/opencli/types';

cli({
  site: 'fanqie',
  name: 'delete',
  description: '删除章节',
  domain: 'fanqienovel.com',
  strategy: Strategy.COOKIE,
  args: [
    { name: 'item_id', required: true, positional: true, help: '章节 item_id' },
    { name: 'book_id', required: true, help: '作品 ID' },
  ],
  columns: ['status'],
  func: async (page: IPage, kwargs) => {
    await browserFetch(page, 'POST', '/api/author/article/delete_article/v0/', {
      body: {
        book_id: kwargs.book_id as string,
        item_id: kwargs.item_id as string,
      },
    });
    return [{ status: `✅ 已删除章节 ${kwargs.item_id}` }];
  },
});
