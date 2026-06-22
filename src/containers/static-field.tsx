import { Check, Grip } from 'lucide-react'
import React, { useRef, useState } from 'react'
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
import {
  findResponsePanelTableLabel,
  findResponsePanelTableValues,
  formatValue,
  getMissingRequiredParams,
  isObjectArray,
  normalizeValue,
  resolveBind,
  toReactRouterPath,
} from '../services/openapi-normalizer'
import { executeRequest } from '../services/request-executor'
import { PaginationPanel } from './pagination-panel'
import type { FieldGroup, OperationField, PaginationFieldsConfig, ResolvedAction } from '../types/operation'
import type { AuthState } from '../types/auth'
import { toast } from 'react-toastify'

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface StaticFieldProps {
  field: OperationField
  value: unknown
  actions?: ResolvedAction[]
  baseUrl?: string
  auth?: AuthState
  fieldPath?: string
  paginationConfigs?: PaginationFieldsConfig[]
  values?: Record<FieldGroup, Record<string, unknown>>
  onPageChange?: (group: FieldGroup, path: string[], value: unknown) => void
  onPostback?: () => void
  onNavigate?: (routePath: string, boundValues: Record<FieldGroup, Record<string, unknown>>) => void
}

// ---------------------------------------------------------------------------
// useFieldActions
// ---------------------------------------------------------------------------

