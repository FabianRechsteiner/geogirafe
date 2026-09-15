// SPDX-License-Identifier: Apache-2.0
import path from 'path';
import { EOL } from 'os';
import { copy, replaceInFile } from './tools.js';

// Generate template files
console.info(`Copying the Templates...`);
let sourceDir = './';
let targetDir = path.join('dist', 'lib', 'templates');
copy('tsconfig.json', sourceDir, targetDir);
copy('vite.config.js', sourceDir, targetDir);
replaceInFile(
  path.join(targetDir, 'vite.config.js'),
  /'\.\/buildtools\/[^']+';/gm,
  "'@geogirafe/lib-geoportal/buildtools';"
);
replaceInFile(
  path.join(targetDir, 'vite.config.js'),
  /import InlineTemplatesPlugin/gm,
  'import { InlineTemplatesPlugin }'
);
replaceInFile(path.join(targetDir, 'vite.config.js'), /import HtmlRebuildPlugin/gm, 'import { HtmlRebuildPlugin }');
replaceInFile(
  path.join(targetDir, 'vite.config.js'),
  /import InlineTemplatesPlugin/gm,
  'import { InlineTemplatesPlugin }'
);
replaceInFile(
  path.join(targetDir, 'vite.config.js'),
  /const geogirafeSource = 'src'/gm,
  "const geogirafeSource = 'node_modules/@geogirafe/lib-geoportal'"
);
replaceInFile(
  path.join(targetDir, 'vite.config.js'),
  /const certsDirectory = 'buildtools\/certs'/gm,
  "const certsDirectory = 'certs'"
);
replaceInFile(
  path.join(targetDir, 'vite.config.js'),
  /desktop: resolve\(__dirname, 'index.html'\)/gm,
  `desktop: resolve(__dirname, 'index.html'),${EOL}          custom: resolve(__dirname, 'custom.html')`
);
replaceInFile(
  path.join(targetDir, 'vite.config.js'),
  /import analyzer from 'vite-bundle-analyzer';/gm,
  'const analyzer = null;'
);
copy('index.html', sourceDir, targetDir);
replaceInFile(path.join(targetDir, 'index.html'), /href="src\/styles/gm, 'href="styles');
copy('mobile.html', sourceDir, targetDir);
replaceInFile(path.join(targetDir, 'mobile.html'), /href="src\/styles/gm, 'href="styles');
copy('iframe.html', sourceDir, targetDir);
replaceInFile(path.join(targetDir, 'iframe.html'), /href="src\/styles/gm, 'href="styles');
copy('api.html', sourceDir, targetDir);
replaceInFile(path.join(targetDir, 'api.html'), /href="src\/styles\/api.css/gm, 'href="api.css');

// Copy public assets (images, favicon, ...)
sourceDir = './public';
targetDir = path.join('dist', 'lib', 'templates', 'public');
copy('api', sourceDir, targetDir);
copy('images', sourceDir, targetDir);
copy('favicon.ico', sourceDir, targetDir);
copy('site.webmanifest', sourceDir, targetDir);

// Copy default config for the sample application
sourceDir = './demo/';
targetDir = path.join('dist', 'lib', 'templates', 'public');
copy('config.sampleapp.json', sourceDir, targetDir, 'config.json');
copy('config.sampleapp.mobile.json', sourceDir, targetDir, 'config.mobile.json');
copy('config.sampleapp.api.json', sourceDir, targetDir, 'config.api.json');
