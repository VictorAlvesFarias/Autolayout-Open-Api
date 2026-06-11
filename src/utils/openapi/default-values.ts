import type { OpenAPIV3 } from 'openapi-types'

export function getDefaultForSchema(schema: OpenAPIV3.SchemaObject): unknown {
  if (schema.default !== undefined) return schema.default
  if (schema.example !== undefined) return schema.example
  if (schema.enum?.length) return schema.enum[0]

  const type = schema.type ?? (schema.properties ? 'object' : undefined)

  switch (type) {
    case 'string':
      if (schema.format === 'date') return ''
      if (schema.format === 'date-time') return ''
      return ''
    case 'number':
    case 'integer':
      return schema.minimum ?? 0
    case 'boolean':
      return false
    case 'array':
      return []
    case 'object': {
      if (!schema.properties) return {}
      const obj: Record<string, unknown> = {}
      for (const [key, prop] of Object.entries(schema.properties)) {
        if ('$ref' in prop) continue
        obj[key] = getDefaultForSchema(prop)
      }
      return obj
    }
    default:
      return ''
  }
}

export function getPlaceholder(schema: OpenAPIV3.SchemaObject): string {
  if (schema.example !== undefined && typeof schema.example !== 'object') {
    return String(schema.example)
  }
  if (schema.format) return schema.format
  if (schema.type) return schema.type
  return ''
}
