# 资源数据模型

本项目用于整理“全国大学生智能车竞赛”的开源仓库、B 站视频、文章教程、官方资料和工具数据。数据优先服务 GitHub Pages 静态网站，因此采用可直接加载的 JSON 文件，并将筛选枚举集中维护在 `data/taxonomy.json`。

## 文件约定

- `data/resources.index.json`：资源分片索引。GitHub Pages 不能列目录，前端通过这个清单聚合加载各个分片。
- `data/resources/{year}/{group}/resources.json`：资源分片数据，顶层为数组。示例：`data/resources/2025/camera/resources.json`。
- `data/taxonomy.json`：筛选枚举，包括年份、组别、资料类型、主题和难度。
- `schemas/resources.schema.json`：资源列表 JSON Schema，方便编辑器提示和后续接入 CI。
- `schemas/resources-index.schema.json`：资源分片索引 JSON Schema。
- `schemas/taxonomy.schema.json`：枚举字典 JSON Schema。
- `scripts/validate-resources.js`：Node 校验脚本，不依赖第三方包。

## 分片目录规范

资源按两级目录拆分：

```text
data/resources/
  2024/
    electromagnetic/
      resources.json
  2025/
    camera/
      resources.json
    common/
      resources.json
  2026/
    common/
      resources.json
```

约定：

- 第一层目录是年份，必须存在于 `data/taxonomy.json` 的 `years`。
- 第二层目录是组别 ID，必须存在于 `data/taxonomy.json` 的 `groups`。
- `common` 表示跨组通用资料，`other` 表示暂时无法归入具体组别的资料。
- 分片内每条资源的 `year` 必须与路径年份一致。
- 分片内每条资源的 `groups` 必须包含路径组别。跨组资料可以放在 `common` 分片，同时在 `groups` 中额外写入相关组别。
- 新增分片后必须把路径加入 `data/resources.index.json` 的 `files`。

## Resource 字段

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | string | 是 | 稳定 ID，使用小写字母、数字和连字符，建议包含年份、类型和主题。 |
| `title` | string | 是 | 资源标题，用于列表和详情页展示。 |
| `url` | string | 是 | 资源链接，仅允许 `http` 或 `https`。 |
| `year` | string | 是 | 4 位年份字符串，如 `2026`，必须存在于 `taxonomy.years`。 |
| `groups` | string[] | 是 | 所属组别，可多选，如 `camera`、`electromagnetic`、`common`。 |
| `type` | string | 是 | 资料类型，如 `github`、`bilibili`、`article`。 |
| `topics` | string[] | 是 | 主题标签，可多选，如 `control`、`vision`。 |
| `level` | string | 是 | 难度等级：`beginner`、`intermediate`、`advanced`。 |
| `language` | string | 是 | 语言代码，中文资料建议写 `zh-CN`。 |
| `description` | string | 是 | 简短说明，用于搜索摘要和详情页。 |
| `source` | object | 是 | 来源信息，包含 `platform` 和 `author`。 |
| `tags` | string[] | 是 | 自由标签，用于补充搜索关键词，不作为主筛选枚举。 |
| `featured` | boolean | 是 | 是否推荐展示。 |
| `createdAt` | string | 是 | 数据创建日期，格式 `YYYY-MM-DD`。 |
| `updatedAt` | string | 是 | 数据更新日期，格式 `YYYY-MM-DD`。 |

## Taxonomy 设计

主筛选维度保持稳定、可枚举：

- `years`：年份筛选，使用字符串避免前端和 JSON Schema 中的格式歧义。
- `groups`：竞赛组别，`common` 表示跨组通用资料。
- `resourceTypes`：资料类型，用于区分 GitHub、B 站、文章、官方资料等。
- `topics`：知识主题，用于按机械、硬件、控制、视觉、电磁等方向筛选。
- `levels`：难度，用于帮助新队伍快速定位入门或进阶资料。

新增组别、主题或资料类型时，先更新 `data/taxonomy.json`，再在资源中引用对应 `id`。

## 校验方式

在仓库根目录执行：

```bash
node scripts/validate-resources.js
```

当前脚本会检查：

- `data/resources.index.json` 是否存在、是否列出了有效分片。
- 分片路径是否符合 `data/resources/{year}/{group}/resources.json`。
- 每个分片是否为数组，或包含 `resources` 数组。
- 必填字段是否存在。
- `id` 是否重复、格式是否正确。
- `url` 是否为 `http/https`，以及是否重复。
- `year` 是否为 4 位字符串，并存在于 `taxonomy.years`。
- `groups`、`type`、`topics`、`level` 是否使用已定义枚举。
- 资源 `year` 是否与分片年份一致，`groups` 是否包含分片组别。
- 数组字段是否存在重复值。
- `createdAt`、`updatedAt` 是否为 `YYYY-MM-DD` 格式。

脚本刻意不依赖第三方包，方便在 GitHub Actions 或本地 Node 环境中直接运行。
