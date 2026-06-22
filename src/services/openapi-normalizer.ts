import type { OpenAPIV3 } from 'openapi-types'
import type {
  ActionBind,
  ApiOperation,
  ApiParameter,
  ApiRequestBody,
  EndpointConfig,
  FieldGroup,
  FieldType,
  OperationEndpoint,
  OperationField,
} from '../types/operation'
import { setNestedValue } from '../utils/openapi/build-url'

export interface FieldPatchRule {
  match: (field: OperationField, parent: OperationField | null | undefined) => boolean
  patch: Partial<OperationField> | ((field: OperationField, parent: OperationField | null | undefined) => OperationField)
}

export interface CreateFieldOptions {
  group: FieldGroup
  path: string[]
  schema: OpenAPIV3.SchemaObject
  required?: boolean
  description?: string
  example?: unknown
  contentType?: string
}

export function toReactRouterPath(operationPath: string, method: string): string {
  const converted = operationPath.replace(/\{([^}]+)\}/g, ':$1')
  return `/${method}${converted}`
}

export function resolveBind(
  bind: ActionBind[],
  item: Record<string, unknown>
): Record<FieldGroup, Record<string, unknown>> {
  const values: Record<FieldGroup, Record<string, unknown>> = {
    path: {}, query: {}, header: {}, cookie: {}, body: {}, responses: {},
  }

  for (const b of bind) {
    const rawValue = b.from ? (item[b.from] ?? b.fallbackValue) : b.fallbackValue
    const [group, ...segments] = b.to.split('.')

    if (rawValue !== null && typeof rawValue === 'object' && !Array.isArray(rawValue)) {
      for (const [key, val] of Object.entries(rawValue as Record<string, unknown>)) {
        setNestedValue({ target: values[group as FieldGroup], segments: [...segments, key], value: val })
      }
    } else {
      setNestedValue({ target: values[group as FieldGroup], segments, value: rawValue })
    }
  }

  return values
}

export function resolveEndpoints(operations: ApiOperation[], configMap: EndpointConfig[]): OperationEndpoint[] {
  const endpoints: OperationEndpoint[] = operations.map((op) => {
    const config = configMap.find((c) => c.operationId === op.id)
    const fields = normalizeOperation(op, config?.rules ?? [])

    return {
      id: op.id,
      method: op.method,
      operationPath: op.path,
      routePath: toReactRouterPath(op.path, op.method),
      fields,
      actions: [],
      render: config?.render ?? true,
      runOnInit: config?.runOnInit ?? false,
      returnBind: config?.returnBind,
      searchInputId: config?.searchInputId,
    }
  })

  for (const endpoint of endpoints) {
    const config = configMap.find((c) => c.operationId === endpoint.id)

    endpoint.actions = (config?.actions ?? []).flatMap((actionConfig) => {
      const targetEndpoint = endpoints.find((e) => e.id === actionConfig.targetOperationId)

      if (!targetEndpoint) {
        return []
      }

      return [{
        type: actionConfig.type,
        postback: actionConfig.postback,
        label: actionConfig.label,
        path: actionConfig.path,
        operationId: actionConfig.targetOperationId,
        endpoint: targetEndpoint,
        bind: actionConfig.bind,
        returnBind: actionConfig.returnBind,
        searchInputId: config?.searchInputId,
      }]
    })

    endpoint.paginationFieldsConfigs = (config?.paginationFieldsConfigs ?? []).flatMap((conf) => {
      if (!conf) {
        return []
      }

      return [{
        currentPageFieldId: conf.currentPageFieldId,
        totalPagesFieldId: conf.totalPagesFieldId,
        operationFieldId: conf.operationFieldId,
      }]
    })
  }

  return endpoints
}

export function getMissingRequiredParams(
  endpoint: OperationEndpoint,
  values: Record<FieldGroup, Record<string, unknown>>
): string[] {
  const missing: string[] = []

  function walk(field: OperationField): void {
    if (!field.required) return

    const groupValues = values[field.group] ?? {}
    const val = field.path.reduce<unknown>(
      (acc, key) => (acc as Record<string, unknown>)?.[key],
      groupValues
    )

    if (val === undefined || val === null || val === '') {
      missing.push(field.id)
    }
  }

  function walkTree(fields: OperationField[]): void {
    for (const field of fields) {
      walk(field)
      if (field.children?.length) walkTree(field.children)
    }
  }

  walkTree(endpoint.fields.filter(f => f.group !== 'responses'))

  return missing
}

