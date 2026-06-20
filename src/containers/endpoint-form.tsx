import { useContext, useEffect, useRef, useState } from 'react'
import { IModalController, ModalClose, ModalContext } from 'react-base-components'
import { useLocation, useSearchParams } from 'react-router-dom'
import Button from '../components/button'
import Card from '../components/card'
import Text from '../components/input-text'
import Label from '../components/label'
import ModalRoot from '../components/modal-root'
import { ResponseSchema } from '../containers/response-panel'
import { useAuth } from '../context/auth-context'
import { executeRequest } from '../services/request-executor'
import { createInitialFormValues } from '../utils/openapi/build-url'
import { SchemaField } from './schema-field'
import { OpenApiContext } from '../context/openapi-context'
import type { AuthType } from '../types/auth'
import type { ActionBind, ApiOperation, ApiResponseResult, FieldGroup, OperationEndpoint, OperationField } from '../types/operation'
import { RotateCcw, SlidersHorizontal } from 'lucide-react'
import InputRoot from '../components/input-root'
import { setNestedValue } from '../utils/openapi/build-url'
import { resolveBind } from '../services/openapi-normalizer'
import { toast } from 'react-toastify'

export interface EndpointFormProps {
  operation: ApiOperation
  endpoint: OperationEndpoint
}

