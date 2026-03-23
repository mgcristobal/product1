const mongoose = require('mongoose');

/**
 * Schema for storing i18n translations in MongoDB.
 *
 * Each document represents one namespace for one language (locale).
 * The `translations` field is a flat key-value map, where keys can use
 * dot notation (e.g. "welcome.title") and values are the translated strings.
 *
 * Example document:
 * {
 *   locale: "es",
 *   namespace: "common",
 *   translations: {
 *     "welcome": "Bienvenido",
 *     "greeting": "Hola, {{name}}!",
 *     "errors.notFound": "No encontrado"
 *   }
 * }
 */
const translationSchema = new mongoose.Schema(
  {
    locale: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    namespace: {
      type: String,
      required: true,
      trim: true,
      default: 'translation',
    },
    translations: {
      type: Map,
      of: String,
      required: true,
    },
  },
  { timestamps: true }
);

// Compound index: one document per locale+namespace combination
translationSchema.index({ locale: 1, namespace: 1 }, { unique: true });

module.exports = mongoose.model('Translation', translationSchema);
