const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const resourcesIndexPath = path.join(rootDir, "data", "resources.index.json");

function usage() {
  console.log("用法：node scripts/import-resource-drafts.js <resources-drafts.json>");
  console.log("将前端“添加资源”导出的草稿按年份和首个组别合并到 data/resources/{year}/{group}/resources.json。");
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`${filePath} 不是有效 JSON：${error.message}`);
  }
}

function writeJson(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function normalizePath(value) {
  return value.replace(/\\/g, "/");
}

function shardPathFor(resource) {
  const year = resource.year;
  const group = Array.isArray(resource.groups) && resource.groups[0] ? resource.groups[0] : "common";
  return `data/resources/${year}/${group}/resources.json`;
}

function readIndex() {
  const index = fs.existsSync(resourcesIndexPath)
    ? readJson(resourcesIndexPath)
    : { version: 1, description: "资源分片索引。", files: [] };
  if (!Array.isArray(index.files)) index.files = [];
  index.files = [...new Set(index.files.map(normalizePath))].sort();
  return index;
}

function readShard(relativePath) {
  const absolutePath = path.join(rootDir, relativePath);
  if (!fs.existsSync(absolutePath)) return { absolutePath, payload: [], resources: [], isWrapped: false };

  const payload = readJson(absolutePath);
  const resources = Array.isArray(payload) ? payload : payload.resources;
  if (!Array.isArray(resources)) throw new Error(`${relativePath} 顶层必须是数组，或包含 resources 数组`);
  return { absolutePath, payload, resources, isWrapped: !Array.isArray(payload) };
}

function collectExistingResources(files) {
  return files.flatMap((file) => readShard(file).resources);
}

function validateDraft(resource, index) {
  const location = `drafts[${index}]`;
  const required = ["id", "title", "url", "year", "groups", "type", "topics", "level", "language", "description", "source", "tags", "featured", "createdAt", "updatedAt"];
  required.forEach((field) => {
    if (!(field in resource)) throw new Error(`${location} 缺少字段：${field}`);
  });
  if (!/^[0-9]{4}$/.test(String(resource.year))) throw new Error(`${location}.year 必须是 4 位年份`);
  if (!Array.isArray(resource.groups) || !resource.groups.length) throw new Error(`${location}.groups 不能为空`);
}

function main() {
  const draftFile = process.argv[2];
  if (!draftFile || ["-h", "--help"].includes(draftFile)) {
    usage();
    return;
  }

  const draftsPath = path.resolve(process.cwd(), draftFile);
  const drafts = readJson(draftsPath);
  if (!Array.isArray(drafts) || !drafts.length) throw new Error("草稿文件必须是非空资源数组");
  drafts.forEach(validateDraft);

  const index = readIndex();
  const existing = collectExistingResources(index.files);
  const knownIds = new Set(existing.map((item) => item.id).filter(Boolean));
  const knownUrls = new Set(existing.map((item) => item.url).filter(Boolean));

  drafts.forEach((resource) => {
    if (knownIds.has(resource.id)) throw new Error(`资源 id 已存在：${resource.id}`);
    if (knownUrls.has(resource.url)) throw new Error(`资源 url 已存在：${resource.url}`);
    knownIds.add(resource.id);
    knownUrls.add(resource.url);
  });

  const grouped = new Map();
  drafts.forEach((resource) => {
    const relativePath = shardPathFor(resource);
    if (!grouped.has(relativePath)) grouped.set(relativePath, []);
    grouped.get(relativePath).push(resource);
  });

  grouped.forEach((resources, relativePath) => {
    const shard = readShard(relativePath);
    const nextResources = [...shard.resources, ...resources];
    const nextPayload = shard.isWrapped ? { ...shard.payload, resources: nextResources } : nextResources;
    writeJson(shard.absolutePath, nextPayload);
    if (!index.files.includes(relativePath)) index.files.push(relativePath);
    console.log(`已合并 ${resources.length} 条 -> ${relativePath}`);
  });

  index.files = [...new Set(index.files)].sort();
  writeJson(resourcesIndexPath, index);
  console.log("完成。建议继续运行：node scripts/validate-resources.js");
}

try {
  main();
} catch (error) {
  console.error(`导入失败：${error.message}`);
  process.exitCode = 1;
}
