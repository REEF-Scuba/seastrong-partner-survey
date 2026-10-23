/* Shared script for results.html and privacy.html. */
import { initChrome } from './common.js';

initChrome();
const root = document.querySelector('[data-results-page]');
if (root) import('./results.js').then(m => m.loadResults(root, { level: 1 }));
