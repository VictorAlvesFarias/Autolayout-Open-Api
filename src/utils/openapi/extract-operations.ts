import type { OpenAPIV3 } from 'openapi-types'
import type { ApiOperation, ApiParameter, ApiRequestBody, ApiResponseDefinition, HttpMethod } from '../../types/operation'
import { dereferenceSchema, resolveRef } from './resolve-ref'

const HTTP_METHODS: HttpMethod[] = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']

function resolveParameter(doc: OpenAPIV3.Document, param: OpenAPIV3.ParameterObject | OpenAPIV3.ReferenceObject): ApiParameter {
  const resolved =
    '$ref' in param ? resolveRef<OpenAPIV3.ParameterObject>(doc, param.$ref) : param

  const schema =
    resolved.schema != null
      ? dereferenceSchema(doc, resolved.schema)
      : ({ type: 'string' } as OpenAPIV3.SchemaObject)

  return {
    name: resolved.name,
    in: resolved.in as ApiParameter['in'],
    required: Boolean(resolved.required ?? resolved.in === 'path'),
    description: resolved.description,
    schema,
    example: resolved.example,
    examples: resolved.examples as Record<string, OpenAPIV3.ExampleObject> | undefined,
  }
}

function resolveRequestBody(
  doc: OpenAPIV3.Document,
  body: OpenAPIV3.RequestBodyObject | OpenAPIV3.ReferenceObject,
): ApiRequestBody {
  const resolved =
    '$ref' in body ? resolveRef<OpenAPIV3.RequestBodyObject>(doc, body.$ref) : body

  const contents = Object.entries(resolved.content ?? {}).map(([contentType, media]) => ({
    contentType,
    schema: media.schema
      ? dereferenceSchema(doc, media.schema)
      : ({ type: 'object' } as OpenAPIV3.SchemaObject),
  }))

  return {
    required: Boolean(resolved.required),
    contents,
  }
}

function resolveResponses(
  doc: OpenAPIV3.Document,
  responses: OpenAPIV3.ResponsesObject | OpenAPIV3.ReferenceObject | undefined,
): ApiResponseDefinition[] {
  if (!responses) return []

  const resolved = isReferenceObject(responses)
    ? resolveRef<OpenAPIV3.ResponsesObject>(doc, responses.$ref)
    : responses

  return Object.entries(resolved).map(([statusCode, response]) => {
    const resolvedResponse = isReferenceObject(response)
      ? resolveRef<OpenAPIV3.ResponseObject>(doc, response.$ref)
      : response

    const contents = Object.entries(resolvedResponse.content ?? {}).map(([contentType, media]) => ({
      contentType,
      schema: media.schema
        ? dereferenceSchema(doc, media.schema)
        : ({ type: 'object' } as OpenAPIV3.SchemaObject),
    }))

    return {
      statusCode,
      description: resolvedResponse.description,
      contents,
    }
  })
}

function isReferenceObject(value: unknown): value is OpenAPIV3.ReferenceObject {
  return typeof value === 'object' && value !== null && '$ref' in value && typeof (value as { $ref?: unknown }).$ref === 'string'
}

export function extractOperations(doc: OpenAPIV3.Document): ApiOperation[] {
  const operations: ApiOperation[] = []

  for (const [path, pathItem] of Object.entries(doc.paths ?? {})) {
    if (!pathItem) continue

    const pathLevelParams = (pathItem.parameters ?? []).map((p) => resolveParameter(doc, p))

    for (const method of HTTP_METHODS) {
      const operation = pathItem[method]
      if (!operation) continue

      const opParams = (operation.parameters ?? []).map((p) => resolveParameter(doc, p))
      const mergedParams = mergeParameters(pathLevelParams, opParams)

      const tags =
        operation.tags?.length ? operation.tags : operation.operationId ? [operation.operationId.split('_')[0]] : ['Geral']

      const id = operation.operationId ?? `${method}-${path}`.replace(/[^\w-]/g, '-')

      operations.push({
        id,
        method,
        path,
        summary: operation.summary ?? operation.operationId,
        description: operation.description,
        tags,
        parameters: mergedParams,
        requestBody: operation.requestBody
          ? resolveRequestBody(doc, operation.requestBody)
          : undefined,
        responses: resolveResponses(doc, operation.responses),
        deprecated: operation.deprecated,
      })
    }
  }

  return operations.sort((a, b) => {
    const tagCmp = a.tags[0].localeCompare(b.tags[0])
    if (tagCmp !== 0) return tagCmp
    return `${a.method} ${a.path}`.localeCompare(`${b.method} ${b.path}`)
  })
}

function mergeParameters(pathLevel: ApiParameter[], operationLevel: ApiParameter[]): ApiParameter[] {
  const map = new Map<string, ApiParameter>()
  for (const p of pathLevel) {
    map.set(`${p.in}:${p.name}`, p)
  }
  for (const p of operationLevel) {
    map.set(`${p.in}:${p.name}`, p)
  }
  return Array.from(map.values())
}

export function groupByTag(operations: ApiOperation[]): { name: string; operations: ApiOperation[] }[] {
  const groups = new Map<string, ApiOperation[]>()

  for (const op of operations) {
    const tag = op.tags[0] ?? 'Geral'
    if (!groups.has(tag)) groups.set(tag, [])
    groups.get(tag)!.push(op)
  }

  return Array.from(groups.entries())
    .map(([name, ops]) => ({ name, operations: ops }))
    .sort((a, b) => a.name.localeCompare(b.name))
}
