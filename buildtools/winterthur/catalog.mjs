import { createHash } from 'node:crypto';
import { JSDOM } from 'jsdom';

export const metadata = (checked = false) => ({
  isChecked: checked, isExpanded: false, isLegendExpanded: false,
  wasLegendExpanded: false, exclusiveGroup: false
});
export const stableId = (key) => 100000000 + Number.parseInt(createHash('sha256').update(key).digest('hex').slice(0, 10), 16);
export const truth = (value) => value === true || value === 'true' || value === 1 || value === '1';
export const visibleTopic = (t) => !t.missingpermission && (t.main_layer || t.background_layer || t.overlay_layer);

export function parseCapabilities(xml) {
  const doc = new JSDOM(xml, { contentType: 'text/xml' }).window.document;
  const text = (node, tag) => [...node.children].find((n) => n.localName === tag)?.textContent?.trim();
  const layers = {};
  function visit(node, inherited = {}) {
    const state = { ...inherited };
    if (node.hasAttribute('queryable')) state.queryable = truth(node.getAttribute('queryable'));
    const crs = [...node.children].filter((n) => ['SRS', 'CRS'].includes(n.localName)).flatMap((n) => n.textContent.trim().split(/\s+/));
    state.crs = [...new Set([...(inherited.crs ?? []), ...crs])];
    const name = text(node, 'Name');
    if (name) layers[name] = { ...state, name, title: text(node, 'Title') };
    [...node.children].filter((n) => n.localName === 'Layer').forEach((n) => visit(n, state));
  }
  const root = [...doc.getElementsByTagName('Layer')].find((n) => n.parentElement?.localName === 'Capability');
  if (!root) throw new Error('Capabilities contains no root layer');
  visit(root);
  const request = doc.getElementsByTagName('GetFeatureInfo')[0];
  return { layers, infoFormats: request ? [...request.getElementsByTagName('Format')].map((n) => n.textContent) : [] };
}

export function collectionChanges(before = [], after = []) {
  const old = new Map(before.map((c) => [c.id, c]));
  const current = new Map(after.map((c) => [c.id, c]));
  return {
    added: after.filter((c) => !old.has(c.id)).map((c) => c.id),
    removed: before.filter((c) => !current.has(c.id)).map((c) => c.id),
    changed: after.filter((c) => old.has(c.id) && JSON.stringify(old.get(c.id)) !== JSON.stringify(c)).map((c) => c.id)
  };
}

