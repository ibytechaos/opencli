---
name: opencli-fanqie
description: "Use when managing novels on Fanqie (番茄小说). Create books, publish chapters, batch publish, upload covers, check stats. Examples: '发布章节到番茄', '创建新书', '批量发布小说', 'opencli fanqie'"
version: 1.2.0
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

---

## 番茄平台运营规则

### 作品生命周期

```
创建新书 → 发布章节 → 达标签约 → 申请推荐 → 推荐/完结
```

### 签约条件

| 条件 | 要求 | 提醒时机 |
|------|------|---------|
| **字数门槛** | 连载 ≥ 3万字 | `books` 返回 word_count ≥ 30000 时提醒 |
| **更新频率** | 保持稳定更新（建议日更） | — |
| **内容质量** | 通过平台审核评估 | `book_intro.tag` 显示"可签约"时提醒 |

> **重要：当 `opencli fanqie books` 返回某本书的 tag 为 "可签约" 时，必须提醒用户去后台申请签约。签约后才能获得收益分成。**

### 推荐评估

| 阶段 | 条件 | tag 值 |
|------|------|--------|
| 加油写作 | 字数不足推荐门槛 | `加油写作` |
| 可签约 | 达到签约条件 | `可签约` |
| 可推荐 | 签约后达到推荐字数（约 5-15万字） | `可推荐` |
| 推荐中 | 已在推荐池中 | `推荐中` |
| 内容待优化 | 推荐评估未通过 | `内容待优化` |

### 作品评级

| 等级 | 含义 |
|------|------|
| B | 基础评级 |
| B+ | 较好，有推荐潜力 |
| A | 优秀 |
| S | 精品 |

### 章节规则

| 规则 | 详情 |
|------|------|
| 标题 | ≥ 5 字，章节号只支持阿拉伯数字（第1章，非第一章） |
| 正文 | ≥ 1000 字 |
| AI 声明 | 发布时 `use_ai=2`（否） |
| 书名 | ≤ 15 字 |
| 简介 | 50-500 字 |
| 发布间隔 | ≥ 3 秒 |

### 封面规则

| 规则 | 详情 |
|------|------|
| 尺寸 | **600x800** 像素（3:4 比例） |
| 格式 | jpg/png/jpeg |
| 大小 | ≤ 5MB |
| 内容 | 需包含书名和作者笔名 |
| 审核 | 上传后 **1-2小时审核**，通过后更新 |

### 封面上传流程（CDP）

```
1. 进入 book-info 页面 → 点"修改"
2. 点"选择封面" → 弹窗选"本地上传" tab
3. CDP DOM.setFileInputFiles 设置文件
4. 自动触发 upload_pic_v1 API → 获得 pic_uri
5. 点"确定" → 点"立即修改" → modify_book API
6. 等待 1-2 小时审核
```

---

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
| `/api/author/book/modify_book/v0/` | POST | 修改书籍信息（含封面） |
| `/api/author/data/upload_pic_v1/v0` | POST | 上传封面图片（FormData） |
| `/api/author/chapter/chapter_list/v1` | GET | 章节列表 |
| `/api/author/volume/volume_list/v1` | GET | 分卷列表 |
| `/api/author/article/new_article/v0/` | POST | 创建草稿 |
| `/api/author/article/cover_article/v0/` | POST | 保存内容 |
| `/api/author/publish_article/v0/` | POST | 确认发布 |
| `/api/author/account/info/v0/` | GET | 作者账号信息 |
| `/api/author/book/category_list/v0/` | GET | 作品分类列表 |

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
| 10 | 直接调 modify_book 改封面 | 必须先通过 UI 弹窗上传（upload_pic_v1），再 modify_book |
| 11 | 封面用 1024x1024 | 番茄要求 **600x800**，上传后需 1-2h 审核 |
