import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'path';

function getAllTypescriptFiles(directoryPath: string, fileList: string[] = []) {
  const files = fs.readdirSync(directoryPath);
  files.forEach((file) => {
    const filePath = path.join(directoryPath, file);
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      getAllTypescriptFiles(filePath, fileList);
    } else if (stats.isFile() && path.extname(file) === '.ts') {
      fileList.push(filePath);
    }
  });

  return fileList;
}

function getSubDirectories(directoryPath: string) {
  const files = fs.readdirSync(directoryPath);
  return files.filter((f) => fs.statSync(path.join(directoryPath, f)).isDirectory());
}

describe('Components architecture', () => {
  it('There should not be any dependencies between components, except the central ones', async () => {
    const componentsPath = path.join(__dirname, 'components');
    // First, get the list of direct sub directories names
    let components = getSubDirectories(componentsPath);

    // Then remove from this list the central components that are allowed to be used in other components
    const centralComponents = ['button', 'menubutton', 'querybuilder'];
    components = components.filter((component) => !centralComponents.includes(component));

    // Then, check if some component is using another component.
    // If yes, it means we have create a dependency between two components in the code
    // This can be problematic for the modular architecture, because each component should be independant
    const errors: string[] = [];
    const tsFiles = getAllTypescriptFiles(componentsPath);
    for (const tsFile of tsFiles) {
      const code = fs.readFileSync(tsFile, 'utf8');
      const regex = / *import *\{? *([\w, ]+)\}? *from *'(.*)';?/gm;
      const matches = code.matchAll(regex);
      for (const match of matches) {
        const importPath = match[2];
        for (const component of components) {
          if (importPath.includes(`/${component}/`)) {
            // This import is using an import of another component
            errors.push(`Illegal dependency: the component ${tsFile} is referencing another component ${importPath}`);
          }
        }
      }
    }

    // Raise exception if any error was found
    if (errors.length > 0) {
      throw new Error(errors.join('\n'));
    }
  });
});
