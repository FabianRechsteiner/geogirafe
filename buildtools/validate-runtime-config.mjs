import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const requiredJsonFiles = ['public/config.json', 'public/config.mobile.json', 'public/themes.json'];

function fail(message) {
  console.error(message);
  process.exit(1);
}

function readJson(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    fail(`Missing required file: ${relativePath}`);
  }
  try {
    return JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
  } catch (error) {
    fail(`Invalid JSON in ${relativePath}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function isRelativeAsset(value) {
  return typeof value === 'string' && value.length > 0 && !/^(?:https?:)?\/\//.test(value) && !value.startsWith('data:');
}

function assertExists(relativePath) {
  const normalized = relativePath.replace(/^\.?\//, '');
  const absolutePath = path.join(root, 'public', normalized);
  if (!fs.existsSync(absolutePath)) {
    fail(`Missing referenced runtime asset: public/${normalized}`);
  }
}

function walkLayer(layer, callback) {
  callback(layer);
  if (Array.isArray(layer.children)) {
    for (const child of layer.children) {
      walkLayer(child, callback);
    }
  }
}

for (const file of requiredJsonFiles) {
  readJson(file);
}

const config = readJson('public/config.json');
const themes = readJson('public/themes.json');

if (typeof config.themes?.url !== 'string' || config.themes.url.trim().length === 0) {
  fail('public/config.json must define themes.url.');
}
if (isRelativeAsset(config.themes.url)) {
  assertExists(config.themes.url);
}

if (typeof config.search?.url !== 'string' || !config.search.url.includes('###SEARCHTERM###')) {
  fail('public/config.json must define search.url with the ###SEARCHTERM### placeholder.');
}

const referencedAssets = new Set();

for (const backgroundLayer of themes.background_layers ?? []) {
  walkLayer(backgroundLayer, (layer) => {
    if (layer.type === 'VectorTiles' && isRelativeAsset(layer.style)) {
      referencedAssets.add(layer.style);
    }
    if (isRelativeAsset(layer.metadata?.thumbnail)) {
      referencedAssets.add(layer.metadata.thumbnail);
    }
    if (isRelativeAsset(layer.icon)) {
      referencedAssets.add(layer.icon);
    }
  });
}

for (const theme of themes.themes ?? []) {
  if (isRelativeAsset(theme.icon)) {
    referencedAssets.add(theme.icon);
  }
  walkLayer(theme, (layer) => {
    if (layer.type === 'VectorTiles' && isRelativeAsset(layer.style)) {
      referencedAssets.add(layer.style);
    }
    if (isRelativeAsset(layer.metadata?.thumbnail)) {
      referencedAssets.add(layer.metadata.thumbnail);
    }
    if (isRelativeAsset(layer.metadata?.iconUrl)) {
      referencedAssets.add(layer.metadata.iconUrl);
    }
  });
}

for (const asset of referencedAssets) {
  assertExists(asset);
}

console.log(
  `Runtime config validation passed for ${requiredJsonFiles.length} JSON files and ${referencedAssets.size} referenced assets.`
);
