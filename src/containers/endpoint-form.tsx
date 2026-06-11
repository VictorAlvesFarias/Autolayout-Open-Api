import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ApiOperation, ApiResponseResult } from '../types/operation'
import type { AuthType } from '../types/auth'
import Card from '../components/card'
import SchemaField from './schema-field'
import Text from '../components/input-text'
import Label from '../components/label'
import { useAuth } from '../context/auth-context'
import { useOpenApi } from '../context/openapi-context'
import { executeRequest } from '../services/request-executor'
import { createInitialFormValues } from '../utils/openapi/build-url'
import { FieldGroup, normalizeOperation } from '../services/openapi-normalizer'
import { ModalClose, ModalContext, ModalOpen } from 'react-base-components'
import ModalRoot from '../components/modal-root'
import Button from '../components/button'
import { ResponseSchema } from '../containers/response-panel'
import { useSearchParams } from 'react-router-dom'

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
  const { baseUrl } = useOpenApi()
  const [response, setResponse] = useState<ApiResponseResult | null>(null)
  const [sending, setSending] = useState(false)
  const [values, setValues] = useState<Record<FieldGroup, Record<string, unknown>>>(() => createInitialFormValues(operation))
  const [searchParams] = useSearchParams()
  const lastAutoRunOperationId = useRef<string | null>(null)
  const fields = normalizeOperation(operation)
  const parametersGroups = groupFields(fields).filter((group) => group !== 'body' && group !== 'responses')
  const body = fields.filter((field) => field.group === 'body')
  const responses = fields.filter((field) => field.group === 'responses' && field.path.includes('200'))
  const parameters = fields.filter((field) => field.group !== 'body' && field.group !== 'responses')

  useEffect(() => {
    const session = searchParams.get('session')

    if (!session) {
      return;
    }

    console.log(values)

    localStorage.setItem(session, JSON.stringify(values))
  }, [values])

  useEffect(() => {
    const session = localStorage.getItem('session')

    if (!session) {
      return;
    }

    console.log(JSON.parse(session))

    setValues(JSON.parse(session))
  }, [])

  const sendRequest = useCallback(async () => {
    if (!baseUrl || sending) {
      return
    }

    setSending(true)
    setResponse(null)

    try {
      const result = await executeRequest(baseUrl, operation, values, auth)

      setResponse(result)
    }
    finally {
      setSending(false)
    }
  }, [auth, baseUrl, operation, sending, values])

  function onParamChange(location: FieldGroup, name: string, value: unknown) {
    console.log(new Date().toISOString() + ' - EndpointForm.onParamChange - location, name, value:', JSON.stringify({ location, name, value }))

    setValues((prev) => {
      // console.log(new Date().toISOString() + ' - EndpointForm.onParamChange - setValues - prev:', JSON.stringify({ prev }))

      const currentValues = prev[location] && typeof prev[location] === 'object' ? (prev[location]) : {}

      // console.log(new Date().toISOString() + ' - EndpointForm.onParamChange - setValues - currentValues:', JSON.stringify({ currentValues }))

      const nextValues = {
        ...prev,
        [location]: {
          ...currentValues,
          [name]: value,
        },
      }

      // console.log(new Date().toISOString() + ' - EndpointForm.onParamChange - setValues - currentValues:', JSON.stringify({ nextValues }))

      return nextValues
    })
  }

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

  useEffect(() => {
    setValues(createInitialFormValues(operation))
    setResponse(null)

    lastAutoRunOperationId.current = null
  }, [operation])

  return (
    <div className="flex flex-col gap-4">
      <ModalContext>
        <div className="flex-1 flex items-end w-fit gap-3">
          <ModalOpen className="w-full h-fit">
            <Button>Parameters</Button>
          </ModalOpen>

          <Button onClick={() => sendRequest()}>Refresh</Button>
        </div>

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
            // console.log(new Date().toISOString() + ' - EndpointForm.return - body.filter - field, i:', JSON.stringify({ field, i }))

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
      )
      }

      {
        responses.length > 0 && (
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
        )
      }

      <Card>
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="text-sm font-semibold text-zinc-300">Auth proxy</h3>
          <button
            type="button"
            onClick={() => void sendRequest()}
            disabled={!baseUrl || sending}
            className="text-xs rounded border border-zinc-800 px-3 py-1 text-zinc-300 hover:text-white hover:bg-violet-500/10 transition-all disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sending ? 'Enviando...' : 'Executar'}
          </button>
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
          <div>
            <Label>Token</Label>
            <Text
              type="password"
              value={auth.bearerToken}
              onChange={(v) => updateAuth('bearerToken', v.target.value.toString())}
              placeholder="eyJhbGciOiJIUzI1NiIs..."
            />
          </div>
        )}

        {auth.type === 'basic' && (
          <div className="flex flex-col gap-2">
            <div>
              <Label>Usuário</Label>
              <Text
                value={auth.basicUsername}
                onChange={(v) => updateAuth('basicUsername', v.target.value.toString())}
              />
            </div>

            <div>
              <Label>Senha</Label>
              <Text
                type="password"
                value={auth.basicPassword}
                onChange={(v) => updateAuth('basicPassword', v.target.value.toString())}
              />
            </div>
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

            <div>
              <Label>Nome da chave</Label>
              <Text
                value={auth.apiKeyName}
                onChange={(v) => updateAuth('apiKeyName', v.target.value.toString())}
                placeholder="X-Api-Key"
              />
            </div>

            <div>
              <Label>Valor</Label>
              <Text
                type="password"
                value={auth.apiKeyValue}
                onChange={(v) => updateAuth('apiKeyValue', v.target.value.toString())}
              />
            </div>
          </div>
        )}
      </Card>
    </div >
  )
}

function groupFields(fields: ReturnType<typeof normalizeOperation>): FieldGroup[] {
  return fields.reduce((acc: FieldGroup[], field) => (acc.includes(field.group) ? acc : [...acc, field.group]), [])
}

export default EndpointForm