# GitHub Pages 静态站点技术骨架

这个站点面向“全国大学生智能车竞赛”的资料导航，默认直接部署到 GitHub Pages，不依赖 npm、构建器或服务端接口。

## 文件职责

- `index.html`：单页入口，包含资源筛选区、资源列表区和 Markdown 文档浏览区。
- `assets/css/styles.css`：响应式布局、首页视觉、资源卡片和 Markdown 内容样式。
- `assets/js/app.js`：读取 `data/resources.json`，生成筛选项，完成关键词搜索、年份/组别/类型/主题筛选，并提供轻量 Markdown 渲染。
- `.nojekyll`：关闭 GitHub Pages 的 Jekyll 处理，确保静态文件原样发布。
- `docs/*.md`：可被前端通过 `#/docs/example.md` 路由读取并渲染。

## 资源数据结构

前端会优先读取 `data/resources.json`。该文件可以是数组，也可以是带 `resources` 字段的对象。

```json
{
  "resources": [
    {
      "id": "camera-2025-guide",
      "title": "2025 摄像头组调车入门",
      "year": "2025",
      "group": "摄像头组",
      "type": "文档",
      "topic": "入门",
      "url": "docs/camera-2025-guide.md",
      "description": "从硬件检查、赛道识别到速度环调参的入门路径。",
      "tags": ["摄像头", "调参", "入门"],
      "source": "社区整理"
    },
    {
      "id": "bilibili-example",
      "title": "智能车竞赛经验分享视频",
      "year": "2024",
      "group": "完全模型组",
      "type": "B站视频",
      "topic": "经验分享",
      "url": "https://www.bilibili.com/",
      "description": "适合作为组队初期的信息入口。",
      "tags": ["B站", "复盘"],
      "source": "Bilibili"
    }
  ]
}
```

也兼容更细的数据模型：`groups` 和 `topics` 可以使用数组，`source` 可以使用 `{ "platform": "...", "author": "..." }` 对象。前端会把数组字段用于筛选，把对象来源格式化成“平台 / 作者”。

## 筛选逻辑

- 关键词会匹配标题、年份、组别、类型、主题、简介、来源和标签。
- 年份、组别、类型、主题的下拉选项从资源数据自动去重生成。
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
3. GitHub Pages 发布后，首页会自动读取同源路径下的 `data/resources.json`。

本地测试建议使用静态服务器，而不是直接双击打开 HTML，因为浏览器对 `file://` 下的 `fetch` 有限制。
