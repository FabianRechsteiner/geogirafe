import path from 'path';
import fs from 'fs-extra';
import { findFilesRecursive, copy, deleteDirectory } from './tools.js';

// Reference main files
const filecontent = `/// <reference path="./components/main.d.ts" />
/// <reference path="./base/main.d.ts" />
/// <reference path="./models/main.d.ts" />
/// <reference path="./tools/main.d.ts" />
/// <reference path="./decs.d.ts" />
  `;
const filepath = path.resolve('dist', 'lib', 'main.d.ts');
console.log(`Write File ${filepath}`);
const existingContent = fs.readFileSync(filepath, 'utf-8');
const newContent = filecontent + '\n' + existingContent;
fs.writeFileSync(filepath, newContent);

// Copy common styles of the application
let sourceDir = 'src';
let targetDir = path.join('dist', 'lib');
console.info(`Copying styles...`);
copy('styles', sourceDir, targetDir);
console.info(`Copying icons and translation files...`);
copy('assets', sourceDir, targetDir);
console.info(`Copying service worker...`);
copy('service-worker.js', sourceDir, targetDir);

// Copy buildtools that should be added to package
console.info(`Copying the BuildTools...`);
sourceDir = 'buildtools';
targetDir = path.join('dist', 'lib', 'buildtools');
copy('tools.js', sourceDir, targetDir);
copy('main.js', sourceDir, targetDir);
copy('lib-inline.js', sourceDir, targetDir);
copy('vite-inline-templates-plugin.js', sourceDir, targetDir);
copy('vite-restart-plugin.js', sourceDir, targetDir);
copy('generate-dev-certs.cmd', sourceDir, targetDir);
copy('generate-dev-certs.sh', sourceDir, targetDir);

// Copy typing files
console.info(`Copying the Typings...`);
sourceDir = path.join('dist', 'lib-src-inline');
targetDir = path.join('dist', 'lib');
copy('typings', sourceDir, targetDir);
copy('decs.d.ts', sourceDir, targetDir);
copy('main.d.ts', sourceDir, targetDir);

// Copy assets
console.info(`Copying the Assets...`);
sourceDir = './';
targetDir = path.join('dist', 'lib');
copy('package.json', sourceDir, targetDir);
copy('README.md', sourceDir, targetDir);
copy('CONTRIBUTING.md', sourceDir, targetDir);
copy('LICENSE', sourceDir, targetDir);
copy('public', sourceDir, targetDir);
deleteDirectory(path.join(targetDir, 'public', 'Mock'));

const fileList = findFilesRecursive(path.resolve('src', 'components'), ['.png', '.webp', '.jpg', '.jpeg', '.svg']);
for (const filepath of fileList) {
  const filename = path.basename(filepath);
  sourceDir = path.dirname(filepath);
  targetDir = sourceDir.replace('src', path.join('dist', 'lib'));
  copy(filename, sourceDir, targetDir);
}

// Remove temporary build directory
deleteDirectory('./dist/lib-src-inline');
