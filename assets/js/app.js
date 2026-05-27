(function () {
  const DATA_URL = "data/resources.json";
  const TAXONOMY_URL = "data/taxonomy.json";

  const state = {
    resources: [],
    taxonomy: {
      years: [],
      groups: [],
      resourceTypes: [],
      topics: [],
      levels: []
    },
    filters: {
      keyword: "",
      year: "",
      group: "",
      type: "",
      topic: ""
    }
  };

  const els = {
    filters: document.getElementById("filters"),
    keyword: document.getElementById("keyword"),
    year: document.getElementById("year-filter"),
    group: document.getElementById("group-filter"),
    type: document.getElementById("type-filter"),
    topic: document.getElementById("topic-filter"),
    resultMeta: document.getElementById("result-meta"),
    stateMessage: document.getElementById("state-message"),
    resourceList: document.getElementById("resource-list"),
    resourcesView: document.getElementById("resources-view"),
    docView: document.getElementById("doc-view"),
    docContent: document.getElementById("doc-content"),
    docTitle: document.getElementById("doc-title")
  };

  const fallbackTaxonomy = {
    years: ["2024", "2025", "2026"],
    groups: [
      { id: "common", name: "通用资料" },
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

  function optionMap(name) {
    return new Map((state.taxonomy[name] || []).map((option) => [option.id, option.name]));
  }

  function labelFor(mapName, id) {
    return optionMap(mapName).get(id) || id || "";
  }

  function normalizeArray(value) {
    if (Array.isArray(value)) {
      return value.filter(Boolean).map(String);
    }
    return value ? [String(value)] : [];
  }

  function normalizeSource(source) {
    if (!source) {
      return "";
    }
    if (typeof source === "string") {
      return source;
    }
    return [source.platform, source.author].filter(Boolean).join(" / ");
  }

  function normalizeResource(item, index) {
    const groups = normalizeArray(item.groups || item.group);
    const topics = normalizeArray(item.topics || item.topic);
    const tags = normalizeArray(item.tags);
    return {
      id: item.id || `resource-${index}`,
      title: item.title || "未命名资源",
      year: String(item.year || ""),
      groups,
      type: item.type || "",
      topics,
      level: item.level || "",
      url: item.url || "",
      description: item.description || "",
      tags,
      featured: Boolean(item.featured),
      source: normalizeSource(item.source || item.author)
    };
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
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
    const values = Array.from(select.options).map((option) => option.value);
    select.value = values.includes(current) ? current : "";
  }

  function hydrateFilters() {
    const usedYears = new Set(state.resources.map((item) => item.year).filter(Boolean));
    const years = (state.taxonomy.years || [])
      .filter((year) => usedYears.size === 0 || usedYears.has(year))
      .sort((a, b) => String(b).localeCompare(String(a), "zh-CN"));

    fillSelect(els.year, years, "全部年份");
    fillSelect(els.group, state.taxonomy.groups || [], "全部组别");
    fillSelect(els.type, state.taxonomy.resourceTypes || [], "全部类型");
    fillSelect(els.topic, state.taxonomy.topics || [], "全部主题");
  }

  function getSearchText(item) {
    const groupLabels = item.groups.map((id) => labelFor("groups", id));
    const topicLabels = item.topics.map((id) => labelFor("topics", id));
    return [
      item.title,
      item.year,
      item.type,
      labelFor("resourceTypes", item.type),
      labelFor("levels", item.level),
      item.description,
      item.source,
      ...groupLabels,
      ...topicLabels,
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
    return values
      .map((value) => `<span class="pill">${escapeHtml(labelFor(mapName, value))}</span>`)
      .join("");
  }

  function renderResources() {
    const results = state.resources.filter(matchesFilters);
    els.resultMeta.textContent = `共 ${results.length} / ${state.resources.length} 条资源`;
    els.resourceList.innerHTML = "";

    if (!results.length) {
      els.stateMessage.hidden = false;
      els.stateMessage.textContent = "没有匹配的资源。可以减少筛选条件，或检查 data/resources.json 中的字段。";
      return;
    }

    els.stateMessage.hidden = true;
    const fragment = document.createDocumentFragment();

    results.forEach((item) => {
      const card = document.createElement("article");
      card.className = "resource-card";
      const url = item.url ? escapeHtml(item.url) : "";
      const href = isInternalDoc(item.url) && !String(item.url).startsWith("#/")
        ? `#/${url}`
        : url;
      const action = url
        ? `<a href="${href}" target="${isInternalDoc(item.url) ? "_self" : "_blank"}" rel="noopener">打开资源</a>`
        : "";
      const tags = item.tags.map((tag) => `<span class="tag">#${escapeHtml(tag)}</span>`).join("");
      const featured = item.featured ? '<span class="pill featured">精选</span>' : "";

      card.innerHTML = `
        <div class="card-topline">
          ${item.year ? `<span>${escapeHtml(item.year)}</span>` : ""}
          ${featured}
          ${renderPills(item.groups, "groups")}
          ${item.type ? `<span class="pill">${escapeHtml(labelFor("resourceTypes", item.type))}</span>` : ""}
        </div>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.description || "暂无简介。")}</p>
        ${item.source ? `<p><strong>来源：</strong>${escapeHtml(item.source)}</p>` : ""}
        <div class="tag-list">
          ${renderPills(item.topics, "topics")}
          ${item.level ? `<span class="pill level">${escapeHtml(labelFor("levels", item.level))}</span>` : ""}
          ${tags}
        </div>
        <div class="card-actions">${action}</div>
      `;
      fragment.appendChild(card);
    });

    els.resourceList.appendChild(fragment);
  }

  function isInternalDoc(url) {
    return /^docs\/.+\.md(?:#.*)?$/i.test(url) || /^#\/docs\/.+\.md(?:#.*)?$/i.test(url);
  }

  function syncFiltersFromForm() {
    state.filters.keyword = els.keyword.value;
    state.filters.year = els.year.value;
    state.filters.group = els.group.value;
    state.filters.type = els.type.value;
    state.filters.topic = els.topic.value;
    renderResources();
  }

  async function fetchJson(url) {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  }

  async function loadResources() {
    try {
      const [rawTaxonomy, payload] = await Promise.all([
        fetchJson(TAXONOMY_URL).catch(() => fallbackTaxonomy),
        fetchJson(DATA_URL)
      ]);
      const list = Array.isArray(payload) ? payload : payload.resources;
      state.taxonomy = { ...fallbackTaxonomy, ...rawTaxonomy };
      state.resources = (Array.isArray(list) ? list : []).map(normalizeResource);
      els.stateMessage.hidden = true;
    } catch (error) {
      state.taxonomy = fallbackTaxonomy;
      state.resources = [];
      els.stateMessage.hidden = false;
      els.stateMessage.textContent = "未能读取 data/resources.json。通过本地静态服务器或 GitHub Pages 访问时，请确认数据文件存在且 JSON 格式正确。";
    }

    hydrateFilters();
    renderResources();
  }

  function renderMarkdown(markdown) {
    const lines = markdown.replace(/\r\n/g, "\n").split("\n");
    let html = "";
    let inCode = false;
    let listType = "";
    let tableRows = [];

    function closeList() {
      if (listType) {
        html += `</${listType}>`;
        listType = "";
      }
    }

    function closeTable() {
      if (!tableRows.length) {
        return;
      }

      html += "<table>";
      tableRows.forEach((row, index) => {
        const cells = row
          .trim()
          .replace(/^\|/, "")
          .replace(/\|$/, "")
          .split("|")
          .map((cell) => cell.trim());
        const tag = index === 0 ? "th" : "td";
        html += "<tr>";
        cells.forEach((cell) => {
          html += `<${tag}>${inlineMarkdown(cell)}</${tag}>`;
        });
        html += "</tr>";
      });
      html += "</table>";
      tableRows = [];
    }

    function openList(type) {
      closeTable();
      if (listType && listType !== type) {
        closeList();
      }
      if (!listType) {
        html += `<${type}>`;
        listType = type;
      }
    }

    lines.forEach((line) => {
      if (line.startsWith("```")) {
        closeList();
        closeTable();
        html += inCode ? "</code></pre>" : "<pre><code>";
        inCode = !inCode;
        return;
      }

      if (inCode) {
        html += `${escapeHtml(line)}\n`;
        return;
      }

      if (!line.trim()) {
        closeList();
        closeTable();
        return;
      }

      if (/^\|(.+\|)+$/.test(line.trim())) {
        closeList();
        if (!/^\|\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(line.trim())) {
          tableRows.push(line);
        }
        return;
      }

      const heading = line.match(/^(#{1,3})\s+(.+)$/);
      if (heading) {
        closeList();
        closeTable();
        const level = heading[1].length;
        html += `<h${level}>${inlineMarkdown(heading[2])}</h${level}>`;
        return;
      }

      const item = line.match(/^-\s+(.+)$/);
      if (item) {
        openList("ul");
        html += `<li>${inlineMarkdown(item[1])}</li>`;
        return;
      }

      const orderedItem = line.match(/^\d+\.\s+(.+)$/);
      if (orderedItem) {
        openList("ol");
        html += `<li>${inlineMarkdown(orderedItem[1])}</li>`;
        return;
      }

      closeList();
      closeTable();
      html += `<p>${inlineMarkdown(line)}</p>`;
    });

    closeList();
    closeTable();
    if (inCode) {
      html += "</code></pre>";
    }
    return html;
  }

  function inlineMarkdown(text) {
    return escapeHtml(text)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  }

  async function showDoc(path) {
    els.resourcesView.hidden = true;
    els.docView.hidden = false;
    els.docTitle.textContent = path.split("/").pop() || "文档";
    els.docContent.innerHTML = "<p>正在加载文档...</p>";

    try {
      const response = await fetch(path, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const markdown = await response.text();
      els.docContent.innerHTML = renderMarkdown(markdown);
    } catch (error) {
      els.docContent.innerHTML = `<p>无法加载 <code>${escapeHtml(path)}</code>。通过本地静态服务器或 GitHub Pages 访问时可正常读取 Markdown。</p>`;
    }
  }

  function showResources() {
    els.docView.hidden = true;
    els.resourcesView.hidden = false;
  }

  function handleRoute() {
    const hash = window.location.hash || "#/resources";
    const docMatch = hash.match(/^#\/(docs\/.+\.md)$/i);
    if (docMatch) {
      showDoc(docMatch[1]);
      return;
    }
    showResources();
  }

  els.filters.addEventListener("input", syncFiltersFromForm);
  els.filters.addEventListener("change", syncFiltersFromForm);
  window.addEventListener("hashchange", handleRoute);

  loadResources();
  handleRoute();
}());
