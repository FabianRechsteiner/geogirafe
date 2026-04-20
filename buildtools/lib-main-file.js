// SPDX-License-Identifier: Apache-2.0
import fs from 'node:fs';
import path from 'path';
import {
  extractDefaultGlobalExportName,
  extractDefaultExportTypeName,
  extractDefaultExportValueName,
  extractNotDefaultExportTypeNames,
  extractNotDefaultExportValueNames,
  findFilesRecursive
} from './tools.js';

function generateValueExports(code) {
  const exports = [];

  // Default global export
  const defaultExport = extractDefaultGlobalExportName(code);
  if (defaultExport) {
    if (['class', 'function', 'const'].includes(defaultExport.objectType)) {
      exports.push(`default as ${defaultExport.objectName}`);
    }
  }

  // Default export
  const defaultExportName = extractDefaultExportValueName(code);
  if (defaultExportName) {
    exports.push(`default as ${defaultExportName}`);
  }

  // Manage all non-default exports
  const exportNames = extractNotDefaultExportValueNames(code);
  for (const exportName of exportNames) {
    exports.push(exportName);
  }

  return exports;
}

function generateTypeExports(code) {
  const exports = [];

  // Default global export
  const defaultExport = extractDefaultGlobalExportName(code);
  if (defaultExport) {
    if (['type', 'interface'].includes(defaultExport.objectType)) {
      exports.push(`default as ${defaultExport.objectName}`);
    }
  }

  // Default export
  const defaultExportTypeName = extractDefaultExportTypeName(code);
  if (defaultExportTypeName) {
    exports.push(`default as ${defaultExportTypeName}`);
  }

  // Non-Default exports
  const typeExportNames = extractNotDefaultExportTypeNames(code);
  for (const exportName of typeExportNames) {
    exports.push(exportName);
  }

  return exports;
}

function generateExportStatements(mainFilePath, componentsPath) {
  const exportStatements = [];

  for (const filePath of componentsPath) {
    if (filePath.endsWith('.spec.ts')) {
      // Do not manage test files
      continue;
    }

    console.log(`Generating exports for ${filePath}`);

    const relativePath = path.relative(mainFilePath, filePath);
    // Convert backslashes to forward slashes, remove .js/.ts suffixs
    const cleanPath = relativePath
      .replace(/\\/g, '/')
      .replace('../', './')
      .replace(/\.[tj]s$/, '');

    const code = fs.readFileSync(filePath, 'utf-8');
    const valueExports = generateValueExports(code);
    const typeExports = generateTypeExports(code);

    if (typeExports.length > 0) {
      console.log(`  - Type exports: ${typeExports.join(', ')}`);
      exportStatements.push(`export type { ${typeExports.join(', ')} } from '${cleanPath}';`);
    }
    if (valueExports.length > 0) {
      console.log(`  - Value exports: ${valueExports.join(', ')}`);
      exportStatements.push(`export { ${valueExports.join(', ')} } from '${cleanPath}';`);
    }
  }

  const outputFileContent = exportStatements.join('\n');
  const newFilePath = mainFilePath.replace('src', path.join('dist', 'lib-src-inline'));
  fs.writeFileSync(newFilePath, outputFileContent);
}

// base main.ts
const basePath = path.resolve('src', 'base');
const fileListBase = findFilesRecursive(basePath, ['.ts', '.js']);
const fileListBaseFilter = fileListBase.filter((filepath) => !filepath.match(/.*(test|\.spec).*/i));
const mainBasePath = path.join(basePath, 'main.ts');
generateExportStatements(mainBasePath, fileListBaseFilter);

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

// models main.ts
const modelsPath = path.resolve('src', 'models');
const fileListModels = findFilesRecursive(modelsPath, ['.ts', '.js']);
const fileListModelsFilter = fileListModels.filter((filepath) => !filepath.match(/.*(test|\.spec).*/i));
const mainModelsPath = path.join(modelsPath, 'main.ts');
generateExportStatements(mainModelsPath, fileListModelsFilter);

// api main.ts
const apiPath = path.resolve('src', 'api');
const fileListApi = findFilesRecursive(apiPath, ['.ts', '.js']);
const fileListApiFilter = fileListApi.filter((filepath) => !filepath.match(/.*(test|\.spec).*/i));
const mainApiPath = path.join(apiPath, 'main.ts');
generateExportStatements(mainApiPath, fileListApiFilter);
