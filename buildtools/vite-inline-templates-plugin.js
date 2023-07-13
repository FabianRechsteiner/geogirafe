import fs from 'node:fs';
import path from 'path';

const InlineTemplatesPlugin = function() {
  return {
    name: 'girafe-inline-templates',
    transform(code, id) {
      let newCode = code;
      if (id.includes('src/components/') && (id.endsWith('.js'))) {

        const htmlRegex = new RegExp(`templateUrl *= *['"](.*)['"] *;?`);
        if (htmlRegex.test(code)) {

          // First, verify is there is a style file
          let styleCode = '';
          const styleRegex = new RegExp(`styleUrl *= *['"](.*)['"] *;?`);
          if (styleRegex.test(code)) {
            const styleFound = code.match(styleRegex);
            const styleFilePath = path.join(path.dirname(id), styleFound[1]);
            const styleFileContent = fs.readFileSync(styleFilePath, 'utf8');
            // Concert css notation (for ex \002a) to javascript notation (\u002a)
            styleCode = styleFileContent.replace(/\\([0-9a-fA-F]{4})/g, '\\u$1');
            styleCode = `<style>\n${styleCode}\n</style>`;
          }

          // Read HTML template
          const htmlFound = code.match(htmlRegex);
          const htmlFilePath = path.join(path.dirname(id), htmlFound[1]);
          const htmlFileContent = fs.readFileSync(htmlFilePath, 'utf8');
          const htmlCode = `template = () => { return uHtml\`${styleCode}\n${htmlFileContent}\`; }`;

          // Add HTML and CSS inline
          newCode = code.replace(styleRegex, '');
          newCode = newCode.replace(htmlRegex, htmlCode);
          newCode = `import { html as uHtml } from 'uhtml';\n${newCode}`
        }
      }

      return {
        code: newCode,
        map: null
      };
    }
  };
}

export default InlineTemplatesPlugin;