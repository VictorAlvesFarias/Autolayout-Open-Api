import type { OpenAPIV3 } from 'openapi-types'
import type {
  ApiOperation,
  ApiParameter,
  ApiRequestBody,
  ApiResponseDefinition,
  HttpMethod,
} from '../../types/operation'
import { dereferenceSchema, resolveRef } from './resolve-ref'

const HTTP_METHODS: HttpMethod[] = [
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'head',
  'options',
]

export interface ResolveParameterArgs {
  doc: OpenAPIV3.Document
  param: OpenAPIV3.ParameterObject | OpenAPIV3.ReferenceObject
}

export interface ResolveRequestBodyArgs {
  doc: OpenAPIV3.Document
  body: OpenAPIV3.RequestBodyObject | OpenAPIV3.ReferenceObject
}

export interface ResolveResponsesArgs {
  doc: OpenAPIV3.Document
  responses: OpenAPIV3.ResponsesObject | OpenAPIV3.ReferenceObject | undefined
}

export interface IsReferenceObjectArgs {
  value: unknown
}

export interface ExtractOperationsArgs {
  doc: OpenAPIV3.Document
}

export interface MergeParametersArgs {
  pathLevel: ApiParameter[]
  operationLevel: ApiParameter[]
}

export interface GroupByTagArgs {
  operations: ApiOperation[]
}

export function extractOperations(doc: OpenAPIV3.Document): ApiOperation[] {
  const operations: ApiOperation[] = []

  for (const [path, pathItem] of Object.entries(doc.paths ?? {})) {
    if (!pathItem) {
      continue
    }

    const pathLevelParams = (pathItem.parameters ?? []).map(p => {
      return resolveParameter({ doc, param: p });
    })

    for (const method of HTTP_METHODS) {
      const operation = pathItem[method]

      if (!operation) {
        continue
      }

      const opParams = (operation.parameters ?? []).map(p => {
        return resolveParameter({ doc, param: p });
      })

      const mergedParams = mergeParameters({ pathLevel: pathLevelParams, operationLevel: opParams })

      // ⚠️  Ternário: prefira if/else para maior clareza.
      const tags =
        operation.tags?.length ? operation.tags : operation.operationId ? [operation.operationId.split('_')[0]] : ['Geral'];

      const id = operation.operationId ?? `${method}-${path}`.replace(/[^\w-]/g, '-')

      // ⚠️  Ternário: prefira if/else para maior clareza.
      operations.push({
        id,
        method,
        path,
        summary: operation.summary ?? operation.operationId,
        description: operation.description,
        tags,
        parameters: mergedParams,
        requestBody: operation.requestBody
          ? resolveRequestBody({ doc, body: operation.requestBody })
          : undefined,
        responses: resolveResponses({ doc, responses: operation.responses }),
        deprecated: operation.deprecated,
      });
    }
  }

  return operations.sort((a, b) => {
    const tagCmp = a.tags[0].localeCompare(b.tags[0])

    if (tagCmp !== 0) {
      return tagCmp
    }

    return `${a.method} ${a.path}`.localeCompare(`${b.method} ${b.path}`)
  });
}

export function resolveParameter(args: ResolveParameterArgs): ApiParameter {
  let resolved: OpenAPIV3.ParameterObject

  if ('$ref' in args.param) {
    resolved = resolveRef<OpenAPIV3.ParameterObject>({
      doc: args.doc,
      ref: args.param.$ref,
    })
  }
  else {
    resolved = args.param
  }

  let schema: OpenAPIV3.SchemaObject

  if (resolved.schema != null) {
    schema = dereferenceSchema({
      doc: args.doc,
      schema: resolved.schema,
    })
  }
  else {
    schema = {
      type: 'string',
    } as OpenAPIV3.SchemaObject
  }

  let required = false

  if (resolved.required !== undefined) {
    required = Boolean(resolved.required)
  }
  else {
    required = resolved.in === 'path'
  }

  return {
    name: resolved.name,
    in: resolved.in as ApiParameter['in'],
    required,
    description: resolved.description,
    schema,
    example: resolved.example,
    examples:
      resolved.examples as
      | Record<string, OpenAPIV3.ExampleObject>
      | undefined,
  }
}

