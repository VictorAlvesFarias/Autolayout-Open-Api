import { Check, Grip } from 'lucide-react'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AccordionContext, If, IModalController, ModalClose, ModalContext } from 'react-base-components'
import Accordion from '../components/accordion'
import AccordionRoot from '../components/accordion-root'
import AccordionTitle from '../components/accordion-title'
import Button from '../components/button'
import Card from '../components/card'
import Checkbox from '../components/checkbox'
import InputRoot from '../components/input-root'
import Text from '../components/input-text'
import Label from '../components/label'
import ModalRoot from '../components/modal-root'
import { findResponsePanelTableLabel, findResponsePanelTableValues, formatValue, isObjectArray, normalizeValue, resolveBind } from '../services/openapi-normalizer'
import { executeRequest } from '../services/request-executor'
import { setNestedValue } from '../utils/openapi/build-url'
import type { ActionBind, FieldGroup, OperationField, ResolvedAction } from '../types/operation'
import type { AuthState } from '../types/auth'

export interface ResponsePanelProps {
  field: OperationField
  value: unknown
  actions?: ResolvedAction[]
  baseUrl?: string
  auth?: AuthState
  fieldPath?: string
  onPostback?: () => void
}

function useFieldActions(
  actions: ResolvedAction[] | undefined,
  fieldPath: string | undefined,
  baseUrl: string | undefined,
  auth: AuthState | undefined,
  onPostback: (() => void) | undefined,
) {
  const navigate = useNavigate()
  const localActions = (actions ?? []).filter((a) => a.path === fieldPath)
  const hasActions = localActions.length > 0

  const modalActionsRef = useRef<IModalController>(null)
  const modalResultRef = useRef<IModalController>(null)
  const [actionResult, setActionResult] = useState<{ action: ResolvedAction; data: unknown } | null>(null)
  const [runningAction, setRunningAction] = useState(false)
  const [activeItem, setActiveItem] = useState<unknown>(null)

  async function runAction(action: ResolvedAction) {
    if (runningAction) return

    const item = (activeItem ?? {}) as Record<string, unknown>

    if (action.type === 'navigate') {
      const values = resolveBind(action.bind, item)
      const routePath = `${action.operation.path}_${action.operation.method}`

      console.log(values)
      navigate(routePath, { state: { values } })

      modalActionsRef.current?.close()

      return
    }

    if (!baseUrl) return

    const values = resolveBind(action.bind, item)

    setRunningAction(true)

    try {
      const result = await executeRequest({ baseUrl, operation: action.operation, values, auth: auth! })

      setActionResult({ action, data: result.data })

      modalActionsRef.current?.close()

      if (action.postback) {
        onPostback?.()
      }
      else {
        modalResultRef.current?.open()
      }
    }
    finally {
      setRunningAction(false)
    }
  }

  const modals = hasActions ? (
    <>
      <ModalContext ref={modalActionsRef}>
        <ModalRoot>
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-full max-h-full max-w-2xl bg-main-black-800 flex flex-col gap-6 rounded text-white">
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-purple-300">Actions</h3>
                  <ModalClose><Button type='button'>Close</Button></ModalClose>
                </div>
                <div className="flex flex-col gap-2">
                  {localActions.map((action, i) => (
                    <Button
                      key={i}
                      type="button"
                      variation='outline'
                      disabled={runningAction}
                      onClick={() => runAction(action)}
                    >
                      <Grip className="w-5 h-5 text-purple-400" />
                      <span>{action.label}</span>
                    </Button>
                  ))}
                </div>
                {runningAction && (
                  <div className="mt-3 flex items-end gap-[2px] h-4">
                    {[10, 16, 8, 14, 7].map((h, i) => (
                      <div key={i} className="w-[2px] rounded-sm bg-purple-400 origin-bottom" style={{
                        height: h,
                        animation: 'pulse-bar 1.1s ease-in-out infinite',
                        animationDelay: `${i * 0.15}s`,
                      }} />
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </ModalRoot>
      </ModalContext>

      <ModalContext ref={modalResultRef}>
        <ModalRoot>
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-full max-h-full max-w-2xl bg-main-black-800 flex flex-col gap-6 rounded text-white">
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-semibold text-purple-300">{actionResult?.action.label}</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {actionResult?.action.operation?.method?.toUpperCase()} {actionResult?.action.operation?.path}
                    </p>
                  </div>
                  <ModalClose><Button type='button'>Close</Button></ModalClose>
                </div>
                {actionResult && (
                  <ResponseSchema
                    field={actionResult.action.operation?.responses?.[0] as unknown as OperationField}
                    value={actionResult.data}
                  />
                )}
              </Card>
            </div>
          </div>
        </ModalRoot>
      </ModalContext>
    </>
  ) : null

  function openActions(item: unknown) {
    setActiveItem(item)
    modalActionsRef.current?.open()
  }

  return { hasActions, modals, openActions }
}

// ---------------------------------------------------------------------------
// Componentes
// ---------------------------------------------------------------------------
export function ResponseObjectSchema({ field, value, actions, baseUrl, auth, fieldPath, onPostback }: ResponsePanelProps) {
  const data = normalizeValue(value)
  const obj = data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, unknown>) : {}
  const { hasActions, modals, openActions } = useFieldActions(actions, fieldPath, baseUrl, auth, onPostback)

  const children = (
    <div className="flex flex-col gap-3">
      {field.children?.map((child) => (
        <ResponseSchema
          key={child.id}
          field={child}
          value={obj[child.name]}
          actions={actions}
          baseUrl={baseUrl}
          auth={auth}
          fieldPath={child.id}
          onPostback={onPostback}
        />
      ))}
    </div>
  )

  if (!field.fieldset) {
    return (
      <>
        {children}
        {modals}
      </>
    )
  }

  return (
    <fieldset className="border border-zinc-800 rounded p-3 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <legend className="text-sm font-semibold text-zinc-300 px-1">{field.label}</legend>
        {hasActions && (
          <Button type='button' variation="icon" onClick={(e) => { e.stopPropagation(); openActions(obj) }}>
            <Grip className='w-5 h-5' />
          </Button>
        )}
      </div>
      {field.description && <p className="text-xs text-zinc-500">{field.description}</p>}
      {children}
      {modals}
    </fieldset>
  )
}

export function ResponseArraySchema({ field, value, actions, baseUrl, auth, fieldPath, onPostback }: ResponsePanelProps) {
  const data = normalizeValue(value)
  const items = Array.isArray(data) ? data : []
  const hasObjectItems = isObjectArray(field)
  const labels = hasObjectItems ? findResponsePanelTableLabel(field) : ['Value']
  const { hasActions, modals, openActions } = useFieldActions(actions, fieldPath, baseUrl, auth, onPostback)

  function renderContent(item: unknown) {
    if (hasObjectItems) {
      return (
        <ResponseSchema
          field={{ ...field, type: 'object' }}
          value={item}
          actions={actions}
          baseUrl={baseUrl}
          auth={auth}
          fieldPath={fieldPath}
          onPostback={onPostback}
        />
      )
    }
    return <span className="text-sm">{formatValue(item)}</span>
  }

  function renderHeader() {
    return (
      <div className="flex gap-3">
        <div className="grid gap-3 flex-1 cursor-pointer p-3" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(150px, 1fr))` }}>
          {labels.map((cell, index) => (
            <span key={index} className="text-sm text-white overflow-hidden text-ellipsis whitespace-nowrap">{cell}</span>
          ))}
        </div>
        <span className="w-12" />
      </div>
    )
  }

  function renderItem(item: unknown, index: number) {
    return (
      <AccordionContext key={index}>
        <AccordionRoot variation="table">
          <AccordionTitle variation="table">
            <div className="flex items-center gap-3 w-full">
              <div className="grid gap-3 flex-1 cursor-pointer" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(150px, 1fr))` }}>
                {hasObjectItems ? (
                  findResponsePanelTableValues(field, item).map((cell, i) => (
                    <span key={i} className="text-sm font-semibold overflow-hidden text-ellipsis whitespace-nowrap">{formatValue(cell)}</span>
                  ))
                ) : (
                  <span className="text-sm font-semibold overflow-hidden text-ellipsis whitespace-nowrap">{formatValue(item)}</span>
                )}
              </div>
              {hasActions && (
                <Button type='button' variation="icon" onClick={(e) => { e.stopPropagation(); openActions(item) }}>
                  <Grip className='w-5 h-5' />
                </Button>
              )}
            </div>
          </AccordionTitle>
          <Accordion variation="transparent">
            <div className="p-3 flex flex-col gap-3">{renderContent(item)}</div>
          </Accordion>
        </AccordionRoot>
      </AccordionContext>
    )
  }

  const emptyState = (
    <If conditional={items.length <= 0}>
      <p className="text-xs text-zinc-500">Array vazio</p>
    </If>
  )

  if (!field.fieldset) {
    return (
      <div>
        {renderHeader()}
        <If conditional={items.length > 0}>{items.map(renderItem)}</If>
        {emptyState}
        {modals}
      </div>
    )
  }

  return (
    <fieldset className="border border-zinc-800 rounded p-3 flex flex-col">
      <legend className="text-sm font-semibold text-zinc-300 px-1">{field.label}</legend>
      {renderHeader()}
      <If conditional={items.length > 0}>{items.map(renderItem)}</If>
      {emptyState}
      {modals}
    </fieldset>
  )
}

export function ResponseBooleanSchema({ field, value, actions, baseUrl, auth, fieldPath, onPostback }: ResponsePanelProps) {
  const { hasActions, modals, openActions } = useFieldActions(actions, fieldPath, baseUrl, auth, onPostback)

  return (
    <InputRoot variation="checkbox">
      <div className="flex items-center justify-between">
        <Label>
          {field.label}
          {field.required && <span className="text-red-400 ml-1">*</span>}
        </Label>
        {hasActions && (
          <Button type='button' variation="icon" onClick={(e) => { e.stopPropagation(); openActions(value) }}>
            <Grip className='w-5 h-5' />
          </Button>
        )}
      </div>
      {field.description && <div className="text-xs text-zinc-500 mb-2">{field.description}</div>}
      <Checkbox defaultValue={Boolean(value).toString()} data={'true'}>
        <Check size={16} />
      </Checkbox>
      {modals}
    </InputRoot>
  )
}

export function ResponseStringSchema({ field, value, actions, baseUrl, auth, fieldPath, onPostback }: ResponsePanelProps) {
  const data = normalizeValue(value)
  const { hasActions, modals, openActions } = useFieldActions(actions, fieldPath, baseUrl, auth, onPostback)

  return (
    <InputRoot>
      <Label>
        {field.label}
        {field.required && <span className="text-red-400 ml-1">*</span>}
      </Label>
      {field.description && <div className="text-xs text-zinc-500 mb-2">{field.description}</div>}
      <div className="flex items-center gap-3 flex-1">
        <Text
          disabled={true}
          type="text"
          value={formatValue(data)}
          placeholder={field.placeholder ?? field.label}
        />
        {hasActions && (
          <Button type='button' variation="icon" onClick={(e) => { e.stopPropagation(); openActions(value) }}>
            <Grip className='w-5 h-5' />
          </Button>
        )}
      </div>
      {modals}
    </InputRoot>
  )
}

export function ResponseSchema({ field, value, actions, baseUrl, auth, fieldPath, onPostback }: ResponsePanelProps) {
  if (field.render === false) {
    return null
  }

  if (field.type === 'object') {
    return <ResponseObjectSchema field={field} value={value} actions={actions} baseUrl={baseUrl} auth={auth} fieldPath={fieldPath} onPostback={onPostback} />
  }

  if (field.type === 'array') {
    return <ResponseArraySchema field={field} value={value} actions={actions} baseUrl={baseUrl} auth={auth} fieldPath={fieldPath} onPostback={onPostback} />
  }

  if (field.type === 'boolean') {
    return <ResponseBooleanSchema field={field} value={value} actions={actions} baseUrl={baseUrl} auth={auth} fieldPath={fieldPath} onPostback={onPostback} />
  }

  return <ResponseStringSchema field={field} value={value} actions={actions} baseUrl={baseUrl} auth={auth} fieldPath={fieldPath} onPostback={onPostback} />
}