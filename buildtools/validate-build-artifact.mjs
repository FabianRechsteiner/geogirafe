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

if (!indexHtml.includes('rel="config-main-url" href="config.json"')) {
  fail('Built dist/app/index.html does not reference a relative config.json.');
}
if (!mobileHtml.includes('rel="config-mobile-url" href="config.mobile.json"')) {
  fail('Built dist/app/mobile.html does not reference a relative config.mobile.json.');
}

console.log('Build artifact validation passed.');
