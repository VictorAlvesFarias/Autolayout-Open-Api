import type { ApiOperation, FieldGroup } from '../../types/operation'
import { getDefaultForSchema } from './default-values'

export interface GetBaseUrlArgs {
  specUrl: string
  servers?: { url: string }[]
}

export interface BuildRequestUrlArgs {
  baseUrl: string
  operation: ApiOperation | null
  values: Record<FieldGroup, Record<string, unknown>>
}

export interface AppendQueryParamsArgs {
  url: URL
  obj: Record<string, unknown>
  prefix?: string
}

export interface CreateInitialFormValuesArgs {
  operation: ApiOperation
}

export interface SetNestedValueArgs {
  target: Record<string, unknown>
  segments: string[]
  value: unknown
}

export function getBaseUrl(args: GetBaseUrlArgs): string {
  if (args.servers?.length) {
    return args.servers[0].url.replace(/\/$/, '')
  }

  try {
    const url = new URL(args.specUrl)
    return `${url.protocol}//${url.host}`
  } catch {
    return ''
  }
}

export function buildRequestUrl(args: BuildRequestUrlArgs): string {
  let path = args.operation?.path

  for (const [key, value] of Object.entries(args.values.path)) {
    if (value === undefined || value === null || value === '') {
      continue
    }

    let encodedValue: string

    if (typeof value === 'object') {
      encodedValue = JSON.stringify(value)
    } else {
      encodedValue = String(value)
    }

    path = path?.replace(
      `{${key}}`,
      encodeURIComponent(encodedValue),
    )
  }

  let baseUrl = args.baseUrl

  if (!baseUrl.endsWith('/')) {
    baseUrl = `${baseUrl}/`
  }

  const url = new URL(path ?? '', baseUrl)

  appendQueryParams({
    url,
    obj: args.values.query,
  })

  return url.toString()
}

export function createInitialFormValues(args: CreateInitialFormValuesArgs): Record<FieldGroup, Record<string, unknown>> {
  const session = new URLSearchParams(window.location.search).get('session')

  if (session) {
    const stored = localStorage.getItem(session)
    
    if (stored) {
      return JSON.parse(stored)
    }
  }

  const values: Record<FieldGroup, Record<string, unknown>> = {
    path: {},
    query: {},
    header: {},
    cookie: {},
    body: {},
    responses: {},
  }

  for (const param of args?.operation?.parameters ?? []) {
    const bucket = values[param.in]

    let defaultVal = param.example

    if (defaultVal === undefined) {
      if (param.examples) {
        defaultVal = Object.values(param.examples)[0]?.value
      }
    }

    if (defaultVal === undefined) {
      defaultVal = getDefaultForSchema({
        schema: param.schema,
      })
    }

    const segments = param.name.split('.')

    if (segments.length === 1) {
      bucket[param.name] = defaultVal
    } else {
      setNestedValue({
        target: bucket,
        segments,
        value: defaultVal,
      })
    }
  }

  if (args?.operation?.requestBody?.contents?.length) {
    const first = args.operation.requestBody.contents[0]

    const bodyDefault = getDefaultForSchema({
      schema: first.schema,
    })

    if (bodyDefault && typeof bodyDefault === 'object') {
      Object.assign(values.body, bodyDefault as object)
    }
  }

  return values
}

export function appendQueryParams(args: AppendQueryParamsArgs): void {
  for (const [key, value] of Object.entries(args.obj)) {
    if (value === undefined || value === null || value === '') {
      continue
    }

    let fullKey = key

    if (args.prefix) {
      fullKey = `${args.prefix}.${key}`
    }

    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (item === undefined || item === null) {
          return
        }

        if (typeof item === 'object') {
          appendQueryParams({
            url: args.url,
            obj: item as Record<string, unknown>,
            prefix: `${fullKey}[${index}]`,
          })
        }
        else {
          args.url.searchParams.append(
            fullKey,
            String(item),
          )
        }
      })

      continue
    }

    if (typeof value === 'object') {
      appendQueryParams({
        url: args.url,
        obj: value as Record<string, unknown>,
        prefix: fullKey,
      })

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