function useFieldActions(
  actions: ResolvedAction[] | undefined,
  fieldPath: string | undefined,
  baseUrl: string | undefined,
  auth: AuthState | undefined,
  onPostback: (() => void) | undefined,
  onNavigate: StaticFieldProps['onNavigate'],
) {
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
    const boundValues = resolveBind(action.bind, item)

    if (action.type === 'navigate') {
      const missing = getMissingRequiredParams(action.endpoint, boundValues)
      if (missing.length > 0) {
        toast.error(`Parâmetros obrigatórios não preenchidos na action "${action.label}": ${missing.join(', ')}`)
        console.warn('Parâmetros obrigatórios não preenchidos:', missing)
        return
      }
      const routePath = toReactRouterPath(action.endpoint.operationPath, action.endpoint.method)
      onNavigate?.(routePath, boundValues)
      modalActionsRef.current?.close()
      return
    }

    if (!baseUrl) return

    const missing = getMissingRequiredParams(action.endpoint, boundValues)
    if (missing.length > 0) {
      toast.error(`Parâmetros obrigatórios não preenchidos na action "${action.label}": ${missing.join(', ')}`)
      console.warn('Parâmetros obrigatórios não preenchidos:', missing)
      return
    }

    setRunningAction(true)

    try {
      const result = await executeRequest({ baseUrl, endpoint: action.endpoint, values: boundValues, auth: auth! })
      setActionResult({ action, data: result.data })
      modalActionsRef.current?.close()

      if (action.postback) {
        onPostback?.()
      } else {
        modalResultRef.current?.open()
      }
    } finally {
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
                  <ModalClose><Button type="button">Close</Button></ModalClose>
                </div>
                <div className="flex flex-col gap-2">
                  {localActions.map((action, i) => (
                    <Button
                      key={i}
                      type="button"
                      variation="outline"
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
                      <div
                        key={i}
                        className="w-[2px] rounded-sm bg-purple-400 origin-bottom"
                        style={{
                          height: h,
                          animation: 'pulse-bar 1.1s ease-in-out infinite',
                          animationDelay: `${i * 0.15}s`,
                        }}
                      />
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
                      {actionResult?.action.endpoint?.method?.toUpperCase()} {actionResult?.action.endpoint?.operationPath}
                    </p>
                  </div>
                  <ModalClose><Button type="button">Close</Button></ModalClose>
                </div>
                {actionResult && (
                  <StaticField
                    field={actionResult.action.endpoint?.fields?.[0] as unknown as OperationField}
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
// StaticFieldForObject
// ---------------------------------------------------------------------------

export function StaticFieldForObject({ field, value, actions, baseUrl, auth, paginationConfigs, values, onPageChange, onPostback, onNavigate }: StaticFieldProps) {
  const data = normalizeValue(value)
  const obj = data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, unknown>) : {}
  const { hasActions, modals, openActions } = useFieldActions(actions, field.id, baseUrl, auth, onPostback, onNavigate)

  const children = (
    <div className="flex flex-col gap-3">
      {field.children?.map((child) => (
        <StaticField
          key={child.id}
          field={child}
          value={obj[child.name]}
          actions={actions}
          baseUrl={baseUrl}
          auth={auth}
          fieldPath={child.id}
          paginationConfigs={paginationConfigs}
          values={values}
          onPageChange={onPageChange}
          onPostback={onPostback}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  )

  if (!field.fieldset) return <>{children}{modals}</>

  return (
    <fieldset className="border border-zinc-800 rounded p-3 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <legend className="text-sm font-semibold text-zinc-300 px-1">{field.label}</legend>
        {hasActions && (
          <Button type="button" variation="icon" onClick={(e) => { e.stopPropagation(); openActions(obj) }}>
            <Grip className="w-5 h-5" />
          </Button>
        )}
      </div>
      {field.description && <p className="text-xs text-zinc-500">{field.description}</p>}
      {children}
      {modals}
    </fieldset>
  )
}

// ---------------------------------------------------------------------------
// StaticFieldForArray
// ---------------------------------------------------------------------------

export function StaticFieldForArray({ field, value, actions, baseUrl, auth, paginationConfigs, values, onPageChange, onPostback, onNavigate }: StaticFieldProps) {
  const data = normalizeValue(value)
  const items = Array.isArray(data) ? data : []
  const hasObjectItems = isObjectArray(field)
  const labels = hasObjectItems ? findResponsePanelTableLabel(field) : ['Value']
  const { hasActions, modals, openActions } = useFieldActions(actions, field.id, baseUrl, auth, onPostback, onNavigate)

  // Find pagination config for this specific array field
  const paginationConfig = paginationConfigs?.find((c) => c.operationFieldId === field.id)

  function renderContent(item: unknown) {
    if (hasObjectItems) {
      return (
        <StaticField
          field={{ ...field, type: 'object' }}
          value={item}
          actions={actions}
          baseUrl={baseUrl}
          auth={auth}
          paginationConfigs={paginationConfigs}
          values={values}
          onPageChange={onPageChange}
          onPostback={onPostback}
          onNavigate={onNavigate}
        />
      )
    }
    return <span className="text-sm">{formatValue(item)}</span>
  }

  function renderHeader() {
    return (
      <div className="flex gap-3">
        <div className="grid gap-3 flex-1 cursor-pointer p-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
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
              <div className="grid gap-3 flex-1 cursor-pointer" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
                {hasObjectItems ? (
                  findResponsePanelTableValues(field, item).map((cell, i) => (
                    <span key={i} className="text-sm font-semibold overflow-hidden text-ellipsis whitespace-nowrap">{formatValue(cell)}</span>
                  ))
                ) : (
                  <span className="text-sm font-semibold overflow-hidden text-ellipsis whitespace-nowrap">{formatValue(item)}</span>
                )}
              </div>
              {hasActions && (
                <Button type="button" variation="icon" onClick={(e) => { e.stopPropagation(); openActions(item) }}>
                  <Grip className="w-5 h-5" />
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

  // console.log("field:", field)
  // console.log("paginationConfigs:", paginationConfigs)
  // console.log("paginationConfig for this field:", paginationConfig)
  // console.log("values:", values)
  // console.log("validation:", paginationConfig != null && values !== null && onPageChange !== undefined)

  const pagination = paginationConfig && values && onPageChange ? (
    <PaginationPanel
      config={paginationConfig}
      values={values}
      onPageChange={onPageChange}
    />
  ) : null

  console.log("pagination:", pagination)

  if (!field.fieldset) {
    return (
      <div>
        {renderHeader()}
        <If conditional={items.length > 0}>{items.map(renderItem)}</If>
        {emptyState}
        {pagination}
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
      {pagination}
      {modals}
    </fieldset>
  )
}

// ---------------------------------------------------------------------------
// StaticFieldForBoolean
// ---------------------------------------------------------------------------

export function StaticFieldForBoolean({ field, value, actions, baseUrl, auth, onPostback, onNavigate }: StaticFieldProps) {
  const { hasActions, modals, openActions } = useFieldActions(actions, field.id, baseUrl, auth, onPostback, onNavigate)

  return (
    <InputRoot variation="checkbox">
      <div className="flex items-center justify-between">
        <Label>
          {field.label}
          {field.required && <span className="text-red-400 ml-1">*</span>}
        </Label>
        {hasActions && (
          <Button type="button" variation="icon" onClick={(e) => { e.stopPropagation(); openActions(value) }}>
            <Grip className="w-5 h-5" />
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

// ---------------------------------------------------------------------------
// StaticFieldString
// ---------------------------------------------------------------------------

export function StaticFieldString({ field, value, actions, baseUrl, auth, onPostback, onNavigate }: StaticFieldProps) {
  const data = normalizeValue(value)
  const { hasActions, modals, openActions } = useFieldActions(actions, field.id, baseUrl, auth, onPostback, onNavigate)

  return (
    <InputRoot>
      <Label>
        {field.label}
        {field.required && <span className="text-red-400 ml-1">*</span>}
      </Label>
      {field.description && <div className="text-xs text-zinc-500 mb-2">{field.description}</div>}
      <div className="flex items-center gap-3 flex-1">
        <Text disabled type="text" value={formatValue(data)} placeholder={field.placeholder ?? field.label} />
        {hasActions && (
          <Button type="button" variation="icon" onClick={(e) => { e.stopPropagation(); openActions(value) }}>
            <Grip className="w-5 h-5" />
          </Button>
        )}
      </div>
      {modals}
    </InputRoot>
  )
}

// ---------------------------------------------------------------------------
// StaticField — router
// ---------------------------------------------------------------------------

export function StaticField({ field, value, actions, baseUrl, auth, fieldPath, paginationConfigs, values, onPageChange, onPostback, onNavigate }: StaticFieldProps) {
  if (field.render === false) return null

  if (field.type === 'object') {
    return <StaticFieldForObject field={field} value={value} actions={actions} baseUrl={baseUrl} auth={auth} fieldPath={fieldPath} paginationConfigs={paginationConfigs} values={values} onPageChange={onPageChange} onPostback={onPostback} onNavigate={onNavigate} />
  }

  if (field.type === 'array') {
    return <StaticFieldForArray field={field} value={value} actions={actions} baseUrl={baseUrl} auth={auth} fieldPath={fieldPath} paginationConfigs={paginationConfigs} values={values} onPageChange={onPageChange} onPostback={onPostback} onNavigate={onNavigate} />
  }

  if (field.type === 'boolean') {
    return <StaticFieldForBoolean field={field} value={value} actions={actions} baseUrl={baseUrl} auth={auth} fieldPath={fieldPath} onPostback={onPostback} onNavigate={onNavigate} />
  }

  return <StaticFieldString field={field} value={value} actions={actions} baseUrl={baseUrl} auth={auth} fieldPath={fieldPath} onPostback={onPostback} onNavigate={onNavigate} />
}