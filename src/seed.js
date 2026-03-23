/**
 * seed.js – Populates MongoDB with initial translations for en / es / fr.
 *
 * Usage:
 *   node src/seed.js
 *   MONGO_URI=mongodb://user:pass@host/db node src/seed.js
 */

const mongoose = require('mongoose');
const Translation = require('./models/Translation');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/i18n_demo';

const seeds = [
  {
    locale: 'en',
    namespace: 'common',
    translations: {
      welcome: 'Welcome',
      greeting: 'Hello, {{name}}!',
      farewell: 'Goodbye, {{name}}!',
      'nav.home': 'Home',
      'nav.about': 'About',
      'nav.contact': 'Contact',
      'errors.notFound': 'Page not found',
      'errors.server': 'Internal server error',
    },
  },
  {
    locale: 'es',
    namespace: 'common',
    translations: {
      welcome: 'Bienvenido',
      greeting: '¡Hola, {{name}}!',
      farewell: '¡Adiós, {{name}}!',
      'nav.home': 'Inicio',
      'nav.about': 'Acerca de',
      'nav.contact': 'Contacto',
      'errors.notFound': 'Página no encontrada',
      'errors.server': 'Error interno del servidor',
    },
  },
  {
    locale: 'fr',
    namespace: 'common',
    translations: {
      welcome: 'Bienvenue',
      greeting: 'Bonjour, {{name}} !',
      farewell: 'Au revoir, {{name}} !',
      'nav.home': 'Accueil',
      'nav.about': 'À propos',
      'nav.contact': 'Contact',
      'errors.notFound': 'Page introuvable',
      'errors.server': 'Erreur interne du serveur',
    },
  },
];

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB:', MONGO_URI);

  for (const { locale, namespace, translations } of seeds) {
    const doc = await Translation.findOneAndUpdate(
      { locale, namespace },
      // Replace the entire translations map
      { $set: { translations } },
      { upsert: true, new: true }
    );
    console.log(`Seeded ${locale}/${namespace} — ${Object.keys(translations).length} keys (id: ${doc._id})`);
  }

  await mongoose.disconnect();
  console.log('Done.');
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
