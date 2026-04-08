/**
 * Create a new book on Fanqie.
 *
 * API: POST /api/author/book/create/v0/
 *
 * Usage:
 *   opencli fanqie create-book --name "书名" --abstract "简介..."
 *   opencli fanqie create-book --name "书名" --abstract "简介..." --gender 1 --protagonist "林北辰"
 */

import { cli, Strategy } from '@jackwener/opencli/registry';
import { ArgumentError } from '@jackwener/opencli/errors';
import type { IPage } from '@jackwener/opencli/types';
import { browserFetch } from './_shared/browser-fetch.js';
import type { FanqieResponse } from './_shared/types.js';

cli({
  site: 'fanqie',
  name: 'create-book',
  description: '创建新书',
  domain: 'fanqienovel.com',
  strategy: Strategy.COOKIE,
  args: [
    { name: 'name', required: true, help: '书名（≤15字）' },
    { name: 'abstract', required: true, help: '作品简介（50-500字）' },
    { name: 'gender', type: 'int', default: 1, help: '目标读者：1=男频 0=女频' },
    { name: 'protagonist', default: '', help: '主角名（≤5字，多个用逗号分隔）' },
    { name: 'category', default: '', help: '分类 ID（可通过 fanqie categories 获取）' },
  ],
  columns: ['status', 'book_id', 'book_name'],
  func: async (page: IPage, kwargs) => {
    const name = kwargs.name as string;
    const abstract = kwargs.abstract as string;
    const gender = kwargs.gender as number;
    const protagonist = kwargs.protagonist as string;
    const category = kwargs.category as string;

    // Validate
    if (name.length > 15) {
      throw new ArgumentError(`书名不能超过15字，当前 ${name.length} 字`);
    }
    if (abstract.length < 50 || abstract.length > 500) {
      throw new ArgumentError(`简介需要50-500字，当前 ${abstract.length} 字`);
    }

    // Build roles array
    const roles: string[] = [];
    if (protagonist) {
      protagonist.split(',').forEach((r) => {
        const trimmed = r.trim();
        if (trimmed.length > 5) {
          throw new ArgumentError(`主角名不能超过5字："${trimmed}"`);
        }
        if (trimmed) roles.push(trimmed);
      });
    }

    const res = (await browserFetch(page, 'POST', '/api/author/book/create/v0/', {
      body: {
        book_name: name,
        abstract,
        gender,
        roles: JSON.stringify(roles),
        category: category || '',
        thumb_uri: '', // Use default cover
      },
    })) as FanqieResponse<{ book_id: string }>;

    const bookId = res.data?.book_id ?? 'unknown';

    return [{
      status: '✅ 创建成功',
      book_id: bookId,
      book_name: name,
    }];
  },
});
