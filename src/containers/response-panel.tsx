import { Check } from 'lucide-react'
import { AccordionContext, If } from 'react-base-components'
import Accordion from '../components/accordion'
import AccordionRoot from '../components/accordion-root'
import AccordionTitle from '../components/accordion-title'
import Checkbox from '../components/checkbox'
import InputRoot from '../components/input-root'
import Text from '../components/input-text'
import Label from '../components/label'
import { findResponsePanelTableLabel, findResponsePanelTableValues, formatValue, isObjectArray, normalizeValue } from '../services/openapi-normalizer'
import { OperationField } from '../types/operation'

export interface ResponsePanelProps {
  field: OperationField
  value: unknown
}

export function ResponseObjectSchema({ field, value }: ResponsePanelProps) {
  const data = normalizeValue(value)
  const obj =
    data && typeof data === 'object' && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : {}

  const children = (
    <div className="flex flex-col gap-3">
      {field.children?.map((child) => (
        <ResponseSchema key={child.id} field={child} value={obj[child.name]} />
      ))}
    </div>
  )

  const isRoot =
    field.depth === 0 || field.depth === undefined || field.depth == null

  if (isRoot) {
    return children
  }

  return (
    <fieldset className="border border-zinc-800 rounded p-3 flex flex-col gap-3">
      <legend className="text-sm font-semibold text-zinc-300 px-1">
        {field.label}
      </legend>

      {field.description && (
        <p className="text-xs text-zinc-500">{field.description}</p>
      )}

      {children}
    </fieldset>
  )
}

export function ResponseArraySchema({ field, value }: ResponsePanelProps) {
  const data = normalizeValue(value)
  const items = Array.isArray(data) ? data : []
  const hasObjectItems = isObjectArray(field)
  const labels = hasObjectItems ? findResponsePanelTableLabel(field) : ['Value']

  function renderContent(item: unknown) {
    if (hasObjectItems) {
      return (
        <ResponseSchema field={{ ...field, type: 'object' }} value={item} />
      )
    }

    return <span className="text-sm">{formatValue(item)}</span>
  }

  function renderHeader() {
    return (
      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2 w-full px-2 cursor-pointer pb-3">
        {labels.map((cell, index) => (
          <span key={index} className="text-sm text-white">
            {cell}
          </span>
        ))}
      </div>
    )
  }

  function renderItem(item: unknown, index: number) {
    return (
      <AccordionContext key={index}>
        <AccordionRoot variation="table">
          <AccordionTitle variation="table">
            {hasObjectItems ? (
              <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2 w-full px-2 cursor-pointer">
                {findResponsePanelTableValues(field, item).map((cell, i) => (
                  <span key={i} className="text-sm font-semibold">
                    {formatValue(cell)}
                  </span>
                ))}
              </div>
            ) : (
              <div className="px-2">
                <span className="text-sm font-semibold">{formatValue(item)}</span>
              </div>
            )}
          </AccordionTitle>
          <Accordion variation="transparent">
            <div className="py-3 flex flex-col gap-3">{renderContent(item)}</div>
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

        <If conditional={items.length > 0}>
          {items.map(renderItem)}
        </If>

        {emptyState}
      </div>
    )
  }

  return (
    <fieldset className="border border-zinc-800 rounded p-3 flex flex-col">
      <legend className="text-sm font-semibold text-zinc-300 px-1">
        {field.label}
      </legend>

      {renderHeader()}

      <If conditional={items.length > 0}>{items.map(renderItem)}</If>
      {emptyState}
    </fieldset>
  )
}

export function ResponseBooleanSchema({ field, value }: ResponsePanelProps) {
  return (
    <InputRoot variation="checkbox">
      <Label>
        {field.label}
        {field.required && <span className="text-red-400 ml-1">*</span>}
      </Label>

      {field.description && (
        <div className="text-xs text-zinc-500 mb-2">{field.description}</div>
      )}

      <Checkbox checked={Boolean(value)} data={'true'}>
        <Check size={16} />
      </Checkbox>
    </InputRoot>
  )
}

export function ResponseStringSchema({ field, value }: ResponsePanelProps) {
  const data = normalizeValue(value)

  return (
    <InputRoot>
      <Label>
        {field.label}
        {field.required && <span className="text-red-400 ml-1">*</span>}
      </Label>

      {field.description && (
        <div className="text-xs text-zinc-500 mb-2">{field.description}</div>
      )}

      <Text
        disabled={true}
        type="text"
        value={formatValue(data)}
        placeholder={field.placeholder ?? field.label}
      />
    </InputRoot>
  )
}

export function ResponseSchema({ field, value }: ResponsePanelProps) {
  if (field.type === 'object') {
    return <ResponseObjectSchema field={field} value={value} />
  }

  if (field.type === 'array') {
    return <ResponseArraySchema field={field} value={value} />
  }

  if (field.type === 'boolean') {
    return <ResponseBooleanSchema field={field} value={value} />
  }

  return <ResponseStringSchema field={field} value={value} />
}