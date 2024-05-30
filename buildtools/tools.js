import MagicString from 'magic-string';
import fs from 'fs-extra';
import path from 'path';

export function findFilesRecursive(sourceDir, allowedExtensions, fileList = []) {
  const childs = fs.readdirSync(sourceDir);

  childs.forEach((filename) => {
    const src = path.join(sourceDir, filename);

    if (fs.statSync(src).isDirectory()) {
      findFilesRecursive(src, allowedExtensions, fileList);
    } else {
      const extension = path.extname(filename).toLowerCase();
      if (allowedExtensions.includes(extension)) {
        fileList.push(src);
      }
    }
  });

  return fileList;
}

export function deleteDirectory(sourceDir) {
  if (fs.existsSync(sourceDir)) {
    fs.rmSync(sourceDir, { recursive: true });
  }
}

export function copy(filename, sourceDir, targetDir) {
  const source = path.join(sourceDir, filename);
  const target = path.join(targetDir, filename);

  if (fs.existsSync(source)) {
    // First create destination directory
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir);
    }
    // Then copy file
    console.info(`Copying ${filename} to ${target}`);
    fs.copySync(source, target);
  } else {
    console.error(`{source} does not exist.`);
  }
}

export function inlineTemplate(filename) {
  // Read the file
  const code = fs.readFileSync(filename, 'utf8');
  const magicString = new MagicString(code);

  // Find the HTML template
  const htmlRegex = /templateUrl *= *['"](.*)['"] *;?/;
  if (htmlRegex.test(code)) {
    // Verify if there is a CSS file
    let styleCode = '';
    const styleRegex = /styleUrl *= *['"](.*)['"] *;?/;
    if (styleRegex.test(code)) {
      // Read the CSS file
      const styleFound = code.match(styleRegex);
      const styleFilePath = path.join(path.dirname(filename), styleFound[1]);
      try {
        const styleFileContent = fs.readFileSync(styleFilePath, 'utf8');
        // Convert css notation (for ex \002a) to javascript notation (\u002a)
        styleCode = styleFileContent.replace(/\\([0-9a-fA-F]{4})/g, '\\u$1');
        styleCode = `<style>\n${styleCode}\n</style>`;
        magicString.overwrite(styleFound.index, styleFound.index + styleFound[0].length, '');
      } catch (error) {
        console.error(`Error reading style file for ${filename}: ${error}`);
      }
    }

    // Read HTML template
    const htmlFound = code.match(htmlRegex);
    const htmlFilePath = path.join(path.dirname(filename), htmlFound[1]);
    try {
      const htmlFileContent = fs.readFileSync(htmlFilePath, 'utf8');
      const htmlCode = `template = () => { return uHtml\`${styleCode}\n${htmlFileContent}\`; }`;
      magicString.overwrite(htmlFound.index, htmlFound.index + htmlFound[0].length, htmlCode);

      // Add missing import (uHtml)
      magicString.prepend(`import { html as uHtml } from 'uhtml';\n`);
      if (htmlFileContent.includes('uHtmlFor')) {
        // Include uHtmlFor if it is used in the template
        magicString.prepend(`import { htmlFor as uHtmlFor } from 'uhtml/keyed';\n`);
      }
    } catch (error) {
      console.error(`Error reading HTML file for ${filename}: ${error}`);
    }
  }

  // Return the code and the corresponding sourcemap
  const sourcemap = magicString.generateMap({
    source: filename,
    file: filename + '.map',
    includeContent: true,
    hires: true
  });

  return {
    code: magicString.toString(),
    map: sourcemap.toString()
  };
}
