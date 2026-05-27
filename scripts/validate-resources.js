const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const resourcesPath = path.join(rootDir, "data", "resources.json");
const taxonomyPath = path.join(rootDir, "data", "taxonomy.json");

const requiredFields = [
  "id",
  "title",
  "url",
  "year",
  "groups",
  "type",
  "topics",
  "level",
  "language",
  "description",
  "source",
  "tags",
  "featured",
  "createdAt",
  "updatedAt"
];

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`${path.relative(rootDir, filePath)} 不是有效 JSON：${error.message}`);
  }
}

function optionIds(options) {
  return new Set(options.map((option) => option.id));
}

function isValidUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function validateUniqueArray(values, label, errors, location) {
  if (!Array.isArray(values)) {
    errors.push(`${location}.${label} 必须是数组`);
    return;
  }

  if (values.length === 0) {
    errors.push(`${location}.${label} 不能为空`);
  }

  const seen = new Set();
  values.forEach((value) => {
    if (seen.has(value)) {
      errors.push(`${location}.${label} 存在重复值：${value}`);
    }
    seen.add(value);
  });
}

function validateResource(resource, index, taxonomy, trackers, errors) {
  const location = `resources[${index}]`;

  if (!resource || typeof resource !== "object" || Array.isArray(resource)) {
    errors.push(`${location} 必须是对象`);
    return;
  }

  requiredFields.forEach((field) => {
    if (!(field in resource)) {
      errors.push(`${location} 缺少必填字段：${field}`);
    }
  });

  if (typeof resource.id === "string") {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(resource.id)) {
      errors.push(`${location}.id 格式错误，应使用小写字母、数字和连字符`);
    }
    if (trackers.ids.has(resource.id)) {
      errors.push(`${location}.id 重复：${resource.id}`);
    }
    trackers.ids.add(resource.id);
  }

  if (typeof resource.url !== "string" || !isValidUrl(resource.url)) {
    errors.push(`${location}.url 必须是 http/https URL`);
  } else {
    const normalizedUrl = resource.url.trim();
    if (trackers.urls.has(normalizedUrl)) {
      errors.push(`${location}.url 重复：${normalizedUrl}`);
    }
    trackers.urls.add(normalizedUrl);
  }

  if (typeof resource.year !== "string" || !/^[0-9]{4}$/.test(resource.year)) {
    errors.push(`${location}.year 必须是 4 位年份字符串，如 2026`);
  } else if (!taxonomy.years.has(resource.year)) {
    errors.push(`${location}.year 不在 taxonomy.years 中：${resource.year}`);
  }

  validateUniqueArray(resource.groups, "groups", errors, location);
  if (Array.isArray(resource.groups)) {
    resource.groups.forEach((group) => {
      if (!taxonomy.groups.has(group)) {
        errors.push(`${location}.groups 包含未知组别：${group}`);
      }
    });
  }

  if (typeof resource.type !== "string" || !taxonomy.resourceTypes.has(resource.type)) {
    errors.push(`${location}.type 不是有效资料类型：${resource.type}`);
  }

  validateUniqueArray(resource.topics, "topics", errors, location);
  if (Array.isArray(resource.topics)) {
    resource.topics.forEach((topic) => {
      if (!taxonomy.topics.has(topic)) {
        errors.push(`${location}.topics 包含未知主题：${topic}`);
      }
    });
  }

  if (typeof resource.level !== "string" || !taxonomy.levels.has(resource.level)) {
    errors.push(`${location}.level 不是有效难度：${resource.level}`);
  }

  if (!resource.source || typeof resource.source !== "object" || Array.isArray(resource.source)) {
    errors.push(`${location}.source 必须是对象`);
  } else {
    if (!resource.source.platform) {
      errors.push(`${location}.source.platform 不能为空`);
    }
    if (!resource.source.author) {
      errors.push(`${location}.source.author 不能为空`);
    }
  }

  if (!Array.isArray(resource.tags)) {
    errors.push(`${location}.tags 必须是数组`);
  }

  if (typeof resource.featured !== "boolean") {
    errors.push(`${location}.featured 必须是布尔值`);
  }

  ["createdAt", "updatedAt"].forEach((field) => {
    if (typeof resource[field] !== "string" || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(resource[field])) {
      errors.push(`${location}.${field} 必须是 YYYY-MM-DD 格式`);
    }
  });
}

function main() {
  const resources = readJson(resourcesPath);
  const rawTaxonomy = readJson(taxonomyPath);
  const errors = [];

  if (!Array.isArray(resources)) {
    errors.push("data/resources.json 顶层必须是数组");
  }

  const taxonomy = {
    years: new Set(rawTaxonomy.years || []),
    groups: optionIds(rawTaxonomy.groups || []),
    resourceTypes: optionIds(rawTaxonomy.resourceTypes || []),
    topics: optionIds(rawTaxonomy.topics || []),
    levels: optionIds(rawTaxonomy.levels || [])
  };

  if (Array.isArray(resources)) {
    const trackers = {
      ids: new Set(),
      urls: new Set()
    };

    resources.forEach((resource, index) => {
      validateResource(resource, index, taxonomy, trackers, errors);
    });
  }

  if (errors.length > 0) {
    console.error("资源数据校验失败：");
    errors.forEach((error) => console.error(`- ${error}`));
    process.exit(1);
  }

  console.log(`资源数据校验通过：${resources.length} 条资源。`);
}

main();
