import fs from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import { truth } from './catalog.mjs';

const source = JSON.parse(await fs.readFile('data/winterthur/source.json', 'utf8'));
const settings = JSON.parse(await fs.readFile('buildtools/winterthur/settings.json', 'utf8'));
const origin = 'https://fabianrechsteiner.github.io';
const report = { checkedAt: new Date().toISOString(), origin, services: [], featureSamples: [], browserAcceptance: 'not-performed-no-browser-connected' };
async function inspect(url) {
  try {
    const r = await fetch(url, { headers: { Origin: origin }, signal: AbortSignal.timeout(20000) });
    const bytes = Buffer.from(await r.arrayBuffer());
    const contentType = r.headers.get('content-type') ?? '';
    const cors = r.headers.get('access-control-allow-origin');
    const text = contentType.includes('image/') ? '' : bytes.toString('utf8');
    const exception = text.match(/<(?:\w+:)?(?:ServiceException|ExceptionText)\b[^>]*>([\s\S]*?)<\//)?.[1]?.trim();
    return { status: r.status, contentType, cors, browserReadable: r.ok && [origin, '*'].includes(cors),
      image: bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),
      ...(exception ? { exception } : {}), text };
  } catch (e) { return { error: e.message, browserReadable: false, image: false, text: '' }; }
}
const summary = ({text, ...rest}) => rest;
const queue = Object.entries(source.resources);
let count=0;
await Promise.all(Array.from({length:4}, async()=> {
  while(queue.length) {
    const [name,resource]=queue.shift();
    const base=settings.wmsOverrides[name] ?? `${settings.wmsBaseUrl}/${encodeURIComponent(name)}`;
    const active=resource.layers.filter(l=>!truth(l.wms)&&truth(l.visini)).sort((a,b)=>a.wms_sort-b.wms_sort);
    const common={SERVICE:'WMS',VERSION:'1.3.0',CRS:'EPSG:3857',BBOX:'960000,6015000,985000,6035000',WIDTH:'256',HEIGHT:'256',FORMAT:'image/png',STYLES:'',LAYERS:active.map(l=>l.layername).join(','),TRANSPARENT:'TRUE'};
    if(settings.wmsProjections?.[name]) {
      common.CRS=settings.wmsProjections[name];
      common.BBOX='2690000,1255000,2710000,1270000';
    }
    const map=await inspect(base+'?'+new URLSearchParams({...common,REQUEST:'GetMap'}));
    const queryLayer=resource.layers.find(l=>resource.capabilities?.layers[l.layername]?.queryable);
    const record={name,map:summary(map), query:null};
    if(queryLayer) {
      const result=await inspect(base+'?'+new URLSearchParams({...common,REQUEST:'GetFeatureInfo',LAYERS:queryLayer.layername,QUERY_LAYERS:queryLayer.layername,INFO_FORMAT:'application/vnd.ogc.gml',FEATURE_COUNT:'5',I:'128',J:'128'}));
      record.query=summary(result);
      record.query.layer=queryLayer.layername;
      record.query.validGml=result.status===200 && !result.exception && /(?:FeatureCollection|msGMLOutput|featureMember)/.test(result.text);
      if(record.query.validGml) {
        try { new JSDOM(result.text, {contentType:'text/xml'}); }
        catch(e) { record.query.validGml=false; record.query.error=`Invalid XML: ${e.message}`; }
      }
    }
    report.services.push(record);
    if(++count%20===0) console.log(`Checked ${count} services`);
  }
}));
// One known object and one empty-location query exercise the format actually
// consumed by GeoGirafe, without enabling OGC API in the runtime application.
for(const [collection,topic,layer] of [['baumkataster.baumkataster','Baumkataster','BaumkatasterBaumstandort'],['solarkataster.solarkataster','Solarkataster','SolarkatasterTeildachflaechen']]) {
  try {
    const response=await fetch(`${settings.featuresUrl}/collections/${collection}/items?limit=1`);
    const data=await response.json();
    const geom=data.features?.[0]?.geometry;
    if(!geom) throw new Error('No sample geometry');
    let pairs=[];
    const visit=c=> { if(typeof c[0]==='number') pairs.push(c); else c.forEach(visit); };
    visit(geom.coordinates);
    const lng=pairs.reduce((a,p)=>a+p[0],0)/pairs.length, lat=pairs.reduce((a,p)=>a+p[1],0)/pairs.length;
    const x=lng*20037508.342789244/180, y=Math.log(Math.tan((90+lat)*Math.PI/360))*20037508.342789244/Math.PI;
    const base=settings.wmsOverrides[topic]??`${settings.wmsBaseUrl}/${topic}`;
    for(const [scenario,cx,cy] of [['object',x,y],['empty',0,0]]) {
      const params={SERVICE:'WMS',VERSION:'1.3.0',REQUEST:'GetFeatureInfo',CRS:'EPSG:3857',BBOX:[cx-10,cy-10,cx+10,cy+10].join(','),WIDTH:'101',HEIGHT:'101',I:'50',J:'50',LAYERS:layer,QUERY_LAYERS:layer,STYLES:'',FORMAT:'image/png',INFO_FORMAT:'application/vnd.ogc.gml',FEATURE_COUNT:'10'};
      const result=await inspect(base+'?'+new URLSearchParams(params));
      let features=0;
      let parseError;
      if(result.text.startsWith('<') && !result.exception) {
        try {
        const doc=new JSDOM(result.text,{contentType:'text/xml'}).window.document;
        features=[...doc.getElementsByTagName('*')].filter(n=>n.localName.endsWith('_feature')||n.localName==='featureMember').length;
        } catch(e) { parseError=e.message; }
      }
      report.featureSamples.push({topic,scenario,...summary(result),features,...(parseError ? {parseError}: {})});
    }
  } catch(e) { report.featureSamples.push({topic,error:e.message}); }
}
report.services.sort((a,b)=>a.name.localeCompare(b.name));
report.summary={total:report.services.length, mapsReady:report.services.filter(s=>s.map.image&&s.map.browserReadable).length,
  queryable:report.services.filter(s=>s.query).length, queriesReady:report.services.filter(s=>s.query?.validGml&&s.query.browserReadable).length};
await fs.writeFile('data/winterthur/services.json',JSON.stringify(report,null,2)+'\n');
console.log(report.summary);
console.log('Sample queries:',report.featureSamples.map(s=>({topic:s.topic,scenario:s.scenario,status:s.status,features:s.features,error:s.error})));
