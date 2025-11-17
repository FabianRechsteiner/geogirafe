import MagicString from 'magic-string';
import fs from 'fs-extra';
import path from 'path';
import { minify } from 'minify';

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

export function replaceInFile(filename, searchPattern, replacement) {
  try {
    const content = fs.readFileSync(filename, 'utf8');
    const newContent = content.replace(searchPattern, replacement);
    fs.writeFileSync(filename, newContent, 'utf8');
  } catch (error) {
    console.error(`Error replacing content in ${filename}: ${error}`);
  }
}

async function getStyleCode(currentFilename, relativeCssPath) {
  const styleFilePath = path.join(path.dirname(currentFilename), relativeCssPath.trim());
  try {
    const styleFileContent = fs.readFileSync(styleFilePath, 'utf8');
    // Convert css notation (for ex \002a) to javascript notation (\u002a)
    let styleCode = styleFileContent.replace(/\\([0-9a-fA-F]{4})/g, '\\u$1');
    styleCode = await minify.css(styleCode);
    styleCode = `<style>\n${styleCode}\n</style>`;
    return styleCode;
  } catch (error) {
    console.error(`Error reading style file for ${currentFilename}: ${error}`);
    throw error;
  }
}

async function getHtmlCode(currentFilename, relativeHtmlPath, styleCode) {
  const htmlFilePath = path.join(path.dirname(currentFilename), relativeHtmlPath.trim());
  try {
    let htmlCode = fs.readFileSync(htmlFilePath, 'utf8');
    htmlCode = await minify.html(htmlCode, {
      html: {
        minifyCSS: false,
        collapseBooleanAttributes: false,
        removeAttributeQuotes: false
      }
    });
    htmlCode = `template = () => { return uHtml\`${styleCode}\n${htmlCode}\`; }`;
    return htmlCode;
  } catch (error) {
    console.error(`Error reading html file for ${currentFilename}: ${error}`);
    throw error;
  }
}

export function isLineCommented(regExpMatch, code) {
  if (!regExpMatch) {
    return false;
  }

  const lineStart = code.substring(0, regExpMatch.index);
  const lastNewlineIndex = lineStart.lastIndexOf('\n');
  const lineBeforeMatch = lineStart.substring(lastNewlineIndex + 1);

  // The line is commented
  if (lineBeforeMatch.trim().startsWith('//')) {
    return true;
  }

  // Test if we are in a commented block
  let commentedBlock = 0;
  for (let i = 0; i < regExpMatch.index; i++) {
    if (code[i] === '/' && code[i + 1] === '*') {
      commentedBlock++;
      i++;
    } else if (code[i] === '*' && code[i + 1] === '/') {
      commentedBlock--;
      i++;
    }
  }
  if (commentedBlock > 0) {
    return true;
  }

  return false;
}

function isStringCommented(line) {
  if (!line) {
    return false;
  }
  if (line.trim().startsWith('//')) {
    return true;
  }
  if (line.trim().startsWith('/*')) {
    return true;
  }
  return false;
}

// Regex definitions
export const styleRegex = /styleUrl *= *['"](.*)['"] *;?/g;
export const stylesRegex = /styleUrls *= *\[([\s\S]*?)\] *;?/gs;
export const htmlRegex = /templateUrl *= *['"](.*)['"] *;?/g;

export async function inlineTemplate(filename) {
  // Read the file
  const code = fs.readFileSync(filename, 'utf8');
  const magicString = new MagicString(code);

  // We integrate HTML and CSS only if there is an HTML Template
  const htmlFounds = code.matchAll(htmlRegex);
  for (const htmlFound of htmlFounds) {
    if (htmlFound && !isLineCommented(htmlFound, code) && htmlFound[1]) {
      let styleCode = '';

      // Unique style Url
      const styleFounds = code.matchAll(styleRegex);
      for (const styleFound of styleFounds) {
        if (styleFound && !isLineCommented(styleFound, code) && styleFound[1]) {
          styleCode += await getStyleCode(filename, styleFound[1]);
          magicString.overwrite(styleFound.index, styleFound.index + styleFound[0].length, '');
        }
      }

      // Multiple style Urls
      const stylesFounds = code.matchAll(stylesRegex);
      for (const stylesFound of stylesFounds) {
        if (stylesFound && !isLineCommented(stylesFound, code) && stylesFound[1]) {
          const stylePaths = stylesFound[1]
            .split(',')
            .map((p) => p.trim().replace(/['"]/g, ''))
            .filter((p) => p.length > 0 && !isStringCommented(p));
          for (const stylePath of stylePaths) {
            styleCode += await getStyleCode(filename, stylePath);
          }
          magicString.overwrite(stylesFound.index, stylesFound.index + stylesFound[0].length, '');
        }
      }

      // HTML template
      const htmlCode = await getHtmlCode(filename, htmlFound[1], styleCode);
      magicString.overwrite(htmlFound.index, htmlFound.index + htmlFound[0].length, htmlCode);

      // Add missing import (uHtml)
      magicString.prepend(`import { html as uHtml } from 'uhtml';\n`);
      if (htmlCode.includes('uHtmlFor')) {
        // Include uHtmlFor if it is used in the template
        magicString.prepend(`import { htmlFor as uHtmlFor } from 'uhtml/keyed';\n`);
      }
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
