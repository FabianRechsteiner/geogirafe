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
copy('index.html', sourceDir, targetDir);
replaceInFile(path.join(targetDir, 'index.html'), /href="src\/styles/gm, 'href="styles');
copy('mobile.html', sourceDir, targetDir);
replaceInFile(path.join(targetDir, 'mobile.html'), /href="src\/styles/gm, 'href="styles');
copy('iframe.html', sourceDir, targetDir);
replaceInFile(path.join(targetDir, 'iframe.html'), /href="src\/styles/gm, 'href="styles');
copy('api.html', sourceDir, targetDir);

// Copy public assets (images, favicon, ...)
sourceDir = './public';
targetDir = path.join('dist', 'lib', 'templates', 'public');
copy('images', sourceDir, targetDir);
copy('favicon.ico', sourceDir, targetDir);
copy('site.webmanifest', sourceDir, targetDir);
