import path from 'path';
import { copy, replaceInFile } from './tools.js';

// Generate template files
console.info(`Copying the Templates...`);
const sourceDir = './';
const targetDir = path.join('dist', 'lib', 'templates');
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
copy('index.html', sourceDir, targetDir);
replaceInFile(path.join(targetDir, 'index.html'), /href="src\/styles/gm, 'href="styles"');
copy('mobile.html', sourceDir, targetDir);
replaceInFile(path.join(targetDir, 'mobile.html'), /href="src\/styles/gm, 'href="styles"');
