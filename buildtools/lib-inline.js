import fs from 'node:fs';
import path from 'path';
import { findFilesRecursive, inlineTemplate } from './tools.js';

function main() {
  const fileList = findFilesRecursive(path.resolve('src', 'components'), ['.ts', '.js']);
  for (const filepath of fileList) {
    console.info(`Integrating inline HTML for file ${filepath}`);
    const newCode = inlineTemplate(filepath);
    const newFilePath = filepath.replace('src', path.join('dist', 'lib-src-inline'));

    fs.mkdirSync(path.dirname(newFilePath), { recursive: true });
    fs.writeFileSync(newFilePath, newCode, 'utf-8');
  }
}

main();
