// SPDX-License-Identifier: Apache-2.0
import { inlineTemplate } from './tools.js';

const InlineTemplatesPlugin = function () {
  return {
    name: 'girafe-inline-templates',
    load(id) {
      if (
        (id.includes('src/components/') || id.includes('src/api/')) &&
        (id.endsWith('.js') || id.endsWith('.ts'))
      ) {
        // Read the file and integrate the HTML and the CSS inline as template string.
        return inlineTemplate(id);
      }
      // The standard load function of vite will be used
      return null;
    }
  };
};

export default InlineTemplatesPlugin;
