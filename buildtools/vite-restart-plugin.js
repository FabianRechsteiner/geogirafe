// SPDX-License-Identifier: Apache-2.0
const HtmlRebuildPlugin = function () {
  return {
    name: 'girafe-html-rebuild',
    handleHotUpdate({ file, server }) {
      if (
        (file.includes('src/components/') || file.includes('src/api/')) &&
        (file.endsWith('.html') || file.endsWith('.css'))
      ) {
        // Change in component
        server.restart();
      } else if (file.includes('styles/') && !file.endsWith('index.css')) {
        // Change in common styles
        server.restart();
      }
    }
  };
};

export default HtmlRebuildPlugin;
