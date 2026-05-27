# GitHub Pages 静态站点技术骨架

这个站点面向“全国大学生智能车竞赛”的资料导航，默认直接部署到 GitHub Pages，不依赖 npm、构建器或服务端接口。

## 文件职责

- `index.html`：单页入口，包含资源筛选区、资源列表区和 Markdown 文档浏览区。
- `assets/css/styles.css`：响应式布局、首页视觉、资源卡片和 Markdown 内容样式。
- `assets/js/app.js`：读取 `data/resources.index.json`，聚合加载各年份/组别下的 `resources.json`，生成筛选项，完成关键词搜索、年份/组别/类型/主题筛选，并提供轻量 Markdown 渲染。
- `.nojekyll`：关闭 GitHub Pages 的 Jekyll 处理，确保静态文件原样发布。
- `docs/*.md`：可被前端通过 `#/docs/example.md` 路由读取并渲染。

## 资源数据结构

前端会优先读取 `data/resources.index.json`，再按索引中的 `files` 加载各个资源分片。每个分片可以是数组，也可以是带 `resources` 字段的对象。

```json
{
  "version": 1,
  "files": [
    "data/resources/2025/camera/resources.json",
    "data/resources/2025/common/resources.json"
  ]
}
```

分片示例：

```json
[
  {
    "id": "2025-github-camera-baseline",
    "title": "摄像头组基础代码仓库示例",
    "year": "2025",
    "groups": ["camera"],
    "type": "github",
    "topics": ["embedded", "vision", "control"],
    "level": "intermediate",
    "url": "https://github.com/example/smartcar-camera-baseline",
    "description": "覆盖图像采集、赛道识别和基础控制。",
    "source": {
      "platform": "github",
      "author": "示例作者"
    },
    "tags": ["摄像头", "代码", "PID"],
    "featured": false,
    "language": "zh-CN",
    "createdAt": "2026-05-27",
    "updatedAt": "2026-05-27"
  }
]
```

前端仍兼容旧版 `data/resources.json`，但长期维护应使用分片结构。

## 筛选逻辑

- 关键词会匹配标题、年份、组别、类型、主题、简介、来源和标签。
- 年份、组别、类型、主题的下拉选项来自 `data/taxonomy.json`，资源数据使用对应 ID。
- 多个筛选条件之间是“同时满足”的关系。
- 如果 `data/resources.json` 缺失或格式错误，页面会显示示例资源与提示，方便在空仓库中先验证页面。

## Markdown 渲染

当前前端实现了轻量 Markdown 渲染，支持：

- 一级到三级标题。
- 无序列表。
- 代码块和行内代码。
- 加粗文本。
- 普通链接。

访问方式为 `#/docs/文件名.md`，例如 `#/docs/site-architecture.md`。这套实现适合导航站说明文档；如果后续需要表格、目录、任务列表、脚注或更完整的 Markdown 语法，可以在不改变数据结构的前提下替换为 CDN 版 `marked` 或其他 Markdown 解析器。

## 部署方式

1. 把站点文件推送到 GitHub 仓库。
2. 在仓库 Settings 的 Pages 页面选择对应分支和根目录。
3. GitHub Pages 发布后，首页会自动读取同源路径下的 `data/resources.index.json` 并聚合加载资源分片。

本地测试建议使用静态服务器，而不是直接双击打开 HTML，因为浏览器对 `file://` 下的 `fetch` 有限制。
