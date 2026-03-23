// SPDX-License-Identifier: Apache-2.0
import proj4 from 'proj4';
import { register } from 'ol/proj/proj4';
import MockGirafeContext from './mockcontext';
import IGirafeContext from '../context/icontext';
import { MockConfig } from './mockconfig';

class MockHelper {
  public static startMocking(): IGirafeContext {
    const context = new MockGirafeContext();

    for (const crs of MockConfig.crs) {
      proj4.defs(crs.code, crs.definition);
    }
    register(proj4);

    return context;
  }

  public static stopMocking(context: IGirafeContext) {
    // @ts-ignore
    context.configManager.config = null;
    context.userDataManager.deleteAllUserData();
  }
}

export default MockHelper;
