const Translation = require('../models/Translation');

/**
 * Custom i18next backend that loads translations from MongoDB.
 *
 * i18next backends must implement:
 *   - type: 'backend'
 *   - init(services, backendOptions, i18nextOptions)
 *   - read(language, namespace, callback)
 *   - (optional) create(languages, namespace, key, fallbackValue) — for missing keys
 *
 * Usage with i18next:
 *   i18next.use(MongoDBBackend).init({ ... })
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
   * Called by i18next to load translations for a language+namespace.
   * Must call callback(error, translations) where translations is a plain object.
   */
  async read(language, namespace, callback) {
    try {
      const doc = await Translation.findOne({ locale: language, namespace });

      if (!doc) {
        // Return null (not an error) so i18next falls back to the next language
        return callback(null, null);
      }

      // Convert Map to plain object
      const translations = Object.fromEntries(doc.translations);
      callback(null, translations);
    } catch (err) {
      callback(err, null);
    }
  }

  /**
   * Called by i18next when a key is missing (requires saveMissing: true).
   * Upserts the missing key into MongoDB so translators can fill it in later.
   */
  async create(languages, namespace, key, fallbackValue) {
    for (const language of languages) {
      await Translation.findOneAndUpdate(
        { locale: language, namespace },
        { $set: { [`translations.${key}`]: fallbackValue || key } },
        { upsert: true, new: true }
      );
    }
  }
}

MongoDBBackend.type = 'backend';

module.exports = MongoDBBackend;