export function applyRuleToTree(
  field: OperationField,
  rule: FieldPatchRule,
  parent?: OperationField
): OperationField {
  let result = field

  if (rule.match(result, parent)) {
    result = typeof rule.patch === 'function'
      ? rule.patch(result, parent)
      : { ...result, ...rule.patch }
  }

  if (result.children?.length) {
    result = {
      ...result,
      children: result.children.map(child => applyRuleToTree(child, rule, result)),
    }
  }

  return result
}

export function applyPatch(field: OperationField, rules: FieldPatchRule[]): OperationField {
  let current = field
  for (const rule of rules) {
    current = applyRuleToTree(current, rule)
  }
  return current
}

export function normalizeOperation(operation: ApiOperation, rules: FieldPatchRule[] = []): OperationField[] {
  const fields: OperationField[] = []

  if (operation.parameters) {
    fields.push(...normalizeParameter(operation.parameters))
  }

  if (operation.requestBody) {
    fields.push(...normalizeRequestBody(operation.requestBody))
  }

  for (const response of operation.responses) {
    for (const content of response.contents.filter(c => c.contentType === 'application/json')) {
      fields.push(walkSchema(content.schema, 'responses', [response.statusCode], false, content.contentType))
    }
  }

  if (rules.length === 0) {
    return fields
  }

  return fields.map(field => applyPatch(field, rules))
}

export function normalizeValue(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value
  }

  try {
    return JSON.parse(value)
  }
  catch {
    return value
  }
}

export function formatValue(value: unknown): string {
  if (value === undefined) return '—'
  if (value === null) return 'null'
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  try { return JSON.stringify(value, null, 2) } catch { return String(value) }
}

export function isObjectArray(field: OperationField): boolean {
  return field.children?.some(child => child.name !== '*') ?? false
}

export function findResponsePanelTableValues(field?: OperationField, item?: unknown, length = 3): unknown[] {
  if (!isObjectArray(field!)) return [item]
  const values: unknown[] = []
  field?.children?.forEach((child) => {
    if (child.type !== 'object' && child.type !== 'array') {
      values.push((item as Record<string, unknown>)?.[child.name])
    }
  })
  return values.slice(0, length)
}

export function findResponsePanelTableLabel(field?: OperationField, length = 3): string[] {
  if (!isObjectArray(field!)) return []
  const values: string[] = []
  field?.children?.forEach((child) => {
    if (child.type !== 'object' && child.type !== 'array') values.push(child.label)
  })
  return values.slice(0, length)
}

export function normalizeParameter(parameters: ApiParameter[]): OperationField[] {
  const tree: OperationField[] = []
  for (const parameter of parameters) {
    const segments = parameter.name.split('.')
    if (segments.length === 1) {
      tree.push(walkSchema(parameter.schema, parameter.in, segments, parameter.required))
      continue
    }
    insertParameter(tree, parameter, segments)
  }
  return tree
}

export function insertParameter(fields: OperationField[], parameter: ApiParameter, segments: string[]) {
  let current = fields
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    const isLeaf = i === segments.length - 1
    let field = current.find(f => f.name === segment)
    if (!field) {
      field = {
        id: `${parameter.in}.${segments.slice(0, i + 1).join('.')}`,
        group: parameter.in,
        path: segments.slice(0, i + 1),
        depth: i,
        name: segment,
        label: segment,
        type: isLeaf ? resolveType(parameter.schema) : 'object',
        renderMode: isLeaf ? 'field' : 'section',
        required: false,
        fieldset: true,
        children: [],
        render: true,
      }
      current.push(field)
    }
    if (isLeaf) Object.assign(field, walkSchema(parameter.schema, parameter.in, segments, parameter.required))
    field.children ??= []
    current = field.children
  }
}

export function normalizeRequestBody(requestBody: ApiRequestBody): OperationField[] {
  const fields: OperationField[] = []
  for (const content of requestBody.contents.filter(c => c.contentType === 'application/json')) {
    const schema = content.schema
    if (schema.type === 'object' && schema.properties) {
      for (const [propertyName, propertySchema] of Object.entries(schema.properties)) {
        if ('$ref' in propertySchema) continue
        fields.push(
          walkSchema(propertySchema, 'body', [propertyName], schema.required?.includes(propertyName) ?? false, content.contentType)
        )
      }
    }
  }
  return fields
}

