/**
 * seed.js — Populates MongoDB with initial translation data.
 *
 * Run once before starting the server:
 *   node src/seed.js
 *
 * Or with a custom MongoDB URI:
 *   MONGODB_URI=mongodb://user:pass@host/db node src/seed.js
 */

const { connectDB } = require('./db');
const Translation = require('./models/Translation');

const SEED_DATA = [
  // ── English ──────────────────────────────────────
  {
    locale: 'en',
    namespace: 'common',
    translations: {
      welcome: 'Welcome',
      greeting: 'Hello, {{name}}!',
      'nav.home': 'Home',
      'nav.about': 'About',
    },
  },
  {
    locale: 'en',
    namespace: 'errors',
    translations: {
      notFound: 'Page not found',
      serverError: 'Internal server error',
      unauthorized: 'You are not authorised to view this page',
    },
  },

  // ── Spanish ───────────────────────────────────────
  {
    locale: 'es',
    namespace: 'common',
    translations: {
      welcome: 'Bienvenido',
      greeting: '¡Hola, {{name}}!',
      'nav.home': 'Inicio',
      'nav.about': 'Sobre nosotros',
    },
  },
  {
    locale: 'es',
    namespace: 'errors',
    translations: {
      notFound: 'Página no encontrada',
      serverError: 'Error interno del servidor',
      unauthorized: 'No tienes permiso para ver esta página',
    },
  },

  // ── French ────────────────────────────────────────
  {
    locale: 'fr',
    namespace: 'common',
    translations: {
      welcome: 'Bienvenue',
      greeting: 'Bonjour, {{name}} !',
      'nav.home': 'Accueil',
      'nav.about': 'À propos',
    },
  },
  {
    locale: 'fr',
    namespace: 'errors',
    translations: {
      notFound: 'Page introuvable',
      serverError: 'Erreur interne du serveur',
      unauthorized: "Vous n'êtes pas autorisé à voir cette page",
    },
  },
];

async function seed() {
  await connectDB();

  for (const entry of SEED_DATA) {
    await Translation.findOneAndUpdate(
      { locale: entry.locale, namespace: entry.namespace },
      {
        $set: {
          // Convert plain object to the Map-compatible format mongoose expects
          translations: new Map(Object.entries(entry.translations)),
        },
      },
      { upsert: true, new: true }
    );
    console.log(`Seeded [${entry.locale}] ${entry.namespace}`);
  }

  console.log('Seed complete.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
