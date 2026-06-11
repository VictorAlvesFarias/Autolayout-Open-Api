import { FieldGroup } from '../../services/openapi-normalizer'
import type { ApiOperation } from '../../types/operation'
import { getDefaultForSchema } from './default-values'

export function getBaseUrl(specUrl: string, servers?: { url: string }[]): string {
  if (servers?.length) {
    return servers[0].url.replace(/\/$/, '')
  }

  try {
    const url = new URL(specUrl)
    return `${url.protocol}//${url.host}`
  } catch {
    return ''
  }
}

// build-url.ts
export function buildRequestUrl(
  baseUrl: string,
  operation: ApiOperation | null,
  values: Record<FieldGroup, Record<string, unknown>>,
): string {
  let path = operation?.path

  for (const [key, value] of Object.entries(values.path)) {
    if (value === undefined || value === null || value === '') continue

    path = path?.replace(
      `{${key}}`,
      encodeURIComponent(
        typeof value === 'object' ? JSON.stringify(value) : String(value),
      ),
    )
  }

  const url = new URL(
    path ?? '',
    baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`,
  )

  appendQueryParams(url, values.query)

  return url.toString()
}

/**
 * Adiciona parâmetros de query expandindo objetos aninhados com notação de ponto.
 * Ex: { Address: { Street: "Rua A" } } → Address.Street=Rua+A
 */
function appendQueryParams(
  url: URL,
  obj: Record<string, unknown>,
  prefix = '',
): void {
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null || value === '') continue

    const fullKey = prefix ? `${prefix}.${key}` : key

    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (item === undefined || item === null) return

        if (typeof item === 'object') {
          // Array de objetos: expande com índice → Phones[0].Number=123
          appendQueryParams(
            url,
            item as Record<string, unknown>,
            `${fullKey}[${index}]`,
          )
        } else {
          // Array de primitivos: repete a chave → Ids=1&Ids=2
          url.searchParams.append(fullKey, String(item))
        }
      })
      continue
    }

    if (typeof value === 'object') {
      // Objeto aninhado: expande com ponto → Address.Street=123
      appendQueryParams(url, value as Record<string, unknown>, fullKey)
      continue
    }

    url.searchParams.set(fullKey, String(value))
  }
}
// build-url.ts
export function createInitialFormValues(
  operation: ApiOperation,
): Record<FieldGroup, Record<string, unknown>> {
  const values: Record<FieldGroup, Record<string, unknown>> = {
    path: {},
    query: {},
    header: {},
    cookie: {},
    body: {},
    responses: {},
  }

  for (const param of operation.parameters) {
    const bucket = values[param.in]
    const defaultVal =
      param.example ??
      (param.examples
        ? Object.values(param.examples)[0]?.value
        : undefined) ??
      getDefaultForSchema(param.schema)

    const segments = param.name.split('.')

    if (segments.length === 1) {
      // Parâmetro simples: "Name", "MinAge", etc.
      bucket[param.name] = defaultVal
    } else {
      // Parâmetro dotted: "Address.Street" → monta { Address: { Street: "" } }
      setNestedValue(bucket, segments, defaultVal)
    }
  }

  if (operation.requestBody?.contents.length) {
    const first = operation.requestBody.contents[0]
    const bodyDefault = getDefaultForSchema(first.schema)
    if (bodyDefault && typeof bodyDefault === 'object') {
      Object.assign(values.body, bodyDefault as object)
    }
  }

  return values
}

/** Insere um valor em um caminho aninhado, mesclando objetos existentes */
function setNestedValue(
  target: Record<string, unknown>,
  segments: string[],
  value: unknown,
): void {
  let current = target

  for (let i = 0; i < segments.length - 1; i++) {
    const key = segments[i]

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

  current[segments[segments.length - 1]] = value
}