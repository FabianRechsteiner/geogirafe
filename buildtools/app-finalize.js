// SPDX-License-Identifier: Apache-2.0
import { deleteFiles } from './tools.js';

// Removeing the cesium sourcemaps because they are really big and not useful at all
deleteFiles(['./dist/app/assets/cesium-*.js.map']);
