# i18n con Node.js y MongoDB (driver nativo)

Demo de cómo usar **`require('i18n')`** en Node.js almacenando los ficheros de
traducción *locale* en **MongoDB** usando el **driver nativo** (`mongodb`)
sin Mongoose.

## Diferencias clave respecto al enfoque i18next

| Aspecto | `i18next` + MongoDBBackend | `i18n` + driver nativo |
|---|---|---|
| Plugin de backend | Clase personalizada `read()` / `create()` | No existe; se carga con `staticCatalog` |
| Hot reload | `i18next.reloadResources()` | `i18n.configure()` con el catálogo actualizado |
| Interpolación | `{{name}}` | `%s` (sprintf) o `%(name)s` |
| Middleware Express | `i18next-http-middleware` | `i18n.init` incluido en el paquete |
| Detección de idioma | `LanguageDetector` | Middleware manual (`?lng=` / `Accept-Language`) |

## Arquitectura

```
HTTP Request
     │
     ▼
Middleware de detección   ← ?lng=es  o  Accept-Language: es
     │  res.setLocale('es')
     ▼
i18n.init (middleware)    ← añade res.__() a la respuesta
     │
     ▼
res.__('greeting', 'Alice')   ← busca en staticCatalog['es']
```

### Cómo se carga el catálogo desde MongoDB

```
start()
  └─ connect()          ← MongoClient.connect()
  └─ reconfigure()
       └─ loadCatalog() ← coll.find({}).toArray()
            │             [ { locale:'es', translations:{...} }, ... ]
            ▼
       i18n.configure({ staticCatalog: { es:{...}, en:{...}, fr:{...} } })
```

## Estructura del proyecto

```
src/
├── db.js      # Conexión y helpers con el driver nativo de MongoDB
├── i18n.js    # Carga el catálogo de MongoDB y configura require('i18n')
├── server.js  # Servidor Express
└── seed.js    # Carga traducciones iniciales en MongoDB
```

## Estructura del documento en MongoDB

```json
{
  "_id": "...",
  "locale": "es",
  "translations": {
    "welcome":       "Bienvenido",
    "greeting":      "¡Hola, %s!",
    "nav.home":      "Inicio",
    "errors.notFound": "Página no encontrada"
  }
}
```

Un documento por locale. Sin namespaces (el paquete `i18n` no los usa).

## Instalación y uso

```bash
npm install
node src/seed.js   # poblar MongoDB
npm start          # arrancar en :3000
```

### Probar con distintos idiomas

```bash
curl "http://localhost:3000/hello?lng=es"
curl "http://localhost:3000/hello?lng=fr&name=Alice"
curl -H "Accept-Language: en" "http://localhost:3000/hello"
```

### Consultar traducciones

```bash
curl http://localhost:3000/translations/es
```

### Actualizar una traducción en caliente

```bash
curl -X PUT http://localhost:3000/translations/es \
     -H "Content-Type: application/json" \
     -d '{"welcome":"¡Bienvenido al sistema!"}'
```

Internamente: `db.updateTranslations()` → `reconfigure()` → `i18n.configure({ staticCatalog: ... })`.
El cambio surte efecto en la siguiente petición sin reiniciar el servidor.

## Variables de entorno

| Variable | Valor por defecto | Descripción |
|---|---|---|
| `MONGO_URI` | `mongodb://localhost:27017` | URI de conexión |
| `MONGO_DB` | `i18n_demo` | Nombre de la base de datos |
| `PORT` | `3000` | Puerto HTTP |
