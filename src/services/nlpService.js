/**
 * @file Servicio de Procesamiento de Lenguaje Natural (NLP).
 * @description Contiene funciones para el análisis de texto, cálculo de similitud y extracción de palabras clave.
 */

class NLPService {
  /**
   * @private
   * @description Lista de palabras vacías (stop words) en español para filtrar.
   * Estas palabras son comunes y no suelen aportar significado relevante en las consultas.
   * Se incluyen algunas variaciones y palabras muy frecuentes.
   */
  #stopWords = [
    "el",
    "la",
    "de",
    "que",
    "y",
    "a",
    "en",
    "un",
    "es",
    "se",
    "no",
    "te",
    "lo",
    "le",
    "da",
    "su",
    "por",
    "son",
    "con",
    "para",
    "al",
    "del",
    "los",
    "las",
    "una",
    "como",
    "pero",
    "sus",
    "han",
    "me",
    "si",
    "sin",
    "sobre",
    "este",
    "ya",
    "entre",
    "cuando",
    "todo",
    "esta",
    "ser",
    "son",
    "dos",
    "también",
    "fue",
    "había",
    "era",
    "muy",
    "años",
    "hasta",
    "desde",
    "está",
    "mi",
    "porque",
    "qué",
    "sólo",
    "yo",
    "hay",
    "vez",
    "puede",
    "todos",
    "así",
    "nos",
    "ni",
    "parte",
    "tiene",
    "él",
    "uno",
    "donde",
    "bien",
    "tiempo",
    "mismo",
    "ese",
    "ahora",
    "cada",
    "e",
    "vida",
    "otro",
    "después",
    "te",
    "otros",
    "aunque",
    "esa",
    "eso",
    "hace",
    "otra",
    "gobierno",
    "tan",
    "durante",
    "siempre",
    "día",
    "tanto",
    "ella",
    "tres",
    "sí",
    "dijo",
    "sido",
    "gran",
    "país",
    "según",
    "menos",
    "mundo",
    "año",
    "antes",
    "estado",
    "quiero",
    "mientras",
    "sin",
    "lugar",
    "solo",
    "nosotros",
    "pueden",
    "trabajo",
    "vida",
    "ejemplo",
    "esos",
    "pues",
    "ahora",
    "decir",
    "grupo",
    "momento",
    "desde",
    "hacer",
    "esto",
    "nombre",
    "aquí",
    "llegar",
    "comentó",
    "agua",
    "más",
    "nueva",
    "estas",
    "muchos",
    "siguiendo",
    "endidad",
    "gran",
    "hombre",
    "conseguir",
    "ésta",
    "those",
    "muchas",
    "junto",
    "lugar",
    "podría",
    "primera",
    "suelen",
    "usted",
    "estas",
    "segundo",
    "varios",
    "cuál",
    "cuales",
    "cómo",
    "cuánto",
    "cuántos",
    "qué",
    "quién",
    "quiénes",
    "cual", // Añadido para manejar "cual" sin acento
  ]

  /**
   * Calcula la distancia de Levenshtein entre dos cadenas de texto.
   * La distancia de Levenshtein es una métrica para medir la diferencia entre dos secuencias.
   * Se define como el número mínimo de ediciones de un solo carácter (inserciones, eliminaciones o sustituciones)
   * necesarias para transformar una cadena en la otra.
   *
   * @param {string} str1 - La primera cadena de texto.
   * @param {string} str2 - La segunda cadena de texto.
   * @returns {number} La distancia de Levenshtein entre las dos cadenas.
   */
  levenshteinDistance(str1, str2) {
    const m = str1.length
    const n = str2.length
    const dp = Array(m + 1)
      .fill(null)
      .map(() => Array(n + 1).fill(0))

    for (let i = 0; i <= m; i++) {
      dp[i][0] = i
    }
    for (let j = 0; j <= n; j++) {
      dp[0][j] = j
    }

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1, // Eliminación
          dp[i][j - 1] + 1, // Inserción
          dp[i - 1][j - 1] + cost, // Sustitución
        )
      }
    }
    return dp[m][n]
  }

  /**
   * Calcula la similitud entre dos cadenas de texto basada en la distancia de Levenshtein.
   * Un valor de 1.0 indica cadenas idénticas, y 0.0 indica ninguna similitud.
   *
   * @param {string} str1 - La primera cadena de texto.
   * @param {string} str2 - La segunda cadena de texto.
   * @returns {number} Un valor decimal entre 0 y 1 que representa la similitud.
   */
  calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1

    if (longer.length === 0) return 1.0 // Ambas vacías, son idénticas

    const distance = this.levenshteinDistance(longer, shorter)
    return (longer.length - distance) / longer.length
  }

  /**
   * Normaliza una cadena de texto para facilitar el procesamiento.
   * Convierte a minúsculas, elimina tildes, remueve caracteres no alfanuméricos
   * (excepto espacios) y normaliza espacios.
   *
   * @param {string} text - La cadena de texto a normalizar.
   * @returns {string} La cadena de texto normalizada.
   */
  normalizeText(text) {
    if (typeof text !== "string") return ""
    return text
      .toLowerCase()
      .normalize("NFD") // Descompone caracteres acentuados
      .replace(/[\u0300-\u036f]/g, "") // Elimina diacríticos (tildes)
      .replace(/[^\w\s]/g, "") // Remueve caracteres no alfanuméricos (excepto espacios)
      .replace(/\s+/g, " ") // Normaliza múltiples espacios a uno solo
      .trim()
  }

  /**
   * Extrae palabras clave de una cadena de texto.
   * Normaliza el texto, lo divide en palabras y filtra las palabras vacías (stop words).
   * Devuelve un array de palabras clave únicas.
   *
   * @param {string} text - La cadena de texto de la cual extraer las palabras clave.
   * @param {number} [minLength=3] - La longitud mínima de una palabra para ser considerada palabra clave.
   * @returns {string[]} Un array de palabras clave únicas.
   */
  extractKeywords(text, minLength = 3) {
    const normalizedText = this.normalizeText(text)
    const words = normalizedText.split(" ")
    const filteredWords = words.filter(
      (word) => word.length >= minLength && !this.#stopWords.includes(word) && !/^\d+$/.test(word),
    )
    return [...new Set(filteredWords)] // Devuelve palabras clave únicas
  }

  /**
   * Calcula el score de superposición de palabras clave, buscando coincidencias parciales.
   * Mide cuántas palabras clave del primer conjunto (ej. del usuario) tienen una coincidencia
   * (exacta o parcial) en el segundo conjunto (ej. de la pregunta).
   *
   * @param {string[]} keywords1 - Primer array de palabras clave (ej. del mensaje del usuario).
   * @param {string[]} keywords2 - Segundo array de palabras clave (ej. de la pregunta en la base de conocimiento).
   * @returns {number} Un valor decimal entre 0 y 1 que representa el grado de superposición.
   */
  calculateKeywordOverlapScore(keywords1, keywords2) {
    if (!keywords1 || !keywords2 || keywords1.length === 0 || keywords2.length === 0) {
      return 0
    }

    const normalizedKeywords1 = keywords1.map((k) => this.normalizeText(k))
    const normalizedKeywords2 = keywords2.map((k) => this.normalizeText(k))

    let matchedUserKeywords = 0
    for (const userK of normalizedKeywords1) {
      for (const questionK of normalizedKeywords2) {
        // Coincidencia parcial: si una palabra incluye a la otra
        if (userK.includes(questionK) || questionK.includes(userK)) {
          matchedUserKeywords++
          break // Contar solo una coincidencia por palabra clave del usuario
        }
      }
    }

    // El score es la proporción de palabras clave del usuario que encontraron una coincidencia
    return normalizedKeywords1.length > 0 ? matchedUserKeywords / normalizedKeywords1.length : 0
  }
}

module.exports = new NLPService()
