const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const resourcesIndexPath = path.join(rootDir, "data", "resources.index.json");
const resourcesRoot = path.join(rootDir, "data", "resources");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function normalizeUrl(value) {
  return value.trim().replace(/\/+$/, "");
}

function walkResourceFiles(dir, files = []) {
  if (!fs.existsSync(dir)) {
    return files;
  }

  fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkResourceFiles(fullPath, files);
    } else if (entry.isFile() && entry.name === "resources.json") {
      files.push(fullPath);
    }
  });

  return files;
}

function indexFiles() {
  const files = new Set();

  if (fs.existsSync(resourcesIndexPath)) {
    const index = readJson(resourcesIndexPath);
    if (Array.isArray(index.files)) {
      index.files.forEach((file) => files.add(path.join(rootDir, file)));
    }
  }

  walkResourceFiles(resourcesRoot).forEach((file) => files.add(file));
  return Array.from(files);
}

function readResources(filePath) {
  const payload = readJson(filePath);
  return Array.isArray(payload) ? payload : payload.resources || [];
}

function main() {
  const urls = process.argv.slice(2);
  if (urls.length === 0) {
    console.error("用法：node scripts/check-resource-url.js <url> [url...]");
    process.exit(2);
  }

  const queries = urls.map((url) => ({
    original: url,
    normalized: normalizeUrl(url)
  }));

  const matches = [];
  indexFiles().forEach((filePath) => {
    if (!fs.existsSync(filePath)) {
      return;
    }

    const relativePath = path.relative(rootDir, filePath).replace(/\\/g, "/");
    readResources(filePath).forEach((resource, index) => {
      if (!resource || typeof resource.url !== "string") {
        return;
      }

      const resourceUrl = resource.url.trim();
      const normalizedResourceUrl = normalizeUrl(resourceUrl);
      queries.forEach((query) => {
        if (resourceUrl === query.original || normalizedResourceUrl === query.normalized) {
          matches.push({
            query: query.original,
            id: resource.id || "(missing id)",
            url: resourceUrl,
            location: `${relativePath}:resources[${index}]`
          });
        }
      });
    });
  });

  if (matches.length > 0) {
    console.error("发现已收录 URL：");
    matches.forEach((match) => {
      console.error(`- ${match.query}`);
      console.error(`  ${match.location} ${match.id}`);
      console.error(`  ${match.url}`);
    });
    process.exit(1);
  }

  console.log(`未发现重复 URL：${queries.length} 个。`);
}

main();
