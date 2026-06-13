import { useContext, useEffect, useRef, useState } from 'react'
import { IModalController, ModalClose, ModalContext, ModalOpen } from 'react-base-components'
import { useSearchParams } from 'react-router-dom'
import Button from '../components/button'
import Card from '../components/card'
import Text from '../components/input-text'
import Label from '../components/label'
import ModalRoot from '../components/modal-root'
import { ResponseSchema } from '../containers/response-panel'
import { useAuth } from '../context/auth-context'
import { normalizeOperation } from '../services/openapi-normalizer'
import { executeRequest } from '../services/request-executor'
import { createInitialFormValues } from '../utils/openapi/build-url'
import { SchemaField } from './schema-field'
import { OpenApiContext } from '../context/openapi-context'

import type { AuthType } from '../types/auth'
import type { ApiOperation, ApiResponseResult, FieldGroup } from '../types/operation'
import { Grip, RotateCcw, SlidersHorizontal } from 'lucide-react'
import InputRoot from '../components/input-root'

export interface EndpointFormProps {
  operation: ApiOperation
}

export function EndpointForm({ operation }: EndpointFormProps) {
  const AUTH_OPTIONS: Array<{ value: AuthType; label: string }> = [
    { value: 'none' as const, label: 'Nenhuma' },
    { value: 'bearer' as const, label: 'Bearer Token' },
    { value: 'basic' as const, label: 'Basic Auth' },
    { value: 'apiKey' as const, label: 'API Key' },
  ]

  const { auth, updateAuth } = useAuth()
  const { baseUrl } = useContext(OpenApiContext)
  const [response, setResponse] = useState<ApiResponseResult | null>(null)
  const [sending, setSending] = useState(false)
  const [searchParams] = useSearchParams()
  const lastAutoRunOperationId = useRef<string | null>(null)
  const timeoutActionRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [values, setValues] = useState<Record<FieldGroup, Record<string, unknown>>>(() => createInitialFormValues({ operation }))

  const fields = normalizeOperation(operation, [
    {
      match: (field) => field.id.toLowerCase() == 'query.name',
      patch: (field) => { return { ...field, render: false } },
    }
  ])

  const parametersGroups = groupFields(fields).filter((group) => group !== 'body' && group !== 'responses')
  const body = fields.filter((field) => field.group === 'body')
  const responses = fields.filter((field) => field.group === 'responses' && field.path.includes('200'))
  const parameters = fields.filter((field) => field.group !== 'body' && field.group !== 'responses')
  const modalParametersContext = useRef<IModalController>(null)

  async function sendRequest() {
    if (!baseUrl || sending) {
      return
    }

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

  function groupFields(fields: ReturnType<typeof normalizeOperation>): FieldGroup[] {
    return fields.reduce((acc: FieldGroup[], field) => (acc.includes(field.group) ? acc : [...acc, field.group]), [])
  }

  function onParamChange(location: FieldGroup, name: string, value: unknown) {
    console.log(new Date().toISOString() + ' - EndpointForm.onParamChange - location, name, value:', JSON.stringify({ location, name, value }))

    setValues((prev) => {
      const currentValues = prev[location] && typeof prev[location] === 'object' ? (prev[location]) : {}

      const nextValues = {
        ...prev,
        [location]: {
          ...currentValues,
          [name]: value,
        },
      }

      return nextValues
    })
  }

  function getValueByPath(values: Record<string, unknown>, path: string[]): unknown {
    return path.reduce((acc, key) => (acc as Record<string, unknown>)?.[key], values as unknown)
  }

  function setValueByPath(values: Record<string, unknown>, path: string[], value: unknown): Record<string, unknown> {
    const [head, ...tail] = path

    if (tail.length === 0) {
      return { ...values, [head]: value }
    }

    return {
      ...values,
      [head]: setValueByPath(
        (values[head] as Record<string, unknown>) ?? {},
        tail,
        value
      ),
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

    if (timeoutActionRef.current) {
      clearTimeout(timeoutActionRef.current)
    }

    timeoutActionRef.current = setTimeout(() => {
      sendRequest()
    }, 500)
  }

  useEffect(() => {
    const session = searchParams.get('session')

    if (!session) {
      return
    }

    localStorage.setItem(session, JSON.stringify(values))
  }, [values, searchParams])

  useEffect(() => {
    const hasRequiredInputs = operation.parameters.some((parameter) => parameter.required) || Boolean(operation.requestBody?.required)

    if (!baseUrl || hasRequiredInputs) {
      return
    }

    if (lastAutoRunOperationId.current === operation.id) {
      return
    }

    lastAutoRunOperationId.current = operation.id

    sendRequest()
  }, [baseUrl, operation.id, operation.parameters, operation.requestBody?.required, sendRequest])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex-1 flex items-end gap-3">
        <InputRoot>
          <Text
            value={String(getFieldValue('query', ['name']) ?? '')}
            onChange={(v) => setFieldValue('query', ['name'], v.target.value)}
          />
        </InputRoot>
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
          className="text-zinc-200 text-xs hover:underline rounded border border-zinc-800 min-w-12 min-h-12 flex items-center justify-center hover:bg-purple-600/15 transition-all"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>
      <ModalContext ref={modalParametersContext}>
        <ModalRoot>
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-full max-h-full max-w-2xl bg-main-black-800 flex flex-col gap-6 rounded text-white">
              <Card>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-semibold text-purple-300 mb-3">Parameters</h3>
                  <ModalClose>
                    <Button>Close</Button>
                  </ModalClose>
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
          {body.filter((field) => field.group === 'body').map((field, i) => {
            return (
              <SchemaField
                key={`${i}`}
                field={{ ...field, fieldset: body.length > 1 }}
                value={values?.[field.group]?.[field.name]}
                onChange={(next) => onParamChange('body', field.name, next)}
              />
            )
          })}
        </Card>
      )}

      {responses.length > 0 && (
        <Card>
          <h3 className="text-base font-semibold text-purple-300 mb-3">
            Response
          </h3>

          {responses.map((responseField) =>
            <ResponseSchema
              field={{ ...responseField, fieldset: responses.length > 1 }}
              value={response?.data}
            />
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
              <Text
                value={auth.basicUsername}
                onChange={(v) => updateAuth('basicUsername', v.target.value.toString())}
              />
            </InputRoot>
            <InputRoot>
              <Label>Senha</Label>
              <Text
                type="password"
                value={auth.basicPassword}
                onChange={(v) => updateAuth('basicPassword', v.target.value.toString())}
              />
            </InputRoot>
          </div>
        )}

        {auth.type === 'apiKey' && (
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                type="button"
                className={`text-xs px-2 py-1 rounded ${auth.apiKeyIn === 'header'
                  ? 'bg-violet-600 text-white'
                  : 'bg-zinc-800 text-zinc-400'
                  }`}
                onClick={() => updateAuth('apiKeyIn', 'header')}
              >
                Header
              </button>

              <button
                type="button"
                className={`text-xs px-2 py-1 rounded ${auth.apiKeyIn === 'query'
                  ? 'bg-violet-600 text-white'
                  : 'bg-zinc-800 text-zinc-400'
                  }`}
                onClick={() => updateAuth('apiKeyIn', 'query')}
              >
                Query
              </button>
            </div>
            <InputRoot>
              <Label>Nome da chave</Label>
              <Text
                value={auth.apiKeyName}
                onChange={(v) => updateAuth('apiKeyName', v.target.value.toString())}
                placeholder="X-Api-Key"
              />
            </InputRoot>
            <InputRoot>
              <Label>Valor</Label>
              <Text type="password" value={auth.apiKeyValue} onChange={(v) => updateAuth('apiKeyValue', v.target.value.toString())} />
            </InputRoot>
          </div>
        )}
      </Card>
    </div >
  )
}