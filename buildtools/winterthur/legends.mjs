import fs from 'node:fs/promises';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { stableId } from './catalog.mjs';

const escape = (s) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const wrap = (text) => text.match(/.{1,48}(?:\s|$)|\S{1,48}/g)?.map((s) => s.trim()) ?? [''];

// Preserve original legend symbols and labels in a self-contained image for
// GeoGirafe's existing legendImage interface; no GetLegendGraphic is required.
export async function createLegendImages(output, topic, layers) {
  const doc = new JSDOM(await fs.readFile(path.join(output, 'legends', `${topic}.html`), 'utf8')).window.document;
  const images = {};
  for (const layer of layers) {
    const title = layer.leglayertitle || layer.toclayertitle;
    const heading = [...doc.querySelectorAll('.layer')].find((p) => p.textContent.trim() === title);
    if (!heading) continue;
    const rows = [];
    for (let node = heading.nextElementSibling; node && !node.matches('.layer'); node = node.nextElementSibling) {
      for (const tr of node.querySelectorAll('tr')) {
        const label = tr.querySelector('.legtabtext')?.textContent.trim() ?? tr.textContent.trim();
        const symbols = [];
        for (const img of tr.querySelectorAll('img')) {
          const file = path.resolve(output, 'legends', img.getAttribute('src'));
          if (!file.startsWith(path.resolve(output, 'assets') + path.sep)) throw new Error('Legend image outside asset directory');
          const data = await fs.readFile(file);
          const mime = file.endsWith('.gif') ? 'image/gif' : file.endsWith('.jpg') ? 'image/jpeg' : file.endsWith('.svg') ? 'image/svg+xml' : 'image/png';
          symbols.push(`data:${mime};base64,${data.toString('base64')}`);
        }
        if (label || symbols.length) rows.push({ lines: wrap(label), symbols });
      }
    }
    if (!rows.length) continue;
    let y = 8;
    const parts = [];
    for (const row of rows) {
      const height = Math.max(34, row.lines.length * 18 + 10, row.symbols.length * 34);
      row.symbols.forEach((src, i) => parts.push(`<image x="4" y="${y + i * 34}" width="38" height="30" href="${src}"/>`));
      row.lines.forEach((line, i) => parts.push(`<text x="50" y="${y + 19 + i * 18}" font-family="sans-serif" font-size="13">${escape(line)}</text>`));
      y += height;
    }
    const name = `legend-${stableId(`${topic}:${layer.layername}`)}.svg`;
    await fs.writeFile(path.join(output, 'assets', name), `<svg xmlns="http://www.w3.org/2000/svg" width="410" height="${y + 4}" viewBox="0 0 410 ${y + 4}"><rect width="100%" height="100%" fill="white"/>${parts.join('')}</svg>`);
    images[layer.layername] = `winterthur/assets/${name}`;
  }
  return images;
}
