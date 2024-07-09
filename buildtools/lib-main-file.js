import fs from 'node:fs';
import path from 'path';
import { findFilesRecursive } from './tools.js';

const extractClassName = (filePath) => {
  const content = fs.readFileSync(filePath, 'utf-8');

  const classMatch = content.match(/class\s+([A-Z]\w+)\s/);

  if (!classMatch) {
    console.log(`Class definition not found in ${filePath}`);
  }
  return classMatch ? classMatch[1] : null;
};

const generateExportStatements = (mainFilePath, componentsPath) => {
  const exportStatements = [];

  for (const filePath of componentsPath) {
    if (filePath.endsWith('.spec.ts')) {
      // Do not manage test files
      continue;
    }
    console.log(`Handling ${filePath}`);
    const className = extractClassName(filePath);
    if (className) {
      const relativePath = path.relative(mainFilePath, filePath);

      // Convert backslashes to forward slashes
      // Remove .js/.ts suffixs
      const cleanPath = relativePath
        .replace(/\\/g, '/')
        .replace('../', './')
        .replace(/\.[tj]s$/, '');

      exportStatements.push(`export { default as ${className} } from '${cleanPath}';`);
    }
  }

  const outputFileContent = exportStatements.join('\n');

  const newFilePath = mainFilePath.replace('src', path.join('dist', 'lib-src-inline'));

  fs.writeFileSync(newFilePath, outputFileContent);
};

// base main.ts
const basePath = path.resolve('src', 'base');
const fileListBase = findFilesRecursive(basePath, ['.ts', '.js']);
const mainBasePath = path.join(basePath, 'main.ts');
generateExportStatements(mainBasePath, fileListBase);

// components main.ts
const componentPath = path.resolve('src', 'components');
const fileListComponents = findFilesRecursive(componentPath, ['.ts', '.js']);
const fileListComponentsFilter = fileListComponents.filter((filepath) => filepath.match(/.*component\.(ts|js)/i));
const componentMainPath = path.join(componentPath, 'main.ts');
generateExportStatements(componentMainPath, fileListComponentsFilter);

// tools main.ts
const toolsPath = path.resolve('src', 'tools');
const fileListTools = findFilesRecursive(toolsPath, ['.ts', '.js']);
const fileListToolsFilter = fileListTools.filter((filepath) => !filepath.match(/.*(test|\.spec).*/i));
const mainToolsPath = path.join(toolsPath, 'main.ts');
generateExportStatements(mainToolsPath, fileListToolsFilter);

//models main.ts
const modelsPath = path.resolve('src', 'models');
const fileListModels = findFilesRecursive(modelsPath, ['.ts', '.js']);
const fileListModelsFilter = fileListModels.filter((filepath) => !filepath.match(/.*(test|\.spec).*/i));
const mainModelsPath = path.join(modelsPath, 'main.ts');
generateExportStatements(mainModelsPath, fileListModelsFilter);
