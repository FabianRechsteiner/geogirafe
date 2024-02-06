import { inlineTemplate } from './tools';

const InlineTemplatesPlugin = function () {
  return {
    name: 'girafe-inline-templates',
    load(id) {
      if (id.includes('src/components/') && (id.endsWith('.js') || id.endsWith('.ts'))) {
        // Read the file and integrate the HTML and the CSS inline as template string.
        const newCode = inlineTemplate(id);
        return newCode;
      }
      // The standard load function of vite will be used
      return null;
    }
  };
};

export default InlineTemplatesPlugin;
