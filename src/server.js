const express = require('express');
const { i18n, reconfigure }    = require('./i18n');
const { connect, updateTranslations, translationsCollection } = require('./db');

const PORT = process.env.PORT || 3000;

async function start() {
  // 1. Connect to MongoDB and configure i18n from the stored catalog
  await connect();
  await reconfigure();

  // 2. Create Express app
  const app = express();
  app.use(express.json());

  // 3. Mount i18n middleware – adds res.__() and sets the locale per request
  app.use(i18n.init);

  // 4. Locale detection middleware
  //    Priority: ?lng= query string → Accept-Language header → default
  app.use((req, res, next) => {
    const lang = req.query.lng || req.acceptsLanguages(i18n.getLocales());
    if (lang) res.setLocale(lang);
    next();
  });

  // ─── Demo routes ────────────────────────────────────────────────────────────

  /**
   * GET /hello[?lng=es][&name=Alice]
   *
   * Uses res.__() provided by i18n middleware.
   * '%s' is the sprintf placeholder for positional arguments.
   */
  app.get('/hello', (req, res) => {
    const name = req.query.name || 'World';
    res.json({
      language: res.getLocale(),
      // sprintf style: greeting = 'Hello, %s!'
      message:  res.__('greeting', name),
      welcome:  res.__('welcome'),
    });
  });

  /**
   * GET /translations/:locale
   * Returns the raw translation object stored in MongoDB.
   */
  app.get('/translations/:locale', async (req, res) => {
    const coll = await translationsCollection();
    const doc  = await coll.findOne({ locale: req.params.locale });
    if (!doc) return res.status(404).json({ error: 'Locale not found' });
    res.json({ locale: doc.locale, translations: doc.translations });
  });

  /**
   * PUT /translations/:locale
   * Merges new key-value pairs, then reloads the in-memory i18n catalog.
   *
   * Body: { "welcome": "¡Bienvenido al sistema!" }
   */
  app.put('/translations/:locale', async (req, res) => {
    const updates = req.body;

    if (typeof updates !== 'object' || Array.isArray(updates)) {
      return res.status(400).json({ error: 'Body must be a JSON object of key-value pairs' });
    }

    const doc = await updateTranslations(req.params.locale, updates);

    // Reload the full catalog from MongoDB and re-configure i18n in memory
    await reconfigure();

    res.json({
      message:      'Translations updated and i18n reconfigured',
      locale:       doc.locale,
      translations: doc.translations,
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
