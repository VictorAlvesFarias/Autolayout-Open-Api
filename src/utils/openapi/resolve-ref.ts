import type { OpenAPIV3 } from 'openapi-types'

export function resolveRef<T>(doc: OpenAPIV3.Document, ref: string): T {
  if (!ref.startsWith('#/')) {
    throw new Error(`Referência externa não suportada: ${ref}`)
  }

  const path = ref.slice(2).split('/')
  let current: unknown = doc

  for (const segment of path) {
    const key = segment.replace(/~1/g, '/').replace(/~0/g, '~')
    if (current == null || typeof current !== 'object') {
      throw new Error(`Referência inválida: ${ref}`)
    }
    current = (current as Record<string, unknown>)[key]
  }

  return current as T
}

export function dereferenceSchema(
  doc: OpenAPIV3.Document,
  schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject,
  depth = 0,
): OpenAPIV3.SchemaObject {
  if (depth > 12) {
    return { type: 'object' }
  }

  if ('$ref' in schema) {
    const resolved = resolveRef<OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject>(doc, schema.$ref)
    return dereferenceSchema(doc, resolved, depth + 1)
  }

  const result: OpenAPIV3.SchemaObject = { ...schema }

  if (result.properties) {
    const props: Record<string, OpenAPIV3.SchemaObject> = {}
    for (const [key, value] of Object.entries(result.properties)) {
      props[key] = dereferenceSchema(doc, value, depth + 1)
    }
    result.properties = props
  }

  if (result.items) {
    result.items = dereferenceSchema(doc, result.items as OpenAPIV3.SchemaObject, depth + 1)
  }

  if (result.additionalProperties && typeof result.additionalProperties === 'object') {
    result.additionalProperties = dereferenceSchema(
      doc,
      result.additionalProperties as OpenAPIV3.SchemaObject,
      depth + 1,
    )
  }

  if (result.allOf) {
    return mergeAllOf(doc, result.allOf, depth)
  }

  if (result.oneOf?.length) {
    return { ...dereferenceSchema(doc, result.oneOf[0], depth + 1), title: result.title, description: result.description }
  }

  if (result.anyOf?.length) {
    return { ...dereferenceSchema(doc, result.anyOf[0], depth + 1), title: result.title, description: result.description }
  }

  return result
}

function mergeAllOf(
  doc: OpenAPIV3.Document,
  schemas: (OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject)[],
  depth: number,
): OpenAPIV3.SchemaObject {
  const merged: OpenAPIV3.SchemaObject = { type: 'object', properties: {}, required: [] }

  for (const item of schemas) {
    const s = dereferenceSchema(doc, item, depth + 1)
    if (s.properties) {
      merged.properties = { ...merged.properties, ...s.properties }
    }
    if (s.required) {
      merged.required = [...(merged.required ?? []), ...s.required]
    }
    if (s.type && !merged.type) merged.type = s.type
    if (s.enum) merged.enum = s.enum
    if (s.format) merged.format = s.format
    if (s.description) merged.description = s.description
    if (s.example !== undefined) merged.example = s.example
  }

  return merged
}
