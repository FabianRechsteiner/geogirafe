import MagicString from 'magic-string';
import fs from 'node:fs';
import path from 'path';

const InlineTemplatesPlugin = function() {
  return {
    name: 'girafe-inline-templates',
    transform(code, id) {
      //const originalCode = fs.readFileSync(id, 'utf8');
      

      let newCode = code;
      const magicString = new MagicString(code);
      if (id.includes('src/components/') && (id.endsWith('.js') || id.endsWith('.ts'))) {

        const htmlRegex = new RegExp(`templateUrl *= *['"](.*)['"] *;?`);
        if (htmlRegex.test(code)) {

          // First, verify is there is a style file
          let styleCode = '';
          const styleRegex = new RegExp(`styleUrl *= *['"](.*)['"] *;?`);
          if (styleRegex.test(code)) {
            const styleFound = code.match(styleRegex);
            const styleFilePath = path.join(path.dirname(id), styleFound[1]);
            try {
              const styleFileContent = fs.readFileSync(styleFilePath, 'utf8');
              // Concert css notation (for ex \002a) to javascript notation (\u002a)
              styleCode = styleFileContent.replace(/\\([0-9a-fA-F]{4})/g, '\\u$1');
              styleCode = `<style>\n${styleCode}\n</style>`;
              magicString.overwrite(styleFound.index, styleFound.index + styleFound[0].length, '');
            } catch (error) {
              console.error(`Error reading style file for ${id}: ${error}`);
            }
          }

          // Read HTML template
          const htmlFound = code.match(htmlRegex);
          const htmlFilePath = path.join(path.dirname(id), htmlFound[1]);
          try {
            const htmlFileContent = fs.readFileSync(htmlFilePath, 'utf8');
            const htmlCode = `template = () => { return uHtml\`${styleCode}\n${htmlFileContent}\`; }`;
            magicString.overwrite(htmlFound.index, htmlFound.index + htmlFound[0].length, htmlCode);
          } catch (error) {
            console.error(`Error reading HTML file for ${id}: ${error}`);
          }

          magicString.prepend(`import { html as uHtml } from 'uhtml';\n`);
          newCode = magicString.toString();
        }
      }

      // Generate sourcemap
      const mapSource = path.relative(process.cwd(), id);
      const mapFile = mapSource + '.map';
      const sourceMap = magicString.generateMap({
        hires: true,
        source: mapSource,
        file: mapFile,
        includeContent: true
      });

      return {
        code: newCode,
        map: sourceMap
      };
    }
  };
}

export default InlineTemplatesPlugin;