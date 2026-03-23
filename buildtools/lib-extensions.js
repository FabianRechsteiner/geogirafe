// SPDX-License-Identifier: Apache-2.0
import path from 'path';
import fs from 'node:fs';
import { appendImportExtension, findFilesRecursive } from './tools.js';

// Append extensions to all imports to make the library javascript standard
console.info(`Appending file extensions...`);
const basePath = path.resolve('dist', 'lib-src-inline');
const fileListBase = findFilesRecursive(basePath, ['.ts']);
const fileListBaseFilter = fileListBase.filter((filepath) => !filepath.match(/.*(test|\.spec).*/i));
for (const file of fileListBaseFilter) {
  console.info(`Appending extensions in file ${file}`);
  const content = fs.readFileSync(file, 'utf8');
  const newContent = appendImportExtension(content, '.js');
  fs.writeFileSync(file, newContent, 'utf8');
}
