import path from 'path';
import { findFilesRecursive, copy, deleteDirectory } from './tools.js';

// Copy common styles of the application
let sourceDir = 'src';
let targetDir = path.join('dist', 'lib', '');
copy('styles', sourceDir, targetDir);

// Copy buildtools that should be added to package
console.info(`Copying the BuildTools...`);
sourceDir = 'buildtools';
targetDir = path.join('dist', 'lib', 'buildtools');
copy('tools.js', sourceDir, targetDir);
copy('lib-inline.js', sourceDir, targetDir);
copy('vite-inline-templates-plugin.js', sourceDir, targetDir);
copy('vite-restart-plugin.js', sourceDir, targetDir);

// Copy typing files
console.info(`Copying the Typings...`);
sourceDir = path.join('dist', 'lib-src-inline');
targetDir = path.join('dist', 'lib');
copy('typings', sourceDir, targetDir);
copy('decs.d.ts', sourceDir, targetDir);
copy('main.lib.d.ts', sourceDir, targetDir);

// Copy assets
console.info(`Copying the Assets...`);
sourceDir = './';
targetDir = path.join('dist', 'lib');
copy('package.json', sourceDir, targetDir);
copy('README.md', sourceDir, targetDir);
copy('CONTRIBUTING.md', sourceDir, targetDir);
copy('LICENSE', sourceDir, targetDir);
copy('public', sourceDir, targetDir);

const fileList = findFilesRecursive(path.resolve('src', 'components'), ['.png', '.webp', '.jpg', '.jpeg', '.svg']);
for (const filepath of fileList) {
  const filename = path.basename(filepath);
  sourceDir = path.dirname(filepath);
  targetDir = sourceDir.replace('src', path.join('dist', 'lib'));
  copy(filename, sourceDir, targetDir);
}

// Remove temporary build directory
deleteDirectory('./dist/lib-src-inline');