export function buildCatalog(snapshot, settings, vectormap) {
  const excludedBackgrounds = new Set(settings.excludedBackgrounds ?? []);
  const unique = new Map();
  for (const t of snapshot.topics) {
    if (!unique.has(t.name)) unique.set(t.name, t);
  }
  const sorted = [...unique.values()].sort((a, b) => a.categorysort - b.categorysort || a.categories_topics_sort - b.categories_topics_sort || a.name.localeCompare(b.name));
  const catalog = { ogcServers: {}, background_layers: [vectormap], themes: [], errors: [] };
  const inventory = [];
  const names = new Map();
  const titles = new Map();
  for (const t of sorted.filter(visibleTopic)) titles.set(t.title, (titles.get(t.title) ?? 0) + 1);
  for (const t of sorted) {
    const resource = snapshot.resources[t.name];
    const record = {
      name: t.name, title: t.title,
      categories: [...new Set(snapshot.topics.filter((x) => x.name === t.name).map((x) => x.categorytitle))],
      background: t.bg_topic, subtopics: t.subtopics, status: '', issues: [...(resource?.issues ?? [])],
      sessionFreeMap: resource?.sessionFreeMap ?? null
    };
    inventory.push(record);
    if (t.missingpermission) { record.status = 'excluded-protected'; continue; }
    const requiredBackground = sorted.some((x) => visibleTopic(x) && x.bg_topic === t.name);
    if (!visibleTopic(t) && !requiredBackground) { record.status = 'excluded-helper'; continue; }
    if (!resource?.layers?.length || !resource.capabilities) {
      record.status = 'blocked'; continue;
    }
    const serverId = `winterthur-${t.name}`;
    const serverUrl = settings.wmsOverrides?.[t.name] ?? `${settings.wmsBaseUrl}/${encodeURIComponent(t.name)}`;
    catalog.ogcServers[serverId] = { url: serverUrl, wfsSupport: false, type: 'other', imageType: 'image/png' };
    if (settings.wmsProjections?.[t.name]) catalog.ogcServers[serverId].projection = settings.wmsProjections[t.name];
    const displayName = titles.get(t.title) > 1 ? `${t.title} (${t.name})` : t.title;
    names.set(t.name, displayName);
    // GeoGirafe's tree order is top-to-bottom, WMS order is bottom-to-top.
    const rows = resource.layers.filter((l) => !truth(l.wms)).sort((a, b) => b.wms_sort - a.wms_sort);
    const children = [];
    for (const row of rows) {
      const cap = resource.capabilities.layers[row.layername];
      if (!cap) {
        record.issues.push(`Layer missing from capabilities: ${row.layername}`);
        continue;
      }
      const minResolutionHint = Math.max(0, Number(row.minscale) || 0) / (39.37 * 96);
      const maxResolutionHint = (Number(row.maxscale) || 999999999) / (39.37 * 96);
      const leaf = {
        id: stableId(`layer:${t.name}:${row.id}`), name: row.toclayertitle || cap.title || row.layername,
        type: 'WMS', ogcServer: serverId, layers: row.layername, minResolutionHint, maxResolutionHint,
        childLayers: [{ name: row.layername, queryable: !!cap.queryable, minResolutionHint, maxResolutionHint }],
        metadata: { ...metadata(truth(row.visini)), legend: !!resource.legendImages?.[row.layername],
          ...(resource.legendAvailable ? { metadataUrl: `winterthur/legends/${t.name}.html` } : {}),
          ...(resource.legendImages?.[row.layername] ? { legendImage: resource.legendImages[row.layername] } : {}) }
      };
      // Keep contiguous groups so grouping cannot change the cartographic draw order.
      if (row.groupname) {
        let group = children.at(-1);
        if (group?.name !== row.groupname || !group.children) {
          group = { id: stableId(`group:${t.name}:${row.groupname}:${row.id}`), name: row.groupname, metadata: metadata(true), children: [] };
          children.push(group);
        }
        group.children.push(leaf);
      } else children.push(leaf);
    }
    record.layerCount = rows.length;
    record.importedLayerCount = children.reduce((n, c) => n + (c.children?.length ?? 1), 0);
    record.status = record.importedLayerCount === rows.length ? 'imported' : 'blocked';
    if (children.length === 0) { record.status = 'blocked'; continue; }
    if (t.main_layer || t.overlay_layer) {
      catalog.themes.push({ id: stableId(`theme:${t.name}`), name: displayName,
        icon: resource.icon ?? 'images/logo/vectormap-logo.png', functionalities: {},
        metadata: { ...metadata(true), isExpanded: true, category: t.categorytitle }, children });
    }
    if ((t.background_layer || requiredBackground) && !excludedBackgrounds.has(t.name)) {
      catalog.background_layers.push({ id: stableId(`background:${t.name}`), name: displayName,
        metadata: { ...metadata(), thumbnail: resource.icon ?? 'images/logo/vectormap-vertical.png' },
        children: cloneForBackground(children, t.name) });
    }
  }
  return { catalog, inventory, names: Object.fromEntries(names) };
}

function cloneForBackground(children, name) {
  return children.map((c) => ({ ...structuredClone(c), id: stableId(`background-layer:${name}:${c.id}`),
    ...(c.children ? { children: cloneForBackground(c.children, name) } : {}) }));
}
