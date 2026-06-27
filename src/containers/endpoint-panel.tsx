import { useContext, useEffect, useRef, useState } from 'react'
import { If, IModalController, ModalClose, ModalContext } from 'react-base-components'
import { ToggleGroupContext } from 'react-base-components'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import Button from '../components/button'
import Card from '../components/card'
import ModalRoot from '../components/modal-root'
import { DinamicField } from './dinamic-field'
import { StaticField } from './static-field'
import { ToggleGroup, ToggleGroupButton } from '../components/toogle-group'
import { executeRequest } from '../services/request-executor'
import { createInitialFormValues, setNestedValue } from '../utils/openapi/build-url'
import { OpenApiContext } from '../context/openapi-context'
import { fieldExists, getMissingRequiredParams, getValueByFieldId, resolveBind, splitFieldId } from '../services/openapi-normalizer'
import { useAuth } from '../context/auth-context'
import { toast } from 'react-toastify'
import { RotateCcw, SlidersHorizontal } from 'lucide-react'
import type { ActionBind, FieldGroup, OperationEndpoint, OperationField } from '../types/operation'
import type { AuthState } from '../types/auth'

export interface EndpointPanelProps {
  endpoint: OperationEndpoint
}

export interface EndpointPanelGroupProps {
  endpoint: OperationEndpoint
  values: Record<FieldGroup, Record<string, unknown>>
  onFieldChange: (id: string, value: unknown, timeout?: number) => void
}

export interface EndpointPanelForResponseProps extends EndpointPanelGroupProps {
  sending: boolean
  responseCode: string
  onResponseCodeChange: (code: string) => void
  baseUrl?: string
  auth?: AuthState
  onPostback: () => void
  onNavigate: (routePath: string, boundValues: Record<FieldGroup, Record<string, unknown>>) => void
}

export function EndpointPanelForSearch({ endpoint, values, onFieldChange }: EndpointPanelGroupProps) {
  const searchInputField = fieldExists(endpoint.searchInputId, endpoint.fields)

  if (!searchInputField) return null

  return (
    <DinamicField
      field={searchInputField}
      value={String(getValueByFieldId(values, searchInputField.id) ?? '')}
      onChange={(v) => onFieldChange(searchInputField.id, v, 500)}
    />
  )
}

export function EndpointPanelForParameters({ endpoint, values, onFieldChange }: EndpointPanelGroupProps) {
  const modalRef = useRef<IModalController>(null)

  const parameters = endpoint.fields.filter(
    (f) => f.group !== 'body' && f.group !== 'responses' && f.render !== false
  )

  const parametersGroups = endpoint.fields
    .filter((f) => f.group !== 'body' && f.group !== 'responses')
    .reduce((acc: FieldGroup[], field) => (acc.includes(field.group) ? acc : [...acc, field.group]), [])

  if (parameters.length === 0) return null

  return (
    <>
      <button
        type="button"
        onClick={() => modalRef.current?.open()}
        className="text-zinc-200 text-xs hover:underline rounded border border-zinc-800 min-w-12 min-h-12 flex items-center justify-center hover:bg-purple-600/15 transition-all"
      >
        <SlidersHorizontal className="w-5 h-5" />
      </button>

      <ModalContext ref={modalRef}>
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
                    {parameters
                      .filter((f) => f.group === group)
                      .map((field, i) => (
                        <DinamicField
                          key={`${group}_${i}`}
                          field={{ ...field, fieldset: parameters.length > 1 }}
                          value={getValueByFieldId(values, field.id)}
                          onChange={(next) => onFieldChange(field.id, next)}
                        />
                      ))}
                  </Card>
                ))}
              </Card>
            </div>
          </div>
        </ModalRoot>
      </ModalContext>
    </>
  )
}

export function EndpointPanelForBody({ endpoint, values, onFieldChange }: EndpointPanelGroupProps) {
  const body = endpoint.fields.filter((f) => f.group === 'body' && f.render !== false)

  return (
    <If conditional={body.length > 0}>
      <Card>
        <h3 className="text-base font-semibold text-purple-300 mb-3">Body</h3>
        {body.map((field, i) => (
          <DinamicField
            key={`${i}`}
            field={{ ...field, fieldset: body.length > 1 }}
            value={getValueByFieldId(values, field.id)}
            onChange={(next) => onFieldChange(field.id, next)}
          />
        ))}
      </Card>
    </If>
  )
}

