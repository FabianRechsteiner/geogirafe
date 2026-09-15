import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildCatalog, visibleTopic } from './catalog.mjs';

const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const snapshot = read('data/winterthur/source.json');
const settings = read('buildtools/winterthur/settings.json');
const inventory = read('data/winterthur/inventory.json');
const catalog = read('public/winterthur/themes.json');
const config = read('public/winterthur/config.json');
const vectormap = read('public/themes.json').background_layers.find((l) => l.type === 'VectorTiles');
assert.deepEqual(catalog, buildCatalog(snapshot, settings, vectormap).catalog, 'Generated catalog is stale');
assert.equal(config.themes.defaultTheme, 'Grundkarte');
assert.equal(config.basemaps.defaultBasemap, vectormap.name);
assert.equal(config.map.srid, 'EPSG:3857');
const ids = new Set();
let leaves = 0;
function asset(p) {
  if (!p || /^https?:/.test(p)) return;
  assert.ok(fs.existsSync(path.join('public', p)), `Missing asset: ${p}`);
}
function visit(node) {
  assert.ok(Number.isSafeInteger(node.id), `Invalid ID: ${node.name}`);
  assert.ok(!ids.has(node.id), `Duplicate ID: ${node.id}`); ids.add(node.id);
  asset(node.icon); asset(node.metadata?.thumbnail); asset(node.metadata?.legendImage); asset(node.metadata?.metadataUrl);
  if (node.type === 'WMS') {
    leaves++;
    assert.ok(catalog.ogcServers[node.ogcServer], `Missing WMS server: ${node.name}`);
    assert.ok(node.minResolutionHint < node.maxResolutionHint, `Invalid scale range: ${node.name}`);
    assert.ok(node.childLayers.every((l) => typeof l.queryable === 'boolean'));
  }
  node.children?.forEach(visit);
}
catalog.themes.forEach(visit); catalog.background_layers.forEach(visit);
for (const t of snapshot.topics.filter(visibleTopic)) {
  const entry = inventory.topics.find((r) => r.name === t.name);
  assert.ok(entry, `Missing topic in inventory: ${t.name}`);
  assert.equal(entry.status, 'imported', `Topic not imported: ${t.name}`);
}
for (const m of settings.collectionMappings) {
  assert.ok(snapshot.collections.some((c) => c.id === m.collectionId), `Unknown collection: ${m.collectionId}`);
  for (const layer of m.layers) assert.ok(snapshot.resources[m.topic]?.layers.some((l) => l.layername === layer), `Unknown mapped layer: ${m.topic}/${layer}`);
}
assert.ok(!Object.values(catalog.ogcServers).some((s) => s.oapifSupport), 'OGC API must remain inventory-only');
for (const p of ['winterthur.html','winterthur.mobile.html']) {
  const html = fs.readFileSync(p, 'utf8');
  assert.ok(html.includes('href="winterthur/config.json"'));
  assert.ok(html.includes('Stadtplan Winterthur'));
}
const unavailable = inventory.topics.filter((t) => t.status === 'imported' && t.sessionFreeMap !== true);
console.log(`Winterthur configuration valid: ${catalog.themes.length} themes, ${leaves} WMS layer instances, ${snapshot.collections.length} inventoried collections.`);
if (unavailable.length) console.warn(`${unavailable.length} services did not pass the session-free map check; see the service report before production acceptance.`);
