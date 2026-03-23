/**
 * db.js – MongoDB connection using the native Node.js driver (no Mongoose).
 *
 * Exports a singleton MongoClient and a helper to get the translations collection.
 */

const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME   = process.env.MONGO_DB   || 'i18n_demo';
const COLL_NAME = 'translations';

let client;

/**
 * Connect once and reuse the same client for the lifetime of the process.
 * @returns {Promise<MongoClient>}
 */
async function connect() {
  if (!client) {
    client = new MongoClient(MONGO_URI);
    await client.connect();
    console.log('MongoDB connected:', MONGO_URI);
  }
  return client;
}

/**
 * Returns the translations Collection object.
 * @returns {Promise<import('mongodb').Collection>}
 */
async function translationsCollection() {
  const c = await connect();
  return c.db(DB_NAME).collection(COLL_NAME);
}

/**
 * Load all translation documents and reshape them into the staticCatalog
 * format that require('i18n') expects:
 *
 *   { en: { welcome: 'Welcome', greeting: 'Hello, %s!' },
 *     es: { welcome: 'Bienvenido', greeting: '¡Hola, %s!' },
 *     fr: { welcome: 'Bienvenue', greeting: 'Bonjour, %s !' } }
 *
 * Each document in MongoDB looks like:
 *   { locale: 'es', translations: { welcome: 'Bienvenido', ... } }
 *
 * @returns {Promise<Object>}
 */
async function loadCatalog() {
  const coll = await translationsCollection();
  const docs  = await coll.find({}).toArray();

  const catalog = {};
  for (const doc of docs) {
    catalog[doc.locale] = doc.translations;
  }
  return catalog;
}

/**
 * Merge key-value pairs into a locale document (upsert).
 * @param {string} locale
 * @param {Object} updates  - plain object { key: 'value', ... }
 * @returns {Promise<Object>}  the full updated document
 */
async function updateTranslations(locale, updates) {
  const coll = await translationsCollection();

  // Build $set payload: { 'translations.welcome': 'Bienvenido', ... }
  const setPayload = {};
  for (const [key, value] of Object.entries(updates)) {
    setPayload[`translations.${key}`] = value;
  }

  const result = await coll.findOneAndUpdate(
    { locale },
    { $set: setPayload, $setOnInsert: { locale } },
    { upsert: true, returnDocument: 'after' }
  );
  return result;
}

module.exports = { connect, translationsCollection, loadCatalog, updateTranslations };
