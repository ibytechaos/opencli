---
name: opencli-jimeng
description: "Use when generating images or videos with 即梦AI/Seedream/Seedance (ByteDance/火山引擎). Examples: '即梦生图', 'seedance视频', 'opencli jimeng', '火山引擎生成'"
version: 1.1.0
author: wuzhipeng
tags: [jimeng, seedream, seedance, volcengine, image-generation, video-generation, opencli]
allowed-tools: Bash(opencli:*), Read, Write
---

# 即梦AI — opencli jimeng

通过 `opencli jimeng <command>` 使用即梦AI (Seedream/Seedance) 生成图片和视频。

## 前置条件

```bash
export ARK_API_KEY="your-key"   # https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey
```

> 图片和视频生成统一使用 `ARK_API_KEY`，不需要 VOLC_ACCESSKEY/SECRETKEY。
> 需要在 [方舟模型管理](https://console.volcengine.com/ark/region:ark+cn-beijing/openManagement) 开通对应模型。

## 命令

### API 图片生成（Seedream 5.0，已实测 ✅）

```bash
opencli jimeng generate-image-api "月光下的猫咪"                               # 默认 2048x2048
opencli jimeng generate-image-api "日落山景" --size 2848x1600                  # 横屏 16:9
opencli jimeng generate-image-api "产品海报" --size 2K --output poster.png     # 2K 分辨率
opencli jimeng generate-image-api "风景" --model doubao-seedream-4-5-251128    # 用 4.5
opencli jimeng generate-image-api "logo" --no-watermark                       # 去水印
```

### API 视频生成（Seedance 2.0）

```bash
opencli jimeng generate-video-api "一只猫在月球上跳舞"                           # 默认 5s
opencli jimeng generate-video-api "城市延时" --duration 10 --aspect-ratio 9:16  # 竖屏
```

> 需先在方舟后台开通 `doubao-seedance-2-0-260128` 模型。

### 浏览器版（需登录 jimeng.jianying.com）

```bash
opencli jimeng generate "赛博朋克城市"     # 网页版生图
opencli jimeng history --limit 20          # 查看历史
```

## 参数

| 命令 | 参数 | 默认值 | 说明 |
|------|------|--------|------|
| `generate-image-api` | `--size` | `2048x2048` | 像素值或分辨率（2K/3K） |
| `generate-image-api` | `--model` | `doubao-seedream-5-0-260128` | 模型 ID |
| `generate-image-api` | `--response-format` | `b64_json` | url 或 b64_json |
| `generate-image-api` | `--no-watermark` | `false` | 去除"AI生成"水印 |
| `generate-video-api` | `--duration` | `5` | 视频时长（秒） |
| `generate-video-api` | `--aspect-ratio` | `16:9` | 16:9, 9:16, 1:1 |

## 可用模型

在方舟后台开通后可用：

| 模型 ID | 能力 |
|---------|------|
| `doubao-seedream-5-0-260128` | 文生图（最新，支持组图、联网搜索） |
| `doubao-seedream-4-5-251128` | 文生图（高质量，支持 4K） |
| `doubao-seedream-4-0-250828` | 文生图（支持 1K-4K） |
| `doubao-seedream-3-0-t2i-250415` | 文生图（基础版） |
| `doubao-seedance-2-0-260128` | 文生视频（Seedance 2.0） |
| `doubao-seedance-1-5-pro-251215` | 文生视频（1.5 Pro） |
| `doubao-seededit-3-0-i2i-250628` | 图生图编辑 |

## 推荐尺寸（Seedream 5.0）

| 比例 | 2K | 3K |
|------|----|----|
| 1:1 | 2048x2048 | 3072x3072 |
| 4:3 | 2304x1728 | 3456x2592 |
| 16:9 | 2848x1600 | 4096x2304 |
| 9:16 | 1600x2848 | 2304x4096 |

## Prompt 技巧

- 即梦对**中文 prompt 优化好**，推荐中文
- 风格词: "水彩风"、"油画"、"赛博朋克"、"二次元"、"写实摄影"
- 细节词: "暖色调"、"柔和光线"、"特写镜头"、"电影感"
- 建议不超过 300 汉字

## API 文档

- 图片: `POST https://ark.cn-beijing.volces.com/api/v3/images/generations`
- 视频: `POST https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks`
- 鉴权: `Authorization: Bearer $ARK_API_KEY`
