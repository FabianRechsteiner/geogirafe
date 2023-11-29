const HtmlRebuildPlugin = function () {
  return {
    name: 'girafe-html-rebuild',
    handleHotUpdate({ file, server }) {
      if (file.includes('src/components/') && (file.endsWith('.html') || file.endsWith('.css'))) {
        server.restart();
      }
    }
  };
};

export default HtmlRebuildPlugin;
