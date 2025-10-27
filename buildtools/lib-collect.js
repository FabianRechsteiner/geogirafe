import path from 'path';
import { copy } from './tools.js';

const sourceDir = 'src';
const targetDir = path.join('dist', 'lib-src-inline');

copy('base', sourceDir, targetDir);
copy('models', sourceDir, targetDir);
copy('tools', sourceDir, targetDir);
copy('typings', sourceDir, targetDir);
copy('decs.d.ts', sourceDir, targetDir);
copy('main.tools.ts', sourceDir, targetDir);
copy('main.ts', sourceDir, targetDir);
copy('main.mobile.ts', sourceDir, targetDir);
copy('main.iframe.ts', sourceDir, targetDir);
