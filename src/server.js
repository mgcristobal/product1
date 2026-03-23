const express = require('express');
const { connectDB } = require('./db');
const { initI18n, i18nMiddleware } = require('./i18n');
const Translation = require('./models/Translation');

const app = express();
app.use(express.json());

async function start() {
  // 1. Connect to MongoDB first — the i18n backend needs it
  await connectDB();

  // 2. Initialise i18next (loads translations from MongoDB)
  await initI18n();

  // 3. Mount the i18n middleware so every route gets req.t()
  app.use(i18nMiddleware());

  // ──────────────────────────────────────────────
  // Demo routes
  // ──────────────────────────────────────────────

  /**
   * GET /hello
   * Demonstrates basic translation with req.t().
   *
   * Try:
   *   curl "http://localhost:3000/hello?lng=es"
   *   curl "http://localhost:3000/hello?lng=fr"
   *   curl "http://localhost:3000/hello"          (defaults to 'en')
   */
  app.get('/hello', (req, res) => {
    res.json({
      language: req.language,
      message: req.t('welcome'),
      greeting: req.t('greeting', { name: 'World' }),
    });
  });

  /**
   * GET /error-demo
   * Shows how to use a specific namespace.
   *
   * Try:
   *   curl "http://localhost:3000/error-demo?lng=es"
   */
  app.get('/error-demo', (req, res) => {
    res.status(404).json({
      language: req.language,
      // Use the 'errors' namespace explicitly
      error: req.t('notFound', { ns: 'errors' }),
    });
  });

  // ──────────────────────────────────────────────
  // CRUD routes for managing translations at runtime
  // ──────────────────────────────────────────────

  /**
   * GET /translations
   * List all locale+namespace documents.
   */
  app.get('/translations', async (_req, res) => {
    const docs = await Translation.find({}, { translations: 1, locale: 1, namespace: 1 });
    res.json(docs);
  });

  /**
   * PUT /translations/:locale/:namespace
   * Upsert a set of translations for a locale and namespace.
   * Reloads i18next so changes take effect immediately.
   *
   * Body: { "welcome": "Hola", "greeting": "Hola, {{name}}!" }
   *
   * Try:
   *   curl -X PUT http://localhost:3000/translations/es/common \
   *        -H "Content-Type: application/json" \
   *        -d '{"welcome":"¡Bienvenido actualizado!"}'
   */
  app.put('/translations/:locale/:namespace', async (req, res) => {
    const { locale, namespace } = req.params;
    const incoming = req.body;

    // Build $set payload for the Map field
    const setPayload = {};
    for (const [key, value] of Object.entries(incoming)) {
      setPayload[`translations.${key}`] = value;
    }

    await Translation.findOneAndUpdate(
      { locale, namespace },
      { $set: setPayload },
      { upsert: true, new: true }
    );

    // Tell i18next to reload the resource bundle from MongoDB
    const { default: i18next } = await import('i18next');
    i18next.reloadResources([locale], [namespace]);

    res.json({ ok: true, locale, namespace, updated: Object.keys(incoming) });
  });

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
