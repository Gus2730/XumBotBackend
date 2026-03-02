/**
 * @file Servicio de Gestión de Base de Datos.
 * @description Maneja la carga, guardado, inicialización y respaldo de la base de conocimiento
 * almacenada en un archivo JSON local.
 */

const fs = require("fs").promises
const path = require("path")
const config = require("../config/config")
const logger = require("../utils/logger")
const { v4: uuidv4 } = require("uuid")
const nlpService = require("./nlpService") // Importar nlpService para normalización de keywords

class DatabaseService {
  /**
   * @private
   * @description Ruta al archivo de datos de la base de conocimiento.
   */
  #dataPath = config.DATABASE.path
  /**
   * @private
   * @description Ruta al directorio donde se guardarán los backups.
   */
  #backupPath = config.DATABASE.backupPath

  /**
   * @constructor
   * @description Inicializa las rutas de la base de datos y backups.
   */
  constructor() {
    // Estas rutas ya están inicializadas en las propiedades de la clase al usar #
  }

  /**
   * Carga los datos de la base de conocimiento desde el archivo JSON.
   * Si el archivo no existe, devuelve una estructura de datos inicial vacía.
   *
   * @returns {Promise<object>} Los datos de la base de conocimiento.
   * @throws {Error} Si ocurre un error al leer o parsear el archivo (excepto ENOENT).
   */
  async loadData() {
    try {
      const data = await fs.readFile(this.#dataPath, "utf8")
      return JSON.parse(data)
    } catch (error) {
      if (error.code === "ENOENT") {
        logger.warn(`Database file not found at ${this.#dataPath}. Returning empty initial structure.`)
        return {
          questions: [],
          metadata: { version: "1.0.0", createdAt: new Date().toISOString(), lastUpdated: new Date().toISOString() },
        }
      }
      logger.error(`Error loading database from ${this.#dataPath}: ${error.message}`, { errorStack: error.stack })
      throw error
    }
  }

  /**
   * Guarda los datos de la base de conocimiento en el archivo JSON.
   * Antes de guardar, crea un backup automático de los datos existentes.
   * Asegura que el directorio de datos exista.
   *
   * @param {object} data - Los datos de la base de conocimiento a guardar.
   * @returns {Promise<boolean>} `true` si los datos se guardaron exitosamente.
   * @throws {Error} Si ocurre un error al escribir el archivo.
   */
  async saveData(data) {
    try {
      // Crear backup antes de guardar
      await this.#createBackup()

      // Asegurar que el directorio existe
      await fs.mkdir(path.dirname(this.#dataPath), { recursive: true })

      // Actualizar metadata de última actualización
      data.metadata = data.metadata || { version: "1.0.0" }
      data.metadata.lastUpdated = new Date().toISOString()

      // Guardar datos
      await fs.writeFile(this.#dataPath, JSON.stringify(data, null, 2))

      logger.info(`Database saved successfully to ${this.#dataPath}.`)
      return true
    } catch (error) {
      logger.error(`Error saving database to ${this.#dataPath}: ${error.message}`, { errorStack: error.stack })
      throw error
    }
  }

  /**
   * Crea un backup de la base de conocimiento actual.
   * Los backups se guardan con un timestamp en el nombre del archivo.
   * Limpia los backups antiguos, manteniendo solo un número limitado.
   *
   * @private
   * @returns {Promise<void>}
   */
  async #createBackup() {
    try {
      const data = await this.loadData() // Cargar la última versión para el backup

      // Crear directorio de backups
      await fs.mkdir(this.#backupPath, { recursive: true })

      // Nombre del backup con timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-") // Formato YYYY-MM-DDTHH-MM-SS.sssZ
      const backupFile = path.join(this.#backupPath, `backup-${timestamp}.json`)

      await fs.writeFile(backupFile, JSON.stringify(data, null, 2))

      // Limpiar backups antiguos (mantener solo los últimos 10)
      await this.#cleanOldBackups()

      logger.info(`Backup created: ${backupFile}`)
    } catch (error) {
      // Registrar la advertencia pero no relanzar, el backup es una funcionalidad secundaria.
      logger.warn(`Error creating backup: ${error.message}`, { errorStack: error.stack })
    }
  }

  /**
   * Limpia los archivos de backup antiguos, manteniendo solo un número predefinido (ej. los últimos 10).
   * Los archivos se ordenan por fecha de modificación.
   *
   * @private
   * @returns {Promise<void>}
   */
  async #cleanOldBackups() {
    try {
      const files = await fs.readdir(this.#backupPath)
      const backupFiles = files
        .filter((file) => file.startsWith("backup-") && file.endsWith(".json"))
        .map((file) => ({
          name: file,
          path: path.join(this.#backupPath, file),
          // Obtener la fecha de modificación de forma asíncrona
          time: fs.stat(path.join(this.#backupPath, file)).then((stats) => stats.mtime),
        }))

      // Esperar a que todas las promesas de tiempo se resuelvan
      for (const file of backupFiles) {
        file.time = await file.time
      }

      // Ordenar por fecha de modificación (más reciente primero)
      backupFiles.sort((a, b) => b.time.getTime() - a.time.getTime())

      // Eliminar backups antiguos si hay más de 10
      const MAX_BACKUPS = 10
      if (backupFiles.length > MAX_BACKUPS) {
        const filesToDelete = backupFiles.slice(MAX_BACKUPS)
        for (const file of filesToDelete) {
          await fs.unlink(file.path)
          logger.info(`Old backup deleted: ${file.name}`)
        }
      }
    } catch (error) {
      logger.warn(`Error cleaning old backups: ${error.message}`, { errorStack: error.stack })
    }
  }

  /**
   * Obtiene estadísticas sobre la base de datos (número de preguntas, categorías, tamaño del archivo, etc.).
   *
   * @returns {Promise<object>} Un objeto con las estadísticas de la base de datos.
   * @throws {Error} Si ocurre un error al cargar los datos o al obtener las estadísticas del archivo.
   */
  async getDatabaseStats() {
    try {
      const data = await this.loadData()
      const stats = await fs.stat(this.#dataPath)

      return {
        totalQuestions: data.questions.length,
        categories: [...new Set(data.questions.map((q) => q.category).filter(Boolean))].length,
        fileSize: stats.size, // Tamaño en bytes
        lastModified: stats.mtime, // Última fecha de modificación del archivo
        status: "healthy",
      }
    } catch (error) {
      logger.error(`Error getting database stats: ${error.message}`, { errorStack: error.stack })
      return {
        status: "error",
        error: error.message,
      }
    }
  }

  /**
   * Inicializa la base de datos, creando el archivo `knowledge-base.json` con datos de ejemplo
   * si este no existe.
   *
   * @returns {Promise<void>}
   * @throws {Error} Si ocurre un error al acceder o crear el archivo de la base de datos.
   */
  async initializeDatabase() {
    try {
      await fs.access(this.#dataPath) // Intenta acceder al archivo
      logger.info(`Database file already exists at ${this.#dataPath}.`)
    } catch (error) {
      if (error.code === "ENOENT") {
        logger.info(`Database file not found at ${this.#dataPath}. Initializing with sample data...`)
        await this.#createInitialData()
      } else {
        logger.error(`Error accessing database file at ${this.#dataPath}: ${error.message}`, {
          errorStack: error.stack,
        })
        throw error // Re-lanzar si es un error diferente a "No Such File or Directory"
      }
    }
  }

  /**
   * Crea el archivo inicial de la base de datos con preguntas de ejemplo.
   *
   * @private
   * @returns {Promise<void>}
   * @throws {Error} Si ocurre un error al guardar los datos iniciales.
   */
  async #createInitialData() {
    const initialData = {
      questions: [
        {
          id: uuidv4(),
          question: "¿Cuáles son sus horarios de atención?",
          response:
            "Nuestros horarios de atención son de lunes a viernes de 8:00 AM a 6:00 PM, y sábados de 9:00 AM a 2:00 PM.",
          keywords: ["horarios", "atención", "horario", "abierto"].map((k) => nlpService.normalizeText(k)),
          category: nlpService.normalizeText("horarios"),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          active: true,
        },
        {
          id: uuidv4(),
          question: "¿Cómo puedo contactarlos?",
          response:
            "Puedes contactarnos por teléfono al (555) 123-4567, por email a info@empresa.com, o visitarnos en nuestra oficina en Calle Principal 123.",
          keywords: ["contacto", "teléfono", "email", "dirección"].map((k) => nlpService.normalizeText(k)),
          category: nlpService.normalizeText("contacto"),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          active: true,
        },
        {
          id: uuidv4(),
          question: "¿Qué servicios ofrecen?",
          response:
            "Ofrecemos servicios de consultoría tecnológica, desarrollo de software, soporte técnico, y capacitación empresarial.",
          keywords: ["servicios", "consultoría", "desarrollo", "soporte"].map((k) => nlpService.normalizeText(k)),
          category: nlpService.normalizeText("servicios"),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          active: true,
        },
        {
          id: uuidv4(),
          question: "¿Cuáles son sus precios?",
          response:
            "Nuestros precios varían según el servicio. Para consultoría: $100/hora, desarrollo: desde $2000/proyecto, soporte: $50/hora. Contáctanos para una cotización personalizada.",
          keywords: ["precios", "costos", "tarifas", "cotización"].map((k) => nlpService.normalizeText(k)),
          category: nlpService.normalizeText("precios"),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          active: true,
        },
        {
          id: uuidv4(),
          question: "¿Dónde están ubicados?",
          response:
            "Estamos ubicados en Calle Principal 123, Centro de la Ciudad, CP 12345. Cerca del metro estación Central.",
          keywords: ["ubicación", "dirección", "donde", "localización"].map((k) => nlpService.normalizeText(k)),
          category: nlpService.normalizeText("ubicación"),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          active: true,
        },
        {
          id: uuidv4(),
          question: "¿Ofrecen soporte técnico?",
          response:
            "Sí, ofrecemos soporte técnico 24/7 para nuestros clientes premium, y soporte en horario laboral para clientes estándar.",
          keywords: ["soporte", "técnico", "ayuda", "asistencia"].map((k) => nlpService.normalizeText(k)),
          category: nlpService.normalizeText("soporte"),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          active: true,
        },
        {
          id: uuidv4(),
          question: "¿Cuál es su política de reembolsos?",
          response:
            "Ofrecemos reembolso completo dentro de los primeros 30 días si no estás satisfecho con nuestros servicios.",
          keywords: ["reembolso", "devolución", "política", "garantía"].map((k) => nlpService.normalizeText(k)),
          category: nlpService.normalizeText("políticas"),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          active: true,
        },
        {
          id: uuidv4(),
          question: "¿Tienen promociones actuales?",
          response:
            "Actualmente tenemos 20% de descuento en servicios de consultoría para nuevos clientes y 15% en paquetes de desarrollo.",
          keywords: ["promociones", "descuentos", "ofertas", "especiales"].map((k) => nlpService.normalizeText(k)),
          category: nlpService.normalizeText("promociones"),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          active: true,
        },
        {
          id: uuidv4(),
          question: "¿Qué experiencia tienen?",
          response:
            "Tenemos más de 10 años de experiencia en el sector tecnológico, con más de 200 proyectos exitosos y clientes satisfechos.",
          keywords: ["experiencia", "trayectoria", "años", "proyectos"].map((k) => nlpService.normalizeText(k)),
          category: nlpService.normalizeText("información"),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          active: true,
        },
        {
          id: uuidv4(),
          question: "¿Trabajan con empresas pequeñas?",
          response:
            "Sí, trabajamos con empresas de todos los tamaños, desde startups hasta grandes corporaciones. Adaptamos nuestros servicios a cada necesidad.",
          keywords: ["empresas", "pequeñas", "startups", "tamaño"].map((k) => nlpService.normalizeText(k)),
          category: nlpService.normalizeText("servicios"),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          active: true,
        },
      ],
      metadata: {
        version: "1.0.0",
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      },
    }

    await this.saveData(initialData)
    logger.info("Initial knowledge base created and saved with sample data.")
  }
}

module.exports = new DatabaseService()
