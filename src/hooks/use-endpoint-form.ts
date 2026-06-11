import { useCallback, useEffect, useState } from 'react'
import { createInitialFormValues } from '../utils/openapi/build-url'
import type { ApiOperation, EndpointFormValues } from '../types/operation'

export function cuseEndpointForm(operation: ApiOperation | null) {
  const [values, setValues] = useState<EndpointFormValues>(() =>
    operation ? createInitialFormValues(operation) : emptyValues(),
  )

  useEffect(() => {
    if (operation) {
      setValues(createInitialFormValues(operation))
    }
  }, [operation?.id])

  const setParam = useCallback(
    (location: 'path' | 'query' | 'header' | 'cookie', name: string, value: unknown) => {
      setValues((prev) => ({
        ...prev,
        [location]: { ...prev[location], [name]: value },
      }))
    },
    [],
  )

  const setBody = useCallback((body: unknown) => {
    setValues((prev) => ({ ...prev, body }))
  }, [])

  const setContentType = useCallback((contentType: string) => {
    setValues((prev) => ({ ...prev, contentType }))
  }, [])

  const reset = useCallback(() => {
    if (operation) setValues(createInitialFormValues(operation))
  }, [operation])

  return { values, setValues, setParam, setBody, setContentType, reset }
}

function emptyValues(): EndpointFormValues {
  return { path: {}, query: {}, header: {}, cookie: {}, body: undefined, contentType: 'application/json' }
}
