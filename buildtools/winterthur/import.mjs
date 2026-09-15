import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { JSDOM } from 'jsdom';
import createDOMPurify from 'dompurify';
import { buildCatalog, collectionChanges, parseCapabilities, truth, visibleTopic } from './catalog.mjs';
import { createLegendImages } from './legends.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const settings = JSON.parse(await fs.readFile(new URL('./settings.json', import.meta.url), 'utf8'));
const snapshotPath = path.join(root, 'data/winterthur/source.json');
const output = path.join(root, 'public/winterthur');
const read = async (p, fallback) => { try { return JSON.parse(await fs.readFile(p, 'utf8')); } catch (e) { if (e.code === 'ENOENT') return fallback; throw e; } };
const write = async (p, data) => { await fs.mkdir(path.dirname(p), { recursive: true }); await fs.writeFile(p, typeof data === 'string' ? data : JSON.stringify(data, null, 2) + '\n'); };
const previous = await read(snapshotPath, {});
let snapshot = previous;
let cookie = '';
async function request(url, session = true) {
  const headers = { Accept: '*/*' };
  if (session && cookie && new URL(url).origin === new URL(settings.sourceUrl).origin) headers.Cookie = cookie;
  let response;
  for (let attempt = 0; attempt < 3; attempt++) {
    try { response = await fetch(url, { headers, signal: AbortSignal.timeout(25000) }); break; }
    catch (e) { if (attempt === 2) throw new Error(`Fetch failed: ${url}: ${e.cause?.message ?? e.message}`); }
  }
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
  return response;
}
const json = async (url, session = true) => (await request(url, session)).json();
const assets = new Map();
async function asset(url) {
  if (!assets.has(url)) assets.set(url, (async () => {
    const response = await request(url);
    const type = response.headers.get('content-type') ?? '';
    if (!type.startsWith('image/')) throw new Error(`Not an image: ${url}`);
    const ext = type.includes('svg') ? 'svg' : type.includes('gif') ? 'gif' : type.includes('jpeg') ? 'jpg' : 'png';
    const name = `${createHash('sha256').update(url).digest('hex').slice(0, 20)}.${ext}`;
    await fs.mkdir(path.join(output, 'assets'), { recursive: true });
    await fs.writeFile(path.join(output, 'assets', name), Buffer.from(await response.arrayBuffer()));
    return `winterthur/assets/${name}`;
  })());
  return assets.get(url);
}
async function saveLegend(topic, html, issues) {
  const window = new JSDOM('').window;
  const safe = createDOMPurify(window).sanitize(html, { USE_PROFILES: { html: true }, FORBID_TAGS: ['style', 'form', 'input', 'button'], FORBID_ATTR: ['style'] });
  const dom = new JSDOM(safe);
  for (const img of dom.window.document.querySelectorAll('img')) {
    try { img.src = '../assets/' + path.basename(await asset(new URL(img.getAttribute('src'), settings.sourceUrl).href)); }
    catch (e) { issues.push(e.message); img.remove(); }
  }
  for (const link of dom.window.document.querySelectorAll('a[href]')) {
    link.href = new URL(link.getAttribute('href'), settings.sourceUrl).href;
    link.target = '_blank'; link.rel = 'noopener noreferrer';
  }
  await write(path.join(output, 'legends', `${topic}.html`), `<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self'; style-src 'unsafe-inline'"><title>Legende ${topic}</title><style>body{font:16px system-ui;margin:1.5rem;color:#222}img{max-width:100%}td{padding:4px}.layer{font-weight:bold}</style><body>${dom.window.document.body.innerHTML}</body></html>`);
}

