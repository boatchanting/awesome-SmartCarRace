/* global markdownit, markdownitFootnote, markdownitTaskLists, markdownitEmoji, hljs, Fuse, mermaid, renderMathInElement */
(() => {
  "use strict";

  const config = {
    title: "智能车竞赛知识库",
    docsRoot: "docs",
    manifest: "docs/manifest.json",
    githubRepo: "boatchanting/awosome-SmartCarRace",
    githubBranch: "main",
    githubDocsPath: "docs",
    readmePath: "README.md",
    wordsPerMinute: 300,
    enablePwa: true,
    enableGiscus: false,
    ...(window.DOC_SITE_CONFIG || {})
  };

  const RESOURCE_INDEX_URL = "data/resources.index.json";
  const LEGACY_DATA_URL = "data/resources.json";
  const TAXONOMY_URL = "data/taxonomy.json";
  const RESOURCE_DRAFTS_KEY = "smartcar-resource-drafts-v1";
  const DOC_FALLBACK_FILES = [
    "docs/intro.md",
    "docs/data-model.md",
    "docs/site-architecture.md",
    "docs/contribution.md",
    "docs/commit-message.md",
    "docs/years/index.md",
    "docs/years/2023.md",
    "docs/years/2024.md",
    "docs/groups/2025/index.md",
    "docs/groups/2025/平衡轮腿.md",
    "docs/groups/2025/electromagnetic.md",
    "docs/groups/2025/camera.md",
    "docs/groups/2025/ai-vision.md",
    "docs/roadmaps/collection-roadmap.md",
    "docs/roadmaps/information-architecture.md",
    "docs/knowledge/index.md",
    "docs/knowledge/getting-started.md",
    "docs/knowledge/hardware/sensors.md",
    "docs/knowledge/software/control-and-path.md",
    "docs/knowledge/tools/debugging.md"
  ];

  const fallbackTaxonomy = {
    years: ["2024", "2025", "2026"],
    groups: [
      { id: "common", name: "通用资料" },
      { id: "other", name: "其他" },
      { id: "camera", name: "摄像头组" },
      { id: "electromagnetic", name: "电磁组" },
      { id: "vision", name: "视觉组" }
    ],
    resourceTypes: [
      { id: "github", name: "开源仓库" },
      { id: "bilibili", name: "B 站视频" },
      { id: "article", name: "文章教程" },
      { id: "official", name: "官方资料" }
    ],
    topics: [
      { id: "control", name: "控制算法" },
      { id: "vision", name: "机器视觉" },
      { id: "electromagnetic", name: "电磁导航" },
      { id: "hardware", name: "硬件电路" },
      { id: "rules", name: "竞赛规则" }
    ],
    levels: [
      { id: "beginner", name: "入门" },
      { id: "intermediate", name: "进阶" },
      { id: "advanced", name: "高级" }
    ]
  };

  const state = {
    docs: [],
    docsByPath: new Map(),
    manifestMeta: new Map(),
    fuse: null,
    resourceFuse: null,
    activeDoc: null,
    headings: [],
    baseResources: [],
    resourceDrafts: [],
    resources: [],
    taxonomy: fallbackTaxonomy,
    filters: { keyword: "", year: "", group: "", type: "", topic: "" },
    resourceView: localStorage.getItem("resource-view-mode") || "grid",
    resourcePageSize: Number(localStorage.getItem("resource-page-size") || 50),
    resourcePage: 1,
    searchScopes: { docs: true, resources: true }
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const els = {
    body: document.body,
    home: $("#home-view"),
    resources: $("#resources-view"),
    doc: $("#doc-view"),
    sidebar: $("#doc-sidebar"),
    fileTree: $("#file-tree"),
    tocPanel: $("#toc-panel"),
    toc: $("#toc"),
    breadcrumbs: $("#breadcrumbs"),
    docTitle: $("#doc-title"),
    docCategory: $("#doc-category"),
    docSummary: $("#doc-summary"),
    docMeta: $("#doc-meta"),
    docTags: $("#doc-tags"),
    docContent: $("#doc-content"),
    docPager: $("#doc-pager"),
    editLink: $("#edit-link"),
    readProgress: $("#read-progress"),
    siteStats: $("#site-stats"),
    recentUpdates: $("#recent-updates"),
    readmePreview: $("#readme-preview"),
    featureGrid: $("#feature-grid"),
    searchDialog: $("#search-dialog"),
    searchInput: $("#doc-search"),
    searchResults: $("#search-results"),
    searchTrigger: $("#search-trigger"),
    searchDocsScope: $("#search-scope-docs"),
    searchResourcesScope: $("#search-scope-resources"),
    themeToggle: $("#theme-toggle"),
    mobileMenu: $("#mobile-menu"),
    collapseAll: $("#collapse-all"),
    toggleSidebar: $("#toggle-sidebar"),
    toggleToc: $("#toggle-toc"),
    backTop: $("#back-top"),
    imagePreview: $("#image-preview"),
    imageClose: $("#image-close"),
    filters: $("#filters"),
    keyword: $("#keyword"),
    year: $("#year-filter"),
    group: $("#group-filter"),
    type: $("#type-filter"),
    topic: $("#topic-filter"),
    resultMeta: $("#result-meta"),
    stateMessage: $("#state-message"),
    resourceList: $("#resource-list"),
    resourcePager: $("#resource-pager"),
    resourcePageSize: $("#resource-page-size"),
    toggleResourceBuilder: $("#toggle-resource-builder"),
    closeResourceBuilder: $("#close-resource-builder"),
    resourceBuilder: $("#resource-builder"),
    resourceForm: $("#resource-form"),
    resourceTitle: $("#resource-title"),
    resourceUrl: $("#resource-url"),
    resourceYear: $("#resource-year"),
    resourceGroup: $("#resource-group"),
    resourceType: $("#resource-type"),
    resourceTopic: $("#resource-topic"),
    resourceLevel: $("#resource-level"),
    resourceSource: $("#resource-source"),
    resourceTags: $("#resource-tags"),
    resourceDescription: $("#resource-description"),
    resourceFeatured: $("#resource-featured"),
    resourceDraftMeta: $("#resource-draft-meta"),
    exportResourceDrafts: $("#export-resource-drafts"),
    clearResourceDrafts: $("#clear-resource-drafts")
  };

  const md = createMarkdownRenderer();

  function createMarkdownRenderer() {
    const renderer = markdownit({
      html: true,
      linkify: true,
      typographer: true,
      breaks: false,
      highlight(code, language) {
        const syntaxHighlighter = typeof hljs !== "undefined" ? hljs : null;
        const validLanguage = syntaxHighlighter && language && syntaxHighlighter.getLanguage(language) ? language : "plaintext";
        const highlighted = validLanguage === "plaintext" || !syntaxHighlighter
          ? escapeHtml(code)
          : syntaxHighlighter.highlight(code, { language: validLanguage, ignoreIllegals: true }).value;
        return `<pre class="code-block" data-language="${escapeHtml(validLanguage)}"><button class="copy-code" type="button">复制</button><code class="hljs language-${escapeHtml(validLanguage)}">${highlighted}</code></pre>`;
      }
    });

    if (typeof markdownitFootnote === "function") renderer.use(markdownitFootnote);
    if (typeof markdownitTaskLists === "function") renderer.use(markdownitTaskLists, { enabled: true, label: true });
    if (typeof markdownitEmoji === "function") renderer.use(markdownitEmoji);
    if (markdownitEmoji && typeof markdownitEmoji.full === "function") renderer.use(markdownitEmoji.full);

    const defaultFence = renderer.renderer.rules.fence;
    renderer.renderer.rules.fence = (tokens, idx, options, env, self) => {
      const token = tokens[idx];
      const info = token.info ? token.info.trim() : "";
      if (info === "mermaid") {
        return `<div class="mermaid">${escapeHtml(token.content)}</div>`;
      }
      return defaultFence(tokens, idx, options, env, self);
    };

    return renderer;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function slugify(value) {
    return String(value)
      .trim()
      .toLowerCase()
      .replace(/<[^>]+>/g, "")
      .replace(/[\s/]+/g, "-")
      .replace(/[^\w\u4e00-\u9fa5-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || `heading-${Math.random().toString(36).slice(2, 7)}`;
  }

  async function fetchText(url, options = {}) {
    const response = await fetch(encodeURI(url), { cache: "no-store", ...options });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
    return response.text();
  }

  async function fetchJson(url) {
    const response = await fetch(encodeURI(url), { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
    return response.json();
  }

  async function discoverDocs() {
    const fromManifest = await loadManifest().catch(() => []);
    if (fromManifest.length) return normalizeDocPaths(fromManifest);

    const fromGithub = await scanGithubTree().catch(() => []);
    if (fromGithub.length) return normalizeDocPaths(fromGithub);

    const fromDirectoryListing = await scanDirectoryListing(config.docsRoot).catch(() => []);
    if (fromDirectoryListing.length) return normalizeDocPaths(fromDirectoryListing);

    return normalizeDocPaths(DOC_FALLBACK_FILES);
  }

  async function loadManifest() {
    const manifest = await fetchJson(config.manifest);
    if (Array.isArray(manifest)) return manifest;
    const files = Array.isArray(manifest.files) ? manifest.files : [];
    const docs = Array.isArray(manifest.docs) ? manifest.docs : [];
    state.manifestMeta = new Map(docs
      .filter((doc) => doc && typeof doc.path === "string")
      .map((doc) => [decodeURI(doc.path), doc]));
    return files;
  }

  async function scanGithubTree() {
    if (!config.githubRepo) return [];
    const api = `https://api.github.com/repos/${config.githubRepo}/git/trees/${config.githubBranch}?recursive=1`;
    const payload = await fetchJson(api);
    return (payload.tree || [])
      .filter((item) => item.type === "blob" && item.path.startsWith(`${config.githubDocsPath}/`) && item.path.endsWith(".md"))
      .map((item) => item.path);
  }

  async function scanDirectoryListing(root) {
    // 兼容 nginx/apache 目录索引；GitHub Pages 默认不开放目录列表，因此仍以 manifest 为主。
    const html = await fetchText(`${root}/`);
    const links = Array.from(html.matchAll(/href=["']([^"']+)["']/gi)).map((match) => match[1]);
    return links.filter((href) => href.endsWith(".md")).map((href) => `${root}/${href.replace(/^\.\//, "")}`);
  }

  function normalizeDocPaths(paths) {
    return [...new Set(paths)]
      .filter((path) => String(path).endsWith(".md"))
      .map((path) => decodeURI(String(path).replace(/^\.\//, "")))
      .sort((a, b) => a.localeCompare(b, "zh-CN", { numeric: true }));
  }

  function parseFrontMatter(markdown) {
    const match = markdown.match(/^---\n([\s\S]*?)\n---\n?/);
    const data = {};
    let body = markdown;
    if (match) {
      body = markdown.slice(match[0].length);
      match[1].split("\n").forEach((line) => {
        const pair = line.match(/^([\w-]+):\s*(.*)$/);
        if (!pair) return;
        const key = pair[1];
        const raw = pair[2].trim();
        if (/^\[.*\]$/.test(raw)) {
          data[key] = raw.slice(1, -1).split(",").map((item) => item.trim().replace(/^['"]|['"]$/g, "")).filter(Boolean);
        } else {
          data[key] = raw.replace(/^['"]|['"]$/g, "");
        }
      });
    }
    return { data, body };
  }

  function extractTitle(markdown, filePath, frontMatter = {}) {
    if (frontMatter.title) return frontMatter.title;
    const heading = markdown.match(/^#\s+(.+)$/m);
    if (heading) return stripMarkdown(heading[1]);
    return filePath.split("/").pop().replace(/\.md$/, "").replace(/[-_]/g, " ");
  }

  function stripMarkdown(markdown) {
    return String(markdown)
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
      .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
      .replace(/[#>*_~|\-`]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function countWords(text) {
    const clean = stripMarkdown(text);
    const cjk = (clean.match(/[\u4e00-\u9fa5]/g) || []).length;
    const latin = (clean.replace(/[\u4e00-\u9fa5]/g, " ").match(/[A-Za-z0-9_]+/g) || []).length;
    return cjk + latin;
  }

  function estimateReadTime(words) {
    return Math.max(1, Math.ceil(words / config.wordsPerMinute));
  }

  function inferCategory(path) {
    const parts = path.replace(`${config.docsRoot}/`, "").split("/");
    return parts.length > 1 ? parts[0] : "docs";
  }

  function inferTags(path, frontMatter) {
    if (Array.isArray(frontMatter.tags)) return frontMatter.tags;
    if (frontMatter.tags) return String(frontMatter.tags).split(/[，,]/).map((tag) => tag.trim()).filter(Boolean);
    return path.replace(`${config.docsRoot}/`, "").split("/").slice(0, -1).filter(Boolean);
  }

  function formatDate(value) {
    if (!value) return "未知";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
    return date.toISOString().slice(0, 10);
  }

  function buildDocHash(path, anchor = "") {
    const route = `#/${encodeURI(path)}`;
    return anchor ? `${route}?anchor=${encodeURIComponent(anchor)}` : route;
  }

  function parseDocRoute(hash) {
    const docMatch = hash.match(/^#\/(docs\/.+\.md)(?:\?anchor=(.+))?$/i);
    if (!docMatch) return null;
    return {
      path: decodeURI(docMatch[1]),
      anchor: docMatch[2] ? decodeURIComponent(docMatch[2]) : ""
    };
  }

  function isLocalHost() {
    return ["127.0.0.1", "localhost", "::1"].includes(window.location.hostname);
  }

  function buildDocMetaMarkup(doc) {
    return [
      `📄 ${doc.stats.words.toLocaleString("zh-CN")} 字`,
      `⏱ ${doc.stats.readTime} 分钟`,
      `🗓 创建 ${escapeHtml(formatDate(doc.stats.created))}`,
      `🕒 更新 ${escapeHtml(formatDate(doc.stats.updated || doc.stats.created))}`,
      `✍️ ${escapeHtml(doc.stats.author || "社区")}`
    ].map((item) => `<span>${item}</span>`).join("");
  }

  function buildPagerMarkup(prev, next) {
    return `
      ${prev ? `<a class="pager-card" href="${buildDocHash(prev.path)}"><span>上一篇</span><strong>${escapeHtml(prev.title)}</strong></a>` : "<span></span>"}
      ${next ? `<a class="pager-card next" href="${buildDocHash(next.path)}"><span>下一篇</span><strong>${escapeHtml(next.title)}</strong></a>` : "<span></span>"}
    `;
  }

  function titleToPinyinSeed(text) {
    // 轻量拼音搜索占位：不引入大词库时，保留中文、首字母和英文；可替换为 pinyin-pro CDN。
    return String(text).normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }

  async function loadDocs() {
    const paths = await discoverDocs();
    const docs = await Promise.all(paths.map(async (path) => {
      try {
        const markdown = await fetchText(path);
        const { data, body } = parseFrontMatter(markdown);
        const meta = state.manifestMeta.get(decodeURI(path)) || {};
        const title = extractTitle(body, path, data);
        const words = countWords(body);
        const stats = {
          words,
          readTime: estimateReadTime(words),
          created: meta.created || data.created || data.date || "",
          updated: meta.updated || data.updated || data.modified || data.date || "",
          author: data.author || "智能车竞赛社区",
          category: data.category || inferCategory(path),
          tags: inferTags(path, data)
        };
        return {
          path,
          title,
          markdown,
          body,
          frontMatter: data,
          summary: data.description || stripMarkdown(body).slice(0, 130),
          stats,
          searchText: stripMarkdown(body),
          pinyin: titleToPinyinSeed(`${title} ${stats.tags.join(" ")} ${stats.category}`)
        };
      } catch (error) {
        return {
          path,
          title: path.split("/").pop(),
          markdown: `# 加载失败\n\n无法读取 \`${path}\`。`,
          body: "",
          frontMatter: {},
          summary: "文档加载失败。",
          stats: { words: 0, readTime: 1, created: "", updated: "", author: "", category: inferCategory(path), tags: [] },
          searchText: "",
          pinyin: ""
        };
      }
    }));

    state.docs = docs;
    state.docsByPath = new Map(docs.map((doc) => [doc.path, doc]));
    state.fuse = new Fuse(docs, {
      includeMatches: true,
      threshold: 0.36,
      ignoreLocation: true,
      minMatchCharLength: 1,
      keys: [
        { name: "title", weight: 0.35 },
        { name: "searchText", weight: 0.3 },
        { name: "stats.tags", weight: 0.18 },
        { name: "stats.category", weight: 0.1 },
        { name: "pinyin", weight: 0.07 }
      ]
    });
  }

  function renderFileTree() {
    const tree = { name: config.docsRoot, children: new Map(), files: [] };
    state.docs.forEach((doc) => {
      const parts = doc.path.replace(`${config.docsRoot}/`, "").split("/");
      let node = tree;
      parts.slice(0, -1).forEach((part) => {
        if (!node.children.has(part)) node.children.set(part, { name: part, children: new Map(), files: [] });
        node = node.children.get(part);
      });
      node.files.push(doc);
    });

    const renderNode = (node, depth = 0) => {
      const folders = [...node.children.values()].map((child) => `
        <details open style="--depth:${depth}">
          <summary><i class="fa-regular fa-folder-open"></i>${escapeHtml(child.name)}</summary>
          ${renderNode(child, depth + 1)}
        </details>
      `).join("");
      const files = node.files.map((doc) => `
        <a href="${buildDocHash(doc.path)}" data-path="${escapeHtml(doc.path)}" style="--depth:${depth}">
          <i class="fa-regular fa-file-lines"></i><span>${escapeHtml(doc.title)}</span>
        </a>
      `).join("");
      return `${folders}${files}`;
    };

    els.fileTree.innerHTML = renderNode(tree);
  }

  function renderHome() {
    const totalWords = state.docs.reduce((sum, doc) => sum + doc.stats.words, 0);
    const lastUpdated = state.docs
      .map((doc) => doc.stats.updated || doc.stats.created)
      .filter(Boolean)
      .sort()
      .pop() || "以文件为准";
    els.siteStats.innerHTML = `
      <div class="stat"><strong>${state.docs.length}</strong><span>文档数量</span></div>
      <div class="stat"><strong>${totalWords.toLocaleString("zh-CN")}</strong><span>总字数</span></div>
      <div class="stat"><strong>${escapeHtml(formatDate(lastUpdated))}</strong><span>最后更新</span></div>
      <a class="btn primary full" href="https://github.com/${config.githubRepo}" target="_blank" rel="noreferrer"><i class="fa-brands fa-github"></i> GitHub 仓库</a>
    `;

    const features = [
      ["自动文档树", "扫描 docs/manifest.json 或 GitHub tree，支持多级目录与上一篇/下一篇。", "fa-sitemap"],
      ["增强 Markdown", "GFM、代码高亮、Mermaid、KaTeX、脚注、任务列表与图片预览。", "fa-wand-magic-sparkles"],
      ["本地全文搜索", "Fuse.js 自动索引标题、正文、标签、分类，并支持 Ctrl + K 快捷键。", "fa-magnifying-glass-chart"],
      ["阅读体验", "深浅色主题、阅读进度、TOC 高亮、毛玻璃侧栏与移动端适配。", "fa-book-open-reader"]
    ];
    els.featureGrid.innerHTML = features.map(([title, text, icon]) => `
      <article class="feature-card"><i class="fa-solid ${icon}"></i><h3>${title}</h3><p>${text}</p></article>
    `).join("");

    els.recentUpdates.innerHTML = [...state.docs]
      .sort((a, b) => String(b.stats.updated || b.path).localeCompare(String(a.stats.updated || a.path)))
      .slice(0, 6)
      .map((doc) => `
        <a class="update-item" href="${buildDocHash(doc.path)}">
          <span><strong>${escapeHtml(doc.title)}</strong><small>${escapeHtml(doc.summary)}</small></span>
          <time>${escapeHtml(formatDate(doc.stats.updated || doc.stats.created))}</time>
        </a>
      `).join("");
    syncReadmePreview();
  }

  async function syncReadmePreview() {
    if (!els.readmePreview) return;
    try {
      const readme = await fetchText(config.readmePath);
      const excerpt = readme.split("\n").slice(0, 90).join("\n");
      els.readmePreview.innerHTML = md.render(excerpt);
      enhanceReadmePreviewLinks();
    } catch (error) {
      els.readmePreview.innerHTML = `<p>README 暂时不可用：${escapeHtml(error.message)}</p>`;
    }
  }

  function enhanceReadmePreviewLinks() {
    $$("a", els.readmePreview).forEach((link) => {
      const href = link.getAttribute("href") || "";
      if (/^docs\/.+\.md/.test(href)) {
        link.href = buildDocHash(href);
      } else if (/^https?:\/\//.test(href)) {
        link.target = "_blank";
        link.rel = "noreferrer";
      }
    });
  }

  function renderBreadcrumbs(doc) {
    const parts = doc.path.split("/");
    const crumbs = [`<a href="#/">首页</a>`];
    let acc = "";
    parts.forEach((part, index) => {
      acc = acc ? `${acc}/${part}` : part;
      if (index === parts.length - 1) {
        crumbs.push(`<span>${escapeHtml(doc.title)}</span>`);
      } else {
        crumbs.push(`<span>${escapeHtml(part)}</span>`);
      }
    });
    els.breadcrumbs.innerHTML = crumbs.join(`<i class="fa-solid fa-chevron-right"></i>`);
  }

  function renderDoc(path, anchor = "") {
    const doc = state.docsByPath.get(decodeURI(path)) || state.docs[0];
    if (!doc) return;
    state.activeDoc = doc;
    state.headings = [];
    els.docContent.replaceChildren();
    els.docTags.replaceChildren();
    els.docPager.replaceChildren();
    els.toc.innerHTML = `<span class="toc-empty">本文暂无目录</span>`;
    updateActiveTree(path);

    els.docTitle.textContent = doc.title;
    els.docCategory.textContent = doc.stats.category;
    els.docSummary.textContent = doc.summary;
    els.docMeta.innerHTML = `
      <span>📄 ${doc.stats.words.toLocaleString("zh-CN")} 字</span>
      <span>⏱ ${doc.stats.readTime} 分钟</span>
      <span>🗓 创建 ${escapeHtml(formatDate(doc.stats.created))}</span>
      <span>🕒 更新 ${escapeHtml(formatDate(doc.stats.updated || doc.stats.created))}</span>
      <span>✍️ ${escapeHtml(doc.stats.author || "社区")}</span>
    `;
    els.docMeta.innerHTML = buildDocMetaMarkup(doc);
    els.docTags.innerHTML = doc.stats.tags.map((tag) => `<a class="pill" href="#/search/${encodeURIComponent(tag)}">#${escapeHtml(tag)}</a>`).join("");
    els.editLink.href = `https://github.com/${config.githubRepo}/edit/${config.githubBranch}/${encodeURI(doc.path)}`;
    renderBreadcrumbs(doc);

    try {
      const html = md.render(doc.body || doc.markdown);
      els.docContent.innerHTML = html;
      enhanceRenderedMarkdown();
      renderPager(doc);
      scrollToDocAnchor(anchor);
    } catch (error) {
      console.error("Failed to render document", doc.path, error);
      els.docContent.innerHTML = `<div class="state-message">当前文档渲染失败：${escapeHtml(error.message || String(error))}</div>`;
      return;
      els.docContent.innerHTML = `<div class="state-message">当前文档渲染失败：${escapeHtml(error.message || String(error))}</div>`;
    }
  }

  function renderResolvedDoc(path, anchor = "") {
    const doc = state.docsByPath.get(decodeURI(path)) || state.docs[0];
    if (!doc) return;

    state.activeDoc = doc;
    state.headings = [];
    els.docContent.replaceChildren();
    els.docTags.replaceChildren();
    els.docPager.replaceChildren();
    els.toc.innerHTML = `<span class="toc-empty">本文暂无目录</span>`;
    updateActiveTree(path);

    els.docTitle.textContent = doc.title;
    els.docCategory.textContent = doc.stats.category;
    els.docSummary.textContent = doc.summary;
    els.docMeta.innerHTML = buildDocMetaMarkup(doc);
    els.docTags.innerHTML = doc.stats.tags
      .map((tag) => `<a class="pill" href="#/search/${encodeURIComponent(tag)}">#${escapeHtml(tag)}</a>`)
      .join("");
    els.editLink.href = `https://github.com/${config.githubRepo}/edit/${config.githubBranch}/${encodeURI(doc.path)}`;
    renderBreadcrumbs(doc);

    try {
      const html = md.render(doc.body || doc.markdown);
      els.docContent.innerHTML = html;
      enhanceRenderedMarkdown();
      renderPager(doc);
      scrollToDocAnchor(anchor);
    } catch (error) {
      console.error("Failed to render document", doc.path, error);
      els.docContent.innerHTML = `<div class="state-message">当前文档渲染失败：${escapeHtml(error.message || String(error))}</div>`;
    }
  }

  function enhanceRenderedMarkdown() {
    addHeadingAnchors();
    addCodeLinesAndCopy();
    enhanceLinksAndImages();
    renderMathAndMermaid();
    buildToc();
  }

  function addHeadingAnchors() {
    const used = new Map();
    state.headings = $$('h1, h2, h3, h4', els.docContent).map((heading) => {
      const text = heading.textContent.trim();
      const base = slugify(text);
      const count = used.get(base) || 0;
      used.set(base, count + 1);
      const id = count ? `${base}-${count + 1}` : base;
      heading.id = id;
      heading.innerHTML = `<a class="heading-anchor" href="${buildDocHash(state.activeDoc.path, id)}" aria-hidden="true">#</a>${heading.innerHTML}`;
      return { id, text, level: Number(heading.tagName.slice(1)), element: heading };
    });
  }

  function addCodeLinesAndCopy() {
    $$("pre.code-block", els.docContent).forEach((pre) => {
      const code = $("code", pre);
      if (!code) return;
      const language = pre.dataset.language || "text";
      pre.setAttribute("data-language", language);
      const raw = code.textContent.replace(/\n$/, "");
      const lines = raw.split("\n").length;
      pre.style.setProperty("--line-count", lines);
      const gutter = document.createElement("span");
      gutter.className = "line-numbers";
      gutter.innerHTML = Array.from({ length: lines }, (_, index) => `<span>${index + 1}</span>`).join("");
      pre.prepend(gutter);
      $(".copy-code", pre)?.addEventListener("click", async (event) => {
        await navigator.clipboard.writeText(raw);
        event.currentTarget.textContent = "已复制";
        setTimeout(() => { event.currentTarget.textContent = "复制"; }, 1400);
      });
    });
  }

  function enhanceLinksAndImages() {
    $$("a", els.docContent).forEach((link) => {
      const href = link.getAttribute("href") || "";
      if (/^https?:\/\//.test(href)) {
        link.target = "_blank";
        link.rel = "noreferrer";
      } else if (/^#.+/.test(href)) {
        link.href = buildDocHash(state.activeDoc.path, href.slice(1));
      } else if (/\.md(?:#.*)?$/.test(href)) {
        const resolved = new URL(href, location.origin + "/" + state.activeDoc.path);
        link.href = buildDocHash(resolved.pathname.replace(/^\//, ""), resolved.hash.replace(/^#/, ""));
      }
    });

    $$("img", els.docContent).forEach((img) => {
      img.loading = "lazy";
      img.decoding = "async";
      img.addEventListener("click", () => openImagePreview(img.src, img.alt));
    });
  }

  function renderMathAndMermaid() {
    if (typeof renderMathInElement === "function") {
      renderMathInElement(els.docContent, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false },
          { left: "\\(", right: "\\)", display: false },
          { left: "\\[", right: "\\]", display: true }
        ],
        throwOnError: false
      });
    }
    if (window.mermaid) {
      mermaid.initialize({ startOnLoad: false, theme: getResolvedTheme() === "dark" ? "dark" : "default", securityLevel: "loose" });
      mermaid.run({ nodes: $$(".mermaid", els.docContent) }).catch(() => {});
    }
  }

  function buildToc() {
    const headings = state.headings.filter((heading) => heading.level >= 2 && heading.level <= 4);
    els.toc.innerHTML = headings.length
      ? headings.map((heading) => `<a href="${buildDocHash(state.activeDoc.path, heading.id)}" data-id="${heading.id}" style="--level:${heading.level}">${escapeHtml(heading.text)}</a>`).join("")
      : `<span class="toc-empty">本文暂无目录</span>`;
  }

  function renderPager(doc) {
    const index = state.docs.findIndex((item) => item.path === doc.path);
    const prev = state.docs[index - 1];
    const next = state.docs[index + 1];
    els.docPager.innerHTML = buildPagerMarkup(prev, next);
    return;
    els.docPager.innerHTML = `
      ${prev ? `<a class="pager-card" href="${buildDocHash(prev.path)}"><span>上一篇</span><strong>${escapeHtml(prev.title)}</strong></a>` : "<span></span>"}
      ${next ? `<a class="pager-card next" href="${buildDocHash(next.path)}"><span>下一篇</span><strong>${escapeHtml(next.title)}</strong></a>` : "<span></span>"}
    `;
  }

  function scrollToDocAnchor(anchor) {
    if (!anchor) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const target = document.getElementById(anchor);
    if (!target) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    requestAnimationFrame(() => {
      target.scrollIntoView({ block: "start", behavior: "smooth" });
      updateTocActive();
    });
  }

  function updateActiveTree(path) {
    $$("[data-path]", els.fileTree).forEach((link) => {
      link.classList.toggle("active", decodeURI(link.dataset.path) === decodeURI(path));
    });
  }

  function openSearch(query = "") {
    els.searchDialog.showModal();
    els.searchInput.value = query;
    runSearch(query);
    setTimeout(() => els.searchInput.focus(), 30);
  }

  function syncSearchScopes() {
    state.searchScopes.docs = els.searchDocsScope.checked;
    state.searchScopes.resources = els.searchResourcesScope.checked;
    if (!state.searchScopes.docs && !state.searchScopes.resources) {
      state.searchScopes.docs = true;
      state.searchScopes.resources = true;
      els.searchDocsScope.checked = true;
      els.searchResourcesScope.checked = true;
    }
    runSearch(els.searchInput.value);
  }

  function getDocSearchResults(query) {
    if (!state.searchScopes.docs) return [];
    if (!query) return state.docs.slice(0, 6).map((doc) => ({ type: "doc", item: doc }));
    return (state.fuse ? state.fuse.search(query) : [])
      .slice(0, 8)
      .map((result) => ({ type: "doc", item: result.item }));
  }

  function getResourceSearchResults(query) {
    if (!state.searchScopes.resources) return [];
    const source = query && state.resourceFuse
      ? state.resourceFuse.search(query).map((result) => result.item)
      : state.resources.filter((item) => item.featured).concat(state.resources.filter((item) => !item.featured));
    return source.slice(0, 8).map((item) => ({ type: "resource", item }));
  }

  function buildResourceHref(item) {
    if (!item.url) return "#/resources";
    return isInternalDoc(item.url) ? `#/${item.url.replace(/^#\//, "")}` : item.url;
  }

  function renderDocSearchResult(doc, query) {
    return `
      <a class="search-result" href="${buildDocHash(doc.path)}" data-close-search>
        <small>知识库 · ${escapeHtml(doc.stats.category)}</small>
        <strong>${highlight(doc.title, query)}</strong>
        <span>${highlight(doc.summary || doc.searchText.slice(0, 140), query)}</span>
        <small>${doc.stats.tags.map((tag) => `#${escapeHtml(tag)}`).join(" ")}</small>
      </a>
    `;
  }

  function renderResourceSearchResult(item, query) {
    const href = buildResourceHref(item);
    const externalAttrs = item.url && !isInternalDoc(item.url) ? `target="_blank" rel="noreferrer"` : "";
    return `
      <a class="search-result resource-search-result" href="${escapeHtml(href)}" ${externalAttrs} data-close-search>
        <small>资源 · ${escapeHtml([item.year, labelFor("resourceTypes", item.type)].filter(Boolean).join(" · "))}</small>
        <strong>${highlight(item.title, query)}</strong>
        <span>${highlight(item.description || item.source || "暂无简介。", query)}</span>
        <small>${[...item.groups.map((id) => labelFor("groups", id)), ...item.topics.map((id) => labelFor("topics", id)), ...item.tags].filter(Boolean).map((tag) => `#${escapeHtml(tag)}`).join(" ")}</small>
      </a>
    `;
  }

  function runSearch(query) {
    const trimmed = query.trim();
    const docs = getDocSearchResults(trimmed);
    const resources = getResourceSearchResults(trimmed);
    const sections = [];
    if (state.searchScopes.docs) {
      sections.push(`
        <section class="search-section">
          <h3>知识库</h3>
          ${docs.length ? docs.map(({ item }) => renderDocSearchResult(item, trimmed)).join("") : `<p class="empty">没有找到相关文档。</p>`}
        </section>
      `);
    }
    if (state.searchScopes.resources) {
      sections.push(`
        <section class="search-section">
          <h3>资源</h3>
          ${resources.length ? resources.map(({ item }) => renderResourceSearchResult(item, trimmed)).join("") : `<p class="empty">没有找到相关资源。</p>`}
        </section>
      `);
    }
    els.searchResults.innerHTML = sections.join("");
  }

  function highlight(text, query) {
    const safe = escapeHtml(text);
    if (!query) return safe;
    const parts = query.split(/\s+/).filter(Boolean).map(escapeRegExp);
    if (!parts.length) return safe;
    return safe.replace(new RegExp(`(${parts.join("|")})`, "gi"), "<mark>$1</mark>");
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function setSidebarCollapsed(collapsed, persist = true) {
    els.body.classList.toggle("sidebar-collapsed", collapsed);
    if (els.toggleSidebar) {
      els.toggleSidebar.setAttribute("aria-pressed", String(collapsed));
      els.toggleSidebar.innerHTML = collapsed
        ? `<i class="fa-solid fa-table-list"></i><span>显示文件树</span>`
        : `<i class="fa-solid fa-table-list"></i><span>隐藏文件树</span>`;
    }
    if (collapsed) {
      els.sidebar.classList.remove("open");
      els.mobileMenu.setAttribute("aria-expanded", "false");
    }
    if (persist) localStorage.setItem("doc-sidebar-collapsed", collapsed ? "1" : "0");
  }

  function setTocCollapsed(collapsed, persist = true) {
    els.body.classList.toggle("toc-collapsed", collapsed);
    if (els.toggleToc) {
      els.toggleToc.setAttribute("aria-pressed", String(collapsed));
      els.toggleToc.innerHTML = collapsed
        ? `<i class="fa-solid fa-list-ul"></i><span>显示目录</span>`
        : `<i class="fa-solid fa-list-ul"></i><span>隐藏目录</span>`;
    }
    if (persist) localStorage.setItem("doc-toc-collapsed", collapsed ? "1" : "0");
  }

  function applyLayoutPreferences() {
    setSidebarCollapsed(localStorage.getItem("doc-sidebar-collapsed") === "1", false);
    setTocCollapsed(localStorage.getItem("doc-toc-collapsed") === "1", false);
  }

  function showView(name) {
    els.home.hidden = name !== "home";
    els.resources.hidden = name !== "resources";
    els.doc.hidden = name !== "doc";
    els.tocPanel.hidden = name !== "doc";
    document.body.dataset.view = name;
    if (name !== "doc") {
      els.sidebar.classList.remove("open");
      els.mobileMenu.setAttribute("aria-expanded", "false");
    }
    $$("[data-route]").forEach((link) => link.classList.toggle("active", link.dataset.route === name || (name === "doc" && link.dataset.route === "docs")));
  }

  function handleRoute() {
    const hash = decodeURI(window.location.hash || "#/ ").replace("#/ ", "#/" );
    const searchMatch = hash.match(/^#\/search\/(.+)$/);
    if (searchMatch) openSearch(decodeURIComponent(searchMatch[1]));

    if (!hash || hash === "#/" || hash === "#") {
      showView("home");
      return;
    }
    if (hash === "#/resources") {
      showView("resources");
      return;
    }
    const docRoute = parseDocRoute(hash);
    if (docRoute) {
      showView("doc");
      renderResolvedDoc(docRoute.path, docRoute.anchor);
      return;
    }
    showView("home");
  }

  function getResolvedTheme() {
    const preference = localStorage.getItem("doc-theme") || "auto";
    if (preference === "auto") return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    return preference;
  }

  function applyTheme() {
    const theme = getResolvedTheme();
    els.body.dataset.theme = theme;
    els.themeToggle.innerHTML = theme === "dark" ? `<i class="fa-solid fa-sun"></i>` : `<i class="fa-solid fa-moon"></i>`;
  }

  function toggleTheme() {
    const current = getResolvedTheme();
    localStorage.setItem("doc-theme", current === "dark" ? "light" : "dark");
    applyTheme();
    if (state.activeDoc) renderMathAndMermaid();
  }

  function updateReadingProgress() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = max > 0 ? window.scrollY / max : 0;
    els.readProgress.style.width = `${Math.min(100, Math.max(0, ratio * 100))}%`;
    els.backTop.classList.toggle("show", window.scrollY > 500);
    updateTocActive();
  }

  function updateTocActive() {
    if (!state.headings.length) return;
    const current = [...state.headings].reverse().find((heading) => heading.element.getBoundingClientRect().top <= 120) || state.headings[0];
    $$("a", els.toc).forEach((link) => link.classList.toggle("active", link.dataset.id === current.id));
  }

  function openImagePreview(src, alt) {
    $("img", els.imagePreview).src = src;
    $("img", els.imagePreview).alt = alt || "预览图片";
    els.imagePreview.hidden = false;
  }

  function closeImagePreview() {
    els.imagePreview.hidden = true;
  }

  function optionMap(name) {
    return new Map((state.taxonomy[name] || []).map((option) => [option.id, option.name]));
  }

  function labelFor(mapName, id) {
    return optionMap(mapName).get(id) || id || "";
  }

  function normalizeArray(value) {
    if (Array.isArray(value)) return value.filter(Boolean).map(String);
    return value ? [String(value)] : [];
  }

  function normalizeSource(source) {
    if (!source) return "";
    if (typeof source === "string") return source;
    return [source.platform, source.author].filter(Boolean).join(" / ");
  }

  function normalizeResource(item, index, options = {}) {
    return {
      id: item.id || `resource-${index}`,
      title: item.title || "未命名资源",
      year: String(item.year || ""),
      groups: normalizeArray(item.groups || item.group),
      type: item.type || "",
      topics: normalizeArray(item.topics || item.topic),
      level: item.level || "",
      url: item.url || "",
      description: item.description || "",
      tags: normalizeArray(item.tags),
      featured: Boolean(item.featured),
      source: normalizeSource(item.source || item.author),
      language: item.language || "zh-CN",
      createdAt: item.createdAt || "",
      updatedAt: item.updatedAt || "",
      local: Boolean(options.local),
      searchText: ""
    };
  }

  function loadRawResourceDrafts() {
    try {
      const payload = JSON.parse(localStorage.getItem(RESOURCE_DRAFTS_KEY) || "[]");
      return Array.isArray(payload) ? payload.filter((item) => item && typeof item === "object") : [];
    } catch {
      return [];
    }
  }

  function saveRawResourceDrafts(drafts) {
    localStorage.setItem(RESOURCE_DRAFTS_KEY, JSON.stringify(drafts, null, 2));
  }

  function loadResourceDrafts() {
    return loadRawResourceDrafts().map((item, index) => normalizeResource(item, `draft-${index}`, { local: true }));
  }

  function mergeResources() {
    state.resources = [...state.baseResources, ...state.resourceDrafts];
    state.resources.forEach((item) => {
      item.searchText = getSearchText(item);
    });
    rebuildResourceFuse();
    updateResourceDraftMeta();
  }

  function rebuildResourceFuse() {
    state.resourceFuse = typeof Fuse === "function"
      ? new Fuse(state.resources, {
        threshold: 0.32,
        ignoreLocation: true,
        minMatchCharLength: 1,
        keys: [
          { name: "title", weight: 0.3 },
          { name: "description", weight: 0.22 },
          { name: "searchText", weight: 0.28 },
          { name: "source", weight: 0.1 },
          { name: "tags", weight: 0.1 }
        ]
      })
      : null;
  }

  function todayString() {
    return new Date().toISOString().slice(0, 10);
  }

  function splitList(value) {
    return [...new Set(String(value || "")
      .split(/[，,]/)
      .map((item) => item.trim())
      .filter(Boolean))];
  }

  function slugifyId(value) {
    return String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function hashIdSeed(value) {
    let hash = 0;
    String(value || "").split("").forEach((char) => {
      hash = ((hash * 31) + char.charCodeAt(0)) >>> 0;
    });
    return hash.toString(36);
  }

  function inferPlatform(type, url) {
    if (type) return type;
    try {
      return new URL(url).hostname.replace(/^www\./, "").split(".")[0] || "web";
    } catch {
      return "web";
    }
  }

  function createResourceId(payload) {
    const fallback = slugifyId(new URL(payload.url).hostname.replace(/^www\./, "").split(".")[0]);
    const seed = slugifyId(payload.title) || fallback || "resource";
    const base = slugifyId([payload.year, payload.groups[0], payload.type, seed, hashIdSeed(`${payload.title}${payload.url}`).slice(0, 5)].filter(Boolean).join("-"));
    const used = new Set(state.resources.map((item) => item.id));
    let id = base;
    let suffix = 2;
    while (used.has(id)) {
      id = `${base}-${suffix}`;
      suffix += 1;
    }
    return id;
  }

  function readResourceForm() {
    const title = els.resourceTitle.value.trim();
    const url = els.resourceUrl.value.trim();
    const year = els.resourceYear.value;
    const group = els.resourceGroup.value;
    const type = els.resourceType.value;
    const topic = els.resourceTopic.value;
    const level = els.resourceLevel.value || "beginner";
    const sourceAuthor = els.resourceSource.value.trim() || "待补充";
    const description = els.resourceDescription.value.trim() || `${title} 的资料链接，待补充详细简介。`;
    const tags = splitList(els.resourceTags.value);
    const date = todayString();
    const payload = {
      title,
      url,
      year,
      groups: [group],
      type,
      topics: [topic],
      level,
      language: "zh-CN",
      description,
      source: {
        platform: inferPlatform(type, url),
        author: sourceAuthor
      },
      tags,
      featured: els.resourceFeatured.checked,
      createdAt: date,
      updatedAt: date
    };
    payload.id = createResourceId(payload);
    return payload;
  }

  function isHttpUrl(value) {
    try {
      const parsed = new URL(value);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }

  function updateResourceDraftMeta() {
    if (!els.resourceDraftMeta) return;
    const count = state.resourceDrafts.length;
    els.resourceDraftMeta.textContent = count ? `本地新增 ${count} 条` : "暂无本地新增";
    els.exportResourceDrafts.disabled = count === 0;
    els.clearResourceDrafts.disabled = count === 0;
  }

  function hydrateResourceForm() {
    if (!els.resourceForm) return;
    fillSelect(els.resourceYear, state.taxonomy.years || [], "选择年份");
    fillSelect(els.resourceGroup, state.taxonomy.groups || [], "选择组别");
    fillSelect(els.resourceType, state.taxonomy.resourceTypes || [], "选择类型");
    fillSelect(els.resourceTopic, state.taxonomy.topics || [], "选择主题");
    fillSelect(els.resourceLevel, state.taxonomy.levels || [], "选择难度");
  }

  function clearResourceFormText() {
    els.resourceTitle.value = "";
    els.resourceUrl.value = "";
    els.resourceSource.value = "";
    els.resourceTags.value = "";
    els.resourceDescription.value = "";
    els.resourceFeatured.checked = false;
    els.resourceTitle.focus();
  }

  function addResourceDraft(event) {
    event.preventDefault();
    if (!els.resourceForm.reportValidity()) return;
    if (!isHttpUrl(els.resourceUrl.value.trim())) {
      els.resourceUrl.setCustomValidity("请输入 http 或 https 链接");
      els.resourceUrl.reportValidity();
      els.resourceUrl.setCustomValidity("");
      return;
    }
    const draft = readResourceForm();
    const drafts = loadRawResourceDrafts();
    drafts.push(draft);
    saveRawResourceDrafts(drafts);
    state.resourceDrafts = loadResourceDrafts();
    mergeResources();
    hydrateFilters();
    renderResources();
    clearResourceFormText();
  }

  function exportResourceDrafts() {
    const drafts = loadRawResourceDrafts();
    if (!drafts.length) return;
    const blob = new Blob([JSON.stringify(drafts, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `resources-drafts-${todayString()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function clearResourceDrafts() {
    if (!state.resourceDrafts.length) return;
    if (!window.confirm("清空本地新增资源？")) return;
    localStorage.removeItem(RESOURCE_DRAFTS_KEY);
    state.resourceDrafts = [];
    mergeResources();
    hydrateFilters();
    renderResources();
  }

  function fillSelect(select, options, label) {
    const current = select.value;
    select.innerHTML = `<option value="">${label}</option>`;
    options.forEach((option) => {
      const item = document.createElement("option");
      item.value = typeof option === "string" ? option : option.id;
      item.textContent = typeof option === "string" ? option : option.name;
      select.appendChild(item);
    });
    select.value = [...select.options].some((option) => option.value === current) ? current : "";
  }

  function hydrateFilters() {
    const usedYears = new Set(state.resources.map((item) => item.year).filter(Boolean));
    const years = (state.taxonomy.years || []).filter((year) => !usedYears.size || usedYears.has(year)).sort((a, b) => String(b).localeCompare(String(a), "zh-CN"));
    fillSelect(els.year, years, "全部年份");
    fillSelect(els.group, state.taxonomy.groups || [], "全部组别");
    fillSelect(els.type, state.taxonomy.resourceTypes || [], "全部类型");
    fillSelect(els.topic, state.taxonomy.topics || [], "全部主题");
  }

  function getSearchText(item) {
    return [
      item.title,
      item.year,
      item.type,
      labelFor("resourceTypes", item.type),
      labelFor("levels", item.level),
      item.description,
      item.source,
      ...item.groups.map((id) => labelFor("groups", id)),
      ...item.topics.map((id) => labelFor("topics", id)),
      ...item.tags
    ].join(" ").toLowerCase();
  }

  function matchesFilters(item) {
    const keyword = state.filters.keyword.trim().toLowerCase();
    return (!keyword || getSearchText(item).includes(keyword))
      && (!state.filters.year || item.year === state.filters.year)
      && (!state.filters.group || item.groups.includes(state.filters.group))
      && (!state.filters.type || item.type === state.filters.type)
      && (!state.filters.topic || item.topics.includes(state.filters.topic));
  }

  function renderPills(values, mapName) {
    return values.map((value) => `<span class="pill">${escapeHtml(labelFor(mapName, value))}</span>`).join("");
  }

  function clampResourcePage(totalPages) {
    state.resourcePage = Math.min(Math.max(1, state.resourcePage), Math.max(1, totalPages));
  }

  function setResourceView(view) {
    state.resourceView = view === "detail" ? "detail" : "grid";
    localStorage.setItem("resource-view-mode", state.resourceView);
    els.resourceList.dataset.view = state.resourceView;
    $$(".resource-view-btn").forEach((button) => {
      const active = button.dataset.resourceView === state.resourceView;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    renderResources();
  }

  function setResourcePageSize(value) {
    const size = Number(value);
    state.resourcePageSize = [20, 50, 100, 200].includes(size) ? size : 50;
    localStorage.setItem("resource-page-size", String(state.resourcePageSize));
    if (els.resourcePageSize) els.resourcePageSize.value = String(state.resourcePageSize);
    state.resourcePage = 1;
    renderResources();
  }

  function renderResourceCard(item) {
    const action = item.url
      ? `<a href="${escapeHtml(isInternalDoc(item.url) ? `#/${item.url.replace(/^#\//, "")}` : item.url)}" ${isInternalDoc(item.url) ? "" : "target=\"_blank\" rel=\"noreferrer\""}>打开资源</a>`
      : `<span class="pill">待补充链接</span>`;
    const tags = item.tags.map((tag) => `<span class="tag">#${escapeHtml(tag)}</span>`).join("");
    const groups = item.groups.map((id) => labelFor("groups", id)).filter(Boolean).join("、") || "未分组";
    const topics = item.topics.map((id) => labelFor("topics", id)).filter(Boolean).join("、") || "未标注";
    const updated = item.updatedAt || item.createdAt || "";
    return `
      <article class="resource-card">
        <div class="card-topline">
          ${item.year ? `<span>${escapeHtml(item.year)}</span>` : ""}
          ${item.local ? `<span class="pill local">本地新增</span>` : ""}
          ${item.featured ? `<span class="pill featured">精选</span>` : ""}
          ${renderPills(item.groups, "groups")}
          ${item.type ? `<span class="pill">${escapeHtml(labelFor("resourceTypes", item.type))}</span>` : ""}
        </div>
        <div class="resource-card-main">
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.description || "暂无简介。")}</p>
          ${item.source ? `<p class="resource-source"><strong>来源：</strong>${escapeHtml(item.source)}</p>` : ""}
        </div>
        <dl class="resource-detail-meta">
          <div><dt>年份</dt><dd>${escapeHtml(item.year || "未标注")}</dd></div>
          <div><dt>组别</dt><dd>${escapeHtml(groups)}</dd></div>
          <div><dt>类型</dt><dd>${escapeHtml(labelFor("resourceTypes", item.type) || "未标注")}</dd></div>
          <div><dt>主题</dt><dd>${escapeHtml(topics)}</dd></div>
          <div><dt>难度</dt><dd>${escapeHtml(labelFor("levels", item.level) || "未标注")}</dd></div>
          ${updated ? `<div><dt>更新</dt><dd>${escapeHtml(updated)}</dd></div>` : ""}
        </dl>
        <div class="tag-list">${renderPills(item.topics, "topics")}${item.level ? `<span class="pill level">${escapeHtml(labelFor("levels", item.level))}</span>` : ""}${tags}</div>
        <div class="card-actions">${action}</div>
      </article>
    `;
  }

  function renderResourcePager(total, totalPages) {
    if (!els.resourcePager) return;
    if (totalPages <= 1) {
      els.resourcePager.innerHTML = "";
      return;
    }
    const start = (state.resourcePage - 1) * state.resourcePageSize + 1;
    const end = Math.min(total, state.resourcePage * state.resourcePageSize);
    els.resourcePager.innerHTML = `
      <button type="button" data-page="prev" ${state.resourcePage <= 1 ? "disabled" : ""}><i class="fa-solid fa-chevron-left"></i>上一页</button>
      <span>第 ${state.resourcePage} / ${totalPages} 页，${start}-${end} 条</span>
      <button type="button" data-page="next" ${state.resourcePage >= totalPages ? "disabled" : ""}>下一页<i class="fa-solid fa-chevron-right"></i></button>
    `;
  }

  function renderResources() {
    const results = state.resources.filter(matchesFilters);
    const totalPages = Math.ceil(results.length / state.resourcePageSize) || 1;
    clampResourcePage(totalPages);
    const startIndex = (state.resourcePage - 1) * state.resourcePageSize;
    const pageItems = results.slice(startIndex, startIndex + state.resourcePageSize);
    els.resourceList.dataset.view = state.resourceView;
    els.resultMeta.textContent = `共 ${results.length} / ${state.resources.length} 条资源，当前第 ${state.resourcePage} 页`;
    if (!results.length) {
      els.resourceList.innerHTML = `<div class="state-message">没有匹配的资源，请调整筛选条件。</div>`;
      renderResourcePager(0, 1);
      return;
    }
    els.resourceList.innerHTML = pageItems.map(renderResourceCard).join("");
    renderResourcePager(results.length, totalPages);
  }

  function isInternalDoc(url) {
    return /^docs\/.+\.md(?:#.*)?$/i.test(url) || /^#\/docs\/.+\.md(?:#.*)?$/i.test(url);
  }

  async function loadResourcePayloads() {
    try {
      const index = await fetchJson(RESOURCE_INDEX_URL);
      const files = Array.isArray(index.files) ? index.files : [];
      const payloads = await Promise.all(files.map((file) => fetchJson(file)));
      return payloads.flatMap((payload) => Array.isArray(payload) ? payload : payload.resources || []);
    } catch (error) {
      const payload = await fetchJson(LEGACY_DATA_URL);
      return Array.isArray(payload) ? payload : payload.resources || [];
    }
  }

  async function loadResources() {
    try {
      const [rawTaxonomy, list] = await Promise.all([fetchJson(TAXONOMY_URL).catch(() => fallbackTaxonomy), loadResourcePayloads()]);
      state.taxonomy = { ...fallbackTaxonomy, ...rawTaxonomy };
      state.baseResources = list.map((item, index) => normalizeResource(item, index));
      state.resourceDrafts = loadResourceDrafts();
      mergeResources();
      els.stateMessage.hidden = true;
    } catch (error) {
      state.taxonomy = fallbackTaxonomy;
      state.baseResources = [];
      state.resourceDrafts = loadResourceDrafts();
      state.resources = [];
      mergeResources();
      els.stateMessage.hidden = false;
      els.stateMessage.textContent = "未能读取资源分片。请通过本地静态服务器或 GitHub Pages 访问，并确认 data/resources.index.json 存在。";
    }
    hydrateFilters();
    hydrateResourceForm();
    hydrateResourceControls();
    renderResources();
  }

  function syncFiltersFromForm() {
    state.filters.keyword = els.keyword.value;
    state.filters.year = els.year.value;
    state.filters.group = els.group.value;
    state.filters.type = els.type.value;
    state.filters.topic = els.topic.value;
    state.resourcePage = 1;
    renderResources();
  }

  function hydrateResourceControls() {
    state.resourceView = state.resourceView === "detail" ? "detail" : "grid";
    state.resourcePageSize = [20, 50, 100, 200].includes(state.resourcePageSize) ? state.resourcePageSize : 50;
    if (els.resourcePageSize) els.resourcePageSize.value = String(state.resourcePageSize);
    if (els.resourceList) els.resourceList.dataset.view = state.resourceView;
    $$(".resource-view-btn").forEach((button) => {
      const active = button.dataset.resourceView === state.resourceView;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function setResourceBuilderOpen(open) {
    els.resourceBuilder.hidden = !open;
    els.toggleResourceBuilder.setAttribute("aria-expanded", String(open));
    els.toggleResourceBuilder.innerHTML = open
      ? `<i class="fa-solid fa-chevron-up"></i>收起资源工具`
      : `<i class="fa-solid fa-plus"></i>添加资源`;
    if (open) {
      requestAnimationFrame(() => els.resourceBuilder.scrollIntoView({ block: "start", behavior: "smooth" }));
    }
  }

  async function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    if (isLocalHost() || !config.enablePwa) {
      const registrations = await navigator.serviceWorker.getRegistrations().catch(() => []);
      await Promise.all(registrations.map((registration) => registration.unregister().catch(() => false)));
      if ("caches" in window) {
        const keys = await caches.keys().catch(() => []);
        await Promise.all(keys
          .filter((key) => key.startsWith("smartcar-docs-"))
          .map((key) => caches.delete(key).catch(() => false)));
      }
      return;
    }
    navigator.serviceWorker.register("sw.js?v=4").catch(() => {});
  }

  function bindEvents() {
    window.addEventListener("hashchange", handleRoute);
    window.addEventListener("scroll", updateReadingProgress, { passive: true });
    window.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openSearch();
      }
      if (event.key === "Escape") closeImagePreview();
    });
    els.searchTrigger.addEventListener("click", () => openSearch());
    $$('[data-open-search]').forEach((button) => button.addEventListener("click", () => openSearch()));
    els.searchInput.addEventListener("input", (event) => runSearch(event.target.value));
    els.searchDocsScope.addEventListener("change", syncSearchScopes);
    els.searchResourcesScope.addEventListener("change", syncSearchScopes);
    els.searchResults.addEventListener("click", (event) => {
      if (event.target.closest("[data-close-search]")) els.searchDialog.close();
    });
    els.themeToggle.addEventListener("click", toggleTheme);
    els.toggleSidebar.addEventListener("click", () => setSidebarCollapsed(!els.body.classList.contains("sidebar-collapsed")));
    els.toggleToc.addEventListener("click", () => setTocCollapsed(!els.body.classList.contains("toc-collapsed")));
    els.mobileMenu.addEventListener("click", () => {
      if (els.body.classList.contains("sidebar-collapsed")) return;
      const open = els.sidebar.classList.toggle("open");
      els.mobileMenu.setAttribute("aria-expanded", String(open));
    });
    els.collapseAll.addEventListener("click", () => $$("details", els.fileTree).forEach((detail) => { detail.open = false; }));
    els.backTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
    els.imageClose.addEventListener("click", closeImagePreview);
    els.imagePreview.addEventListener("click", (event) => { if (event.target === els.imagePreview) closeImagePreview(); });
    els.filters.addEventListener("input", syncFiltersFromForm);
    els.filters.addEventListener("change", syncFiltersFromForm);
    els.toggleResourceBuilder.addEventListener("click", () => setResourceBuilderOpen(els.resourceBuilder.hidden));
    els.closeResourceBuilder.addEventListener("click", () => setResourceBuilderOpen(false));
    $$(".resource-view-btn").forEach((button) => button.addEventListener("click", () => setResourceView(button.dataset.resourceView)));
    els.resourcePageSize.addEventListener("change", (event) => setResourcePageSize(event.target.value));
    els.resourcePager.addEventListener("click", (event) => {
      const button = event.target.closest("[data-page]");
      if (!button) return;
      state.resourcePage += button.dataset.page === "next" ? 1 : -1;
      renderResources();
      els.resourceList.scrollIntoView({ block: "start", behavior: "smooth" });
    });
    els.resourceForm.addEventListener("submit", addResourceDraft);
    els.exportResourceDrafts.addEventListener("click", exportResourceDrafts);
    els.clearResourceDrafts.addEventListener("click", clearResourceDrafts);
  }

  async function init() {
    applyTheme();
    applyLayoutPreferences();
    bindEvents();
    await Promise.all([loadDocs(), loadResources()]);
    renderFileTree();
    renderHome();
    handleRoute();
    updateReadingProgress();
    registerServiceWorker();
  }

  init().catch((error) => {
    console.error(error);
    els.home.hidden = false;
    els.home.innerHTML = `<div class="state-message">站点初始化失败：${escapeHtml(error.message)}</div>`;
  });
})();
