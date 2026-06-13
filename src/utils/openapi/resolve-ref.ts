import type { OpenAPIV3 } from 'openapi-types'

export interface ResolveRefArgs {
  doc: OpenAPIV3.Document
  ref: string
}

export interface DereferenceSchemaArgs {
  doc: OpenAPIV3.Document
  schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject
  depth?: number
}

export interface MergeAllOfArgs {
  doc: OpenAPIV3.Document
  schemas: (OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject)[]
  depth: number
}

export function resolveRef<T>(
  args: ResolveRefArgs,
): T {
  if (!args.ref.startsWith('#/')) {
    throw new Error(
      `Referência externa não suportada: ${args.ref}`,
    )
  }

  const path = args.ref.slice(2).split('/')

  let current: unknown = args.doc

  for (const segment of path) {
    const key = segment
      .replace(/~1/g, '/')
      .replace(/~0/g, '~')

    if (
      current === null ||
      current === undefined ||
      typeof current !== 'object'
    ) {
      throw new Error(
        `Referência inválida: ${args.ref}`,
      )
    }

    current = (current as Record<string, unknown>)[key]
  }

  return current as T
}

export function dereferenceSchema(
  args: DereferenceSchemaArgs,
): OpenAPIV3.SchemaObject {
  let depth = 0

  if (args.depth !== undefined) {
    depth = args.depth
  }

  if (depth > 12) {
    return {
      type: 'object',
    }
  }

  if ('$ref' in args.schema) {
    const resolved =
      resolveRef<
        | OpenAPIV3.SchemaObject
        | OpenAPIV3.ReferenceObject
      >({
        doc: args.doc,
        ref: args.schema.$ref,
      })

    return dereferenceSchema({
      doc: args.doc,
      schema: resolved,
      depth: depth + 1,
    })
  }

  const result: OpenAPIV3.SchemaObject = {
    ...args.schema,
  }

  if (result.properties) {
    const props: Record<
      string,
      OpenAPIV3.SchemaObject
    > = {}

    for (const [key, value] of Object.entries(
      result.properties,
    )) {
      props[key] = dereferenceSchema({
        doc: args.doc,
        schema: value,
        depth: depth + 1,
      })
    }

    result.properties = props
  }

  if (
    'items' in result &&
    result.items
  ) {
    result.items = dereferenceSchema({
      doc: args.doc,
      schema:
        result.items as
          | OpenAPIV3.SchemaObject
          | OpenAPIV3.ReferenceObject,
      depth: depth + 1,
    })
  }

  if (
    result.additionalProperties &&
    typeof result.additionalProperties ===
      'object'
  ) {
    result.additionalProperties =
      dereferenceSchema({
        doc: args.doc,
        schema:
          result.additionalProperties as
            | OpenAPIV3.SchemaObject
            | OpenAPIV3.ReferenceObject,
        depth: depth + 1,
      })
  }

  if (result.allOf) {
    return mergeAllOf({
      doc: args.doc,
      schemas: result.allOf,
      depth,
    })
  }

  if (
    result.oneOf &&
    result.oneOf.length > 0
  ) {
    const schema = dereferenceSchema({
      doc: args.doc,
      schema: result.oneOf[0],
      depth: depth + 1,
    })

    return {
      ...schema,
      title: result.title,
      description: result.description,
    }
  }

  if (
    result.anyOf &&
    result.anyOf.length > 0
  ) {
    const schema = dereferenceSchema({
      doc: args.doc,
      schema: result.anyOf[0],
      depth: depth + 1,
    })

    return {
      ...schema,
      title: result.title,
      description: result.description,
    }
  }

  return result
}

export function mergeAllOf(
  args: MergeAllOfArgs,
): OpenAPIV3.SchemaObject {
  const merged: OpenAPIV3.NonArraySchemaObject = {
    type: 'object',
    properties: {},
    required: [],
  }

  for (const item of args.schemas) {
    const schema = dereferenceSchema({
      doc: args.doc,
      schema: item,
      depth: args.depth + 1,
    })

    if (schema.properties) {
      merged.properties = {
        ...merged.properties,
        ...schema.properties,
      }
    }

    if (schema.required) {
      const currentRequired =
        merged.required ?? []

      merged.required = [
        ...currentRequired,
        ...schema.required,
      ]
    }

    if (schema.enum) {
      merged.enum = schema.enum
    }

    if (schema.format) {
      merged.format = schema.format
    }

    if (schema.description) {
      merged.description =
        schema.description
    }

    if (schema.example !== undefined) {
      merged.example = schema.example
    }
  }

  return merged
}