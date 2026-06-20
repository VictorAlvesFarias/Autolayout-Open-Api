import type { OpenAPIV3 } from 'openapi-types'
import type { ActionBind, ApiOperation, ApiParameter, ApiRequestBody, EndpointConfig, FieldGroup, FieldType, OperationEndpoint, OperationField } from '../types/operation'
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
  return operations.map((op) => {
    const config = configMap.find((c) => c.operationId === op.id)
    const fields = normalizeOperation(op, config?.rules ?? [])

    const actions = (config?.actions ?? []).flatMap((actionConfig) => {
      const targetOp = operations.find((o) => o.id === actionConfig.targetOperationId)

      if (!targetOp) {
        return []
      }

      return [{
        type: actionConfig.type,
        postback: actionConfig.postback,
        label: actionConfig.label,
        path: actionConfig.path,
        operationId: actionConfig.targetOperationId,
        operation: targetOp,
        bind: actionConfig.bind,
        returnBind: actionConfig.returnBind,
        render: config?.render ?? true,
        runOnInit: config?.runOnInit ?? false,
      }]
    })

    return {
      id: op.id,
      method: op.method,
      operationPath: op.path,
      fields,
      actions,
      render: config?.render ?? true,
      runOnInit: config?.runOnInit ?? false,
    }
  })
}

// 1. Função auxiliar que aplica UMA única regra na árvore inteira (e seus filhos)
function applyRuleToTree(field: OperationField, rule: FieldPatchRule, parent?: OperationField): OperationField {
  let result = field

  // Aplica a regra no nó atual
  if (rule.match(result, parent)) {
    result = typeof rule.patch === 'function'
      ? rule.patch(result, parent)
      : { ...result, ...rule.patch }
  }

  // Aplica a mesma regra recursivamente nos filhos
  if (result.children?.length) {
    result = {
      ...result,
      children: result.children.map(child => applyRuleToTree(child, rule, result))
    }
  }

  return result
}

// 2. Função principal que roda o Pipeline de regras
export function applyPatch(field: OperationField, rules: FieldPatchRule[]): OperationField {
  let currentTree = field

  // Roda todas as regras, uma por vez, passando a árvore inteira por cada uma
  for (const rule of rules) {
    currentTree = applyRuleToTree(currentTree, rule)
  }

  return currentTree
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
  if (typeof value !== 'string') return value
  try { return JSON.parse(value) } catch { return value }
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
        if ('$ref' in propertySchema) {
          continue
        }

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
      if ('$ref' in propertySchema) {
        continue
      }

      children.push(walkSchema(propertySchema, group, [...path, propertyName], schema.required?.includes(propertyName) ?? false, contentType))
    }
  }

  if (schema.type === 'array' && schema.items && !('$ref' in schema.items)) {
    const item = schema.items

    if (item.type === 'object' && item.properties) {
      for (const [propertyName, propertySchema] of Object.entries(item.properties)) {
        if ('$ref' in propertySchema) {
          continue
        }

        children.push(walkSchema(propertySchema, group, [...path, propertyName], item.required?.includes(propertyName) ?? false, contentType))
      }
    }
    else {
      children.push(walkSchema(item, group, [...path, '*'], false, contentType))
    }
  }

  if (children.length > 0) {
    field.children = children
  }

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