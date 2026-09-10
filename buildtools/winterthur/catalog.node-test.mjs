import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCatalog, collectionChanges, parseCapabilities, stableId } from './catalog.mjs';

test('capability inheritance retains CRS and explicit queryability overrides', () => {
  const c = parseCapabilities('<WMS_Capabilities><Capability><Request><GetFeatureInfo><Format>application/vnd.ogc.gml</Format></GetFeatureInfo></Request><Layer queryable="1"><CRS>EPSG:3857</CRS><Layer><Name>points</Name></Layer><Layer queryable="0"><Name>labels</Name></Layer></Layer></Capability></WMS_Capabilities>');
  assert.equal(c.layers.points.queryable, true);
  assert.equal(c.layers.labels.queryable, false);
  assert.deepEqual(c.layers.labels.crs, ['EPSG:3857']);
});

const topic = { name:'trees', title:'Trees', main_layer:true, background_layer:true, categorytitle:'Nature', categorysort:0, categories_topics_sort:0 };
const row = (id, name, order, checked) => ({ id, layername:name, wms:'false', wms_sort:order, minscale:100, maxscale:10000, visini:checked });
const source = () => ({ topics:[topic, {...topic, categorytitle:'New'}, {name:'private', main_layer:true, missingpermission:true}], resources:{trees:{layers:[row(1,'points',0,true), row(2,'labels',10,false)],capabilities:{layers:{points:{queryable:true},labels:{queryable:false}}},issues:[]}} });
const settings = {wmsBaseUrl:'https://example.test/wms'};

test('deduplicates topics, excludes protected data, preserves painter order and defaults', () => {
  const original=source(); const copy=structuredClone(original);
  const r=buildCatalog(original,settings,{id:1,name:'Base'});
  assert.equal(r.catalog.themes.length,1);
  assert.deepEqual(r.catalog.themes[0].children.map((l)=>l.layers),['labels','points']);
  assert.equal(r.catalog.themes[0].children[0].metadata.isChecked,false);
  assert.equal(r.catalog.themes[0].children[1].childLayers[0].queryable,true);
  assert.deepEqual(r.inventory.find(t=>t.name==='trees').categories,['Nature','New']);
  assert.ok(r.inventory.some((t)=>t.status==='excluded-protected'));
  assert.deepEqual(original,copy);
  assert.notEqual(r.catalog.themes[0].children[0].id,r.catalog.background_layers[1].children[0].id);
});

test('IDs remain stable across catalog reorder and additions', () => {
  assert.equal(stableId('layer:trees:1'),stableId('layer:trees:1'));
  const a=buildCatalog(source(),settings,{id:1});
  const next=source(); next.topics.reverse();
  const b=buildCatalog(next,settings,{id:1});
  assert.equal(a.catalog.themes[0].id,b.catalog.themes[0].id);
  assert.deepEqual(a.catalog.themes[0].children.map(l=>l.id),b.catalog.themes[0].children.map(l=>l.id));
});

test('missing service layers are explicit blockers, not silently omitted', () => {
  const s=source();delete s.resources.trees.capabilities.layers.points;
  const r=buildCatalog(s,settings,{id:1});
  assert.equal(r.inventory.find(t=>t.name==='trees').status,'blocked');
});

test('collection changes distinguish additions, changes and removals without publishing', () => {
  assert.deepEqual(collectionChanges([{id:'a',title:'old'},{id:'b'}],[{id:'a',title:'new'},{id:'c'}]),{added:['c'],removed:['b'],changed:['a']});
  assert.deepEqual(collectionChanges([{id:'a'}],[{id:'a'}]),{added:[],removed:[],changed:[]});
});
