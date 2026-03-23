const Translation = require('../models/Translation');

/**
 * Custom i18next backend that reads/writes translations from/to MongoDB.
 *
 * i18next backend contract:
 *   - type        : 'backend'
 *   - init()      : called once with i18next options
 *   - read()      : called to load a locale+namespace bundle
 *   - create()    : called when saveMissing=true and a key is not found
 */
class MongoDBBackend {
  constructor(services, options = {}) {
    this.init(services, options);
  }

  init(services, options) {
    this.services = services;
    this.options = options;
  }

  /**
   * Load translations for a single locale + namespace.
   * i18next calls this automatically on startup and after reloadResources().
   *
   * @param {string}   language  - e.g. 'es'
   * @param {string}   namespace - e.g. 'common'
   * @param {Function} callback  - callback(error, translations)
   */
  async read(language, namespace, callback) {
    try {
      const doc = await Translation.findOne({ locale: language, namespace });

      if (!doc) {
        // Return null so i18next falls back to the next language in fallbackLng
        return callback(null, null);
      }

      // Convert Mongoose Map to a plain object
      const translations = Object.fromEntries(doc.translations);
      callback(null, translations);
    } catch (err) {
      callback(err, null);
    }
  }

  /**
   * Save a missing key to MongoDB (only called when saveMissing: true).
   * This lets translators discover which keys need translation.
   *
   * @param {string[]} languages     - array of locales, e.g. ['es']
   * @param {string}   namespace
   * @param {string}   key
   * @param {string}   fallbackValue - the key itself or the fallback language value
   */
  async create(languages, namespace, key, fallbackValue) {
    for (const language of languages) {
      try {
        await Translation.findOneAndUpdate(
          { locale: language, namespace },
          { $setOnInsert: { locale: language, namespace }, $set: { [`translations.${key}`]: fallbackValue } },
          { upsert: true, new: true }
        );
      } catch (err) {
        console.error(`[MongoDBBackend] Failed to save missing key "${key}" for ${language}/${namespace}:`, err.message);
      }
    }
  }
}

MongoDBBackend.type = 'backend';

module.exports = MongoDBBackend;
