// lib/polyfill.ts
if (typeof window === 'undefined') {
  global.fetch = require('cross-fetch');
}