export function EndpointForm({ operation, endpoint }: EndpointFormProps) {
  const AUTH_OPTIONS: Array<{ value: AuthType; label: string }> = [
    { value: 'none' as const, label: 'Nenhuma' },
    { value: 'bearer' as const, label: 'Bearer Token' },
    { value: 'basic' as const, label: 'Basic Auth' },
    { value: 'apiKey' as const, label: 'API Key' },
  ]

  const location = useLocation()
  const { auth, updateAuth } = useAuth()
  const { baseUrl } = useContext(OpenApiContext)
  const [response, setResponse] = useState<ApiResponseResult | null>(null)
  const [sending, setSending] = useState(false)
  const timeoutActionRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initRanRef = useRef<string | null>(null)
  const fields = endpoint.fields

  const [values, setValues] = useState<Record<FieldGroup, Record<string, unknown>>>(() => {
    return createInitialFormValues({ operation })
  })

  const parametersGroups = groupFields(fields).filter((group) => group !== 'body' && group !== 'responses')
  const body = fields.filter((field) => field.group === 'body' && field.render !== false)
  const responses = fields.filter((field) => field.group === 'responses' && field.path.includes('200') && field.render !== false)
  const parameters = fields.filter((field) => field.group !== 'body' && field.group !== 'responses' && field.render !== false)
  const modalParametersContext = useRef<IModalController>(null)
  const startFieldset = responses.filter(e => e.render !== false).length > 1;
  const dinamicFields = fieldExists('query.SearchInput', fields)

  async function sendRequest() {
    if (!baseUrl || sending) return

    setSending(true)
    setResponse(null)

    try {
      const result = await executeRequest({ baseUrl, operation, values, auth })

      setResponse(result)

    }
    finally {
      setSending(false)
    }
  }

  function applyReturnBind(
    returnBind: ActionBind[],
    returnData: unknown,
    setValues: React.Dispatch<React.SetStateAction<Record<FieldGroup, Record<string, unknown>>>>
  ) {
    const data = (returnData && typeof returnData === 'object' && !Array.isArray(returnData))
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

        // Objeto complexo → distribui filhos automaticamente
        if (rawValue !== null && typeof rawValue === 'object' && !Array.isArray(rawValue)) {
          for (const [key, val] of Object.entries(rawValue as Record<string, unknown>)) {
            setNestedValue({
              target: next[group as FieldGroup],
              segments: [...segments, key],
              value: val,
            })
          }
        } else {
          setNestedValue({
            target: next[group as FieldGroup],
            segments,
            value: rawValue,
          })
        }
      }

      return next
    })
  }

  function groupFields(fields: OperationField[]): FieldGroup[] {
    return fields.reduce((acc: FieldGroup[], field) => (acc.includes(field.group) ? acc : [...acc, field.group]), [])
  }

  function onParamChange(location: FieldGroup, name: string, value: unknown) {
    setValues((prev) => {
      const currentValues = prev[location] && typeof prev[location] === 'object' ? prev[location] : {}
      return {
        ...prev,
        [location]: { ...currentValues, [name]: value },
      }
    })
  }

  function getValueByPath(values: Record<string, unknown>, path: string[]): unknown {
    return path.reduce((acc, key) => (acc as Record<string, unknown>)?.[key], values as unknown)
  }

  function setValueByPath(values: Record<string, unknown>, path: string[], value: unknown): Record<string, unknown> {
    const [head, ...tail] = path
    if (tail.length === 0) return { ...values, [head]: value }
    return {
      ...values,
      [head]: setValueByPath((values[head] as Record<string, unknown>) ?? {}, tail, value),
    }
  }

  function getFieldValue(group: FieldGroup, path: string[]): unknown {
    return getValueByPath(values[group] as Record<string, unknown>, path)
  }

  function setFieldValue(group: FieldGroup, path: string[], value: unknown) {
    setValues((prev) => ({
      ...prev,
      [group]: setValueByPath(prev[group] as Record<string, unknown>, path, value),
    }))

    if (timeoutActionRef.current) clearTimeout(timeoutActionRef.current)

    timeoutActionRef.current = setTimeout(() => {
      sendRequest()
    }, 500)
  }

  function fieldExists(id: string, ops: OperationField[]): OperationField | undefined {
    const path = id.split('.').splice(1) // remove group

    for (let index = 0; index < path.length; index++) {
      const element = path[index];

      for (const op of ops) {
        if (op.name === element) {
          if (index === path.length - 1) {
            return op
          }

          else if (op.children) {
            const child = fieldExists(path.slice(index + 1).join('.'), op.children)

            if (child) {
              return child
            }
          }
        }
      }
    }
  }

  function getMissingRequiredParams(operation: ApiOperation, values: Record<FieldGroup, Record<string, unknown>>): string[] {
    return operation.parameters
      .filter((p) => p.required)
      .filter((p) => {
        const [group, ...segments] = p.name.includes('.')
          ? p.name.split('.')
          : [p.in, p.name]
        const groupValues = values[group as FieldGroup] ?? {}
        const val = segments.reduce<unknown>(
          (acc, key) => (acc as Record<string, unknown>)?.[key],
          groupValues
        )
        return val === undefined || val === null || val === ''
      })
      .map((p) => `${p.in}.${p.name}`)
  }

  function runInitAction() {
    const initActions = endpoint.actions.filter((a) => a.type === 'init')

    if (!initActions.length || !baseUrl) {
      return
    }

    const initKey = `${operation.id}:${JSON.stringify(location.state)}`

    if (initRanRef.current === initKey) {
      return
    }

    initRanRef.current = initKey

    const locationValues = (location.state?.values ?? {}) as Record<FieldGroup, Record<string, unknown>>

    initActions.forEach(async (action) => {
      const flatItem: Record<string, unknown> = {}

      for (const [groupName, group] of Object.entries(locationValues)) {
        if (group && typeof group === 'object') {
          Object.assign(flatItem, group)
        }
      }

      const requestValues = resolveBind(action.bind, flatItem)

      const missing = getMissingRequiredParams(action.operation, requestValues)

      if (missing.length > 0) {
        toast.error(`Durante a requisição da action ${action.label}, foi detectado que parâmetros orbigatórios não estão preenchidos, vericicar em logs.`)

        console.warn('Parâmetros obrigatórios não preenchidos:', missing)


        return
      }

      const result = await executeRequest({
        baseUrl,
        operation: action.operation,
        values: requestValues,
        auth
      })

      if (action.returnBind?.length) {
        applyReturnBind(action.returnBind, result.data, setValues)
      }
    })
  }

  function runAutoAction() {
    if (!baseUrl || operation.method !== 'get' || !endpoint.runOnInit) {
      return
    }

    const missing = getMissingRequiredParams(operation, values)

    if (missing.length > 0) {
      toast.error(`Durante a requisição automática, foi detectado que parâmetros orbigatórios não estão preenchidos, vericicar em logs.`)

      console.warn('Parâmetros obrigatórios não preenchidos:', missing)

      return
    }

    sendRequest()
  }

  useEffect(() => {
    if (location.state?.values != null || location.state?.values !== undefined) {
      setValues(location.state.values)
    }

    runInitAction()
    runAutoAction()
  }, [operation])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex-1 flex items-end gap-3">
        {dinamicFields && (
          <SchemaField
            field={dinamicFields}
            value={String(getFieldValue(dinamicFields.group, dinamicFields.path) ?? '')}
            onChange={(v) => setFieldValue(dinamicFields.group, dinamicFields.path, v)}
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
          onClick={() => sendRequest()}
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
                    <div key={`${group}_header`} className="flex items-center justify-between mb-3">
                      <h3 className="text-base font-semibold text-purple-300 mb-3">
                        {group[0]?.toUpperCase() + group.slice(1)}
                      </h3>
                    </div>
                    {parameters.map((field, i) => (
                      <SchemaField
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

      {body.length > 0 && (
        <Card>
          <h3 className="text-base font-semibold text-purple-300 mb-3">Body</h3>
          {body.filter((f) => f.group === 'body').map((field, i) => (
            <SchemaField
              key={`${i}`}
              field={{ ...field, fieldset: body.length > 1 }}
              value={values?.[field.group]?.[field.name]}
              onChange={(next) => onParamChange('body', field.name, next)}
            />
          ))}
        </Card>
      )}

      {responses.length > 0 && (
        <Card>
          <h3 className="text-base font-semibold text-purple-300 mb-3">Response</h3>

          {sending ? (
            <div className="flex flex-col gap-3 animate-pulse py-1">
              <div className="h-2.5 bg-zinc-700 rounded-full w-2/3" />
              <div className="flex gap-2">
                <div className="h-2.5 bg-zinc-700 rounded-full w-1/2" />
                <div className="h-2.5 bg-zinc-700 rounded-full w-1/4" />
              </div>
              <div className="h-2.5 bg-zinc-700 rounded-full w-4/5" />
              <div className="h-2.5 bg-zinc-700 rounded-full w-1/3" />
            </div>
          ) : (
            responses.map((responseField, i) => (
              <ResponseSchema
                key={i}
                field={{ ...responseField, fieldset: startFieldset }}
                value={response?.data}
                actions={endpoint.actions}
                baseUrl={baseUrl}
                auth={auth}
                fieldPath={responseField.id}
                onPostback={() => sendRequest()}
              />
            ))
          )}
        </Card>
      )}

      <Card>
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="text-sm font-semibold text-zinc-300">Auth proxy</h3>
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {AUTH_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => updateAuth('type', opt.value)}
              className={`px-3 py-1 rounded text-xs transition-all ${auth.type === opt.value
                ? 'bg-main-violet-500 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:text-white'
                }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {auth.type === 'bearer' && (
          <InputRoot>
            <Label>Token</Label>
            <Text
              type="password"
              value={auth.bearerToken}
              onChange={(v) => updateAuth('bearerToken', v.target.value.toString())}
              placeholder="eyJhbGciOiJIUzI1NiIs..."
            />
          </InputRoot>
        )}

        {auth.type === 'basic' && (
          <div className="flex flex-col gap-2">
            <InputRoot>
              <Label>Usuário</Label>
              <Text value={auth.basicUsername} onChange={(v) => updateAuth('basicUsername', v.target.value.toString())} />
            </InputRoot>
            <InputRoot>
              <Label>Senha</Label>
              <Text type="password" value={auth.basicPassword} onChange={(v) => updateAuth('basicPassword', v.target.value.toString())} />
            </InputRoot>
          </div>
        )}

        {auth.type === 'apiKey' && (
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                type="button"
                className={`text-xs px-2 py-1 rounded ${auth.apiKeyIn === 'header' ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}
                onClick={() => updateAuth('apiKeyIn', 'header')}
              >
                Header
              </button>
              <button
                type="button"
                className={`text-xs px-2 py-1 rounded ${auth.apiKeyIn === 'query' ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}
                onClick={() => updateAuth('apiKeyIn', 'query')}
              >
                Query
              </button>
            </div>
            <InputRoot>
              <Label>Nome da chave</Label>
              <Text value={auth.apiKeyName} onChange={(v) => updateAuth('apiKeyName', v.target.value.toString())} placeholder="X-Api-Key" />
            </InputRoot>
            <InputRoot>
              <Label>Valor</Label>
              <Text type="password" value={auth.apiKeyValue} onChange={(v) => updateAuth('apiKeyValue', v.target.value.toString())} />
            </InputRoot>
          </div>
        )}
      </Card>
    </div>
  )
}