import { useContext, useEffect, useRef, useState } from 'react'
import { ConditionalGroup, If, IModalController, ModalClose, ModalContext } from 'react-base-components'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import Button from '../components/button'
import Card from '../components/card'
import Text from '../components/input-text'
import Label from '../components/label'
import ModalRoot from '../components/modal-root'
import { StaticFieldForBoolean } from './static-field'
import { useAuth } from '../context/auth-context'
import { executeRequest } from '../services/request-executor'
import { createInitialFormValues, setNestedValue } from '../utils/openapi/build-url'
import { DinamicField } from './dinamic-field'
import { OpenApiContext } from '../context/openapi-context'
import type { AuthType } from '../types/auth'
import type { ActionBind, ApiResponseResult, FieldGroup, OperationEndpoint, OperationField, } from '../types/operation'
import { RotateCcw, SlidersHorizontal } from 'lucide-react'
import InputRoot from '../components/input-root'
import { getMissingRequiredParams, resolveBind } from '../services/openapi-normalizer'
import { toast } from 'react-toastify'
import { ToggleGroup, ToggleGroupButton } from '../components/toogle-group'
import { ToggleGroupContext } from 'react-base-components'

export function AuthPanel(props: any) {
    const AUTH_OPTIONS: Array<{ value: AuthType; label: string }> = [
        { value: 'none' as const, label: 'Nenhuma' },
        { value: 'bearer' as const, label: 'Bearer Token' },
        { value: 'basic' as const, label: 'Basic Auth' },
        { value: 'apiKey' as const, label: 'API Key' },
    ]

    const { auth, updateAuth } = useAuth()

    return (
        <Card>
            <div className="flex items-center justify-between gap-3 mb-3">
                <h3 className="text-sm font-semibold text-zinc-300">Auth proxy</h3>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
                <ToggleGroupContext value={auth.type} onChange={(v) => updateAuth('type', v.toString() as AuthType)}>
                    <ToggleGroup>
                        {AUTH_OPTIONS.map((opt) => (
                            <ToggleGroupButton key={opt.value} value={opt.value}>
                                {opt.label}
                            </ToggleGroupButton>
                        ))}
                    </ToggleGroup>
                </ToggleGroupContext>
            </div>
            <If conditional={auth.type === 'none'}>
                <p className="text-xs text-zinc-400">Nenhuma autenticação será aplicada nas requisições, mesmo que o endpoint exija.</p>
            </If>
            <If conditional={auth.type === 'bearer'}>
                <InputRoot>
                    <Label>Token</Label>
                    <Text
                        type="password"
                        value={auth.bearerToken}
                        onChange={(v) => updateAuth('bearerToken', v.target.value)}
                        placeholder="eyJhbGciOiJIUzI1NiIs..."
                    />
                </InputRoot>
            </If>
            <If conditional={auth.type === 'basic'}>
                <div className="flex flex-col gap-2">
                    <InputRoot>
                        <Label>Usuário</Label>
                        <Text value={auth.basicUsername} onChange={(v) => updateAuth('basicUsername', v.target.value)} />
                    </InputRoot>
                    <InputRoot>
                        <Label>Senha</Label>
                        <Text type="password" value={auth.basicPassword} onChange={(v) => updateAuth('basicPassword', v.target.value)} />
                    </InputRoot>
                </div>
            </If>
            <If conditional={auth.type === 'apiKey'}>
                <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                        <button
                            type="button"
                            className={`text-xs px-2 py-1 rounded ${auth.apiKeyIn === 'header' ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-400'
                                }`}
                            onClick={() => updateAuth('apiKeyIn', 'header')}
                        >
                            Header
                        </button>
                        <button
                            type="button"
                            className={`text-xs px-2 py-1 rounded ${auth.apiKeyIn === 'query' ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-400'
                                }`}
                            onClick={() => updateAuth('apiKeyIn', 'query')}
                        >
                            Query
                        </button>
                    </div>
                    <InputRoot>
                        <Label>Nome da chave</Label>
                        <Text value={auth.apiKeyName} onChange={(v) => updateAuth('apiKeyName', v.target.value)} placeholder="X-Api-Key" />
                    </InputRoot>
                    <InputRoot>
                        <Label>Valor</Label>
                        <Text type="password" value={auth.apiKeyValue} onChange={(v) => updateAuth('apiKeyValue', v.target.value)} />
                    </InputRoot>
                </div>
            </If>
        </Card>
    )
}