import { createContext, useCallback, useState, type ReactNode } from 'react'
import { toast } from 'react-toastify'
import { loadOpenApiSpec, type LoadedSpec } from '../utils/openapi/openapi-loader'
import type { ApiOperation } from '../types/operation'

const DEFAULT_SPEC_URL = 'https://localhost:7187/swagger/v1/swagger.json'

export interface OpenApiContextValue {
  specUrl: string
  setSpecUrl: (url: string) => void
  baseUrl: string
  setBaseUrl: (url: string) => void
  loaded: LoadedSpec | null
  loading: boolean
  error: string | null
  loadSpec: () => Promise<void>
  selectedOperation: ApiOperation | null
  selectOperation: (op: ApiOperation | null) => void
}

export const OpenApiContext = createContext<OpenApiContextValue>({
  specUrl: '',
  setSpecUrl: () => { },
  baseUrl: '',
  setBaseUrl: () => { },
  loaded: null,
  loading: false,
  error: null,
  loadSpec: async () => { },
  selectedOperation: null,
  selectOperation: () => { },
})

export function OpenApiProvider({ children }: { children: ReactNode }) {
  const [specUrl, setSpecUrl] = useState(DEFAULT_SPEC_URL)
  const [baseUrl, setBaseUrl] = useState('')
  const [loaded, setLoaded] = useState<LoadedSpec | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedOperation, setSelectedOperation] = useState<ApiOperation | null>(null)

  const loadSpec = useCallback(async () => {
    setLoading(true)
    setError(null)
    setSelectedOperation(null)

    try {
      const result = await loadOpenApiSpec(specUrl)
      setLoaded(result)
      setBaseUrl(result.baseUrl)
      toast.success(`${result.title} carregada — ${result.operations.length} endpoints`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar especificação'
      setError(message)
      setLoaded(null)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [specUrl])

  const value = {
    specUrl,
    setSpecUrl,
    baseUrl,
    setBaseUrl,
    loaded,
    loading,
    error,
    loadSpec,
    selectedOperation,
    selectOperation: setSelectedOperation,
  }

  return <OpenApiContext.Provider value={value}>{children}</OpenApiContext.Provider>
}
