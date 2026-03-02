# 🤖 Chatbot Backend — Arquitectura Modular

Backend profesional de un chatbot conversacional desarrollado con **Node.js 16.13.1** y **Express.js**. Estructurado en capas modulares para facilitar el mantenimiento, escalabilidad y testing.

---

## 📋 Tabla de Contenidos

- [Características](#-características)
- [Arquitectura del Proyecto](#️-arquitectura-del-proyecto)
- [Requisitos](#-requisitos)
- [Instalación](#️-instalación)
- [Configuración](#-configuración)
- [API Endpoints](#-api-endpoints)
- [Módulos y Servicios](#-módulos-y-servicios)
- [Seguridad](#-seguridad)
- [Logging y Monitoreo](#-logging-y-monitoreo)
- [Testing](#-testing)
- [Despliegue](#-despliegue)

---

## ✨ Características

| Categoría        | Detalle                                                               |
| ---------------- | --------------------------------------------------------------------- |
| 🏗️ Arquitectura  | Modular por capas (Controllers → Services → Data)                     |
| 🔒 Seguridad     | Helmet.js, CORS, Rate Limiting, validación de inputs                  |
| 🧠 NLP           | Algoritmo de Levenshtein, similitud semántica, extracción de keywords |
| 💬 Sesiones      | Historial de conversaciones, limpieza automática, estadísticas        |
| 🗄️ Base de Datos | Archivo JSON con backups automáticos y operaciones CRUD               |
| 📋 Logging       | Logs estructurados con niveles configurables                          |
| 🚀 Rendimiento   | Caching en memoria, paginación, operaciones async                     |
| 🧪 Testing       | Jest + Supertest                                                      |

---

## 🏗️ Arquitectura del Proyecto

```
backend/
├── server.js                     # Punto de entrada principal
├── package.json                  # Dependencias y scripts
│
├── src/
│   ├── config/
│   │   └── config.js             # Configuración centralizada del sistema
│   │
│   ├── controllers/              # Capa de controladores (manejo de HTTP)
│   │   ├── chatController.js     # Procesamiento de mensajes del chatbot
│   │   ├── questionController.js # CRUD de preguntas de la base de conocimiento
│   │   └── healthController.js   # Estado del servidor y métricas
│   │
│   ├── services/                 # Capa de servicios (lógica de negocio)
│   │   ├── chatService.js        # Motor de búsqueda y generación de respuestas
│   │   ├── questionService.js    # Gestión de preguntas y categorías
│   │   ├── databaseService.js    # Persistencia JSON con backups automáticos
│   │   ├── nlpService.js         # Procesamiento de lenguaje natural
│   │   └── sessionService.js     # Manejo de sesiones de usuario
│   │
│   ├── routes/                   # Definición de rutas
│   │   ├── index.js              # Router principal
│   │   ├── chatRoutes.js         # Rutas de chat
│   │   ├── questionRoutes.js     # Rutas de gestión de preguntas
│   │   └── healthRoutes.js       # Rutas de health check
│   │
│   ├── middleware/               # Middlewares reutilizables
│   │   ├── index.js              # Setup centralizado de middlewares
│   │   ├── errorHandler.js       # Manejador global de errores
│   │   └── validation.js         # Validación y sanitización de inputs
│   │
│   └── utils/                    # Utilidades compartidas
│       ├── logger.js             # Sistema de logging estructurado
│       └── helpers.js            # Funciones auxiliares
│
├── data/                         # Base de datos JSON
│   ├── knowledge-base.json       # Preguntas y respuestas del chatbot
│   └── backups/                  # Backups automáticos de la BD
│
└── logs/                         # Archivos de log
    └── app.log                   # Log general de la aplicación
```

---

## 📦 Requisitos

- **Node.js** >= 16.13.1
- **npm** >= 8.x

---

## 🛠️ Instalación

```bash
# 1. Clonar el repositorio
git clone <url-del-repositorio>
cd backend

# 2. Instalar dependencias
npm install

# 3. Iniciar en modo desarrollo
npm run dev
```

El servidor se iniciará en `http://localhost:3000`

---

## ⚙️ Configuración

El archivo `src/config/config.js` centraliza toda la configuración. Se puede personalizar mediante **variables de entorno**:

| Variable         | Default                 | Descripción                                         |
| ---------------- | ----------------------- | --------------------------------------------------- |
| `PORT`           | `3000`                  | Puerto del servidor                                 |
| `NODE_ENV`       | `development`           | Entorno de ejecución                                |
| `FRONTEND_URL`   | `http://localhost:4200` | URL permitida por CORS                              |
| `RATE_LIMIT_MAX` | `100`                   | Máximo de requests por ventana (15 min)             |
| `LOG_LEVEL`      | `info`                  | Nivel de logging (`error`, `warn`, `info`, `debug`) |

### Parámetros internos del Chatbot

| Parámetro             | Valor    | Descripción                               |
| --------------------- | -------- | ----------------------------------------- |
| `confidenceThreshold` | `0.6`    | Umbral mínimo de confianza para responder |
| `maxMessageLength`    | `1000`   | Longitud máxima de un mensaje             |
| `sessionTimeout`      | `30 min` | Tiempo de expiración de una sesión        |

---

## 📡 API Endpoints

Base URL: `http://localhost:3000/api`

### 🏥 Health Check

| Método | Endpoint           | Descripción                                                   |
| ------ | ------------------ | ------------------------------------------------------------- |
| `GET`  | `/health`          | Estado básico del servidor                                    |
| `GET`  | `/health/detailed` | Estado detallado con métricas (DB, sesiones, memoria, uptime) |

**Respuesta `/health`:**

```json
{
  "success": true,
  "status": "ok",
  "timestamp": "2026-03-02T10:00:00.000Z"
}
```

---

### 💬 Chat

| Método   | Endpoint                     | Descripción                                    |
| -------- | ---------------------------- | ---------------------------------------------- |
| `POST`   | `/chat`                      | Enviar mensaje y recibir respuesta del chatbot |
| `GET`    | `/chat/sessions/:id/history` | Obtener historial de una sesión                |
| `DELETE` | `/chat/sessions/:id`         | Eliminar sesión y su historial                 |

**Body `POST /chat`:**

```json
{
  "message": "¿Cuáles son los horarios de atención?",
  "sessionId": "opcional-uuid-sesion"
}
```

**Respuesta:**

```json
{
  "success": true,
  "response": "Nuestro horario de atención es de lunes a viernes de 9:00 a 18:00.",
  "sessionId": "uuid-de-sesion",
  "confidence": 0.87,
  "timestamp": "2026-03-02T10:00:00.000Z"
}
```

---

### ❓ Gestión de Preguntas

| Método   | Endpoint                | Descripción                                     |
| -------- | ----------------------- | ----------------------------------------------- |
| `GET`    | `/questions`            | Listar preguntas (soporta filtros y paginación) |
| `GET`    | `/questions/categories` | Obtener todas las categorías disponibles        |
| `GET`    | `/questions/:id`        | Obtener una pregunta específica por ID          |
| `POST`   | `/questions`            | Crear nueva pregunta/respuesta                  |
| `PUT`    | `/questions/:id`        | Actualizar pregunta existente                   |
| `DELETE` | `/questions/:id`        | Eliminar pregunta                               |

**Query params `GET /questions`:**

- `category` — Filtrar por categoría
- `search` — Búsqueda por texto
- `page` — Número de página (default: 1)
- `limit` — Resultados por página (default: 10)

**Body `POST /questions`:**

```json
{
  "question": "¿Cómo puedo contactarlos?",
  "answer": "Puedes escribirnos a contacto@empresa.com",
  "category": "contacto",
  "keywords": ["contacto", "email", "comunicación"]
}
```

---

## 🧩 Módulos y Servicios

### `chatService.js`

Motor principal del chatbot:

- Búsqueda de preguntas similares usando NLP
- Generación de respuestas con nivel de confianza
- Integración con sesiones e historial

### `nlpService.js`

Procesamiento de lenguaje natural:

- **Distancia de Levenshtein** para tolerancia a errores ortográficos
- **Extracción de palabras clave**
- **Similitud semántica** básica
- **Normalización de texto** (lowercase, stopwords, acentos)

### `databaseService.js`

Persistencia de datos:

- Lectura/escritura de `knowledge-base.json`
- **Sistema de backups automático** (retención de los últimos 10)
- Estadísticas de la base de datos
- Inicialización y validación de datos

### `sessionService.js`

Gestión de sesiones:

- Historial de conversaciones por sesión
- Limpieza automática de sesiones expiradas (timeout: 30 min)
- Estadísticas de uso

### `questionService.js`

Gestión del conocimiento:

- CRUD completo de preguntas
- Filtros por categoría y búsqueda de texto
- Paginación de resultados

---

## 🔒 Seguridad

| Middleware           | Paquete              | Propósito                                     |
| -------------------- | -------------------- | --------------------------------------------- |
| Headers HTTP seguros | `helmet`             | Previene ataques XSS, clickjacking, etc.      |
| Control de acceso    | `cors`               | Restringe origins permitidos                  |
| Rate limiting        | `express-rate-limit` | Máx. 100 req/15 min por IP                    |
| Validación de body   | `express.json`       | Rechaza JSON malformado                       |
| Request ID           | `uuid`               | Trazabilidad de cada request (`X-Request-ID`) |
| Error handler        | custom               | No expone stack traces en producción          |

---

## 📊 Logging y Monitoreo

### Niveles de Log

| Nivel   | Descripción                           |
| ------- | ------------------------------------- |
| `ERROR` | Errores críticos del sistema          |
| `WARN`  | Advertencias y situaciones anómalas   |
| `INFO`  | Operaciones normales del servidor     |
| `DEBUG` | Información detallada para desarrollo |

### Archivo de Log

Los logs se guardan en `logs/app.log`. En producción se usa formato JSON estructurado para facilitar el análisis.

### Endpoint de Métricas

`GET /api/health/detailed` devuelve:

- Estado de la base de datos
- Estadísticas de sesiones activas
- Uso de memoria (heap, RSS)
- Uptime del servidor
- Tiempo de respuesta

---

## 🧪 Testing

```bash
# Ejecutar todos los tests
npm test

# Modo watch (re-ejecuta al guardar)
npm run test:watch

# Linting del código
npm run lint

# Autofix de problemas de linting
npm run lint:fix
```

Herramientas utilizadas:

- **Jest** — Framework de testing
- **Supertest** — Testing de endpoints HTTP
- **ESLint** — Análisis estático de código

---

## 🚀 Despliegue

### Desarrollo

```bash
npm run dev
# Usa nodemon para recarga automática al guardar cambios
```

### Producción

```bash
NODE_ENV=production npm start
```

### Docker (opcional)

```dockerfile
FROM node:16.13.1-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

```bash
# Construir imagen
docker build -t chatbot-backend .

# Ejecutar contenedor
docker run -p 3000:3000 -e NODE_ENV=production chatbot-backend
```

---

## 📦 Dependencias

### Producción

| Paquete              | Versión | Uso                      |
| -------------------- | ------- | ------------------------ |
| `express`            | ^4.18.2 | Framework web            |
| `cors`               | ^2.8.5  | Control de CORS          |
| `helmet`             | ^6.1.5  | Headers de seguridad     |
| `express-rate-limit` | ^6.7.0  | Rate limiting            |
| `uuid`               | ^8.3.2  | Generación de IDs únicos |

### Desarrollo

| Paquete     | Versión | Uso                       |
| ----------- | ------- | ------------------------- |
| `nodemon`   | ^2.0.22 | Recarga automática en dev |
| `jest`      | ^28.1.3 | Framework de testing      |
| `eslint`    | ^8.45.0 | Linter de código          |
| `supertest` | ^6.3.3  | Testing HTTP              |

---

## 📝 Licencia

MIT © Developer
