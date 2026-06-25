import { useContext, useEffect, useRef, useState } from 'react'
import { ConditionalGroup, If, IModalController, ModalClose, ModalContext } from 'react-base-components'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import Button from '../components/button'
import Card from '../components/card'
import ModalRoot from '../components/modal-root'
import { StaticField } from './static-field'
import { useAuth } from '../context/auth-context'
import { executeRequest } from '../services/request-executor'
import { createInitialFormValues, setNestedValue } from '../utils/openapi/build-url'
import { DinamicField } from './dinamic-field'
import { OpenApiContext } from '../context/openapi-context'
import type { AuthType } from '../types/auth'
import type { ActionBind, ApiResponseResult, FieldGroup, OperationEndpoint, OperationField } from '../types/operation'
import { RotateCcw, SlidersHorizontal } from 'lucide-react'
import { fieldExists, getMissingRequiredParams, resolveBind } from '../services/openapi-normalizer'
import { toast } from 'react-toastify'
import { ToggleGroup, ToggleGroupButton } from '../components/toogle-group'
import { ToggleGroupContext } from 'react-base-components'

export interface EndpointPanelProps {
  endpoint: OperationEndpoint
}

export function EndpointPanel({ endpoint }: EndpointPanelProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const routeParams = useParams()
  const [searchParams] = useSearchParams()
  const { auth } = useAuth()
  const { baseUrl } = useContext(OpenApiContext)
  const initRanRef = useRef<string | null>(null)
  const timeoutActionRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const parametersGroups = groupFields(endpoint.fields).filter((g) => g !== 'body' && g !== 'responses')
  const body = endpoint.fields.filter((f) => f.group === 'body' && f.render !== false)
  const responses = endpoint.fields.filter((f) => f.group === 'responses' && f.render !== false)
  const parameters = endpoint.fields.filter((f) => f.group !== 'body' && f.group !== 'responses' && f.render !== false)
  const modalParametersContext = useRef<IModalController>(null)
  const startFieldset = responses.filter(e => e.render !== false).length > 1
  const searchInputField = fieldExists(endpoint.searchInputId, endpoint.fields)

  const [sending, setSending] = useState(false)
  const [values, setValues] = useState<Record<FieldGroup, Record<string, unknown>>>(() => createInitialFormValues({ endpoint }))
  const [responseCode, setResponseCode] = useState<string>(responses[0]?.name ?? 'none')

  console.log(endpoint)

  // -------------------------------------------------------------------------
  // Request
  // -------------------------------------------------------------------------

  async function sendRequest(formValues: Record<FieldGroup, Record<string, unknown>>) {
    if (!baseUrl || sending) {
      return
    }

    setSending(true)

    try {
      const result = await executeRequest({ baseUrl, endpoint, values: formValues, auth })

      setValues(prev => ({ ...prev, responses: { ...prev.responses, [responseCode]: result.data } }))

      if (endpoint.returnBind?.length) {
        applyReturnBind(endpoint.returnBind, result.data)
      }
    }
    finally {
      setSending(false)
    }
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  function buildNavigateArgs(targetRoutePath: string, boundValues: Record<FieldGroup, Record<string, unknown>>): [string, { state: unknown }] {
    let resolvedPath = targetRoutePath

    for (const [key, val] of Object.entries(boundValues.path ?? {})) {
      resolvedPath = resolvedPath.replace(`:${key}`, encodeURIComponent(String(val ?? '')))
    }

    const qs = new URLSearchParams()

    for (const [key, val] of Object.entries(boundValues.query ?? {})) {
      if (val !== undefined && val !== null && val !== '') {
        qs.set(key, String(val))
      }
    }

    const search = qs.toString() ? `?${qs.toString()}` : ''
    const stateValues: Partial<Record<FieldGroup, Record<string, unknown>>> = {}

    for (const group of ['body', 'header', 'cookie'] as FieldGroup[]) {
      if (Object.keys(boundValues[group] ?? {}).length > 0) {
        stateValues[group] = boundValues[group]
      }
    }

    return [`${resolvedPath}${search}`, { state: { values: stateValues } }]
  }

  function applyReturnBind(returnBind: ActionBind[], returnData: unknown) {
    const data = returnData && typeof returnData === 'object' && !Array.isArray(returnData) ? (returnData as Record<string, unknown>) : {}

    setValues((prev) => {
      const next: Record<FieldGroup, Record<string, unknown>> = {
        path: { ...prev.path },
        query: { ...prev.query },
        header: { ...prev.header },
        cookie: { ...prev.cookie },
        body: { ...prev.body },
        responses: { ...prev.responses },
      }

      for (const b of returnBind) {
        const rawValue = b.from ? (data[b.from] ?? b.fallbackValue) : b.fallbackValue
        const [group, ...segments] = b.to.split('.')

        if (rawValue !== null && typeof rawValue === 'object' && !Array.isArray(rawValue)) {
          for (const [key, val] of Object.entries(rawValue as Record<string, unknown>)) {
            setNestedValue({ target: next[group as FieldGroup], segments: [...segments, key], value: val })
          }
        }
        else {
          setNestedValue({ target: next[group as FieldGroup], segments, value: rawValue })
        }
      }

      return next
    })
  }

  function groupFields(fields: OperationField[]): FieldGroup[] {
    return fields.reduce(
      (acc: FieldGroup[], field) => (acc.includes(field.group) ? acc : [...acc, field.group]),
      []
    )
  }

  function onParamChange(location: FieldGroup, name: string, value: unknown) {
    setValues((prev) => {
      const currentValues = prev[location] && typeof prev[location] === 'object' ? prev[location] : {}
      return { ...prev, [location]: { ...currentValues, [name]: value } }
    })
  }

  function getFieldValue(group: FieldGroup, path: string[]): unknown {
    return path.reduce(
      (acc, key) => (acc as Record<string, unknown>)?.[key],
      values[group] as unknown
    )
  }

  function setFieldValue(group: FieldGroup, path: string[], value: unknown, timeout?: number): void {
    function set(obj: Record<string, unknown>, [head, ...tail]: string[]): Record<string, unknown> {
      if (tail.length === 0) {
        return { ...obj, [head]: value }
      }

      return { ...obj, [head]: set((obj[head] as Record<string, unknown>) ?? {}, tail) }
    }

    const next = { ...values, [group]: set(values[group] as Record<string, unknown>, path) }

    setValues(next)

    if (timeout !== undefined) {
      if (timeoutActionRef.current) {
        clearTimeout(timeoutActionRef.current)
      }

      timeoutActionRef.current = setTimeout(() => sendRequest(next), timeout)
    }
    else {
      sendRequest(next)
    }
  }

  // -------------------------------------------------------------------------
  // Init
  // -------------------------------------------------------------------------

  function getInitialValues() {
    const initial = createInitialFormValues({ endpoint })

    for (const [key, val] of Object.entries(routeParams)) {
      if (val !== undefined) initial.path[key] = decodeURIComponent(val)
    }

    searchParams.forEach((val, key) => {
      initial.query[key] = val
    })

    const stateValues = (location.state?.values ?? {}) as Record<FieldGroup, Record<string, unknown>>
    for (const group of ['body', 'header', 'cookie'] as FieldGroup[]) {
      if (stateValues[group]) Object.assign(initial[group], stateValues[group])
    }

    let resolvedPath = endpoint.routePath
    for (const [key, val] of Object.entries(initial.path ?? {})) {
      resolvedPath = resolvedPath.replace(`:${key}`, encodeURIComponent(String(val ?? '')))
    }

    const qs = new URLSearchParams()
    for (const [key, val] of Object.entries(initial.query ?? {})) {
      if (val !== undefined && val !== null && val !== '') qs.set(key, String(val))
    }

    navigate(`${resolvedPath}${qs.toString() ? `?${qs.toString()}` : ''}`, { replace: true })

    return initial
  }

  function runInitAction(actionValues: Record<FieldGroup, Record<string, unknown>>) {
    const initActions = endpoint.actions.filter((a) => a.type === 'init')
    if (!initActions.length || !baseUrl) return

    const initKey = `${endpoint.id}:${JSON.stringify(location.state)}`
    if (initRanRef.current === initKey) return
    initRanRef.current = initKey

    const flatItem: Record<string, unknown> = {}
    for (const group of Object.values(actionValues)) {
      if (group && typeof group === 'object') Object.assign(flatItem, group)
    }

    initActions.forEach(async (action) => {
      const requestValues = resolveBind(action.bind, flatItem)

      const missing = getMissingRequiredParams(action.endpoint, requestValues)
      if (missing.length > 0) {
        toast.error(`Parâmetros obrigatórios não preenchidos na action "${action.label}": ${missing.join(', ')}`)
        console.warn('Parâmetros obrigatórios não preenchidos:', missing)
        return
      }

      const result = await executeRequest({ baseUrl, endpoint: action.endpoint, values: requestValues, auth })

      if (action.returnBind?.length) {
        applyReturnBind(action.returnBind, result.data)
      }
    })
  }

  function runAutoAction(actionValues: Record<FieldGroup, Record<string, unknown>>) {
    if (!baseUrl || endpoint.method !== 'get' || !endpoint.runOnInit) return

    const missing = getMissingRequiredParams(endpoint, actionValues)
    if (missing.length > 0) {
      toast.error(`Parâmetros obrigatórios não preenchidos na requisição automática: ${missing.join(', ')}`)
      console.warn('Parâmetros obrigatórios não preenchidos:', missing)
      return
    }

    sendRequest(actionValues)
  }

  function handleActionNavigate(
    targetRoutePath: string,
    boundValues: Record<FieldGroup, Record<string, unknown>>
  ) {
    const [to, options] = buildNavigateArgs(targetRoutePath, boundValues)
    navigate(to, options)
  }

  // -------------------------------------------------------------------------
  // Effects
  // -------------------------------------------------------------------------

  useEffect(() => {
    const initValue = getInitialValues()
    runInitAction(initValue)
    runAutoAction(initValue)
    setValues(initValue)
  }, [endpoint.id])

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="flex flex-col gap-4">
      <div className="flex-1 flex items-end gap-3">
        {searchInputField && (
          <DinamicField
            field={searchInputField}
            value={String(getFieldValue(searchInputField.group, searchInputField.path) ?? '')}
            onChange={(v) => setFieldValue(searchInputField.group, searchInputField.path, v, 500)}
          />
        )}

        <button
          type="button"
          onClick={() => modalParametersContext.current?.open()}
          className="text-zinc-200 text-xs hover:underline rounded border border-zinc-800 min-w-12 min-h-12 flex items-center justify-center hover:bg-purple-600/15 transition-all"
        >
          <SlidersHorizontal className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={() => sendRequest(values)}
          disabled={sending}
          className="text-zinc-200 text-xs hover:underline rounded border border-zinc-800 min-w-12 min-h-12 flex items-center justify-center hover:bg-purple-600/15 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RotateCcw className={`w-5 h-5 transition-transform ${sending ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <ModalContext ref={modalParametersContext}>
        <ModalRoot>
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-full max-h-full max-w-2xl bg-main-black-800 flex flex-col gap-6 rounded text-white">
              <Card>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-semibold text-purple-300 mb-3">Parameters</h3>
                  <ModalClose><Button>Close</Button></ModalClose>
                </div>
                {parametersGroups.map((group) => (
                  <Card key={group}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-base font-semibold text-purple-300 mb-3">
                        {group[0]?.toUpperCase() + group.slice(1)}
                      </h3>
                    </div>
                    {parameters.map((field, i) => (
                      <DinamicField
                        key={`${group}_${i}`}
                        field={{ ...field, fieldset: parameters.length > 1 }}
                        value={values?.[field.group]?.[field.name]}
                        onChange={(next) => onParamChange(field.group, field.name, next)}
                      />
                    ))}
                  </Card>
                ))}
              </Card>
            </div>
          </div>
        </ModalRoot>
      </ModalContext>

      <If conditional={body.length > 0}>
        <Card>
          <h3 className="text-base font-semibold text-purple-300 mb-3">Body</h3>
          {body.map((field, i) => (
            <DinamicField
              key={`${i}`}
              field={{ ...field, fieldset: body.length > 1 }}
              value={values?.[field.group]?.[field.name]}
              onChange={(next) => onParamChange('body', field.name, next)}
            />
          ))}
        </Card>
      </If>

      <Card>
        <h3 className="text-base font-semibold text-purple-300 mb-3">Response</h3>
        <div aria-checked={sending} className="absolute w-full h-full top-0 left-0 p-3 bg-zinc-900 transition-opacity duration-300 opacity-0 pointer-events-none aria-checked:opacity-100 aria-checked:pointer-events-auto">
          <div className="flex flex-col gap-3 animate-pulse py-1">
            <div className="h-2.5 bg-zinc-700 rounded-full w-2/3" />
            <div className="flex gap-2">
              <div className="h-2.5 bg-zinc-700 rounded-full w-1/2" />
              <div className="h-2.5 bg-zinc-700 rounded-full w-1/4" />
            </div>
            <div className="h-2.5 bg-zinc-700 rounded-full w-4/5" />
            <div className="h-2.5 bg-zinc-700 rounded-full w-1/3" />
          </div>
        </div>

        <If conditional={responses.length > 0}>
          <div className="flex flex-col gap-3">
            <ToggleGroupContext value={responseCode} onChange={(v) => setResponseCode(v)}>
              <ToggleGroup>
                {responses
                  .filter((v, i, arr) => arr.findIndex(r => r.name === v.name) === i)
                  .map((resp) => (
                    <ToggleGroupButton key={resp.name} value={resp.name}>
                      {resp.name}
                    </ToggleGroupButton>
                  ))}
              </ToggleGroup>
            </ToggleGroupContext>

            {responses.map((responseField, i) => (
              <If key={i} conditional={responseField.name === responseCode}>
                <StaticField
                  key={i}
                  field={{ ...responseField, fieldset: startFieldset }}
                  value={values?.[responseField.group]?.[responseField.name]}
                  actions={endpoint.actions}
                  baseUrl={baseUrl}
                  auth={auth}
                  fieldPath={responseField.id}
                  paginationConfigs={endpoint.paginationFieldsConfigs}
                  values={values}
                  onPageChange={(group, path, page) => setFieldValue(group, path, page)}
                  onPostback={() => sendRequest(values)}
                  onNavigate={handleActionNavigate}
                />
              </If>
            ))}
          </div>
        </If>
      </Card>
    </div>
  )
}