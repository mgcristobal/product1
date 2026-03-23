const i18next = require('i18next');
const i18nextMiddleware = require('i18next-http-middleware');
const MongoDBBackend = require('./MongoDBBackend');

/**
 * Initialises i18next with:
 *  - MongoDBBackend  → reads translations from MongoDB
 *  - LanguageDetector → detects locale from query (?lng=es), cookie, or Accept-Language header
 */
async function initI18n() {
  await i18next
    .use(MongoDBBackend)
    .use(i18nextMiddleware.LanguageDetector)
    .init({
      // Fallback when a key or locale is missing
      fallbackLng: 'en',
      // Namespaces to pre-load on startup
      ns: ['common'],
      defaultNS: 'common',
      // Languages to pre-load
      preload: ['en', 'es', 'fr'],

      // Detection order: query string → cookie → Accept-Language header
      detection: {
        order: ['querystring', 'cookie', 'header'],
        lookupQuerystring: 'lng',
        lookupCookie: 'i18next',
        caches: ['cookie'],
      },

      // Save unknown keys to MongoDB so translators can fill them in later
      saveMissing: true,
      saveMissingTo: 'all',

      // Avoids "backend not initialised" warnings in tests
      initImmediate: false,
    });

  return i18next;
}

module.exports = { initI18n, i18nextMiddleware };