export function walkSchema(schema: OpenAPIV3.SchemaObject, group: FieldGroup, path: string[], required: boolean, contentType?: string): OperationField {
  const field = createField({ group, path, required, schema, contentType })
  const children: OperationField[] = []

  if (schema.type === 'object' && schema.properties) {
    for (const [propertyName, propertySchema] of Object.entries(schema.properties)) {
      if ('$ref' in propertySchema) continue
      children.push(walkSchema(propertySchema, group, [...path, propertyName], schema.required?.includes(propertyName) ?? false, contentType))
    }
  }

  if (schema.type === 'array' && schema.items && !('$ref' in schema.items)) {
    const item = schema.items
    if (item.type === 'object' && item.properties) {
      for (const [propertyName, propertySchema] of Object.entries(item.properties)) {
        if ('$ref' in propertySchema) continue
        children.push(walkSchema(propertySchema, group, [...path, propertyName], item.required?.includes(propertyName) ?? false, contentType))
      }
    } else {
      children.push(walkSchema(item, group, [...path, '*'], false, contentType))
    }
  }

  if (children.length > 0) field.children = children

  return field
}

export function createField(options: CreateFieldOptions): OperationField {
  const name = options.path[options.path.length - 1]
  const type = resolveType(options.schema)
  const label = name === '*' ? 'Item' : options.schema.title ?? humanize(name)

  return {
    id: `${options.group}.${options.path.join('.')}`,
    fieldset: true,
    group: options.group,
    path: options.path,
    depth: options.path.length - 1,
    name, label, type,
    renderMode: type === 'object' ? 'section' : 'field',
    required: options.required ?? false,
    description: options.description ?? options.schema.description,
    defaultValue: options.schema.default,
    example: options.example,
    enumValues: options.schema.enum ? [...options.schema.enum] : undefined,
    placeholder: buildPlaceholder(options.schema),
    contentType: options.contentType,
    format: options.schema.format,
    minimum: options.schema.minimum,
    maximum: options.schema.maximum,
    exclusiveMinimum: typeof options.schema.exclusiveMinimum === 'boolean' ? options.schema.exclusiveMinimum : undefined,
    exclusiveMaximum: typeof options.schema.exclusiveMaximum === 'boolean' ? options.schema.exclusiveMaximum : undefined,
    multipleOf: options.schema.multipleOf,
    minLength: options.schema.minLength,
    maxLength: options.schema.maxLength,
    pattern: options.schema.pattern,
    minItems: options.schema.minItems,
    maxItems: options.schema.maxItems,
    uniqueItems: options.schema.uniqueItems,
    nullable: options.schema.nullable,
    deprecated: options.schema.deprecated,
    readOnly: options.schema.readOnly,
    writeOnly: options.schema.writeOnly,
    render: true,
  }
}

export function resolveType(schema: OpenAPIV3.SchemaObject): FieldType {
  switch (schema.type) {
    case 'object': return 'object'
    case 'array': return 'array'
    case 'boolean': return 'boolean'
    case 'integer': return 'integer'
    case 'number': return 'number'
    default: return 'string'
  }
}

export function buildPlaceholder(schema: OpenAPIV3.SchemaObject): string | undefined {
  if (schema.example != null) return String(schema.example)
  if (schema.default != null) return String(schema.default)
  switch (schema.format) {
    case 'email': return 'user@example.com'
    case 'date': return 'yyyy-mm-dd'
    case 'date-time': return 'yyyy-mm-ddThh:mm:ss'
    default: return undefined
  }
}

export function humanize(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]/g, ' ')
    .replace(/^\w/, c => c.toUpperCase())
}

export function createDefaultValue(field?: OperationField): unknown {
  if (!field) {
    return ''
  }

  if (field.defaultValue !== undefined) {
    return field.defaultValue
  }

  if (field.type === 'array') {
    return []
  }

  if (field.type === 'object') {
    return Object.fromEntries(
      (field.children ?? []).map(child => [
        child.name,
        createDefaultValue(child),
      ])
    )
  }

  if (field.type === 'boolean') {
    return false
  }

  if (field.type === 'integer' || field.type === 'number') {
    return 0
  }

  return ''
}

export function resolveInputType(field: OperationField): string {
  if (field.format === 'password') {
    return 'password'
  }

  if (field.format === 'email') {
    return 'email'
  }

  if (field.format === 'date') {
    return 'date'
  }

  if (field.format === 'date-time') {
    return 'datetime-local'
  }

  if (field.type === 'integer' || field.type === 'number') {
    return 'number'
  }

  return 'text'
}

export function fieldExists(id: string | null | undefined, ops: OperationField[]): OperationField | undefined {
  const path = id ? id.split('.').splice(1) : []

  for (let index = 0; index < path.length; index++) {
    const element = path[index]

    for (const op of ops) {
      if (op.name === element) {
        if (index === path.length - 1) {
          return op
        }

        if (op.children) {
          const child = fieldExists(path.slice(index + 1).join('.'), op.children)

          if (child) {
            return child
          }
        }
      }
    }
  }
}