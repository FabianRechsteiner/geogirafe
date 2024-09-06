import { describe, it } from 'vitest';
import fs from 'node:fs';
import path from 'path';

function getAllTypescriptFiles(directoryPath: string, fileList: string[] = []) {
  const files = fs.readdirSync(directoryPath);
  files.forEach((file) => {
    const filePath = path.join(directoryPath, file);
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      getAllTypescriptFiles(filePath, fileList);
    } else if (stats.isFile() && path.extname(file) === '.ts' && !filePath.endsWith('.spec.ts')) {
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
    const centralComponents = ['menubutton', 'querybuilder', 'map'];
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
        const importClass = match[1].trim();
        const importPath = match[2].trim();
        for (const component of components) {
          if (!importPath.includes('../../tools/') && importPath.includes(`/${component}/`)) {
            // This import is using an import of another component
            // We allow it only if it is extended
            const extendRegex = new RegExp('.*class +\\w+ +extends +' + importClass, 'gm');
            if (!code.match(extendRegex)) {
              errors.push(`Illegal dependency: the component ${tsFile} is referencing another component ${importPath}`);
            }
          }
        }
      }
    }

    // Raise exception if any error was found
    if (errors.length > 0) {
      throw new Error(errors.join('\n'));
    }
  });

  it('There should not be any cross-dependencies between the files', async () => {
    const tsFiles = getAllTypescriptFiles(__dirname);

    // Actually a cross-dependency can be legitim
    // but in this case we want to manually exclude them from the test.
    // This will ensure that the cross-dependency not created unintentionally
    const legitimCrossDependencies = [
      {
        oa: path.join(__dirname, path.normalize('components/navigation/navbookmarks/component.ts')),
        ob: path.join(__dirname, path.normalize('components/navigation/navhelper/component.ts'))
      },
      {
        oa: path.join(__dirname, path.normalize('components/lidar/tools/manager.ts')),
        ob: path.join(__dirname, path.normalize('components/lidar/tools/plot.ts'))
      },
      {
        oa: path.join(__dirname, path.normalize('models/layers/baselayer.ts')),
        ob: path.join(__dirname, path.normalize('models/layers/grouplayer.ts'))
      },
      {
        oa: path.join(__dirname, path.normalize('models/layers/baselayer.ts')),
        ob: path.join(__dirname, path.normalize('models/layers/themelayer.ts'))
      },
      {
        oa: path.join(__dirname, path.normalize('base/GirafeHTMLElement.ts')),
        ob: path.join(__dirname, path.normalize('tools/state/componentManager.ts'))
      }
    ];

    // Build a list of all dependencies
    const allDependencies: Record<string, string[]> = {};
    for (const tsFile of tsFiles) {
      if (!tsFile.includes('.spec.ts')) {
        // We are not on a unitest file
        const dependencies: string[] = [];
        const code = fs.readFileSync(tsFile, 'utf8');
        const regex = / *import *\{? *([\w, ]+)\}? *from *'(.*)';?/gm;
        const matches = code.matchAll(regex);
        for (const match of matches) {
          const importPath = match[2];
          if (importPath.includes('./')) {
            // We are on a local dependency, not on a library dependency
            let fullImportPath = path.join(path.dirname(tsFile), importPath);
            if (!fullImportPath.endsWith('.ts')) {
              fullImportPath += '.ts';
            }
            dependencies.push(fullImportPath);
          }
        }
        allDependencies[tsFile] = dependencies;
      }
    }

    // Check if there are cross dependencies
    const errors: string[] = [];
    for (const objA in allDependencies) {
      for (const objB of allDependencies[objA]) {
        // Cgheck if objB has a dependency to objA
        if (allDependencies[objB] && allDependencies[objB].includes(objA)) {
          // Cross dependency found!
          // Is it legitim?
          let isLegitim = false;
          for (const legitim of legitimCrossDependencies) {
            if ((legitim.oa === objA && legitim.ob === objB) || (legitim.oa === objB && legitim.ob === objA)) {
              isLegitim = true;
              break;
            }
          }
          if (!isLegitim) {
            errors.push(`Illegal cross dependency: ${objA} is referencing ${objB} and vice-versa.`);
          }
        }
      }
    }

    // Raise exception if any error was found
    if (errors.length > 0) {
      throw new Error(errors.join('\n'));
    }
  });

  it('There should not be any static method in Singleton classes, because it can lead to inconsistancy and confusion.', async () => {
    const tsFiles = getAllTypescriptFiles(__dirname);

    const errors: string[] = [];
    for (const tsFile of tsFiles) {
      const code = fs.readFileSync(tsFile, 'utf8');
      const regex = /.*class (\w+) +extends +GirafeSingleton/gm;
      const matches = code.matchAll(regex);
      for (const match of matches) {
        const className = match[1].trim();
        // Check if the word static is used
        const staticRegex = / +static +/gm;
        if (code.match(staticRegex)) {
          errors.push(`The class ${className} is a singleton and should not have any static method.`);
        }
      }
    }

    // Raise exception if any error was found
    if (errors.length > 0) {
      throw new Error(errors.join('\n'));
    }
  });
});
