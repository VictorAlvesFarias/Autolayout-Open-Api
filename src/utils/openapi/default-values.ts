import type { OpenAPIV3 } from 'openapi-types'

export interface GetDefaultForSchemaArgs {
  schema: OpenAPIV3.SchemaObject
}

export function getDefaultForSchema(args: GetDefaultForSchemaArgs): unknown {
  const schema = args.schema

  if (schema.default !== undefined) {
    return schema.default
  }

  if (schema.example !== undefined) {
    return schema.example
  }

  if (schema.enum?.length) {
    return schema.enum[0]
  }

  let type = schema.type

  if (!type && schema.properties) {
    type = 'object'
  }

  if (type === 'string') {
    return ''
  }

  if (type === 'number' || type === 'integer') {
    if (schema.minimum !== undefined) {
      return schema.minimum
    }

    return 0
  }

  if (type === 'boolean') {
    return false
  }

  if (type === 'array') {
    return []
  }

  if (type === 'object') {
    if (!schema.properties) {
      return {}
    }

    const obj: Record<string, unknown> = {}

    for (const [key, prop] of Object.entries(schema.properties)) {
      if ('$ref' in prop) {
        continue
      }

      obj[key] = getDefaultForSchema({
        schema: prop,
      })
    }

    return obj
  }

  return ''
}