import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const distRoot = path.join(root, 'dist', 'app');

function fail(message) {
  console.error(message);
  process.exit(1);
}

function assertDistFile(relativePath) {
  const absolutePath = path.join(distRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    fail(`Missing built artifact: dist/app/${relativePath}`);
  }
}

assertDistFile('index.html');
assertDistFile('winterthur.html');
assertDistFile('winterthur.mobile.html');
assertDistFile('winterthur/config.json');
assertDistFile('winterthur/themes.json');
assertDistFile('winterthur/logo.png');
for (const page of ['index.html', 'mobile.html', 'winterthur.html', 'winterthur.mobile.html']) {
  const html = fs.readFileSync(path.join(distRoot, page), 'utf8');
  if (!html.includes('href="winterthur/config.json"')) fail(`${page} lost its Winterthur configuration.`);
}
assertDistFile('mobile.html');
assertDistFile('config.json');
assertDistFile('config.mobile.json');
assertDistFile('themes.json');
assertDistFile('styles/ch.vectormap.lightbasemap.json');
assertDistFile('images/logo/vectormap-logo.png');
assertDistFile('images/logo/vectormap-vertical.png');
assertDistFile('images/logo/vectormap-favicon.ico');
assertDistFile('images/logo/vectormap-icon-192.png');
assertDistFile('images/logo/vectormap-icon-512.png');

const indexHtml = fs.readFileSync(path.join(distRoot, 'index.html'), 'utf8');
const mobileHtml = fs.readFileSync(path.join(distRoot, 'mobile.html'), 'utf8');

if (!indexHtml.includes('rel="config-main-url" href="winterthur/config.json"')) {
  fail('Built dist/app/index.html does not reference the Winterthur configuration.');
}
if (!mobileHtml.includes('rel="config-mobile-url" href="winterthur/config.mobile.json"')) {
  fail('Built dist/app/mobile.html does not reference the Winterthur mobile configuration.');
}

console.log('Build artifact validation passed.');
