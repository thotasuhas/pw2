/** Entry point: wires the real browser document and the cached Open-Meteo fetcher. */
import { initApp } from './app.js';
import { createCachedFetcher } from './cache.js';
import { fetchCity } from './data.js';

initApp({ document, lookup: createCachedFetcher(fetchCity) });
