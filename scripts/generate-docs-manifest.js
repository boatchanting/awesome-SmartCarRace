#!/usr/bin/env node
/**
 * Generates docs/manifest.json and sitemap.xml from the local docs directory.
 * Run before deploying if Markdown files are added, moved, or deleted:
 *   node scripts/generate-docs-manifest.js
 */
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const docsRoot = path.join(repoRoot, "docs");
const siteUrl = process.env.SITE_URL || "https://example.com";

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    if (entry.isFile() && entry.name.endsWith(".md")) return [fullPath];
    return [];
  });
}

function toPosix(relativePath) {
  return relativePath.split(path.sep).join("/");
}

const files = walk(docsRoot)
  .map((file) => toPosix(path.relative(repoRoot, file)))
  .sort((a, b) => a.localeCompare(b, "zh-CN", { numeric: true }));

const manifest = {
  generatedAt: new Date().toISOString(),
  root: "docs",
  files
};

fs.writeFileSync(path.join(docsRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

const urls = ["#/", "#/resources", ...files.map((file) => `#/${encodeURI(file)}`)];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
  .map((url) => `  <url><loc>${siteUrl.replace(/\/$/, "")}/${url}</loc><changefreq>weekly</changefreq><priority>${url === "#/" ? "1.0" : "0.8"}</priority></url>`)
  .join("\n")}\n</urlset>\n`;

fs.writeFileSync(path.join(repoRoot, "sitemap.xml"), sitemap);
console.log(`Generated docs/manifest.json and sitemap.xml for ${files.length} Markdown files.`);
