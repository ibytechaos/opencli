/**
 * Fanqie author account info and stats.
 *
 * API: GET /api/author/account/info/v0/
 *
 * Usage:
 *   opencli fanqie stats
 */

import { cli, Strategy } from '@jackwener/opencli/registry';
import { browserFetch } from './_shared/browser-fetch.js';
import type { IPage } from '@jackwener/opencli/types';
import type { FanqieResponse } from './_shared/types.js';

interface AccountInfo {
  author_name: string;
  description: string;
  phone_number: string;
  authorize_type: number;
  is_auth: number;
  mp_name: string;
  point: number;
  point_detail: Array<{ key: string; name: string; point: number }>;
}

cli({
  site: 'fanqie',
  name: 'stats',
  description: '作者账号信息和积分',
  domain: 'fanqienovel.com',
  strategy: Strategy.COOKIE,
  columns: ['metric', 'value'],
  func: async (page: IPage) => {
    const res = (await browserFetch(page, 'GET', '/api/author/account/info/v0/')) as FanqieResponse<AccountInfo>;
    const info = res.data;
    if (!info) return [];

    const rows = [
      { metric: '作者名', value: info.author_name },
      { metric: '笔名', value: info.mp_name },
      { metric: '简介', value: info.description },
      { metric: '实名认证', value: info.is_auth ? '已认证' : '未认证' },
      { metric: '总积分', value: String(info.point) },
    ];

    for (const p of info.point_detail ?? []) {
      rows.push({ metric: `  ${p.name}`, value: String(p.point) });
    }

    return rows;
  },
});
