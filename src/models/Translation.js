const mongoose = require('mongoose');

/**
 * Each document stores all translation keys for one locale + namespace pair.
 *
 * Example document:
 * {
 *   locale:    "es",
 *   namespace: "common",
 *   translations: {
 *     "welcome":      "Bienvenido",
 *     "greeting":     "¡Hola, {{name}}!",
 *     "nav.home":     "Inicio"
 *   }
 * }
 */
const translationSchema = new mongoose.Schema(
  {
    locale: { type: String, required: true },
    namespace: { type: String, required: true, default: 'translation' },
    translations: { type: Map, of: String, default: {} },
  },
  { timestamps: true }
);

// Compound unique index so each locale+namespace pair has exactly one document
translationSchema.index({ locale: 1, namespace: 1 }, { unique: true });

module.exports = mongoose.model('Translation', translationSchema);