export function EndpointPanelForResponse({
  endpoint,
  values,
  onFieldChange,
  sending,
  responseCode,
  onResponseCodeChange,
  baseUrl,
  auth,
  onPostback,
  onNavigate,
}: EndpointPanelForResponseProps) {
  const responses = endpoint.fields.filter((f) => f.group === 'responses' && f.render !== false)
  const startFieldset = responses.filter((e) => e.render !== false).length > 1

  return (
    <Card className="relative">
      <h3 className="text-base font-semibold text-purple-300 mb-3">Response</h3>

      <div
        aria-checked={sending}
        className="absolute z-10 w-full h-full top-0 left-0 p-3 bg-zinc-900 transition-opacity duration-300 opacity-0 pointer-events-none aria-checked:opacity-100 aria-checked:pointer-events-auto"
      >
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
          <ToggleGroupContext value={responseCode} onChange={onResponseCodeChange}>
            <ToggleGroup>
              {responses
                .filter((v, i, arr) => arr.findIndex((r) => r.name === v.name) === i)
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
                value={getValueByFieldId(values, responseField.id)}
                baseUrl={baseUrl}
                auth={auth}
                values={values}
                onPageChange={(fieldId, page) => onFieldChange(fieldId, page)}
                onPostback={onPostback}
                onNavigate={onNavigate}
              />
            </If>
          ))}
        </div>
      </If>
    </Card>
  )
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
  const responses = endpoint.fields.filter((f) => f.group === 'responses' && f.render !== false)
  const [sending, setSending] = useState(true)
  const [responseCode, setResponseCode] = useState<string>(responses[0]?.name ?? 'none')
  const [values, setValues] = useState<Record<FieldGroup, Record<string, unknown>>>(() => createInitialFormValues({ endpoint }))

  async function sendRequest(formValues: Record<FieldGroup, Record<string, unknown>>) {
    if (!baseUrl) {
      setSending(false)
      return
    }

    setSending(true)

    try {
      const result = await executeRequest({ baseUrl, endpoint, values: formValues, auth })

      setValues((prev) => ({
        ...prev,
        responses: { ...prev.responses, [responseCode]: result.data },
      }))

      if (endpoint.returnBind?.length) {
        applyReturnBind(endpoint.returnBind, result.data)
      }
    } finally {
      setSending(false)
    }
  }

  function setFieldValue(id: string, value: unknown, timeout?: number): void {
    const { group, path } = splitFieldId(id)

    function set(obj: Record<string, unknown>, [head, ...tail]: string[]): Record<string, unknown> {
      if (tail.length === 0) return { ...obj, [head]: value }
      return { ...obj, [head]: set((obj[head] as Record<string, unknown>) ?? {}, tail) }
    }

    const next = { ...values, [group]: set(values[group] as Record<string, unknown>, path) }

    setValues(next)

    if (timeout !== undefined) {
      if (timeoutActionRef.current) clearTimeout(timeoutActionRef.current)
      timeoutActionRef.current = setTimeout(() => sendRequest(next), timeout)
    } else {
      sendRequest(next)
    }
  }

  function applyReturnBind(returnBind: ActionBind[], returnData: unknown) {
    const data =
      returnData && typeof returnData === 'object' && !Array.isArray(returnData)
        ? (returnData as Record<string, unknown>)
        : {}

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
        } else {
          setNestedValue({ target: next[group as FieldGroup], segments, value: rawValue })
        }
      }

      return next
    })
  }

  function buildNavigateArgs(
    targetRoutePath: string,
    boundValues: Record<FieldGroup, Record<string, unknown>>
  ): [string, { state: unknown }] {
    let resolvedPath = targetRoutePath

    for (const [key, val] of Object.entries(boundValues.path ?? {})) {
      resolvedPath = resolvedPath.replace(`:${key}`, encodeURIComponent(String(val ?? '')))
    }

    const qs = new URLSearchParams()
    for (const [key, val] of Object.entries(boundValues.query ?? {})) {
      if (val !== undefined && val !== null && val !== '') qs.set(key, String(val))
    }

    const search = qs.toString() ? `?${qs.toString()}` : ''
    const stateValues: Partial<Record<FieldGroup, Record<string, unknown>>> = {}

    for (const group of ['body', 'header', 'cookie'] as FieldGroup[]) {
      if (Object.keys(boundValues[group] ?? {}).length > 0) stateValues[group] = boundValues[group]
    }

    return [`${resolvedPath}${search}`, { state: { values: stateValues } }]
  }

  function handleActionNavigate(
    targetRoutePath: string,
    boundValues: Record<FieldGroup, Record<string, unknown>>
  ) {
    const [to, options] = buildNavigateArgs(targetRoutePath, boundValues)
    navigate(to, options)
  }

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
        return
      }

      const result = await executeRequest({ baseUrl, endpoint: action.endpoint, values: requestValues, auth })

      if (action.returnBind?.length) {
        applyReturnBind(action.returnBind, result.data)
      }
    })
  }

  function runAutoAction(actionValues: Record<FieldGroup, Record<string, unknown>>) {
    if (!baseUrl || endpoint.method !== 'get' || !endpoint.runOnInit) {
      setSending(false)
      return
    }

    const missing = getMissingRequiredParams(endpoint, actionValues)
    if (missing.length > 0) {
      toast.error(`Parâmetros obrigatórios não preenchidos na requisição automática: ${missing.join(', ')}`)
      setSending(false)
      return
    }

    sendRequest(actionValues)
  }

  useEffect(() => {
    const initValue = getInitialValues()
    runInitAction(initValue)
    runAutoAction(initValue)
    setValues(initValue)
  }, [endpoint.id])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex-1 flex items-end gap-3">
        <EndpointPanelForSearch
          endpoint={endpoint}
          values={values}
          onFieldChange={setFieldValue}
        />

        <EndpointPanelForParameters
          endpoint={endpoint}
          values={values}
          onFieldChange={setFieldValue}
        />

        <button
          type="button"
          onClick={() => sendRequest(values)}
          disabled={sending}
          className="text-zinc-200 text-xs hover:underline rounded border border-zinc-800 min-w-12 min-h-12 flex items-center justify-center hover:bg-purple-600/15 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RotateCcw className={`w-5 h-5 transition-transform ${sending ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <EndpointPanelForBody
        endpoint={endpoint}
        values={values}
        onFieldChange={setFieldValue}
      />

      <EndpointPanelForResponse
        endpoint={endpoint}
        values={values}
        onFieldChange={setFieldValue}
        sending={sending}
        responseCode={responseCode}
        onResponseCodeChange={setResponseCode}
        baseUrl={baseUrl}
        auth={auth}
        onPostback={() => sendRequest(values)}
        onNavigate={handleActionNavigate}
      />
    </div>
  )
}