if (!process.argv.includes('--offline')) {
  const start = await request(settings.sourceUrl, false);
  cookie = start.headers.getSetCookie().map((s) => s.split(';')[0]).join('; ');
  const topicsResponse = await json(`${settings.sourceUrl}/topics.json?gbapp=default`);
  if (!topicsResponse.success || !Array.isArray(topicsResponse.gbtopics)) throw new Error('Invalid topic response');
  snapshot = { fetchedAt: new Date().toISOString(), source: settings.sourceUrl, topics: topicsResponse.gbtopics, resources: {}, collections: [], conformance: {} };
  const logo = await request(`${settings.sourceUrl}/images/Logo.png`);
  await fs.mkdir(output, { recursive: true });
  await fs.writeFile(path.join(output, 'logo.png'), Buffer.from(await logo.arrayBuffer()));
  const required = [...new Map(snapshot.topics.filter((t) => visibleTopic(t) || snapshot.topics.some((x) => visibleTopic(x) && x.bg_topic === t.name)).map((t) => [t.name, t])).values()];
  let completed = 0;
  const queue = required.slice();
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (queue.length) {
      const t = queue.shift();
      const resource = { issues: [], legendImages: {} };
      snapshot.resources[t.name] = resource;
      try {
        const layerResponse = await json(`${settings.sourceUrl}/layers.json?topic=${encodeURIComponent(t.name)}`);
        resource.layers = layerResponse.wmslayers;
        if (!Array.isArray(resource.layers)) throw new Error('Invalid layer catalog');
        const wms = settings.wmsOverrides[t.name] ?? `${settings.wmsBaseUrl}/${encodeURIComponent(t.name)}`;
        resource.capabilities = parseCapabilities(await (await request(`${wms}?SERVICE=WMS&REQUEST=GetCapabilities&VERSION=1.3.0`)).text());
        try { if (t.icon) resource.icon = await asset(new URL(t.icon, settings.sourceUrl).href); }
        catch (e) { resource.issues.push(`Thumbnail: ${e.message}`); }
        try {
          await saveLegend(t.name, await (await request(`${settings.sourceUrl}/topics/${encodeURIComponent(t.name)}/legend`)).text(), resource.issues);
          resource.legendAvailable = true;
          resource.legendImages = await createLegendImages(output, t.name, resource.layers);
        } catch (e) { resource.issues.push(`Legend: ${e.message}`); }
        const layers = resource.layers.filter((l) => !truth(l.wms) && truth(l.visini)).sort((a,b) => a.wms_sort-b.wms_sort).map((l) => l.layername).join(',');
        const projection = settings.wmsProjections?.[t.name] ?? 'EPSG:3857';
        const bbox = projection === 'EPSG:2056' ? '2690000,1255000,2710000,1270000' : '960000,6015000,985000,6035000';
        const u = new URL(wms); u.search = new URLSearchParams({ SERVICE:'WMS', REQUEST:'GetMap', VERSION:'1.3.0', CRS:projection, BBOX:bbox, WIDTH:'256', HEIGHT:'256', FORMAT:'image/png', STYLES:'', LAYERS:layers, TRANSPARENT:'TRUE' });
        try { const r = await request(u.href, false); resource.sessionFreeMap = (r.headers.get('content-type') ?? '').startsWith('image/'); }
        catch { resource.sessionFreeMap = false; }
      } catch (e) { resource.issues.push(e.message); }
      if (++completed % 10 === 0 || completed === required.length) console.log(`Inspected ${completed}/${required.length} topics`);
    }
  }));
  snapshot.collections = (await json(`${settings.featuresUrl}/collections`, false)).collections;
  snapshot.conformance = await json(`${settings.featuresUrl}/conformance`, false);
  await write(snapshotPath, snapshot);
}
if (!snapshot.topics) throw new Error('No source snapshot; run online import first');
const vectormap = structuredClone((await read(path.join(root, 'public/themes.json'))).background_layers.find((l) => l.type === 'VectorTiles'));
const { catalog, inventory, names } = buildCatalog(snapshot, settings, vectormap);
await write(path.join(output, 'themes.json'), catalog);
const config = await read(path.join(root, 'public/config.json'));
config.themes = { ...config.themes, url: 'winterthur/themes.json', defaultTheme: 'Grundkarte' };
config.basemaps = { ...config.basemaps, defaultBasemap: vectormap.name };
config.map = { ...config.map, startPosition: '971162.37,6023857.92', startZoom: '12' };
config.contextmenu.crs.unshift({ code: 'EPSG:2056', translation: 'EPSG:2056', format: 'decimal', precision: 2 });
await write(path.join(output, 'config.json'), config);
await write(path.join(output, 'config.mobile.json'), { map: { constrainScales: false } });
const collectionReport = { source: settings.featuresUrl, mode: 'inventory-only', conformance: snapshot.conformance,
  changes: process.argv.includes('--offline') ? (await read(path.join(root,'data/winterthur/collections.json'), {})).changes ?? {} : collectionChanges(previous.collections, snapshot.collections),
  mappings: settings.collectionMappings,
  collections: snapshot.collections.map((c) => ({ ...c, extentUsable: false,
    status: settings.collectionMappings.some((m) => m.collectionId === c.id) ? 'mapped-not-enabled' : 'unmapped' })) };
await write(path.join(root, 'data/winterthur/collections.json'), collectionReport);
await write(path.join(root, 'data/winterthur/inventory.json'), { fetchedAt: snapshot.fetchedAt, sourceEntries: snapshot.topics.length, uniqueTopics: inventory.length, themes: catalog.themes.length, basemaps: catalog.background_layers.length, topics: inventory, names });
const blocked = inventory.filter((t) => t.status === 'blocked');
console.log(`Generated ${catalog.themes.length} themes, ${catalog.background_layers.length} basemaps; ${blocked.length} blocked topics. OGC collections: ${snapshot.collections.length}.`);
if (blocked.length) console.warn('Review data/winterthur/inventory.json before accepting the migration.');
