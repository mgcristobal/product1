/**
 * seed.js – Inserts initial translations (en / es / fr) into MongoDB.
 *
 * Uses the native MongoDB driver directly (no Mongoose).
 *
 * Usage:
 *   node src/seed.js
 *   MONGO_URI=mongodb://user:pass@host/db node src/seed.js
 */

const { connect, translationsCollection } = require('./db');

// Note: 'i18n' package uses '%s' for positional interpolation.
// Named placeholders '%(name)s' are also supported.
const seeds = [
  {
    locale: 'en',
    translations: {
      welcome:         'Welcome',
      greeting:        'Hello, %s!',
      farewell:        'Goodbye, %s!',
      'nav.home':      'Home',
      'nav.about':     'About',
      'nav.contact':   'Contact',
      'errors.notFound': 'Page not found',
      'errors.server':   'Internal server error',
    },
  },
  {
    locale: 'es',
    translations: {
      welcome:         'Bienvenido',
      greeting:        '¡Hola, %s!',
      farewell:        '¡Adiós, %s!',
      'nav.home':      'Inicio',
      'nav.about':     'Acerca de',
      'nav.contact':   'Contacto',
      'errors.notFound': 'Página no encontrada',
      'errors.server':   'Error interno del servidor',
    },
  },
  {
    locale: 'fr',
    translations: {
      welcome:         'Bienvenue',
      greeting:        'Bonjour, %s !',
      farewell:        'Au revoir, %s !',
      'nav.home':      'Accueil',
      'nav.about':     'À propos',
      'nav.contact':   'Contact',
      'errors.notFound': 'Page introuvable',
      'errors.server':   'Erreur interne du serveur',
    },
  },
];

async function seed() {
  await connect();
  const coll = await translationsCollection();

  // Ensure unique index on locale
  await coll.createIndex({ locale: 1 }, { unique: true });

  for (const { locale, translations } of seeds) {
    const result = await coll.findOneAndUpdate(
      { locale },
      { $set: { translations }, $setOnInsert: { locale } },
      { upsert: true, returnDocument: 'after' }
    );
    const keyCount = Object.keys(result.translations).length;
    console.log(`Seeded locale "${locale}" — ${keyCount} keys`);
  }

  console.log('Done.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
