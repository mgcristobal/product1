const i18next = require('i18next');
const i18nextHttpMiddleware = require('i18next-http-middleware');
const MongoDBBackend = require('./MongoDBBackend');

/**
 * Initialises i18next with the MongoDB backend.
 *
 * Language detection order (via i18next-http-middleware):
 *   1. Query string:  GET /hello?lng=es
 *   2. HTTP header:   Accept-Language: es
 *   3. Falls back to `fallbackLng`
 */
async function initI18n() {
  await i18next
    .use(MongoDBBackend)
    .use(i18nextHttpMiddleware.LanguageDetector)
    .init({
      // Languages your app supports
      supportedLngs: ['en', 'es', 'fr'],
      fallbackLng: 'en',

      // Namespaces (maps to a MongoDB document per locale)
      ns: ['common', 'errors'],
      defaultNS: 'common',

      // Backend options (passed to MongoDBBackend.init)
      backend: {},

      // Save keys that are missing in the DB so they can be translated later
      saveMissing: true,
      saveMissingTo: 'all',

      // Disable file-system caching; always read from MongoDB
      interpolation: {
        escapeValue: false, // Not needed for server-side rendering
      },
    });

  console.log('i18next initialised with MongoDB backend');
  return i18next;
}

/**
 * Returns the Express middleware that:
 *  - Detects the request language
 *  - Adds `req.t(key)` and `req.i18n` to every request
 */
function i18nMiddleware() {
  return i18nextHttpMiddleware.handle(i18next);
}

module.exports = { initI18n, i18nMiddleware };
