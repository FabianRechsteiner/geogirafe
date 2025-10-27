import { v4 as uuidv4 } from 'uuid';
import GirafeSingleton from '../../base/GirafeSingleton';
import ErrorStackParser from 'error-stack-parser';
import { SourceMapConsumer } from 'source-map-js';

class ErrorManager extends GirafeSingleton {
  private sourceMaps: { [key: string]: SourceMapConsumer } = {};

  initializeSingleton() {
    this.listenToAllErrors();
  }

  private getErrorMessage(title: string, stack: string, contextUrl: string) {
    const description = `
## Debug Infos

### Context

${contextUrl}

### Callstack

\`\`\`
${stack}
\`\`\`

/label ~"error report"
`;

    const errorMessage = `${title}<br/><a target="_new" href="https://gitlab.com/geogirafe/gg-viewer/-/issues/new?issue[title]=${encodeURIComponent(title)}&issuable_template=bug&issue[description]=${encodeURIComponent(description)}">Report Error</a>`;
    return errorMessage;
  }

  public pushMessage(id: string, text: string, level: 'info' | 'warning' | 'error') {
    // Remove existing message with the same id
    const msgIndex = this.context.stateManager.state.infobox.elements.findIndex((el) => el.id === id);
    if (msgIndex !== -1) {
      this.context.stateManager.state.infobox.elements.splice(msgIndex, 1);
    }

    // Add a new one
    this.context.stateManager.state.infobox.elements.push({
      id: id,
      text: text,
      type: level
    });
  }

  private listenToAllErrors() {
    // Listen to all uncatched errors
    window.onerror = async (_message, file, line, col, error) => {
      const title = error?.message ?? `Unknown error in ${file} at line ${line} and column ${col}.`;
      const stack = await this.getStackTrace(error);
      this.pushErrorMessageWithStack(title, stack);
      return false;
    };

    // Listen to all unhandled HTTPRequest rejections
    window.addEventListener('unhandledrejection', async (event) => {
      const error = (event.reason as Error) ?? new Error('Unknown reason');
      const title = `Unhandled rejection: ${error.message}`;
      const stack = await this.getStackTrace(error);
      this.pushErrorMessageWithStack(title, stack);
      return false;
    });
  }

  private async getStackTrace(error?: Error) {
    let stack = 'Unknown stack';
    if (error?.stack) {
      try {
        // NOTE REG: Specific to Vite: When running in debug mode, we do not need to calculate the original stacktrace
        stack = import.meta.env.DEV ? error.stack : await this.getOriginalStackTrace(error);
      } catch (e) {
        // If an error accurs during the calculation of the stacktrace, we just ignore it
        // and return the original stacktrace. Otherwise it could lead to an infinite exception loop.
        console.warn(e);
        stack = error.stack;
      }
    }

    return stack;
  }

  private pushErrorMessageWithStack(title: string, stack: string) {
    // Add new errormessage only if not already present
    const pendingMessages = this.context.stateManager.state.infobox.elements.map((ele) => ele.text);
    const contextUrl = this.getContextUrl();
    const errorMessage = this.getErrorMessage(title, stack, contextUrl);
    if (!pendingMessages.includes(errorMessage)) {
      this.context.stateManager.state.infobox.elements.push({
        id: uuidv4(),
        text: errorMessage,
        type: 'error'
      });
    }
  }

  private getContextUrl() {
    const base = window.location.href.split('#')[0];
    try {
      const hash = this.context.shareManager.getStateToShare();
      return `${base}#${hash}`;
    } catch {
      return base;
    }
  }

  private async getOriginalStackTrace(error: Error): Promise<string> {
    if (Object.keys(this.sourceMaps).length === 0) {
      await this.loadAllSourceMaps();
    }

    // Map the minified stacktrace with the original one
    const stackFrames = ErrorStackParser.parse(error);
    const originalStackFrames = stackFrames.map((frame) => {
      const sourceMap = this.sourceMaps[this.getNormalizedPath(frame.fileName)];
      if (sourceMap) {
        const originalPosition = sourceMap.originalPositionFor({
          line: frame.lineNumber!,
          column: frame.columnNumber!
        });

        if (originalPosition.source) {
          return {
            fileName: originalPosition.source,
            lineNumber: originalPosition.line,
            columnNumber: originalPosition.column,
            functionName: frame.functionName
          };
        }
      }

      // Default : return the original frame
      return frame;
    });

    return originalStackFrames
      .map((frame) => {
        return `${frame.functionName || 'anonymous'} (${frame.fileName}:${frame.lineNumber}:${frame.columnNumber})`;
      })
      .join('\n');
  }

  private async loadAllSourceMaps() {
    const scripts = document.getElementsByTagName('script');
    for (const script of scripts) {
      await this.loadSourceMap(this.getNormalizedPath(script.src));
    }
  }

  private async loadSourceMap(jsFilename: string) {
    const response = await fetch(jsFilename);
    const content = await response.text();

    // Load sourcemap of this specific file
    let regex = /\/\/# sourceMappingURL=([^\s]+)/;
    let match = RegExp(regex).exec(content);
    if (match) {
      const sourceMapUrl = this.getNormalizedPath(jsFilename, match[1]);
      if (!(jsFilename in this.sourceMaps)) {
        const sourceMapResponse = await fetch(sourceMapUrl);
        const sourceMapContent = await sourceMapResponse.json();
        const sourceMap = new SourceMapConsumer(sourceMapContent);
        this.sourceMaps[jsFilename] = sourceMap;
      }
    } else {
      console.info('No Sourcemap found');
    }

    // Load sourcemaps of all other dependent bundles
    regex = /from *"([^\s]+)"/g;
    const matches = content.matchAll(regex);
    for (match of matches) {
      for (let i = 1; i < match.length; ++i) {
        const sourceMapUrl = this.getNormalizedPath(jsFilename, match[1]);
        await this.loadSourceMap(sourceMapUrl);
      }
    }
  }

  private getNormalizedPath(initialUrl?: string, newFilename?: string | RegExpExecArray): string {
    if (!initialUrl) {
      throw new Error('No path to normalize');
    }
    const path = newFilename ? initialUrl.substring(0, initialUrl.lastIndexOf('/') + 1) + newFilename : initialUrl;
    const url = new URL(path);
    return url.origin + url.pathname;
  }
}

export default ErrorManager;
