import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import yaml from 'js-yaml'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Convert kebab-case to camelCase
 * @param {string} str - kebab-case string
 * @returns {string} camelCase string
 */
function kebabToCamel(str) {
  return str.replace(/-([a-z])/g, (_, char) => char.toUpperCase())
}

/**
 * Filter out keys with __ prefix (private values)
 * @param {any} obj - Object to filter
 * @returns {any} Filtered object
 */
function filterPrivateKeys(obj) {
  if (Array.isArray(obj)) {
    return obj.map(filterPrivateKeys)
  }
  if (obj && typeof obj === 'object') {
    const result = {}
    for (const [key, value] of Object.entries(obj)) {
      if (!key.startsWith('__')) {
        result[key] = filterPrivateKeys(value)
      }
    }
    return result
  }
  return obj
}

/**
 * Load all YAML config files from config directory
 * @returns {Object} Config object with camelCase module names
 */
function loadConfig() {
  const config = {}
  const files = fs.readdirSync(__dirname)

  for (const file of files) {
    if (!file.endsWith('.yaml') && !file.endsWith('.yml')) continue

    const filePath = path.join(__dirname, file)
    const moduleName = kebabToCamel(file.replace(/\.ya?ml$/, ''))

    try {
      const content = fs.readFileSync(filePath, 'utf8')
      const data = yaml.load(content)
      config[moduleName] = filterPrivateKeys(data)
    } catch (err) {
      console.error(`Failed to load config file: ${file}`, err)
    }
  }

  return config
}

const config = loadConfig()

export default config
