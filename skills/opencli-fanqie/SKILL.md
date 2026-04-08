---
name: opencli-fanqie
description: "Use when managing novels on Fanqie (番茄小说). Create books, publish chapters, batch publish, check stats. Examples: '发布章节到番茄', '创建新书', '批量发布小说', 'opencli fanqie'"
version: 1.0.0
author: wuzhipeng
tags: [fanqie, novel, publish, content-creation, opencli]
allowed-tools: Bash(opencli:*), Read, Write
---

# 番茄小说 — opencli fanqie

通过 `opencli fanqie <command>` 管理番茄小说作者后台。

## 命令

```bash
# 查询
opencli fanqie books                                        # 作品列表
opencli fanqie chapters <book_id>                           # 章节列表
opencli fanqie volumes <book_id>                            # 分卷列表
opencli fanqie drafts <book_id>                             # 草稿列表
opencli fanqie stats                                        # 作者信息

# 创作
opencli fanqie create-book --name "书名" --abstract "简介"    # 创建新书
opencli fanqie publish <book_id> --title "第1章 标题" --file ch.txt   # 发布单章
opencli fanqie batch-publish <book_id> --dir ./chapters/     # 批量发布
opencli fanqie update <item_id> --book-id <id> --file new.txt  # 更新章节
opencli fanqie delete <item_id> --book-id <id>               # 删除章节
```

## 平台规则

| 规则 | 详情 |
|------|------|
| 标题 | ≥ 5 字，章节号用阿拉伯数字（第1章，非第一章） |
| 正文 | ≥ 1000 字，HTML 格式（`<p>` 标签包裹段落） |
| AI 声明 | `use_ai=2` = 否 |
| 书名 | ≤ 15 字 |
| 简介 | 50-500 字 |
| 发布间隔 | ≥ 3 秒（实测无限流） |

## 批量发布文件规范

```
chapters/
├── 001-第1章 觉醒.txt      # 序号-章节标题.txt
├── 002-第2章 修炼.txt      # 纯文本，段落用空行分隔
└── 003-第3章 突破.txt      # 每章 ≥ 1000 字
```

---

## 已验证 API

后台地址：`https://fanqienovel.com/main/writer/book-manage`

所有 API 需 `aid=2503&app_name=muye_novel`，POST 用 `application/x-www-form-urlencoded`。

| API | 方法 | 用途 |
|-----|------|------|
| `/api/author/book/book_list/v0` | GET | 作品列表 |
| `/api/author/book/create/v0/` | POST | 创建新书 |
| `/api/author/chapter/chapter_list/v1` | GET | 章节列表 |
| `/api/author/volume/volume_list/v1` | GET | 分卷列表 |
| `/api/author/article/new_article/v0/` | POST | 创建草稿（返回 item_id） |
| `/api/author/article/cover_article/v0/` | POST | 保存标题+内容 |
| `/api/author/publish_article/v0/` | POST | 确认发布 |
| `/api/author/account/info/v0/` | GET | 作者账号信息 |

### 发布链路

```
new_article → cover_article → publish_article
```

### publish_article 完整参数

```
item_id, book_id, volume_id, volume_name, title, content,
publish_status=1, use_ai=2, device_platform=pc,
timer_status=0, need_pay=0, speak_type=0,
timer_time=, timer_chapter_preview=[], has_chapter_ad=false, chapter_ad_types=
```

缺任何一个都会报"缺少书籍卷相关参数"。

---

## 错题本

| # | 坑 | 正确做法 |
|---|-----|---------|
| 1 | URL 猜 `writer.fanqie.com` | 实际在 `fanqienovel.com/main/writer/` |
| 2 | POST 用 JSON | 字节系全用 form-urlencoded |
| 3 | `cover_article` 当发布 | 只保存草稿，需额外调 `publish_article` |
| 4 | publish 只传 3 个参数 | 需要 volume_id、volume_name、use_ai 等完整参数 |
| 5 | 字段名用 `chapter_id` | 番茄全用 `item_id` |
| 6 | `need_reuse=1` 创建新草稿 | `=1` 复用旧草稿，`=0` 才是新建 |
| 7 | "非AI"是 checkbox | 是 radio，`use_ai=2` 表示"否" |
| 8 | DOM 填内容用 innerHTML | ProseMirror/React 需用 CDP `Input.insertText` |
| 9 | 点"下一步"无反应 | 风险检测弹窗拦截，需点取消关闭 `.arco-modal` |