export function resolveRequestBody(args: ResolveRequestBodyArgs): ApiRequestBody {
  let resolved: OpenAPIV3.RequestBodyObject

  if ('$ref' in args.body) {
    resolved = resolveRef<OpenAPIV3.RequestBodyObject>({
      doc: args.doc,
      ref: args.body.$ref,
    })
  }
  else {
    resolved = args.body
  }

  const contents = []

  const contentEntries = Object.entries(
    resolved.content ?? {},
  )

  for (const [contentType, media] of contentEntries) {
    let schema: OpenAPIV3.SchemaObject

    if (media.schema) {
      schema = dereferenceSchema({
        doc: args.doc,
        schema: media.schema,
      })
    }
    else {
      schema = {
        type: 'object',
      } as OpenAPIV3.SchemaObject
    }

    contents.push({
      contentType,
      schema,
    })
  }

  return {
    required: Boolean(resolved.required),
    contents,
  }
}

export function isReferenceObject(args: IsReferenceObjectArgs): boolean {
  if (typeof args.value !== 'object') {
    return false
  }

  if (args.value === null) {
    return false
  }

  if (!('$ref' in args.value)) {
    return false
  }

  const value = args.value as {
    $ref?: unknown
  }

  if (typeof value.$ref !== 'string') {
    return false
  }

  return true
}

export function mergeParameters(args: MergeParametersArgs,): ApiParameter[] {
  const map = new Map<string, ApiParameter>()

  for (const parameter of args.pathLevel) {
    map.set(
      `${parameter.in}:${parameter.name}`,
      parameter,
    )
  }

  for (const parameter of args.operationLevel) {
    map.set(
      `${parameter.in}:${parameter.name}`,
      parameter,
    )
  }

  return Array.from(map.values())
}

export function groupByTag(args: GroupByTagArgs,): { name: string; operations: ApiOperation[] }[] {
  const groups = new Map<string, ApiOperation[]>()

  for (const operation of args.operations) {
    let tag = 'Geral'

    if (operation.tags[0]) {
      tag = operation.tags[0]
    }

    if (!groups.has(tag)) {
      groups.set(tag, [])
    }

    groups.get(tag)!.push(operation)
  }

  return Array.from(groups.entries())
    .map(([name, operations]) => {
    return ({
      name,
      operations
    });
  })
    .sort((a, b) => {
    return a.name.localeCompare(b.name);
  });
}

export function resolveResponses(args: ResolveResponsesArgs): ApiResponseDefinition[] {
  if (!args.responses) {
    return []
  }

  let resolved: OpenAPIV3.ResponsesObject

  // Fix 1: correct args shape; Fix 2: cast to ReferenceObject before accessing .$ref

  if (isReferenceObject({ value: args.responses })) {
    const reference = args.responses as OpenAPIV3.ReferenceObject

    resolved = resolveRef<OpenAPIV3.ResponsesObject>({
      doc: args.doc,
      ref: reference.$ref,
    })
  }
  else {
    // Fix 3: narrow the type explicitly so TS accepts the assignment

    resolved = args.responses as OpenAPIV3.ResponsesObject
  }

  const result: ApiResponseDefinition[] = []

  for (const [statusCode, response] of Object.entries(resolved)) {
    let resolvedResponse: OpenAPIV3.ResponseObject

    if (isReferenceObject({ value: response })) {
      const reference = response as OpenAPIV3.ReferenceObject

      resolvedResponse = resolveRef<OpenAPIV3.ResponseObject>({
        doc: args.doc,
        ref: reference.$ref,
      })
    }
    else {
      resolvedResponse = response as OpenAPIV3.ResponseObject
    }

    // Fix 4: declare contentEntries and contents inside the loop

    const contentEntries = Object.entries(resolvedResponse.content ?? {})
    const contents: { contentType: string; schema: OpenAPIV3.SchemaObject }[] = []

    for (const [contentType, media] of contentEntries) {
      let schema: OpenAPIV3.SchemaObject

      if (media.schema) {
        schema = dereferenceSchema({
          doc: args.doc,
          schema: media.schema,
        })
      }
      else {
        schema = { type: 'object' }
      }

      contents.push({ contentType, schema })
    }

    result.push({
      statusCode,
      description: resolvedResponse.description,
      contents,
    })
  }

  return result
}