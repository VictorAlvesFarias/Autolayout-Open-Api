import axios, { type AxiosRequestConfig } from 'axios'
import type { AuthState } from '../types/auth'
import type { ApiOperation, ApiResponseResult, FieldGroup } from '../types/operation'
import { buildRequestUrl } from '../utils/openapi/build-url'

export interface ExecuteRequestArgs {
  baseUrl: string
  operation: ApiOperation
  values: Record<FieldGroup, Record<string, unknown>>
  auth: AuthState
}

export interface ApplyAuthArgs {
  headers: Record<string, string>
  values: Record<FieldGroup, Record<string, unknown>>
  auth: AuthState
}

export async function executeRequest(args: ExecuteRequestArgs): Promise<ApiResponseResult> {
  const { baseUrl, operation, values, auth } = args
  const url = buildRequestUrl({ baseUrl, operation, values })
  const headers: Record<string, string> = {}

  for (const [key, value] of Object.entries(values.header)) {
    if (value !== undefined && value !== null && value !== '') {
      headers[key] = String(value)
    }
  }

  applyAuth({ headers, values, auth })

  const config: AxiosRequestConfig = {
    method: operation.method,
    url,
    headers,
    validateStatus: () => true,
  }

  if (operation.requestBody && values.body !== undefined) {
    const contentType = 'application/json'

    headers['Content-Type'] = contentType

    if (contentType.includes('application/json')) {
      config.data = typeof values.body === 'string' ? parseJsonSafe(values.body) : values.body
    }
    else if (contentType.includes('application/x-www-form-urlencoded')) {
      const params = new URLSearchParams()

      if (typeof values.body === 'object' && values.body !== null) {
        Object.entries(values.body as Record<string, string>).forEach(([k, v]) =>
          params.set(k, String(v)),
        )
      }

      config.data = params.toString()
    }
    else {
      config.data = values.body
    }
  }

  const start = performance.now()
  const response = await axios(config)
  const responseHeaders: Record<string, string> = {}

  Object.entries(response.headers).forEach(([k, v]) => {
    if (typeof v === 'string') {
      responseHeaders[k] = v
    }
  })

  const result = {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
    data: response.data,
    durationMs: Math.round(performance.now() - start),
  }

  return result

}

export function applyAuth(args: ApplyAuthArgs): void {
  const { headers, values, auth } = args

  if (auth?.type == 'bearer') {
    if (auth.bearerToken) {
      headers.Authorization = `Bearer ${auth.bearerToken}`
    }
  }
  else if (auth?.type == 'basic') {
    if (auth.basicUsername || auth.basicPassword) {
      const encoded = btoa(`${auth.basicUsername}:${auth.basicPassword}`)
      headers.Authorization = `Basic ${encoded}`
    }
  }
  else if (auth?.type == 'apiKey') {

    if (auth.apiKeyName && auth.apiKeyValue) {
      if (auth.apiKeyIn === 'header') {
        headers[auth.apiKeyName] = auth.apiKeyValue
      } else {
        values.query[auth.apiKeyName] = auth.apiKeyValue
      }
    }
  }
}

export function parseJsonSafe(value: string): unknown {
  try {
    return JSON.parse(value)
  }
  catch {
    return value
  }
}
