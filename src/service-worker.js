/**
 * To allow offline mode, the first 100 queries made by the application will be cached.
 * We could have implemented a more specific cache with file extensions for example
 * But then we should define exactly what should be cached.
 * This can be quite complex, because we cannot just cache all images,
 * as some of them are WMTS or WMTS results and others ar icons.
 * So a simple solution here is to cache all the first queries that are done
 * by the application when it starts. With this we should have all the necessary
 * cache to be able to start the application in offline mode
 *
 * The WMTS tiles and other results coming from OGC-Services will be cached on demand
 * with the OfflineManager component of the application.
 */

var storeVersion; // Version of the store. Value is defined by OfflineManager.
var dbCacheName; // Name of the cache for downloaded data. Value is defined by OfflineManager.
var tilesStoreName; // Name of the store used to downloaded tiles. Value is defined by OfflineManager.
var logLevel; // Current log level. Value is defined by OfflineManager.

const offlineTimeout = 3000; // Timeout in case of not reacheable IndexedDB. (3 sec.)
const appCacheName = 'pages'; // Name of the cache for application pages
const maxCacheCount = 300; // Number of queries that should be cached by the service-worker for offline usage.
var cacheCount = 0; // Counter relatied to the max value above

self.addEventListener('message', handleMessage);
self.addEventListener('install', handleInstall);
self.addEventListener('fetch', (event) => {
  event.respondWith(handleFetchEvent(event));
});

/**
 * Read values coming from OfflineManager
 */
function handleMessage(event) {
  if (event.data.logLevel) {
    logLevel = event.data.logLevel;
    log(`LogLevel changed: ${dbCacheName}`);
  }
  if (event.data.tilesStoreName) {
    tilesStoreName = event.data.tilesStoreName;
    log(`SW tilesStoreName changed: ${tilesStoreName}`);
  }
  if (event.data.storeVersion) {
    storeVersion = event.data.storeVersion;
    log(`SW storeVersion changed: ${storeVersion}`);
  }
  if (event.data.dbCacheName) {
    dbCacheName = event.data.dbCacheName;
    log(`SW dbCacheName changed: ${dbCacheName}`);
  }
}

/**
 * Installation of the service worker
 */
function handleInstall() {
  self.skipWaiting();
  log('SW Service Worker installed');
}

async function handleFetchEvent(event) {
  let response = await fetchAndCache(event.request);

  // Use cache only for GET queries
  if (event.request.method === 'GET') {
    if (!response) {
      // Fetch was unsuccessful. We try to load the data from cache.
      response = await loadFromCache(event.request);
    }
    if (!response) {
      // Not found in cache. We try to load from indexedDB
      response = await loadFromIndexedDB(event.request);
    }
    if (!response) {
      // Cannot fetch and not found anywhere.
      // TODO REG: Should we use another response code here?
      // return new Response(null, { status: 503 });
      response = new Response(null, { status: 204 });
    }
  }

  return response;
}

/**
 * Execute a fetch for the query, and cache the result if sucessful
 * Returns null if unsucessful
 */
async function fetchAndCache(request) {
  let response;
  try {
    response = await fetch(request);
    if (cacheCount < maxCacheCount && request.method === 'GET' && response.type !== 'opaque') {
      // Fetch was successful. We cache the result if necessary and return the response.
      cacheCount++;
      log(`SW ${cacheCount}/${maxCacheCount} caching ${request.url} for offline use.`);
      const copy = response.clone();
      const cache = await caches.open(appCacheName);
      await cache.put(request, copy);
    }
    return response;
  } catch {
    return null;
  }
}

/**
 * Try to load this request from local cache.
 * Returns null if unsucessful
 */
async function loadFromCache(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  } else {
    return null;
  }
}

/**
 * Try to load this request from indexedDB.
 * Returns null if unsucessful
 */
async function loadFromIndexedDB(request) {
  try {
    const database = await openIndexedDB();
    const transaction = database.transaction([tilesStoreName], 'readonly');
    const store = transaction.objectStore(tilesStoreName);
    const index = store.index('url');

    return new Promise((resolve, reject) => {
      const dbRequest = index.get(request.url);
      dbRequest.onsuccess = () => {
        if (dbRequest.result) {
          const blob = dbRequest.result.data;
          log('SW Tile found in Cache.');
          resolve(new Response(blob));
        } else {
          log('SW Tile not found in cache.');
          resolve(new Response(null, { status: 204 }));
        }
      };
      dbRequest.onerror = () => {
        reject('SW Error querying IndexedDB Store.');
      };
    });
  } catch (error) {
    return null;
  }
}

/**
 * Open indexedDB
 */
async function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbCacheName, storeVersion);

    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      reject(new Error('SW Timeout while opening IndexedDB'));
    }, offlineTimeout);

    request.onerror = (event) => {
      if (!timedOut) {
        clearTimeout(timeoutId);
        reject(event.target.error);
      }
    };

    request.onsuccess = (event) => {
      if (!timedOut) {
        clearTimeout(timeoutId);
        resolve(event.target.result);
      }
    };
  });
}

function log(str) {
  if (logLevel === 'debug') {
    console.debug(str);
  }
}
