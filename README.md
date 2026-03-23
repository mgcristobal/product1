# i18n con Node.js y MongoDB

Demo completo de cómo usar **i18next** en Node.js almacenando los ficheros de traducción *locale* en **MongoDB** en lugar de ficheros JSON en disco.

## Arquitectura

```
HTTP Request
     │
     ▼
i18next-http-middleware   ← detecta idioma (?lng=es, Accept-Language)
     │
     ▼
MongoDBBackend.read()     ← busca en MongoDB la colección Translation
     │
     ▼
req.t('clave')            ← devuelve la cadena traducida en la ruta
```

## Estructura del proyecto

```
src/
├── models/
│   └── Translation.js     # Schema Mongoose: un documento por locale + namespace
├── i18n/
│   ├── MongoDBBackend.js  # Backend personalizado para i18next
│   └── index.js           # Inicialización de i18next con detección de idioma
├── server.js              # Servidor Express de demostración
└── seed.js                # Script para cargar traducciones iniciales (en/es/fr)
```

## Estructura del documento en MongoDB

```json
{
  "locale": "es",
  "namespace": "common",
  "translations": {
    "welcome": "Bienvenido",
    "greeting": "¡Hola, {{name}}!",
    "nav.home": "Inicio"
  },
  "createdAt": "...",
  "updatedAt": "..."
}
```

Un único documento por par `(locale, namespace)`. El índice compuesto `{ locale, namespace }` garantiza la unicidad.

## Instalación y uso

```bash
# 1. Instalar dependencias
npm install

# 2. Cargar traducciones iniciales en MongoDB
node src/seed.js

# 3. Arrancar el servidor
npm start
```

### Probar con distintos idiomas

```bash
# Español (query string)
curl "http://localhost:3000/hello?lng=es"

# Francés con nombre personalizado
curl "http://localhost:3000/hello?lng=fr&name=Alice"

# Inglés vía cabecera Accept-Language
curl -H "Accept-Language: en" "http://localhost:3000/hello"
```

### Consultar traducciones almacenadas

```bash
curl http://localhost:3000/translations/es/common
```

### Actualizar una traducción en caliente (sin reiniciar el servidor)

```bash
curl -X PUT http://localhost:3000/translations/es/common \
     -H "Content-Type: application/json" \
     -d '{"welcome":"¡Bienvenido al sistema!"}'
```

El endpoint llama a `i18next.reloadResources()` tras la actualización, por lo que el cambio surte efecto en la siguiente petición sin necesidad de reiniciar.

## Puntos clave del MongoDBBackend

| Método | Cuándo lo llama i18next | Qué hace |
|--------|------------------------|----------|
| `read(language, namespace, callback)` | Al arrancar y tras `reloadResources()` | `findOne({ locale, namespace })` y devuelve el Map como objeto plano |
| `create(languages, namespace, key, fallbackValue)` | Cuando `saveMissing: true` y la clave no existe | `findOneAndUpdate` con `$set` para guardar la clave faltante |

## Variables de entorno

| Variable | Valor por defecto | Descripción |
|----------|-------------------|-------------|
| `MONGO_URI` | `mongodb://localhost:27017/i18n_demo` | URI de conexión a MongoDB |
| `PORT` | `3000` | Puerto del servidor HTTP |

## Ventajas frente a ficheros JSON en disco

- Las traducciones se pueden editar sin redesplegar la aplicación.
- Un panel de administración puede modificar los textos directamente vía la API REST.
- Las traducciones están centralizadas si tienes múltiples instancias del servidor (escalado horizontal).
- El campo `updatedAt` de Mongoose permite saber cuándo se modificó cada locale por última vez.
- Con `saveMissing: true`, las claves que faltan se guardan automáticamente para que los traductores las rellenen.
