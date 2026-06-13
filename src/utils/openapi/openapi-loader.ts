import type { OpenAPIV3 } from 'openapi-types'
import type { ApiOperation } from '../../types/operation'
import { getBaseUrl } from './build-url'
import { extractOperations, groupByTag } from './extract-operations'

export interface LoadedSpec {
  document: OpenAPIV3.Document
  operations: ApiOperation[]
  tagGroups: { name: string; operations: ApiOperation[] }[]
  baseUrl: string
  title: string
}

export async function loadOpenApiSpec(specUrl: string): Promise<LoadedSpec> {
  const response = await fetch(specUrl)

  if (!response.ok) {
    throw new Error(`Falha ao carregar spec (${response.status}): ${response.statusText}`)
  }

  const document = (await response.json()) as OpenAPIV3.Document
  const operations = extractOperations(document)
  const tagGroups = groupByTag({ operations })
  const baseUrl = getBaseUrl({ specUrl, servers: document.servers as { url: string }[] | undefined })

  return {
    document,
    operations,
    tagGroups,
    baseUrl,
    title: document.info?.title ?? 'API',
  }
}
