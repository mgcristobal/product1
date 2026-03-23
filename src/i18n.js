/**
 * i18n.js – Configures require('i18n') using translations loaded from MongoDB.
 *
 * Key differences vs i18next approach:
 *  - The 'i18n' package has no plugin system; translations are passed via
 *    staticCatalog at configuration time.
 *  - Hot reload: call reconfigure() again after updating MongoDB; it rebuilds
 *    the catalog and re-runs i18n.configure() without restarting the server.
 *  - Interpolation uses '%s' (sprintf style) or named '%(name)s' placeholders
 *    instead of i18next's '{{name}}' syntax.
 */

const i18n     = require('i18n');
const { loadCatalog } = require('./db');

/**
 * (Re)configure i18n with the latest translations from MongoDB.
 * Safe to call multiple times – i18n.configure() replaces the previous config.
 *
 * @returns {Promise<void>}
 */
async function reconfigure() {
  const catalog = await loadCatalog();
  const locales  = Object.keys(catalog);

  if (locales.length === 0) {
    console.warn('[i18n] No translations found in MongoDB. Run: node src/seed.js');
  }

  i18n.configure({
    // Provide all translations as a static in-memory catalog
    staticCatalog: catalog,

    // List of supported locales (derived from what is in MongoDB)
    locales,

    // Default locale when detection fails
    defaultLocale: 'en',

    // Use dot-notation keys like 'nav.home'
    objectNotation: true,

    // Register __(), __n() etc. as globals (optional, useful for scripts)
    register: global,

    // Do NOT write missing keys to disk (we handle that via MongoDB)
    updateFiles: false,
    syncFiles:   false,
  });

  console.log('[i18n] Configured with locales:', locales);
}

module.exports = { i18n, reconfigure };
