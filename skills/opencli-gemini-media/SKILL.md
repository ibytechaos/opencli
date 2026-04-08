---
name: opencli-gemini-media
description: "Use when generating images or videos with Google Gemini API (Imagen 4, Veo 3, Google Search). Examples: '生成图片', 'generate image', 'create video', 'opencli gemini image-api'"
version: 1.2.0
author: wuzhipeng
tags: [gemini, imagen, veo, image-generation, video-generation, opencli]
allowed-tools: Bash(opencli:*), Read, Write
---

# Gemini Media — API 版图片/视频生成

通过 Gemini API 直接生成图片和视频，无需浏览器。

> **搜索请用** `opencli gemini ask "问题"` 或 `smart-search` skill（浏览器版，更强）。
> **浏览器版生图请用** `opencli gemini image "prompt"`。
> 本 skill 的 API 版命令适合脚本化、批量化场景。

## 前置条件

```bash
export GOOGLE_API_KEY="your-key"   # https://aistudio.google.com/apikey
```

## 命令（全部实测通过 ✅）

### 图片生成

```bash
# Gemini 原生生图 — 快速，支持图文混合
opencli gemini image-api "a cat riding a skateboard"
opencli gemini image-api "pixel art" --output art.png
opencli gemini image-api "logo design" --model nano-banana-pro-preview

# Imagen 4 高质量生图 — 照片级写实，支持批量
opencli gemini imagen-api "photorealistic cat in a spacesuit"
opencli gemini imagen-api "product photo" --count 4 --aspect-ratio 16:9
```

### 视频生成（Veo 3）

```bash
opencli gemini video-api "a dog playing fetch on the beach"                    # 默认 6s 16:9
opencli gemini video-api "timelapse flower" --duration 8 --aspect-ratio 9:16   # 竖屏
opencli gemini video-api "cinematic city" --model veo-2.0-generate-001         # Veo 2
```

> 异步操作，自动轮询（通常 30-40 秒完成，最长 10 分钟）。

## 参数

| 命令 | 参数 | 默认值 | 说明 |
|------|------|--------|------|
| `image-api` | `--output` | `./generated-{ts}.png` | 输出路径 |
| `image-api` | `--model` | `gemini-2.5-flash-image` | 可选: nano-banana-pro-preview, gemini-3-pro-image-preview |
| `imagen-api` | `--count` | `1` | 生成数量 (1-4) |
| `imagen-api` | `--aspect-ratio` | `1:1` | 1:1, 16:9, 9:16, 4:3, 3:4 |
| `imagen-api` | `--model` | `imagen-4.0-generate-001` | 可选: imagen-4.0-ultra-generate-001, imagen-4.0-fast-generate-001 |
| `video-api` | `--duration` | `6` | 4-8 秒 |
| `video-api` | `--aspect-ratio` | `16:9` | 16:9, 9:16, 1:1 |
| `video-api` | `--model` | `veo-3.0-generate-001` | 可选: veo-2.0-generate-001 |

## 模型选择

| 模型 | 用途 | 特点 |
|------|------|------|
| `gemini-2.5-flash-image` | 日常生图 | 快速，可图文混合对话 |
| `nano-banana-pro-preview` | 高保真生图 | 文字渲染强，细节好 |
| `imagen-4.0-generate-001` | 专业生图 | 照片级写实，最高质量 |
| `imagen-4.0-fast-generate-001` | 快速生图 | 速度优先 |
| `veo-3.0-generate-001` | 视频生成 | 6s 视频，带音频 |

## vs 浏览器版

| | API 版（本 skill） | 浏览器版（已有） |
|--|-------------------|----------------|
| 生图 | `image-api` / `imagen-api` | `image`（需浏览器） |
| 生视频 | `video-api` ✅ | 无 |
| 搜索 | — | `ask`（需浏览器） |
| 深度研究 | — | `deep-research`（需浏览器） |
| 优势 | 无需浏览器、可脚本化 | AI Ultra 免费额度 |

## 错题本

| 坑 | 正确做法 |
|----|---------|
| 模型名 `gemini-2.0-flash-exp` | 已更名为 `gemini-2.5-flash-image` |
| Veo 用 `generateVideos` | 正确是 `predictLongRunning` |
| Veo duration 传 5 或 10 | 实际范围 4-8 秒 |
| Veo 返回 base64 | 实际返回 URI，需下载 |
| `--duration` 被解析为 string | 需 `Number()` 强制转换 |

## Google Search（API 版）

```bash
opencli gemini search-api "具身机器人开源项目"                    # 中文搜索
opencli gemini search-api "latest TypeScript features 2026"      # 英文搜索
opencli gemini search-api "DORA-RS" --model gemini-2.5-flash-lite  # 指定模型
```

> 使用 Gemini 的 Google Search grounding 功能，返回答案 + 引用来源。
> 无需浏览器，纯 API 调用。默认模型 `gemini-2.5-flash`。
