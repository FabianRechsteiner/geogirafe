// SPDX-License-Identifier: Apache-2.0
import { describe, it } from 'vitest';
import fs from 'node:fs';
import path from 'path';

function getAllFilesOfType(directoryPath: string, extension: string, fileList: string[] = []) {
  const files = fs.readdirSync(directoryPath);
  files.forEach((file) => {
    const filePath = path.join(directoryPath, file);
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      getAllFilesOfType(filePath, extension, fileList);
    } else if (stats.isFile() && path.extname(file) === extension && !filePath.endsWith('.spec' + extension)) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

function getAllTypescriptFiles(directoryPath: string, fileList: string[] = []) {
  return getAllFilesOfType(directoryPath, '.ts', fileList);
}

function getAllHtmlFiles(directoryPath: string, fileList: string[] = []) {
  return getAllFilesOfType(directoryPath, '.html', fileList);
}

function getAllStylesheetFiles(directoryPath: string, fileList: string[] = []) {
  return getAllFilesOfType(directoryPath, '.css', fileList);
}

function getAllSvgFiles(directoryPath: string, fileList: string[] = []) {
  return getAllFilesOfType(directoryPath, '.svg', fileList);
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
    const centralComponents = ['querybuilder', 'map', 'timerestriction'];
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
    const interfaceDependencies = [path.join(__dirname, path.normalize('tools/context/icontext.ts'))];

    const legitimCrossDependencies = [
      /*{
        oa: path.join(__dirname, path.normalize('components/lidar/tools/manager.ts')),
        ob: path.join(__dirname, path.normalize('components/lidar/tools/plot.ts'))
      },*/
      {
        oa: path.join(__dirname, path.normalize('models/layers/baselayer.ts')),
        ob: path.join(__dirname, path.normalize('models/layers/grouplayer.ts'))
      },
      {
        oa: path.join(__dirname, path.normalize('models/layers/baselayer.ts')),
        ob: path.join(__dirname, path.normalize('models/layers/themelayer.ts'))
      } /*
      {
        oa: path.join(__dirname, path.normalize('base/GirafeHTMLElement.ts')),
        ob: path.join(__dirname, path.normalize('tools/state/componentManager.ts'))
      }*/
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
          for (const interfaceDep of interfaceDependencies) {
            if (objA === interfaceDep || objB === interfaceDep) {
              isLegitim = true;
              break;
            }
          }
          if (!isLegitim) {
            for (const legitim of legitimCrossDependencies) {
              if ((legitim.oa === objA && legitim.ob === objB) || (legitim.oa === objB && legitim.ob === objA)) {
                isLegitim = true;
                break;
              }
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

  it('Components should use this.subscribe() method instead of stateManager.subscribe(), because they will be automaticaly unsubscribed when the component disconnects from DOM', async () => {
    const componentsPath = path.join(__dirname, 'components');
    const tsFiles = getAllTypescriptFiles(componentsPath);

    const errors: string[] = [];
    for (const tsFile of tsFiles) {
      const code = fs.readFileSync(tsFile, 'utf8');
      const regex = /.*class (\w+) +extends +GirafeHTMLElement/gm;
      const matches = code.matchAll(regex);
      for (const match of matches) {
        const className = match[1].trim();
        // Check if this.stateManager.subscribe() is used
        let subscribeRegex = /.*\.stateManager\.subscribe.*/gm;
        if (code.match(subscribeRegex)) {
          errors.push(
            `The component ${className} should use this.subscribe() instead of this.stateManager.subscribe().`
          );
        }
      }
    }

    // Raise exception if any error was found
    if (errors.length > 0) {
      throw new Error(errors.join('\n'));
    }
  });

  it('Components should use this.unsubscribe() method instead of stateManager.unsubscribe(), because the list of subscription should be keep up to date for automatic unsubscribtion if disconnected from the DOM', async () => {
    const componentsPath = path.join(__dirname, 'components');
    const tsFiles = getAllTypescriptFiles(componentsPath);

    const errors: string[] = [];
    for (const tsFile of tsFiles) {
      const code = fs.readFileSync(tsFile, 'utf8');
      const regex = /.*class (\w+) +extends +GirafeHTMLElement/gm;
      const matches = code.matchAll(regex);
      for (const match of matches) {
        const className = match[1].trim();
        // Check if this.stateManager.unsubscribe() is used
        let subscribeRegex = /.*\.stateManager\.unsubscribe.*/gm;
        if (code.match(subscribeRegex)) {
          errors.push(
            `The component ${className} should use this.unsubscribe() instead of this.stateManager.unsubscribe().`
          );
        }
      }
    }

    // Raise exception if any error was found
    if (errors.length > 0) {
      throw new Error(errors.join('\n'));
    }
  });

  it('HTML templates should use relative path for icons, not absolute ones.', async () => {
    const parentPath = path.join(__dirname, '..'); // include parent path for index and mobile templates
    const htmlFiles = getAllHtmlFiles(parentPath);
    const tsFiles = getAllTypescriptFiles(__dirname);

    const errors: string[] = [];
    for (const file of [...htmlFiles, ...tsFiles]) {
      const code = fs.readFileSync(file, 'utf8');
      const regex = /src="\/icons\//gm;
      if (code.match(regex)) {
        errors.push(`The template ${file} should use relative path for icons.`);
      }
    }

    // Raise exception if any error was found
    if (errors.length > 0) {
      throw new Error(errors.join('\n'));
    }
  }, 120000);

  it('There should not be any unused icon.', async () => {
    const iconsPath = path.join(__dirname, 'assets/icons');
    const allIcons = getAllSvgFiles(iconsPath);

    const usedIcons = allIcons.reduce(
      (acc, el: string) => {
        el = el.replace(/\\/g, '/');
        acc[el.split('/assets/')[1]] = false;
        return acc;
      },
      {} as { [key: string]: boolean }
    );

    const parentPath = path.join(__dirname, '..'); // include parent path for index and mobile templates
    const htmlFiles = getAllHtmlFiles(parentPath);
    const tsFiles = getAllTypescriptFiles(__dirname);
    const cssFiles = getAllStylesheetFiles(__dirname);

    for (const file of [...htmlFiles, ...tsFiles, ...cssFiles]) {
      const code = fs.readFileSync(file, 'utf8');
      const regex = /(icons\/[^'"]+\.svg)/gm;
      const matches = code.matchAll(regex);
      for (const match of matches) {
        const iconPath = match[1].trim();
        usedIcons[iconPath] = true;
      }
    }

    const errors = Object.keys(usedIcons)
      .filter((key) => !usedIcons[key])
      .map((key) => `The icon ${key} is never used. It should be removed.`);
    // Raise exception if any error was found
    if (errors.length > 0) {
      throw new Error(errors.join('\n'));
    }
  });
});

describe('Components translations', () => {
  const noNeedForTranslation = [
    ':&nbsp;',
    'pt',
    'DPI',
    ':',
    'KML',
    'WMS',
    'WMTS',
    'URL',
    'px',
    'GeoJson',
    'GPX',
    'x',
    '×',
    '2D',
    '3D',
    '1&nbsp;:&nbsp;',
    'LOD',
    ')',
    '(',
    '+',
    '/',
    '[',
    ']',
    '.',
    '-',
    '--'
  ];

  function getSupportedLanguages() {
    const i18nPath = path.join(__dirname, 'assets', 'i18n');
    const files = fs.readdirSync(i18nPath);
    const languages: string[] = [];
    files.forEach((file) => {
      languages.push(file.split('.')[0]);
    });

    return languages;
  }

  it('There should not be any hardcoded text in html files without i18n attribute', async () => {
    const parentPath = path.join(__dirname, 'components'); // include parent path for index and mobile templates
    const htmlFiles = getAllHtmlFiles(parentPath);

    const errors: string[] = [];
    for (const htmlFile of htmlFiles) {
      let code = fs.readFileSync(htmlFile, 'utf8');
      // Replace characters < and > that are used in attributes (for example for comparison tests of function with =>)
      code = code.replace(/(="[^"]*)>([^"]*")/g, '$1&gt;$2');
      code = code.replace(/(="[^"]*)<([^"]*")/g, '$1&lt;$2');

      const regex = /([^>]+>)([^<]+)</gms;
      const matches = code.matchAll(regex);
      for (const match of matches) {
        const tag = match[1]
          .trim()
          .replace(/(="[^"]*)&gt;([^"]*")/g, '$1>$2')
          .replace(/(="[^"]*)&lt;([^"]*")/g, '$1<$2');
        const text = match[2]
          .trim()
          .replace(/(="[^"]*)&gt;([^"]*")/g, '$1>$2')
          .replace(/(="[^"]*)&lt;([^"]*")/g, '$1<$2');
        if (text.length === 0) {
          // Only spaces or line breaks
          continue;
        }
        if (text.startsWith('https://')) {
          // Is just a link, nothing to translate
          continue;
        }
        if (text.startsWith('${') || text.endsWith('}')) {
          // If the content is a uHtml variable, we ignore it
          continue;
        }
        if (text.startsWith('`') && text.endsWith('`')) {
          // If the content is a uHtml template, we ignore it
          continue;
        }
        if (tag.includes('i18n=')) {
          // If there already is a i18n tag, everything is ok, and we ignore it
          continue;
        }
        if (noNeedForTranslation.includes(text)) {
          // Special strings do not need any translation
          continue;
        }

        errors.push(`The template ${htmlFile} contains untranslated text: """${text}""" in tag <${tag}.`);
      }
    }

    // Raise exception if any error was found
    if (errors.length > 0) {
      throw new Error(errors.join('\n'));
    }
  });

  it('Every i18n attribute should have a corresponding translation', async () => {
    // First, read all translations files
    const i18nPath = path.join(__dirname, 'assets', 'i18n');
    const translations: Record<string, any> = {};
    for (const lang of getSupportedLanguages()) {
      const file = fs.readFileSync(path.join(i18nPath, `${lang}.json`), 'utf-8');
      translations[lang] = JSON.parse(file)[lang];
    }

    const parentPath = path.join(__dirname, 'components'); // include parent path for index and mobile templates
    const htmlFiles = getAllHtmlFiles(parentPath);

    const errors: string[] = [];
    for (const htmlFile of htmlFiles) {
      let code = fs.readFileSync(htmlFile, 'utf8');
      const regex = /i18n="([^"]+)"/gms;
      const matches = code.matchAll(regex);
      for (const match of matches) {
        const i18nId = match[1];

        if (i18nId.startsWith('${') || i18nId.endsWith('}')) {
          // If the content is a uHtml variable, we ignore it
          continue;
        }

        for (const lang of getSupportedLanguages()) {
          if (!(i18nId in translations[lang])) {
            // Translation is missing
            errors.push(`The translation in ${lang.toUpperCase()} is missing for key "${i18nId}".`);
          }
        }
      }
    }

    // Raise exception if any error was found
    if (errors.length > 0) {
      throw new Error(errors.join('\n'));
    }
  });

  it('Every tooltip should have a corresponding translation', async () => {
    // First, read all translations files
    const i18nPath = path.join(__dirname, 'assets', 'i18n');
    const translations: Record<string, any> = {};
    for (const lang of getSupportedLanguages()) {
      const file = fs.readFileSync(path.join(i18nPath, `${lang}.json`), 'utf-8');
      translations[lang] = JSON.parse(file)[lang];
    }

    const parentPath = path.join(__dirname, 'components'); // include parent path for index and mobile templates
    const htmlFiles = getAllHtmlFiles(parentPath);

    const errors: string[] = [];
    for (const htmlFile of htmlFiles) {
      let code = fs.readFileSync(htmlFile, 'utf8');
      const regex = /tip="([^"]+)"/gms;
      const matches = code.matchAll(regex);
      for (const match of matches) {
        const i18nId = match[1];

        if (i18nId.startsWith('${') || i18nId.endsWith('}')) {
          // If the content is a uHtml variable, we ignore it
          continue;
        }

        if (noNeedForTranslation.includes(i18nId)) {
          // Special strings do not need any translation
          continue;
        }

        for (const lang of getSupportedLanguages()) {
          if (!(i18nId in translations[lang])) {
            // Translation is missing
            errors.push(`The translation in ${lang.toUpperCase()} is missing for key "${i18nId}".`);
          }
        }
      }
    }

    // Raise exception if any error was found
    if (errors.length > 0) {
      throw new Error(errors.join('\n'));
    }
  });

  it('Every geTranslation call should have a corresponding translation', async () => {
    // First, read all translations files
    const i18nPath = path.join(__dirname, 'assets', 'i18n');
    const translations: Record<string, any> = {};
    for (const lang of getSupportedLanguages()) {
      const file = fs.readFileSync(path.join(i18nPath, `${lang}.json`), 'utf-8');
      translations[lang] = JSON.parse(file)[lang];
    }

    const parentPath = path.join(__dirname, 'components'); // include parent path for index and mobile templates
    const htmlFiles = getAllHtmlFiles(parentPath);
    const tsFiles = getAllTypescriptFiles(parentPath);

    const errors: string[] = [];
    for (const file of [...htmlFiles, ...tsFiles]) {
      let code = fs.readFileSync(file, 'utf8');
      const regex = /getTranslation\('([^']+)'\)/gm;
      const matches = code.matchAll(regex);
      for (const match of matches) {
        const i18nId = match[1];

        if (noNeedForTranslation.includes(i18nId)) {
          // Special strings do not need any translation
          continue;
        }

        for (const lang of getSupportedLanguages()) {
          if (!(i18nId in translations[lang])) {
            // Translation is missing
            errors.push(`The translation in ${lang.toUpperCase()} is missing for key "${i18nId}".`);
          }
        }
      }
    }

    // Raise exception if any error was found
    if (errors.length > 0) {
      throw new Error(errors.join('\n'));
    }
  });

  it('Every gAlert, gPrompt, gConfirm call should have a corresponding translation', async () => {
    // First, read all translations files
    const i18nPath = path.join(__dirname, 'assets', 'i18n');
    const translations: Record<string, any> = {};
    for (const lang of getSupportedLanguages()) {
      const file = fs.readFileSync(path.join(i18nPath, `${lang}.json`), 'utf-8');
      translations[lang] = JSON.parse(file)[lang];
    }

    const parentPath = path.join(__dirname, 'components'); // include parent path for index and mobile templates
    const htmlFiles = getAllHtmlFiles(parentPath);
    const tsFiles = getAllTypescriptFiles(parentPath);

    const errors: string[] = [];
    for (const file of [...htmlFiles, ...tsFiles]) {
      let code = fs.readFileSync(file, 'utf8');
      const regex = /(gPrompt|gAlert|gConfirm)\(([^)]+)\)/gm;
      const matches = code.matchAll(regex);
      for (const match of matches) {
        const params = match[2].split(',');
        for (const param of params) {
          // trim before because the space can be part of the translation
          let i18nId = param.trim();
          if (i18nId.startsWith('`') || !(i18nId.startsWith('"') && i18nId.startsWith("'"))) {
            // Ignore templated strings or variable names
            continue;
          }

          // Remove string separators (' or ")
          i18nId = i18nId.slice(1, -1);
          if (noNeedForTranslation.includes(i18nId)) {
            // Special strings do not need any translation
            continue;
          }

          for (const lang of getSupportedLanguages()) {
            if (!(i18nId in translations[lang])) {
              // Translation is missing
              errors.push(`The translation in ${lang.toUpperCase()} is missing for key "${i18nId}".`);
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
});

describe('Manage User Interactions', () => {
  const searchComponents = (regexPatterns: RegExp[]) => {
    const componentsPath = path.join(__dirname, 'components');
    let candidates: string[] = [];
    const tsFiles = getAllTypescriptFiles(componentsPath);
    for (const tsFile of tsFiles) {
      const code = fs.readFileSync(tsFile, 'utf8');
      for (const pattern of regexPatterns) {
        const addMatches = (code ?? '').match(pattern);
        if (addMatches) {
          candidates.push(tsFile.replace(componentsPath + '/', ''));
          break;
        }
      }
    }
    // Return unique list of shortened file paths that contain interaction event listeners
    return Array.from(new Set(candidates));
  };

  it('Components register listeners for user interactions with the UserInteractionManager', async () => {
    // Add names of components that should be ignored when searching for event listeners
    const fileIgnoreList = [
      `menubutton${path.sep}component.ts`, // contains 'click' listener to remove menu overlays, management not necessary
      `cross-section${path.sep}scatterplot.ts`, // contains 'click' and 'drag' listener for d3 plots
      `getdirections${path.sep}component.ts` // contains 'click' listener on document to close Drop Down Menu when clicking outside
    ];

    // Search patterns
    const searchKeyboardListeners = new RegExp(/document\.addEventListener\(['"]key/gm);
    const searchMouseListenersOnDocument = new RegExp(
      /document\.addEventListener\(['"](click|mouse|contextmenu|drop|onwheel)/gm
    );
    const searchMouseListenersOnMapViewport = new RegExp(
      /Viewport\S*\.addEventListener\(['"](click|mouse|contextmenu|drop|onwheel)/gm
    );
    const searchOlInteractionListeners = new RegExp(/\.on\(['"](\w*move|\w*click|\w*drag)/gm);
    const searchOlInteractionInitializations = new RegExp(/new Draw\(|new Modify\(|new Snap\(/gm);
    const searchEventRegistrations = new RegExp(/(\.registerInteractionListener\()|(\.registerListener\()/gm);

    const filesWithEventListener = searchComponents([
      searchKeyboardListeners,
      searchMouseListenersOnDocument,
      searchMouseListenersOnMapViewport,
      searchOlInteractionListeners,
      searchOlInteractionInitializations
    ]).filter((c) => !fileIgnoreList.some((i) => c.includes(i)));

    const filesWithRegistration = searchComponents([searchEventRegistrations]);

    console.log('User Interaction Manager:');
    console.log('The following tools contain event listeners:\n-', filesWithEventListener.join('\n- '));
    console.log('The following tools contain listener registration:\n-', filesWithRegistration.join('\n- '));

    // Compare occurrence of event listeners and listener registration
    const errors: string[] = [];
    for (const file of filesWithEventListener) {
      if (!filesWithRegistration.includes(file)) {
        errors.push(`${file} contains event listeners but does not register any with the user interaction manager.`);
      }
    }
    // Raise exception if any error was found
    if (errors.length > 0) {
      throw new Error(errors.join('\n'));
    }
  });
});

describe('Session management', () => {
  it('empty href should not break session management', async () => {
    const parentPath = path.join(__dirname, 'components');
    const htmlFiles = getAllHtmlFiles(parentPath);

    const errors: string[] = [];
    for (const htmlFile of htmlFiles) {
      let code = fs.readFileSync(htmlFile, 'utf8');
      const regex = /href="#/;
      const match = code.match(regex);
      if (match) {
        errors.push(
          `${htmlFile}: Using href="#" will break the session management. Please use href="javascript:void(0)" instead.`
        );
      }
    }

    // Raise exception if any error was found
    if (errors.length > 0) {
      throw new Error(errors.join('\n'));
    }
  });
});
