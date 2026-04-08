/** Fanqie API response wrapper */
export interface FanqieResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
  log_id: string;
}

/** Book info from /api/author/book/book_list/v0 */
export interface BookInfo {
  book_id: string;
  book_name: string;
  word_count: number;
  status: number;               // 1=连载中(verify_status=3/4)
  creation_status: number;      // 0=未完结 1=连载中
  category: string;
  abstract: string;
  chapter_number: number;
  last_chapter_time: string;    // unix timestamp string
  last_chapter_title: string;
  sign_progress: number;        // 3=已签约
  contract_status: number;      // 1=已签约
  origin_level: string;         // "B+", "B" etc
  has_hide: number;             // 1=已隐藏
  content_word_number: number;
  book_intro: {
    status: string;
    tag: string;
    message: string;
  };
}

/** Chapter/item info from /api/author/chapter/chapter_list/v1 */
export interface ChapterItem {
  item_id: string;
  volume_id: string;
  index: number;
  title: string;
  article_status: number;       // 0=草稿 1=已发布
  display_status: number;
  create_time: string;          // unix timestamp string
  word_number: number;
  can_delete: number;           // 2=可删除
  timer_time: string;           // 定时发布时间
}

/** Volume info */
export interface VolumeInfo {
  volume_id: string;
  volume_name: string;
  item_count: number;
  index: number;
}

/** New article creation response */
export interface NewArticleData {
  item_id: string;
  volume_id: string;
  column_data: {
    book_id: string;
    book_name: string;
    chapter_passed_num: number;
  };
  volume_data: VolumeInfo[];
}

/** Article status display mapping */
export const ARTICLE_STATUS: Record<number, string> = {
  0: '草稿',
  1: '已发布',
};
