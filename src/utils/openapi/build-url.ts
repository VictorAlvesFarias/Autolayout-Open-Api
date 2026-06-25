import type { FieldGroup, OperationEndpoint, OperationField } from '../../types/operation'

export interface GetBaseUrlArgs {
  specUrl: string
  servers?: { url: string }[]
}

export interface BuildRequestUrlArgs {
  baseUrl: string
  endpoint: OperationEndpoint
  values: Record<FieldGroup, Record<string, unknown>>
}

export interface AppendQueryParamsArgs {
  url: URL
  obj: Record<string, unknown>
  prefix?: string
}

export interface CreateInitialFormValuesArgs {
  endpoint: OperationEndpoint
}

export interface SetNestedValueArgs {
  target: Record<string, unknown>
  segments: string[]
  value: unknown
}

export function getBaseUrl(args: GetBaseUrlArgs): string {
  // if (args.servers?.length) {
  //   console.log("servers")

  //   return args.servers[0].url.replace(/\/$/, '')
  // }

  try {
    const url = new URL(args.specUrl)

    // Separa o caminho da URL usando '/swagger' como ponto de corte e pega a primeira parte
    const basePath = url.pathname.split('/swagger')[0]

    // Retorna o protocolo, o host e o caminho (removendo qualquer barra final caso exista)
    const finalUrl = `${url.protocol}//${url.host}${basePath.replace(/\/$/, '')}`

    return finalUrl
  } catch {
    return ''
  }
}

export function buildRequestUrl(args: BuildRequestUrlArgs): string {
  let path = args.endpoint.operationPath ?? ''

  for (const [key, value] of Object.entries(args.values.path)) {
    if (value === undefined || value === null || value === '') {
      continue
    }

    const encodedValue = typeof value === 'object' ? JSON.stringify(value) : String(value)

    path = path.replace(`{${key}}`, encodeURIComponent(encodedValue))
  }

  const normalizedBaseUrl = args.baseUrl.replace(/\/$/, '')
  const normalizedPath = path.replace(/^\/+/, '')
  const url = new URL(`${normalizedBaseUrl}/${normalizedPath}`)

  appendQueryParams({
    url,
    obj: args.values.query,
  })

  return url.toString()
}

export function walkFieldDefaults(field: OperationField, target: Record<string, unknown>): void {
  if (field.type === 'object' && field.children?.length) {

    const nested: Record<string, unknown> = {}

    for (const child of field.children) {
      walkFieldDefaults(child, nested)
    }

    if (Object.keys(nested).length > 0) {
      target[field.name] = nested
    }

    return
  }

  if (field.type === 'array') {
    target[field.name] = field.defaultValue ?? []

    return
  }

  if (field.defaultValue !== undefined) {
    target[field.name] = field.defaultValue

    return
  }

  if (field.example !== undefined) {
    target[field.name] = field.example

    return
  }

  if (field.type === 'boolean') {
    target[field.name] = false

    return
  }

  if (field.type === 'integer' || field.type === 'number') {
    target[field.name] = 0

    return
  }

  target[field.name] = ''
}

export function createInitialFormValues(args: CreateInitialFormValuesArgs): Record<FieldGroup, Record<string, unknown>> {
  const values: Record<FieldGroup, Record<string, unknown>> = {
    path: {},
    query: {},
    header: {},
    cookie: {},
    body: {},
    responses: {},
  }

  for (const field of args.endpoint.fields) {
    const group = field.group as FieldGroup

    if (!values[group]) {
      continue
    }

    walkFieldDefaults(field, values[group])
  }

  return values
}

export function appendQueryParams(args: AppendQueryParamsArgs): void {
  for (const [key, value] of Object.entries(args.obj)) {
    if (value === undefined || value === null || value === '') continue

    const fullKey = args.prefix ? `${args.prefix}.${key}` : key

    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (item === undefined || item === null) return
        if (typeof item === 'object') {
          appendQueryParams({ url: args.url, obj: item as Record<string, unknown>, prefix: `${fullKey}[${index}]` })
        } else {
          args.url.searchParams.append(fullKey, String(item))
        }
      })
      continue
    }

    if (typeof value === 'object') {
      appendQueryParams({ url: args.url, obj: value as Record<string, unknown>, prefix: fullKey })
      continue
    }

    args.url.searchParams.set(fullKey, String(value))
  }
}

export function setNestedValue(args: SetNestedValueArgs): void {
  let current = args.target

  for (let i = 0; i < args.segments.length - 1; i++) {
    const key = args.segments[i]

    if (
      current[key] === undefined ||
      current[key] === null ||
      typeof current[key] !== 'object' ||
      Array.isArray(current[key])
    ) {
      current[key] = {}
    }

    current = current[key] as Record<string, unknown>
  }

  current[args.segments[args.segments.length - 1]] = args.value
}