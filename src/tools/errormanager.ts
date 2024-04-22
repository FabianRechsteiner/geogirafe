import { v4 as uuidv4 } from 'uuid';
import GirafeSingleton from '../base/GirafeSingleton';
import ConfigManager from './configuration/configmanager';
import StateManager from './state/statemanager';

class ErrorManager extends GirafeSingleton {
  configManager: ConfigManager;
  stateManager: StateManager;

  constructor(type: string) {
    super(type);
    this.configManager = ConfigManager.getInstance();
    this.stateManager = StateManager.getInstance();
    this.listenToAllErrors();
  }

  private getErrorMessage(title: string, stack: string) {
    const description = `
## Callstack

\`\`\`
${stack}
\`\`\`

/label ~"error report"
`;

    const errorMessage = `${title}<br/><a target="_new" href="https://gitlab.com/geogirafe/gg-viewer/-/issues/new?issue[title]=${encodeURIComponent(title)}&issuable_template=bug&issue[description]=${encodeURIComponent(description)}">Report Error</a>`;
    return errorMessage;
  }

  private listenToAllErrors() {
    // Listen to all uncatched errors
    window.onerror = (_message, file, line, col, error) => {
      const title = error?.message ?? `Unknown error in ${file} at line ${line} and column ${col}.`;
      const stack = error?.stack ?? `Unknown error in ${file} at line ${line} and column ${col}.`;

      this.stateManager.state.infobox.elements.push({
        id: uuidv4(),
        text: this.getErrorMessage(title, stack),
        type: 'error'
      });

      return false;
    };

    // Listen to all unhandled HTTPRequest rejections
    window.addEventListener('unhandledrejection', (error) => {
      const title = `Unhandled rejection: ${error.reason.message}`;
      const stack = error.reason.stack;

      this.stateManager.state.infobox.elements.push({
        id: uuidv4(),
        text: this.getErrorMessage(title, stack),
        type: 'error'
      });

      return false;
    });
  }
}

export default ErrorManager;
