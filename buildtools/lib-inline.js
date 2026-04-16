// SPDX-License-Identifier: Apache-2.0
import fs from 'node:fs';
import path from 'path';
import { findFilesRecursive, inlineTemplate } from './tools.js';

async function main() {
  // Inline template for components
  let fileList = findFilesRecursive(path.resolve('src', 'components'), ['.ts', '.js']);
  for (const filepath of fileList) {
    console.info(`Integrating inline HTML for file ${filepath}`);
    const newCodeMapObject = await inlineTemplate(filepath);
    const newFilePath = filepath.replace('src', path.join('dist', 'lib-src-inline'));

    fs.mkdirSync(path.dirname(newFilePath), { recursive: true });
    fs.writeFileSync(newFilePath, newCodeMapObject.code, 'utf-8');
  }

  // Inline template for the API
  fileList = findFilesRecursive(path.resolve('src', 'api'), ['.ts', '.js']);
  for (const filepath of fileList) {
    console.info(`Integrating inline HTML for file ${filepath}`);
    const newCodeMapObject = await inlineTemplate(filepath);
    const newFilePath = filepath.replace('src', path.join('dist', 'lib-src-inline'));

    fs.mkdirSync(path.dirname(newFilePath), { recursive: true });
    fs.writeFileSync(newFilePath, newCodeMapObject.code, 'utf-8');
  }
}

await main();
