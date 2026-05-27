const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const resourcesIndexPath = path.join(rootDir, "data", "resources.index.json");
const legacyResourcesPath = path.join(rootDir, "data", "resources.json");
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

function parseResourceShardPath(filePath) {
  const normalized = filePath.replace(/\\/g, "/");
  const match = normalized.match(/^data\/resources\/([0-9]{4})\/([a-z0-9-]+)\/resources\.json$/);
  if (!match) {
    return null;
  }

  return {
    year: match[1],
    group: match[2]
  };
}

function validateResource(resource, index, context, taxonomy, trackers, errors) {
  const location = `${context.file}:resources[${index}]`;

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
  } else if (context.year && resource.year !== context.year) {
    errors.push(`${location}.year 与分片年份不一致：资源为 ${resource.year}，路径为 ${context.year}`);
  }

  validateUniqueArray(resource.groups, "groups", errors, location);
  if (Array.isArray(resource.groups)) {
    resource.groups.forEach((group) => {
      if (!taxonomy.groups.has(group)) {
        errors.push(`${location}.groups 包含未知组别：${group}`);
      }
    });
    if (context.group && !resource.groups.includes(context.group)) {
      errors.push(`${location}.groups 必须包含所在分片组别：${context.group}`);
    }
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

function readResourceFiles(errors) {
  if (fs.existsSync(resourcesIndexPath)) {
    const index = readJson(resourcesIndexPath);
    if (!Array.isArray(index.files)) {
      errors.push("data/resources.index.json 的 files 必须是数组");
      return [];
    }

    const seenFiles = new Set();
    return index.files.map((file) => {
      if (seenFiles.has(file)) {
        errors.push(`data/resources.index.json 包含重复分片：${file}`);
      }
      seenFiles.add(file);

      const shard = parseResourceShardPath(file);
      if (!shard) {
        errors.push(`资源分片路径不符合 data/resources/{year}/{group}/resources.json：${file}`);
      }

      const absolutePath = path.join(rootDir, file);
      if (!fs.existsSync(absolutePath)) {
        errors.push(`资源分片不存在：${file}`);
        return { file, resources: [], ...shard };
      }

      const payload = readJson(absolutePath);
      const resources = Array.isArray(payload) ? payload : payload.resources;
      if (!Array.isArray(resources)) {
        errors.push(`${file} 顶层必须是数组，或包含 resources 数组`);
        return { file, resources: [], ...shard };
      }

      return { file, resources, ...shard };
    });
  }

  if (fs.existsSync(legacyResourcesPath)) {
    const resources = readJson(legacyResourcesPath);
    if (!Array.isArray(resources)) {
      errors.push("data/resources.json 顶层必须是数组");
      return [];
    }
    return [{ file: "data/resources.json", resources }];
  }

  errors.push("未找到 data/resources.index.json 或 data/resources.json");
  return [];
}

function main() {
  const rawTaxonomy = readJson(taxonomyPath);
  const errors = [];
  const shards = readResourceFiles(errors);

  const taxonomy = {
    years: new Set(rawTaxonomy.years || []),
    groups: optionIds(rawTaxonomy.groups || []),
    resourceTypes: optionIds(rawTaxonomy.resourceTypes || []),
    topics: optionIds(rawTaxonomy.topics || []),
    levels: optionIds(rawTaxonomy.levels || [])
  };

  const trackers = {
    ids: new Set(),
    urls: new Set()
  };

  let total = 0;
  shards.forEach((shard) => {
    if (shard.year && !taxonomy.years.has(shard.year)) {
      errors.push(`${shard.file} 路径年份不在 taxonomy.years 中：${shard.year}`);
    }
    if (shard.group && !taxonomy.groups.has(shard.group)) {
      errors.push(`${shard.file} 路径组别不在 taxonomy.groups 中：${shard.group}`);
    }

    shard.resources.forEach((resource, index) => {
      validateResource(resource, index, shard, taxonomy, trackers, errors);
      total += 1;
    });
  });

  if (errors.length > 0) {
    console.error("资源数据校验失败：");
    errors.forEach((error) => console.error(`- ${error}`));
    process.exit(1);
  }

  console.log(`资源数据校验通过：${total} 条资源，${shards.length} 个分片。`);
}

main();
