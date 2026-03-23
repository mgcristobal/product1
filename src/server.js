const express = require('express');
const mongoose = require('mongoose');
const { initI18n, i18nextMiddleware } = require('./i18n');
const Translation = require('./models/Translation');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/i18n_demo';
const PORT = process.env.PORT || 3000;

async function start() {
  // 1. Connect to MongoDB
  await mongoose.connect(MONGO_URI);
  console.log('MongoDB connected:', MONGO_URI);

  // 2. Initialise i18next (loads translations from MongoDB)
  const i18n = await initI18n();
  console.log('i18next initialised. Loaded locales:', i18n.languages);

  // 3. Create Express app
  const app = express();
  app.use(express.json());

  // 4. Mount i18next middleware – populates req.t() and req.language on every request
  app.use(i18nextMiddleware.handle(i18n));

  // ─── Demo routes ────────────────────────────────────────────────────────────

  /**
   * GET /hello
   * Responds with a translated greeting.
   *
   * Examples:
   *   GET /hello?lng=es          → "¡Hola, Mundo!"
   *   GET /hello?lng=fr&name=Alice → "Bonjour, Alice!"
   *   GET /hello  (Accept-Language: en)  → "Hello, World!"
   */
  app.get('/hello', (req, res) => {
    const name = req.query.name || 'World';
    res.json({
      language: req.language,
      message: req.t('greeting', { name }),
      welcome: req.t('welcome'),
    });
  });

  /**
   * GET /translations/:locale/:namespace
   * Returns the raw translation map stored in MongoDB.
   */
  app.get('/translations/:locale/:namespace', async (req, res) => {
    const doc = await Translation.findOne({
      locale: req.params.locale,
      namespace: req.params.namespace,
    });
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json({ locale: doc.locale, namespace: doc.namespace, translations: Object.fromEntries(doc.translations) });
  });

  /**
   * PUT /translations/:locale/:namespace
   * Merges new key-value pairs into the translation document,
   * then reloads the i18next cache so changes take effect immediately.
   *
   * Body: { "welcome": "¡Bienvenido al sistema!" }
   */
  app.put('/translations/:locale/:namespace', async (req, res) => {
    const { locale, namespace } = req.params;
    const updates = req.body;

    if (typeof updates !== 'object' || Array.isArray(updates)) {
      return res.status(400).json({ error: 'Body must be a JSON object of key-value pairs' });
    }

    // Build $set payload for the Map field
    const setPayload = {};
    for (const [key, value] of Object.entries(updates)) {
      setPayload[`translations.${key}`] = value;
    }

    const doc = await Translation.findOneAndUpdate(
      { locale, namespace },
      { $set: setPayload },
      { upsert: true, new: true }
    );

    // Tell i18next to reload this locale+namespace from MongoDB
    await i18n.reloadResources([locale], [namespace]);

    res.json({
      message: 'Translations updated and cache reloaded',
      locale: doc.locale,
      namespace: doc.namespace,
      translations: Object.fromEntries(doc.translations),
    });
  });

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Try: curl "http://localhost:3000/hello?lng=es"');
  });
}

start().catch((err) => {
  console.error('Startup error:', err);
  process.exit(1);
});
