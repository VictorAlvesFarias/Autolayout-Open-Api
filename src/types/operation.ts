import type { OpenAPIV3 } from 'openapi-types'

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'head' | 'options'

export interface ResolvedSchema {
  schema: OpenAPIV3.SchemaObject
  contentType?: string
}

export interface ApiParameter {
  name: string
  in: 'path' | 'query' | 'header' | 'cookie'
  required: boolean
  description?: string
  schema: OpenAPIV3.SchemaObject
  example?: unknown
  examples?: Record<string, OpenAPIV3.ExampleObject>
}

export interface ApiRequestBody {
  required: boolean
  contents: ResolvedSchema[]
}

export interface ApiResponseContent {
  contentType: string
  schema: OpenAPIV3.SchemaObject
}

export interface ApiResponseDefinition {
  statusCode: string
  description?: string
  contents: ApiResponseContent[]
}

export interface ApiOperation {
  id: string
  method: HttpMethod
  path: string
  summary?: string
  description?: string
  tags: string[]
  parameters: ApiParameter[]
  requestBody?: ApiRequestBody
  responses: ApiResponseDefinition[]
  deprecated?: boolean
}

export interface TagGroup {
  name: string
  operations: ApiOperation[]
}


export interface ApiResponseResult {
  status: number
  statusText: string
  headers: Record<string, string>
  data: unknown
  durationMs: number
  error?: string
}
