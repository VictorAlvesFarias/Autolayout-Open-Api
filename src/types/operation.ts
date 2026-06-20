import type { OpenAPIV3 } from 'openapi-types'
import { FieldPatchRule } from '../services/openapi-normalizer'

export type HttpMethod =
  | 'get'
  | 'post'
  | 'put'
  | 'patch'
  | 'delete'
  | 'head'
  | 'options'

export type FieldRenderMode =
  | 'field'
  | 'section'

export type FieldGroup =
  | 'path'
  | 'query'
  | 'header'
  | 'cookie'
  | 'body'
  | 'responses'

export type FieldType =
  | 'object'
  | 'array'
  | 'string'
  | 'number'
  | 'integer'
  | 'boolean'

export type ActionType = 'request' | 'navigate' | 'init'

export interface OperationField {
  id: string
  group: FieldGroup
  path: string[]
  depth: number
  name: string
  label: string
  type: FieldType
  children?: OperationField[]
  renderMode: FieldRenderMode
  required: boolean
  description?: string
  defaultValue?: unknown
  example?: unknown
  enumValues?: unknown[]
  placeholder?: string
  contentType?: string
  format?: string
  minimum?: number
  maximum?: number
  exclusiveMinimum?: boolean
  exclusiveMaximum?: boolean
  multipleOf?: number
  minLength?: number
  maxLength?: number
  pattern?: string
  minItems?: number
  maxItems?: number
  uniqueItems?: boolean
  nullable?: boolean
  deprecated?: boolean
  readOnly?: boolean
  writeOnly?: boolean
  fieldset: boolean
  render: boolean
}

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

export interface ApiResponseResult {
  status: number
  statusText: string
  headers: Record<string, string>
  data: unknown
  durationMs: number
  error?: string
}

export interface ActionBind {
  from?: string
  to: string
  fallbackValue?: unknown
}

export interface ResolvedAction {
  type: ActionType
  postback?: boolean
  label: string
  path: string
  operationId: string
  bind: ActionBind[]
  returnBind?: ActionBind[] // só para type='init': mapeia retorno → values do form
  operation: ApiOperation
}

export interface OperationEndpoint {
  id: string
  method: HttpMethod
  operationPath: string
  fields: OperationField[]
  actions: ResolvedAction[]
  render: boolean
  runOnInit: boolean
}

export interface EndpointActionConfig {
  type: ActionType
  postback?: boolean
  targetOperationId: string
  label: string
  path: string
  bind: ActionBind[]
  returnBind?: ActionBind[]
}

export interface EndpointConfig {
  operationId: string
  rules?: FieldPatchRule[]
  actions?: EndpointActionConfig[]
  render?: boolean
  runOnInit?: boolean
}